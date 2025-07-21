import asyncio
import copy
import json
import logging
import os
import uuid
from dotenv import load_dotenv

import google.auth
from google import genai
from google.genai.types import (
    HttpOptions, GenerateContentConfig, Part, Content
)

from fastapi import FastAPI, WebSocket
from fastapi.websockets import WebSocketState

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

load_dotenv()

_, PROJECT_ID = google.auth.default()
LOCATION = 'us-central1'
LANGUAGE = os.environ.get('LANGUAGE', 'English')


class MonitoringBackend:
    def __init__(self, client_websocket):
        self.client_ws = client_websocket
        self.images = []
        self.analysis_tasks = {}
        self.analysis_length = 30   # Analyize past 30 secs
        self.analysis_interval = 15 # Analyize every 15 secs


    def generate_response(self, system_instruction, contents, response_schema,
                          model='gemini-2.5-flash'):
        client = genai.Client(vertexai=True,
                              project=PROJECT_ID, location=LOCATION,
                              http_options=HttpOptions(api_version='v1'))
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.1,
                top_p=0.5,
                response_mime_type='application/json',
                response_schema=response_schema,
            )
        )
        return '\n'.join(
            [p.text for p in response.candidates[0].content.parts if p.text]
        )


    def _analyze_images(self, images):
        system_instruction = f'''
You are given a series of images from a security camera that contains one image per second.

[tasks]
- Analyze the images and give the following information:
 * "summary": One sentence summary of the overall state of the images
 * "status": One of the following item: "usual" or "unusual".
 * "details": Detailed description of the scene with a few sentences.
- "summary" is a noun form sentence with around 10 words.
- "status" is "unusual" if the scene contains a suspicious situation suggesting criminal activities.

[output]
- Output in {LANGUAGE}.
'''

        response_schema = {
            "type": "object",
            "properties": {
                "status": {
                    "description": "Status of the scene",
                    "enum": ["usual", "unusual"],
                    "type": "string"
                },
                "summary": {
                    "description": "One sentence summary of the scene",
                    "type": "string"
                },
                "details": {
                    "description": "Detailed description of the scene",
                    "type": "string"
                }
            },
            "required": ["status", "summary", "details"]
        }

        parts = [Part(text='[images]')] + images
        contents = Content(parts=parts, role='user')
        result = self.generate_response(
                system_instruction, contents, response_schema
        )
        return json.loads(result)


    async def analyze_images(self, task_id, images):
        try:
            # Run in the process pool to avoid blocking other threads.
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                None, self._analyze_images, images
            )
            logger.info(f'analysis result: {result}')
            await self.client_ws.send_text(json.dumps(result))
        except Exception as e:
            logger.error(f'failed to analyze images: {e}')

        self.analysis_tasks.pop(task_id)


    async def run(self):
        try:
            async for _message in self.client_ws.iter_text():
                message = json.loads(_message)
                if message['type'] == 'image':
                    self.images.append(
                        Part.from_bytes(
                            data=message['data'],
                            mime_type=message['mime_type'],
                        )
                    )
                # Run analysis task
                if len(self.images) >= self.analysis_length:
                    image_parts = copy.deepcopy(self.images)
                    # drop the first self.analysis_interval frames.
                    self.images = self.images[self.analysis_interval:]
                    task_id = uuid.uuid4().hex
                    self.analysis_tasks[task_id] = asyncio.create_task(
                        self.analyze_images(task_id, image_parts)
                    )
        except Exception as e:
            logger.info('exit from message handler.')

        # Cancel running tasks.
        for task_id in self.analysis_tasks.keys():
            self.analysis_tasks[task_id].cancel()


app = FastAPI()


# Cloud Run health-check
@app.get('/')
async def read_root():
    return {'status': 'ok'}


@app.websocket('/ws')
async def monitoring_endpoint(websocket: WebSocket):
    await websocket.accept()
    backend = MonitoringBackend(websocket)
    await backend.run()


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(
        'main:app', host='localhost', port=8080,
        reload=True, log_level='info'
    )
