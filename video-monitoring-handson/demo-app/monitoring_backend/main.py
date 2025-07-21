import asyncio
import contextvars
import copy
import datetime
import json
import logging
import sys
import threading
import uuid

import firebase_admin
from firebase_admin import auth

import google.auth
from google import genai
from google.genai.types import (
    HttpOptions, GenerateContentConfig, Part, Content
)

from fastapi import FastAPI, WebSocket
from fastapi.websockets import WebSocketState


_, PROJECT_ID = google.auth.default()
LOCATION = 'us-central1'

## Logging setup
session_id_var = contextvars.ContextVar('session_id', default='-')

class ContextVarFilter(logging.Filter):
    def filter(self, record):
        record.session_id = session_id_var.get()
        return True

logger = logging.getLogger()
logger.setLevel(logging.INFO)
formatter = logging.Formatter('[%(asctime)s] [%(session_id)s] [%(levelname)s] %(message)s')
handler = logging.StreamHandler()
handler.addFilter(ContextVarFilter())
handler.setFormatter(formatter)
if not logger.handlers:
    logger.addHandler(handler)
####


class MonitoringBackend:
    def __init__(self, client_websocket):
        self.client_ws = client_websocket
        self.tasks = []
        self.images = []
        self.analysis_tasks = {}
        self.monitoring = False
        self.language = 'English'
        self.max_analysis_tasks = 3 # Max number of concurrent analysis tasks
        self.analysis_length = 60   # Analyize past 60 secs
        self.analysis_interval = 15 # Analyize every 15 secs
        logger.info(f'client connected: {client_websocket.client}')

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
- Output in {self.language}.
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


    def is_client_alive(self):
        if (self.client_ws
            and self.client_ws.client_state is WebSocketState.CONNECTED):
            return True
        return False


    def cancel_analysis_tasks(self):
        for task_id in self.analysis_tasks.keys():
            self.analysis_tasks[task_id].cancel()


    async def analyze_images(self, task_id, images):
        logger.info('analyzing images.')
        try:
            images = [part for part in images if part is not None]
            loop = asyncio.get_running_loop()
            # Run in the process pool to avoid blocking other threads.
            result = await loop.run_in_executor(
                    None, self._analyze_images, images
            )
            ts_format = '%Y-%m-%d %H:%M:%S'
            result['timestamp'] = datetime.datetime.now().strftime(ts_format)
            logger.info(f'analysis result: {result}')
            await self.send_message_to_client(result)
        except Exception as e:
            logger.error(f'failed to analyze images: {e}')
        finally:
            self.analysis_tasks.pop(task_id)


    def process_message(self, message):
        if 'type' not in message.keys():
            return
        # Text message
        if message['type'] == 'text':
            command = message['data']

            if command.startswith('language:'):
                self.language = command.split(':')[-1]
                logger.info(f'set language: {self.language}')

            if command == 'monitoring on':
                logger.info('start monitoring.')
                self.monitoring = True
                # Pad past images so that next analysis will happen
                # right after analysis_interval secs. This is only for demo.
                pad_length = self.analysis_length-self.analysis_interval
                self.images = ([None] * pad_length) + self.images
                self.images = self.images[-pad_length:]

            if command == 'monitoring off':
                logger.info('stop monitoring.')
                self.monitoring = False
                self.cancel_analysis_tasks()

            return

        # Video frames
        if message['type'] == 'image':
            data = message['data']
            mime_type = message['mime_type']
            if not mime_type.startswith('image/'):
                return
            self.images.append(
                Part.from_bytes(
                    data=data,
                    mime_type=mime_type,
                )
            )
            logger.debug(f'number of received images: {len(self.images)}')
            if len(self.images) >= self.analysis_length:
                image_parts = copy.deepcopy(self.images)
                # drop the first self.analysis_interval frames.
                self.images = self.images[self.analysis_interval:]
                concurrent_tasks = len(self.analysis_tasks)
                if concurrent_tasks >= self.max_analysis_tasks:
                    logger.warn(f'Too many tasks: {concurrent_tasks}. Skip analysis task.')
                    return
                if self.monitoring:
                    task_id = uuid.uuid4().hex
                    self.analysis_tasks[task_id] = asyncio.create_task(
                        self.analyze_images(task_id, image_parts)
                    )
                    concurrent_tasks = len(self.analysis_tasks)
                    logger.info(f'number of running analysis tasks: {concurrent_tasks}')


    async def handle_client_messages(self):
        error_count = 0
        while True:
            try:
                async for _message in self.client_ws.iter_text():
                    message = json.loads(_message)
                    self.process_message(message)
                    error_count = 0
            except Exception as e:
                if not self.is_client_alive():
                    logger.info('client disconnected.')
                    break
                logger.error(f'failed receiving from client: {e}')
                error_count += 1
                if error_count > 4:
                    break


    async def send_message_to_client(self, message):
        try:
            await self.client_ws.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f'failed sending to client: {e}')
            if self.client_ws.client_state is WebSocketState.DISCONNECTED:
               logger.info('client closed.')


    async def run(self, session_id):
        try:
            session_id_var.set(session_id)
            self.tasks = [
               asyncio.create_task(self.handle_client_messages()),
            ]
            await asyncio.gather(*self.tasks)
            self.cancel_analysis_tasks()
        except Exception as e:
            logger.error(f'exception in backend handler: {e}')


app = FastAPI()


# Cloud Run health-check
@app.get('/')
async def read_root():
    return {'status': 'ok'}


def set_timer(delay, coro_func, *args):
    loop = asyncio.get_running_loop()

    def callback():
        coro = coro_func(*args)
        asyncio.run_coroutine_threadsafe(coro, loop)

    timer = threading.Timer(delay, callback)
    timer.start()
    return timer


def verify_id_token(id_token):
    logger.info(f'id token {id_token}')
    try:
        firebase_admin.initialize_app()
    except ValueError as err:
        if 'already exists' not in str(err):
            logger.error(f'Firebase initialization error: {err}')

    try:
        decoded_token = auth.verify_id_token(id_token)
        logger.info(decoded_token)
        return decoded_token
    except Exception as e:
        logger.info(f'auth error {e}')
        return None


async def auth_id_token(websocket):
    close_timer = set_timer(5, websocket.close)
    try:
        async for _message in websocket.iter_text():
            message = json.loads(_message)
            if message['type'] != 'token':
                continue
            if verify_id_token(message['data']):
                close_timer.cancel()
                return True
        return False
    except websockets.exceptions.ConnectionClosed:
        return False
    except Exception as e:
        logger.error(f'error on token verification: {e}');
        return False


@app.websocket('/ws')
async def monitoring_endpoint(websocket: WebSocket):
    try:
        await websocket.accept()
        if not await auth_id_token(websocket):
            logger.info('authentication failed.')
            return
        session_id = str(uuid.uuid4())[:8]
        backend = MonitoringBackend(websocket)
        await backend.run(session_id)
    except Exception as e:
        logger.error(f'error on monitoring backend: {e}');
    finally:
        if (websocket.application_state != WebSocketState.DISCONNECTED and
            websocket.client_state != WebSocketState.DISCONNECTED):
            await websocket.close()


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(
        'main:app', host='localhost', port=8080,
        reload=True, log_level='info'
    )
