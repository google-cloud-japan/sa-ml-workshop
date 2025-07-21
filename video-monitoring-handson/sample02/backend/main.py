import asyncio
import base64
import json
import logging
import os
import threading
import time
import uuid
import google.auth
from dotenv import load_dotenv

from google.genai.types import (
    Part,
    Content,
    Blob,
    SpeechConfig,
    VoiceConfig,
    PrebuiltVoiceConfig,
    AudioTranscriptionConfig,
    RealtimeInputConfig,
    AutomaticActivityDetection,
    StartSensitivity,
    EndSensitivity,
    ActivityHandling,
    ProactivityConfig,
    GenerateContentConfig
)
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.agents import LiveRequestQueue
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.sessions.in_memory_session_service import InMemorySessionService

from fastapi import FastAPI, WebSocket
from fastapi.websockets import WebSocketState

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

load_dotenv()

_, PROJECT_ID = google.auth.default()
LOCATION = 'us-central1'
VOICE_NAME = os.environ.get('VOICE_NAME', 'Puck')
LANGUAGE = os.environ.get('LANGUAGE', 'English')
LANG_CODE_MAP = {
    'English': 'en-US',
    'Japanese': 'ja-JP',
    'Korean': 'ko-KR',
}
logger.info(f'LANGUAGE: {LANGUAGE}, VOICE_NAME: {VOICE_NAME}')

os.environ['GOOGLE_GENAI_USE_VERTEXAI'] = 'True'
os.environ['GOOGLE_CLOUD_PROJECT'] = PROJECT_ID
os.environ['GOOGLE_CLOUD_LOCATION'] = LOCATION

SYSTEM_INSTRUCTION = '''
You are a friendly guide of a coffee shop.
Answer to questions regarding the coffee shop from the user.

* Your name is Patrick.
* The name of the coffee shop is "Star Light Cafe".
* You can make assumptions about the coffee shop with your imagination.
* You should start a conversation by saying "Hello, I'm Patrick. I'm happy to answer to your questions regarding "Star Light Cafe". What do you want to know?"
'''

class VoicetalkBackend:
    def __init__(self, client_websocket):
        self.client_ws = client_websocket
        self.live_events = None
        self.live_request_queue = None


    async def create_runner(self):
        session_service = InMemorySessionService()
        generate_content_config = GenerateContentConfig(
            temperature=0.2,
            top_p=0.5,
        )
        voicecall_agent = LlmAgent(
            name='voicecall_agent',
            model='gemini-2.0-flash-live-preview-04-09',
            description='An agent to have a conversation with the user.',
            instruction=SYSTEM_INSTRUCTION,
            generate_content_config=generate_content_config,
        )

        runner = Runner(
            app_name='voicecall_app',
            agent=voicecall_agent,
            session_service=session_service
        )

        session = await session_service.create_session(
            app_name='voicecall_app',
            user_id='default_user',
        )

        run_config = RunConfig(
            streaming_mode=StreamingMode.BIDI,
            response_modalities=['AUDIO'],
            speech_config=SpeechConfig(
                voice_config=VoiceConfig(
                    prebuilt_voice_config=PrebuiltVoiceConfig(
                        voice_name=VOICE_NAME
                    )
                ),
                language_code=LANG_CODE_MAP[LANGUAGE],
            ),
            output_audio_transcription=AudioTranscriptionConfig(),
            input_audio_transcription=AudioTranscriptionConfig(),
        )

        live_request_queue = LiveRequestQueue()
        live_events = runner.run_live(
            user_id='default_user',
            session_id=session.id,
            live_request_queue=live_request_queue,
            run_config=run_config,
        )

        return live_events, live_request_queue


    async def agent_to_client_messaging(self):
        async for event in self.live_events:
            if not (event.content and event.content.parts):
                continue
            for part in event.content.parts:
                if not(hasattr(part, 'inline_data') and part.inline_data):
                    continue
                audio_data = part.inline_data.data
                mime_type = part.inline_data.mime_type
                if audio_data and mime_type.startswith('audio/pcm'):
                    message = {
                        'type': 'audio',
                        'data': base64.b64encode(audio_data).decode('ascii')
                    }
                    await self.client_ws.send_text(json.dumps(message))


    async def client_to_agent_messaging(self):
        async for message in self.client_ws.iter_text():
            message = json.loads(message)
            if message['type'] == 'audio':
                if not('mime_type' in message.keys() and
                        message['mime_type'] == 'audio/pcm'): 
                    continue
                decoded_data = base64.b64decode(message['data'])
                self.live_request_queue.send_realtime(
                    Blob(data=decoded_data,
                         mime_type=f'audio/pcm;rate=16000')
                )


    async def run(self):
        logger.info('start conversation')
        self.live_events, self.live_request_queue = await self.create_runner() 

        text = f'Hello. Please talk in {LANGUAGE}.'
        content = Content(role='user', parts=[Part(text=text)])
        self.live_request_queue.send_content(content=content)

        try:
            # agent to voice client
            agent_to_client_task = asyncio.create_task(
                self.agent_to_client_messaging()
            )
            # voice client to agent
            client_to_agent_task = asyncio.create_task(
                self.client_to_agent_messaging()
            )
            tasks = [
                agent_to_client_task, client_to_agent_task,
            ]
            done, pending = await asyncio.wait(
                tasks, return_when=asyncio.FIRST_COMPLETED
            )
        except Exception as e:
            logger.info(f'exception: {e}')

        logger.info('end conversation')


app = FastAPI()


# Cloud Run health-check
@app.get('/')
async def read_root():
    return {'status': 'ok'}


@app.websocket('/ws')
async def handler(websocket: WebSocket):
    await websocket.accept()
    backend = VoicetalkBackend(websocket)
    await backend.run()



if __name__ == '__main__':
    import uvicorn
    uvicorn.run(
        'main:app', host='localhost', port=8081,
        reload=True, log_level='info'
    )

