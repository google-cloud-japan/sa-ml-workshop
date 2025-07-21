import asyncio
import base64
import json
import logging
import os
import threading
import time
import uuid

import google.auth

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


from system_instruction import SYSTEM_INSTRUCTION

_, PROJECT_ID = google.auth.default()
LOCATION = 'us-central1'

VOICE_NAME = os.getenv('VOICE_NAME', 'Puck')

os.environ['GOOGLE_GENAI_USE_VERTEXAI'] = 'True'
os.environ['GOOGLE_CLOUD_PROJECT'] = PROJECT_ID
os.environ['GOOGLE_CLOUD_LOCATION'] = LOCATION


## Logging setup
logger = logging.getLogger()
logger.setLevel(logging.INFO)
formatter = logging.Formatter('[%(asctime)s] [%(levelname)s] %(message)s')
handler = logging.StreamHandler()
handler.setFormatter(formatter)
if not logger.handlers:
    logger.addHandler(handler)
####

CLIENTS = {}


def set_timer(delay, coro_func, *args):
    loop = asyncio.get_running_loop()

    def callback():
        coro = coro_func(*args)
        asyncio.run_coroutine_threadsafe(coro, loop)

    timer = threading.Timer(delay, callback)
    timer.start()
    return timer


async def send_message(client, message):
    for _ in range(5):
        try:
            await client.send_text(json.dumps(message))
            break
        except Exception as e:
            logger.error(f'send message error: {message}, {e}')
            await asyncio.sleep(1)


async def cancel_tasks(phone_id):
    if phone_id not in CLIENTS.keys():
        return
    logger.info(f'cancelling tasks with phone_id: {phone_id}')
    tasks = CLIENTS[phone_id]['tasks']
    for task in tasks:
        try:
            task.cancel()
        except Exception as e:
            logger.error(f'task cancel error for {task.get_name()}: {e}')


async def call_phone(phone_id):
    try:
        if CLIENTS[phone_id]['call_status'] != 'disconnected':
            return
        voice_client_ws = CLIENTS[phone_id]['voice_client']
        await send_message(voice_client_ws, {
            'type': 'text',
            'command': 'call',
            'phone_id': phone_id,
            'session_id': CLIENTS[phone_id]['session_id']
        })
        await send_frontend_message(phone_id, 'Calling the security operator.')
        CLIENTS[phone_id]['call_status'] = 'connecting'

    except Exception as e:
        logger.error(f'failed to call voice client with {phone_id}: {e}')


async def disconnect_phone(phone_id):
    try:
        logger.info(f'disconnect phone: {phone_id}')
        voice_client_ws = CLIENTS[phone_id]['voice_client']
        frontend_ws = CLIENTS[phone_id]['frontend']
        await send_message(voice_client_ws, {
            'type': 'text',
            'command': 'disconnect',
            'phone_id': phone_id,
        })
        await send_frontend_message(phone_id, 'Conversation finished.')
        # closing the frontend session. voice clinet handler is kept alive.
        await cancel_tasks(phone_id)

    except Exception as e:
        logger.error(f'failed to call voice client with {phone_id}: {e}')


async def send_frontend_message(phone_id, message):
    try:
        frontend_ws = CLIENTS[phone_id]['frontend']
        await send_message(frontend_ws, {
            'type': 'text',
            'command': 'message',
            'data': message,
            'phone_id': phone_id,
        })
    except Exception as e:
        logger.error(f'failed to send message with {phone_id}: {e}')


async def send_final_report(phone_id, summaryText):
    try:
        logger.info(f'send final report.')
        frontend_ws = CLIENTS[phone_id]['frontend']
        await send_message(frontend_ws, {
            'type': 'text',
            'command': 'summary',
            'data': summaryText,
            'phone_id': phone_id,
        })
    except Exception as e:
        logger.error(f'failed to send final report with {phone_id}: {e}')


async def force_end_conversation(phone_id, session_id):
    if CLIENTS[phone_id]['session_id'] != session_id:
        logger.info('session_id mismatch')
        return
    logger.info(f'force end conversation with phone id: {phone_id}')
    await send_final_report(
        phone_id, 'The call was disconnected during the conversation.'
    )
    await disconnect_phone(phone_id)


def get_tools(phone_id):

    async def send_final_report_tool(summaryText: str) -> str:
        """
        Tool to send a final report including the conversation summary to the user.
        Use this tool only when you finished the conversation with the security operator.

        Returns "succeeded" if the report is sent successfully.
        """
        logger.info('using send_final_report_tool.')
        await send_final_report(phone_id, summaryText)
        return 'succeeded'

    async def disconnect_phone_call_tool() -> str:
        """
        Tool to disconnect a phone call with the security company
        when you finished the conversation with the security operator.

        Returns "succeeded" if disconnected successfully.
        """
        logger.info('using disconnect_phone_call_tool.')
        await asyncio.sleep(1)
        await disconnect_phone(phone_id)
        return 'succeeded'

    tools = [
        send_final_report_tool,
        disconnect_phone_call_tool,
    ]
    return tools


