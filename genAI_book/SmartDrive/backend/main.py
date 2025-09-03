import os
import tempfile
from cloudevents.http import from_http
from flask import Flask, request
from google.cloud import storage
from langchain_community.document_loaders import PyPDFLoader
from langchain_google_vertexai import VertexAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains.question_answering import load_qa_chain
from langchain.chains import AnalyzeDocumentChain

storage_client = storage.Client()
llm = VertexAI(
    model_name='gemini-2.5-flash-lite', location='us-central1',
    temperature=0.1, max_output_tokens=1024)
app = Flask(__name__)

# This is to preload the tokenizer module
qa_chain = load_qa_chain(llm, chain_type='map_reduce')
qa_document_chain = AnalyzeDocumentChain(combine_docs_chain=qa_chain)
_ = qa_document_chain.invoke(
        {'input_document': 'I am feeling good.', 'question': 'How are you?'})


def download_from_gcs(bucket_name, filepath, filename):
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(filepath)
    blob.download_to_filename(filename)


def upload_to_gcs(bucket_name, filepath, filename):
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(filepath)
    blob.upload_from_filename(filename)


# This handler is triggered by storage events
@app.route('/api/post', methods=['POST'])
def process_event():
    event = from_http(request.headers, request.data)
    event_id = event['id']
    bucket_name = event.data['bucket']
    filepath = event.data['name']
    filesize = int(event.data['size'])
    content_type = event.data['contentType']
    print('{} - Uploaded file: {}'.format(event_id, filepath))

    # Check if the file is pdf
    if content_type != 'application/pdf':
        print('{} - {} is not a pdf file.'.format(event_id, filepath))
        return ('This is not a pdf file.', 200)

    # Limit the file size <= 10MB
    if filesize > 1024*1024*10:
        print('{} - {} is too large.'.format(event_id, filepath))
        return ('File is too large.', 200)

    # Construct a new filename for summary text
    directory = os.path.dirname(filepath)
    filename = os.path.basename(filepath)
    filename_body, _ = os.path.splitext(filename)
    new_filepath = os.path.join(
        directory, 'summary', filename_body + '.txt')

    # Generate a summary of pdf
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            local_filepath = os.path.join(temp_dir, filename)
            download_from_gcs(bucket_name, filepath, local_filepath)
            pages = PyPDFLoader(local_filepath).load()
            document = ''
            for page in pages[:20]: # Limit the number of page
                document += page.page_content
    except Exception as e:
        print('{} - {} is not accessible.'.format(event_id, filepath))
        print('Error message: {}'.format(e))
        return ('File is not accessible.', 200)

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=6000, chunk_overlap=200)
    qa_chain = load_qa_chain(llm, chain_type='map_reduce')
    qa_document_chain = AnalyzeDocumentChain(
        combine_docs_chain=qa_chain, text_splitter=text_splitter)

    prompt = '何についての文書ですか？日本語で200字程度にまとめて教えてください。'
    description = qa_document_chain.invoke(
        {'input_document': document, 'question': prompt})['output_text'].replace('FINAL ANSWER: ', '')

    print('{} - Description of {}: {}'.format(event_id, filename, description))
    with tempfile.NamedTemporaryFile() as tmp_file:
        with open(tmp_file.name, 'w') as f:
            f.write(description)
        upload_to_gcs(bucket_name, new_filepath, tmp_file.name)

    return ('Succeeded.', 200)
