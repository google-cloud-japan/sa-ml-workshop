import os
import vertexai
from dotenv import load_dotenv
from google.adk.agents.llm_agent import LlmAgent
from google.adk.tools import google_search

load_dotenv('.env')

PROJECT_ID = os.getenv('PROJECT_ID')
LOCATION = os.getenv('LOCATION')

vertexai.init(project=PROJECT_ID, location=LOCATION)
os.environ['GOOGLE_CLOUD_PROJECT'] = PROJECT_ID
os.environ['GOOGLE_CLOUD_LOCATION'] = LOCATION
os.environ['GOOGLE_GENAI_USE_VERTEXAI'] = 'True'

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