async def agent_to_client_messaging(phone_id, websocket, live_events):
    try:
        async for event in live_events:
            if not (event.content and event.content.parts):
                continue
            for part in event.content.parts:
                if not(hasattr(part, 'inline_data') and part.inline_data):
                    continue
                audio_data = part.inline_data.data
                if audio_data and part.inline_data.mime_type.startswith('audio/pcm'):
                    message = {
                        'type': 'audio',
                        'data': base64.b64encode(audio_data).decode('ascii')
                    }
                    await send_message(websocket, message)
    except Exception as e:
        logger.error(f'error on agent to client messaging: {e}')


async def client_to_agent_messaging(
    phone_id, websocket, live_request_queue
):
    try:
        async for message in websocket.iter_text():
            message = json.loads(message)
            logger.debug(f'received from client {message["type"]}')

            if message['type'] == 'audio':
                if CLIENTS[phone_id]['call_status'] != 'connected':
                    continue
                if not('mime_type' in message.keys() and
                        message['mime_type'] == 'audio/pcm'): 
                    continue
                decoded_data = base64.b64decode(message['data'])
                live_request_queue.send_realtime(
                    Blob(data=decoded_data,
                         mime_type=f'audio/pcm;rate=16000')
                )
                continue

            if message['type'] == 'text':
                if message['session_id'] != CLIENTS[phone_id]['session_id']:
                    logger.info(f'client message session id mismatch.')
                    continue
                text = message['data']
                if text.startswith('[connection closed]'):
                    await send_frontend_message(phone_id, 'Call disconnected.');
                    content = Content(role='user', parts=[Part.from_text(text=text)])
                    live_request_queue.send_content(content=content)
                    # force end conversation if agent failed to finish conversation.
                    CLIENTS[phone_id]['close_timer'].cancel()
                    CLIENTS[phone_id]['close_timer'] = set_timer(
                        10,
                        force_end_conversation, phone_id,
                        CLIENTS[phone_id]['session_id']
                    )
                    continue

                if text.startswith('[connection established]'):
                    await send_frontend_message(phone_id, 'Conversation started.');
                    logger.info('delay 2 secs to relay [connection established]')
                    await asyncio.sleep(2)
                    CLIENTS[phone_id]['call_status'] = 'connected'

                if CLIENTS[phone_id]['call_status'] != 'connected':
                    continue
                content = Content(role='user', parts=[Part.from_text(text=text)])
                live_request_queue.send_content(content=content)
                continue

    except Exception as e:
        logger.error(f'error on client to agent messaging: {e}')


async def frontend_to_agent_messaging(
    phone_id, websocket, live_request_queue, request_text
):
    try:
        # Send initial request to agent.
        await asyncio.sleep(1)
        logger.info(f'send request to agent.')
        content = Content(role='user', parts=[Part.from_text(text=request_text)])
        live_request_queue.send_content(content=content)

        # make a call to voice client
        await asyncio.sleep(2)
        logger.info(f'make a call to voice client.')
        await call_phone(phone_id)

        # Keep sending video frames.
        async for message in websocket.iter_text():
            message = json.loads(message)
            logger.debug(f'received from frontend {message["type"]}')
            if message['type'] == 'image':
                if CLIENTS[phone_id]['call_status'] != 'connected':
                    continue
                if not('mime_type' in message.keys() and
                        message['mime_type'].startswith('image/')):
                    continue
                decoded_data = base64.b64decode(message['data'])
                live_request_queue.send_realtime(
                    Blob(data=decoded_data, mime_type=message['mime_type'])
                )
                continue

    except Exception as e:
        logger.error(f'error on frontend to agent messaging: {e}')


