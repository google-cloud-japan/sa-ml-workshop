import os
import json
import httpx
from uuid import uuid4
from dotenv import load_dotenv

from google.adk.agents.callback_context import CallbackContext
from google.adk.tools.tool_context import ToolContext
from google.adk.models import LlmResponse, LlmRequest
from google.adk.agents.llm_agent import LlmAgent
from google.genai.types import Content, Part

from a2a.client import A2AClient
from a2a.types import MessageSendParams, SendStreamingMessageRequest
import google.auth.transport.requests
import google.oauth2.id_token 

load_dotenv('.env')
A2A_SERVER_URL = os.getenv('A2A_SERVER_URL') # A2A remote agent URL


async def a2a_remote_call(query, context_id):
    auth_req = google.auth.transport.requests.Request()
    id_token = google.oauth2.id_token.fetch_id_token(auth_req, A2A_SERVER_URL)
    headers = {
        'Authorization': f'Bearer {id_token}',
        'Content-Type': 'application/json'
    }
    payload = {
        'message': {
            'role': 'user',
            'parts': [{'kind': 'text', 'text': query}],
            'contextId': context_id,
            'messageId': uuid4().hex,
        },
    }
    request = SendStreamingMessageRequest(params=MessageSendParams(**payload))

    async with httpx.AsyncClient(headers=headers, timeout=100) as httpx_client:
        client = await A2AClient.get_client_from_agent_card_url(
            httpx_client, A2A_SERVER_URL
        )
        stream_response = client.send_message_streaming(request)
        result = []
        async for chunk in stream_response:
            chunk = json.loads(chunk.root.model_dump_json(exclude_none=True))
            if chunk['result']['kind'] == 'artifact-update':
                text_messages = []
                for part in chunk['result']['artifact']['parts']:
                    if 'text' in part:
                        text_messages.append(part['text'])
                result.append(Part(text='\n'.join(text_messages)))
    
    return result


async def call_a2a_agent(
    callback_context: CallbackContext, llm_request: LlmRequest
) -> Content:
    last_user_message = []
    if llm_request.contents and llm_request.contents[-1].role == 'user':
         if llm_request.contents[-1].parts:
            for part in llm_request.contents[-1].parts:
                if part.text:
                   last_user_message.append(part.text)
    last_user_message = '\n'.join(last_user_message)

    context_id = callback_context._invocation_context.session.id
    parts = await a2a_remote_call(last_user_message, context_id)
    return LlmResponse(
        content=Content(role='model', parts=parts) 
    )


root_agent = LlmAgent(
    name='search_agent_proxy',
    model='gemini-2.0-flash', # not used
    description='Agent to answer questions using Google Search.',
    before_model_callback=call_a2a_agent,
)
