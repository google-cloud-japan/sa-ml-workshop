import os, sys
import vertexai
from dotenv import load_dotenv
from google.adk.agents.llm_agent import LlmAgent
from google.adk.tools import google_search
from vertexai import agent_engines

PROJECT_ID = os.getenv('PROJECT_ID')
LOCATION = os.getenv('REGION')

vertexai.init(
    project=PROJECT_ID,
    location=LOCATION,
    staging_bucket=f'gs://{PROJECT_ID}'
)

instruction = '''
You are a friendly AI assistant that answers user's queries.
Use google_search to give answers based on the latest and objective information.

[Format instruction]
Output in Japanese, in plain text only.
Avoid adding citation marks such as [1][2].
'''

search_agent = LlmAgent(
    name='search_agent',
    model='gemini-2.0-flash-001',
    description='Agent to answer questions using Google Search.',
    instruction=instruction,
    tools=[google_search]
)

for agent in agent_engines.list():
    if agent.display_name == 'search_agent':
        sys.exit(0)

remote_agent = agent_engines.create(
    agent_engine=search_agent,
    display_name='search_agent',
    requirements=[
        'google-adk==1.2.1',
    ]
)
