import json
import uuid
import os
import logging
from typing import Any, AsyncIterable, Optional, Dict
from urllib.parse import urlparse
from dotenv import load_dotenv

# Third-party imports
import vertexai
from google.genai import types as genai_types
import uvicorn

# Google ADK imports
from google.adk.agents.llm_agent import LlmAgent # Needed for type hinting AdkAgent
from google.adk.artifacts import InMemoryArtifactService
from google.adk.memory.in_memory_memory_service import InMemoryMemoryService
from google.adk.sessions.in_memory_session_service import InMemorySessionService
from google.adk.runners import Runner

# A2A server imports
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.server.tasks import TaskUpdater, InMemoryTaskStore
from a2a.types import (
    DataPart,
    Part,
    Task,
    TaskState,
    TextPart,
    UnsupportedOperationError,
    AgentCapabilities,
    AgentCard,
    AgentSkill,
)
from a2a.utils import (
    new_agent_parts_message,
    new_agent_text_message,
    new_task,
)
from a2a.utils.errors import ServerError
from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler

# --- Configuration ---
load_dotenv('.env')
PROJECT_ID = os.getenv('PROJECT_ID')
LOCATION = os.getenv('LOCATION')
AGENT_URL = os.getenv('AGENT_URL')
APP_NAME = os.getenv('APP_NAME', 'default_app')

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AdkAgent:
    """
    A wrapper class for an ADK LlmAgent to provide a remote interaction interface.
    """
    SUPPORTED_CONTENT_TYPES = ['text', 'text/plain']

    def __init__(self, agent: LlmAgent, app_name: str):
        self._app_name = app_name
        self._agent = agent

        self._runner = Runner(
            app_name=self._app_name,
            agent=self._agent,
            artifact_service=InMemoryArtifactService(),
            session_service=InMemorySessionService(),
            memory_service=InMemoryMemoryService(),
        )

    # To map context_id with a unique session_id, we use context_id as user_id of the session 
    async def _upsert_session(self, user_id: str):
        sessions = self._runner.session_service.list_sessions(
            app_name=self._app_name,
            user_id=user_id,
        )
        if sessions.sessions:
            session = sessions.sessions[0]
            return session
        session = self._runner.session_service.create_session(
            app_name=self._app_name,
            user_id=user_id,
        )
        return session

    async def stream(
        self, updater, context_id: str, query: str
    ) -> AsyncIterable[Dict[str, Any]]:
        content = genai_types.Content(
            role='user', parts=[genai_types.Part.from_text(text=query)]
        )
        session = await self._upsert_session(context_id)
        async_events = self._runner.run_async(
            user_id=context_id,
            session_id=session.id,
            new_message=content,
        )
        
        async for event in async_events:
            parts = convert_genai_parts_to_a2a(event.content.parts)
            if event.is_final_response():
                updater.add_artifact(parts)
                updater.complete()
                break
            else:
                updater.new_agent_message(parts)
                updater.complete()


class AdkAgentExecutor(AgentExecutor):
    """
    A2A AgentExecutor implementation that uses the AdkAgent.
    """
    def __init__(self, adk_agent: AdkAgent):
        """
        Initializes the AdkAgentExecutor.

        Args:
            adk_agent: An instance of the AdkAgent.
        """
        self.adk_agent = adk_agent
        logger.info('AdkAgentExecutor initialized.')

    async def cancel(
        self, request: RequestContext, event_queue: EventQueue
    ) -> Optional[Task]:
        logger.warning('Cancel operation called but is not supported.')
        raise ServerError(error=UnsupportedOperationError('Cancel operation is not supported.'))

    async def execute(
        self,
        context: RequestContext,
        event_queue: EventQueue,
    ) -> None:
        updater = TaskUpdater(event_queue, context.task_id, context.context_id)
        if not context.current_task:
            updater.submit()
        updater.start_work()

        context_id = context.context_id
        query = context.get_user_input()

        await self.adk_agent.stream(updater, context_id, query)


def convert_genai_parts_to_a2a(parts: list[genai_types.Part]) -> list[Part]:
    """Convert a list of Google Gen AI Part types into a list of A2A Part types."""
    return [
        convert_genai_part_to_a2a(part)
        for part in parts
        if (part.text or part.file_data or part.inline_data)
    ]


def convert_genai_part_to_a2a(part: genai_types.Part) -> Part:
    """Convert a single Google Gen AI Part type into an A2A Part type."""
    if part.text:
        return TextPart(text=part.text)
    if part.file_data:
        return FilePart(
            file=FileWithUri(
                uri=part.file_data.file_uri,
                mime_type=part.file_data.mime_type,
            )
        )
    if part.inline_data:
        return Part(
            root=FilePart(
                file=FileWithBytes(
                    bytes=part.inline_data.data,
                    mime_type=part.inline_data.mime_type,
                )
            )
        )
    raise ValueError(f'Unsupported part type: {part}')


def create_agent_card(
    base_url: str,
    supported_content_types: list[str],
    agent_name: str,
    agent_description: str,
) -> AgentCard:
    """Creates the AgentCard for the A2A server."""
    capabilities = AgentCapabilities(streaming=True)
    skill = AgentSkill(
        id=f'{agent_name.lower().replace(' ', '_')}_skill',
        name=f'{agent_name} Skill',
        description=agent_description,
        tags=[tag.strip() for tag in agent_name.lower().split()],
        examples=[f'Interact with {agent_name}'],
    )
    return AgentCard(
        name=agent_name,
        description=agent_description,
        url=base_url,
        version='1.0.0',
        defaultInputModes=supported_content_types,
        defaultOutputModes=supported_content_types,
        capabilities=capabilities,
        skills=[skill],
    )


def run_server(
    agent_instance: LlmAgent,
    app_name, host: str = 'localhost',
    port: int = 10002,
):
    """
    Sets up and runs the A2A Starlette application server for a given agent.
    """
    try:
        # Wrap the imported ADK agent with our AdkAgent
        adk_agent = AdkAgent(agent=agent_instance, app_name=app_name)

        agent_card = create_agent_card(
            base_url=f'http://{host}:{port}/',
            supported_content_types=AdkAgent.SUPPORTED_CONTENT_TYPES,
            agent_name=agent_instance.name.replace('_', ' ').title(), 
            agent_description=agent_instance.description
        )
        
        request_handler = DefaultRequestHandler(
            agent_executor=AdkAgentExecutor(adk_agent),
            task_store=InMemoryTaskStore(),
        )
        
        server_app = A2AStarletteApplication(
            agent_card=agent_card, http_handler=request_handler
        )
        
        logger.info(f"Starting server for agent '{agent_instance.name}' on {host}:{port}")
        uvicorn.run(server_app.build(), host=host, port=port)

    except Exception as e:
        logger.error(f'An error occurred during server setup or runtime: {e}')
        raise


if __name__ == '__main__':
    # Import your custom agent(s)
    from adk_agents import search_agent

    parsed_url = urlparse(AGENT_URL)
    host = parsed_url.hostname
    port = parsed_url.port

    run_server(
        agent_instance=search_agent,
        app_name=APP_NAME,
        host=host,
        port=port,
    )
