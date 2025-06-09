import os, sys
import vertexai
from dotenv import load_dotenv
from google.adk.agents.llm_agent import LlmAgent
from google.adk.tools import google_search
from vertexai import agent_engines

load_dotenv('.env')

PROJECT_ID = os.getenv('PROJECT_ID')
LOCATION = os.getenv('REGION')

vertexai.init(
    project=PROJECT_ID,
    location=LOCATION,
    staging_bucket=f'gs://{PROJECT_ID}'
)

for agent in agent_engines.list():
    if agent.display_name == 'search_agent':
        print(agent.name)
        break
