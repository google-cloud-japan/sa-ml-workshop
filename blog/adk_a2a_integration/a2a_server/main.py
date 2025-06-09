import os
import vertexai
from vertexai import agent_engines

from a2a.server.agent_execution import AgentExecutor
from a2a.server.tasks import TaskUpdater, InMemoryTaskStore
from a2a.types import (
    Task, TextPart, UnsupportedOperationError,
    AgentCapabilities, AgentCard, AgentSkill,
)
from a2a.utils.errors import ServerError
from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler

PROJECT_ID = os.environ['PROJECT_ID']
LOCATION = os.environ['REGION']
AGENT_ID = os.environ['AGENT_ID']
SERVICE_URL = os.environ['SERVICE_URL']

vertexai.init(project=PROJECT_ID, location=LOCATION)


class AdkAgent:
    SUPPORTED_CONTENT_TYPES = ['text', 'text/plain']

    def __init__(self, remote_agent):
        self._remote_agent = remote_agent

    # To map context_id to a unique session_id, we use context_id as user_id (instead of session_id itself) of the session.
    # It's because some session services (ex. VertexAiSessionService) don't accept an arbitrary session ID string.
    def _upsert_session(self, user_id):
        sessions_list = self._remote_agent.list_sessions(user_id=user_id)
        if sessions_list['sessions']:
            session = sessions_list['sessions'][0]
            return session
        session = self._remote_agent.create_session(user_id=user_id)
        sessions_list = self._remote_agent.list_sessions(user_id=user_id)
        return session

    async def stream(self, updater, context_id, query):
        session = self._upsert_session(context_id)
        events = self._remote_agent.stream_query(
            user_id='default_user',
            session_id=session['id'],
            message=query,
        )
        text_parts = []        
        for event in events:
            if text_parts: # not a last part
                updater.new_agent_message(text_parts)
            text_parts = []
            if 'content' in event and 'parts' in event['content']:
                for part in event['content']['parts']:
                    if 'text' in part:
                        text_parts.append(TextPart(text=part['text']))
        # treat last part as an artifact
        updater.add_artifact(text_parts)
        updater.complete()


class AdkAgentExecutor(AgentExecutor):
    def __init__(self, adk_agent: AdkAgent):
        self.adk_agent = adk_agent

    async def cancel(self, request, event_queue):
        raise ServerError(error=UnsupportedOperationError('Cancel operation is not supported.'))

    async def execute(self, context, event_queue):
        updater = TaskUpdater(event_queue, context.task_id, context.context_id)
        if not context.current_task:
            updater.submit()
        updater.start_work()

        context_id = context.context_id
        query = context.get_user_input()
        await self.adk_agent.stream(updater, context_id, query)


def create_agent_card(
    base_url, supported_content_types, agent_name, agent_description):
    
    capabilities = AgentCapabilities(streaming=True)
    skill = AgentSkill(
        id=f"{agent_name.lower().replace(' ', '_')}_skill",
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


remote_agent = agent_engines.get(AGENT_ID)
adk_agent = AdkAgent(remote_agent=remote_agent)

agent_card = create_agent_card(
    base_url=SERVICE_URL,
    supported_content_types=AdkAgent.SUPPORTED_CONTENT_TYPES,
    agent_name=remote_agent.name,
    agent_description=remote_agent.name,
)
    
request_handler = DefaultRequestHandler(
    agent_executor=AdkAgentExecutor(adk_agent),
    task_store=InMemoryTaskStore(),
)

server_app_builder = A2AStarletteApplication(
    agent_card=agent_card, http_handler=request_handler
)

app = server_app_builder.build()
