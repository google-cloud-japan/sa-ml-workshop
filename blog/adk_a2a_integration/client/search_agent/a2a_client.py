import json
import httpx, traceback
from typing import Any
from uuid import uuid4

from google.genai.types import Part
from a2a.client import A2AClient
from a2a.types import MessageSendParams, SendStreamingMessageRequest


def create_send_message_payload(
    text: str,
    task_id: str | None = None,
    context_id: str | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        'message': {
            'role': 'user',
            'parts': [{'kind': 'text', 'text': text}],
            'messageId': uuid4().hex,
        },
    }

    if task_id:
        payload['message']['taskId'] = task_id

    if context_id:
        payload['message']['contextId'] = context_id
    return payload


def response_to_dict(response: Any) -> dict[str, Any]:
    if hasattr(response, 'root'):
        return json.loads(response.root.model_dump_json(exclude_none=True))
    else:
        return json.loads(response.model_dump(mode='json', exclude_none=True))


async def run_streaming(
    client: A2AClient,
    query: str,
    context_id: str,
) -> list[Part]:
    send_payload = create_send_message_payload(
        text=query,
        context_id=context_id,
    )
    request = SendStreamingMessageRequest(
        params=MessageSendParams(**send_payload)
    )
    stream_response = client.send_message_streaming(request)
    result = []
    async for chunk in stream_response:
        chunk = response_to_dict(chunk)
        if 'artifact' in chunk['result'] and 'parts' in chunk['result']['artifact']:
            text_messages = []
            for part in chunk['result']['artifact']['parts']:
                if 'text' in part:
                    text_messages.append(part['text'])
            result.append('\n'.join(text_messages))
    return [Part(text=text) for text in result]


async def a2a_remote_call(
    query: str,
    context_id: str,
    agent_url: str = 'http://localhost:10002',
) -> list[Part]:
    try:
        async with httpx.AsyncClient(timeout=100) as httpx_client:
            client = await A2AClient.get_client_from_agent_card_url(
                httpx_client, agent_url
            )
            result = await run_streaming(client, query, context_id)
            return result
    except Exception as e:
        traceback.print_exc()
        return [Part(text=f'An error occurred: {e}')]
