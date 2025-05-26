import os
from dotenv import load_dotenv

from google.adk.agents.callback_context import CallbackContext
from google.adk.tools.tool_context import ToolContext
from google.adk.models import LlmResponse, LlmRequest
from google.adk.agents.llm_agent import LlmAgent
from google.adk.tools import google_search
from google.genai.types import ModelContent, Part, FunctionCall
from .a2a_client import a2a_remote_call

load_dotenv('.env')
AGENT_URL = os.getenv('AGENT_URL') # A2A remote agent URL


async def call_a2a_agent(
    callback_context: CallbackContext, llm_request: LlmRequest
) -> ModelContent:
    last_user_message = []
    if llm_request.contents and llm_request.contents[-1].role == 'user':
         if llm_request.contents[-1].parts:
            for part in llm_request.contents[-1].parts:
                if part.text:
                   last_user_message.append(part.text)
    last_user_message = '\n'.join(last_user_message)

    context_id = callback_context._invocation_context.session.id
    parts = await a2a_remote_call(last_user_message, context_id, AGENT_URL)
    return LlmResponse(
        content=ModelContent(parts=parts) 
    )


root_agent = LlmAgent(
    name='search_agent_proxy',
    model='gemini-2.0-flash', # not used
    description='Agent to answer questions using Google Search.',
    before_model_callback=call_a2a_agent,
)