async def create_runner(phone_id, lang):
    logger.info('create runner.')
    try:
        session_service = InMemorySessionService()
        tools = get_tools(phone_id)
        generate_content_config = GenerateContentConfig(
            temperature=0.2,
            top_p=0.5,
        )
        autocall_agent = LlmAgent(
            name='autocall_agent',
            model='gemini-2.0-flash-live-preview-04-09',
            description='autocall agent - specialized in talking to a security operator',
            instruction=SYSTEM_INSTRUCTION,
            generate_content_config=generate_content_config,
            tools=tools,
        )

        runner = Runner(
            app_name='autocall_app',
            agent=autocall_agent,
            session_service=session_service,
        )

        session = await session_service.create_session(
            app_name='autocall_app',
            user_id='default_user',
        )
        CLIENTS[phone_id]['session_id'] = session.id
        logger.info(f'Agent session id: {session.id}')

        run_config = RunConfig(
            streaming_mode=StreamingMode.BIDI,
            response_modalities=['AUDIO'],
            speech_config=SpeechConfig(
                voice_config=VoiceConfig(
                    prebuilt_voice_config=PrebuiltVoiceConfig(
                        voice_name=VOICE_NAME
                    )
                ),
                language_code=lang
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

    except Exception as e:
        logger.error(f'error on create runner: {e}')


async def conversation_handler(phone_id):
    try:
        CLIENTS[phone_id]['call_status'] = 'disconnected'
        voice_client_ws = CLIENTS[phone_id]['voice_client']
        frontend_ws = CLIENTS[phone_id]['frontend']

        logger.info('waiting for a call request from frontend')
        request_received = False
        async for message in frontend_ws.iter_text():
            message = json.loads(message)
            if message['type'] != 'text':
                continue
            logger.info(f'request message from frontend with session {phone_id}: {message}')
            request_text = message['data']
            lang = 'en-US'
            if 'lang' in message.keys():
                lang = message['lang']
            request_received = True
            break
        if not request_received:
            return

        await send_frontend_message(phone_id, 'Request received.');

        # Start 3-way communication tasks
        live_events, live_request_queue = await create_runner(phone_id, lang)

        # agent to voice client
        agent_to_client_task = asyncio.create_task(
            agent_to_client_messaging(
                phone_id, voice_client_ws, live_events
            )
        )
        # voice client to agent
        client_to_agent_task = asyncio.create_task(
            client_to_agent_messaging(
                phone_id, voice_client_ws, live_request_queue
            )
        )
        # frontend to agent
        frontend_to_agent_task = asyncio.create_task(
            frontend_to_agent_messaging(
                phone_id, frontend_ws, live_request_queue, request_text
            )
        )
        # agent to frontend is handled by agent tools 

        logger.info('start audio conversation tasks')
        tasks = [
            agent_to_client_task,
            client_to_agent_task,
            frontend_to_agent_task,
        ]
        CLIENTS[phone_id]['tasks'] = tasks
        
        # Force close the frontend session after 10 mins
        CLIENTS[phone_id]['close_timer'] = set_timer(
            3600, cancel_tasks, phone_id
        )

        done, pending = await asyncio.wait(
            tasks, return_when=asyncio.FIRST_COMPLETED
        )

        CLIENTS[phone_id]['close_timer'].cancel()
        CLIENTS[phone_id]['session_id'] = None
        logger.info('end audio conversation tasks')

    except Exception as e:
        logger.info(f'frontend with session {phone_id} disconnected: {e}')

    finally:
        CLIENTS[phone_id]['call_status'] = 'closed'


app = FastAPI()


# Cloud Run health-check
@app.get('/')
async def read_root():
    return {'status': 'ok'}


@app.websocket('/voice_client/{phone_id}')
async def voice_client_handler(websocket: WebSocket, phone_id: str):
    try:
        await websocket.accept()
        logger.info(f'voice cliant with phone id {phone_id} connected.')

        if phone_id in CLIENTS.keys():
            CLIENTS[phone_id]['voice_client'] = websocket
        else:
            CLIENTS[phone_id] = {
                'voice_client': websocket,
                'call_status': 'closed',
            }
        # transitions of call_status
        #  >closed:       frontend disconnected. frontend can connect to backend.
        # |   v
        # | disconnected: frontend connected. waiting for a request from frontend.
        # |   v
        # | connecting:   waiting for voice client to take a call.
        # |   v
        #  -connected:    voice client took the call.

        # Keep idol until closed.
        while websocket.client_state == WebSocketState.CONNECTED:
            await asyncio.sleep(1)

        logger.info(f'voice cliant with phone id {phone_id} disconnected.')
        del CLIENTS[phone_id]['voice_client']
        return

    finally:
        if (websocket.application_state != WebSocketState.DISCONNECTED and
            websocket.client_state != WebSocketState.DISCONNECTED):
            await websocket.close()


@app.websocket('/frontend/{phone_id}')
async def frontend_handler(websocket: WebSocket, phone_id: str):
    try:
        await websocket.accept()

        if phone_id not in CLIENTS:
            logger.info(f'no voice client with phone id {phone_id}')
            return

        if CLIENTS[phone_id]['call_status'] != 'closed':
            logger.info(f'phone line of {phone_id} is busy.')
            return

        logger.info(f'frontend with phone id {phone_id} connected.')
        CLIENTS[phone_id]['frontend'] = websocket

        # Handle three way (frontend, live-api, voice client) communication.
        await conversation_handler(phone_id)

        logger.info(f'frontend with phone id {phone_id} disconnected.')
        del CLIENTS[phone_id]['frontend']
        return

    finally:
        if (websocket.application_state != WebSocketState.DISCONNECTED and
            websocket.client_state != WebSocketState.DISCONNECTED):
            await websocket.close()


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(
        'main:app', host='localhost', port=8081,
        reload=True, log_level='info'
    )
