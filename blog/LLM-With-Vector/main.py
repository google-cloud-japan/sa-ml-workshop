import os
from flask import Flask, request
from langchain.vectorstores import MatchingEngine
from langchain.llms import VertexAI
from langchain.embeddings import VertexAIEmbeddings
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain.agents import initialize_agent, Tool
from langchain.agents import AgentType
from langchain.schema.language_model import BaseLanguageModel

# Constants
projectid = os.environ.get("PROJECT_ID")
region = os.environ.get("REGION")
me_gcs = os.environ.get("GCS_BUTCKET")
index_id = os.environ.get("INDEX_ID")
endpoint_id = os.environ.get("ENDPOINT_ID")

__vector_store = MatchingEngine.from_components(
    embedding=VertexAIEmbeddings(),
    project_id=projectid,
    region=region,
    gcs_bucket_name=me_gcs,
    index_id=index_id,
    endpoint_id=endpoint_id
)

__retriever_prompt_template = """Only using the descriptions, please exact the product_name and the product_url.

Description: {context}

Begin!!

ProductName And ProductURL: 
"""
_retriever_prompt = PromptTemplate(
    input_variables=['context'], template=__retriever_prompt_template)

__query_prompt = """You are a recommendation system that introduces the product that best matches the user's request. 
You must output both of the product's URL and name. The user's request is enclosed in the backquotes (```).

URL: $PRODUCT_URL
NAME: $PRODUCT_NAME

Begin!!!

Request: ```{}```
"""

# Util functions
def generate_query(request: str) -> str:
    return __query_prompt.format(request)

def generate_matchingengine_chain(llm: BaseLanguageModel, prompt: PromptTemplate) -> RetrievalQA:
    retriever = __vector_store.as_retriever(
        search_kwargs={"include_metadata": True})
    return RetrievalQA.from_llm(llm, prompt, retriever=retriever)

app = Flask(__name__)


@app.route("/predict", methods=["POST"])
def predict():
    payload = request.get_json()
    if not payload["text"]:
        return "not found"
    text = payload["text"]
    toy_search = generate_matchingengine_chain(llm=VertexAI(
        temperature=0.2, max_output_tokens=1024), prompt=_retriever_prompt)
    agent_llm = VertexAI(temperature=0.2, max_output_tokens=1024)
    tools = [
        Tool(
            name="Retail Toy QA System",
            func=toy_search.run,
            description="useful for when you need to answer questions about the toys. Input should be comma-separated words, do not input a fully formed question.",
        ),
    ]
    agent = initialize_agent(
        tools, llm=agent_llm, agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION, verbose=True)
    return agent.run(text)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
