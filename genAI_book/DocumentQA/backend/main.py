import json
import os
import sqlalchemy
import tempfile
import google.auth
from cloudevents.http import from_http
from flask import Flask, request
from google.cloud import storage
from google.cloud.sql.connector import Connector
from langchain_community.document_loaders import PyPDFLoader
from langchain_google_vertexai.embeddings import VertexAIEmbeddings
from langchain_google_vertexai import VertexAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains.question_answering import load_qa_chain
from langchain.chains import AnalyzeDocumentChain

storage_client = storage.Client()
llm = VertexAI(
    model_name='text-bison@001',
    temperature=0.1, max_output_tokens=1024)
embeddings = VertexAIEmbeddings(
    model_name='textembedding-gecko-multilingual@001')
app = Flask(__name__)

# This is to preload the tokenizer module.
qa_chain = load_qa_chain(llm, chain_type='map_reduce')
qa_document_chain = AnalyzeDocumentChain(combine_docs_chain=qa_chain)
_ = qa_document_chain.invoke(
        {'input_document': 'I am feeling good.', 'question': 'How are you?'})

# Get environment variables
_, PROJECT_ID = google.auth.default()
DB_REGION = os.environ.get('DB_REGION', 'asia-northeast1')
DB_INSTANCE_NAME = os.environ.get('DB_INSTANCE_NAME', 'genai-app-db')
DB_USER = os.environ.get('DB_USER', 'db-admin')
DB_PASS = os.environ.get('DB_PASS', 'genai-db-admin')
DB_NAME = os.environ.get('DB_NAME', 'docs_db')

# Prepare connection pool
INSTANCE_CONNECTION_NAME = '{}:{}:{}'.format(
    PROJECT_ID, DB_REGION, DB_INSTANCE_NAME)

connector = Connector()

def getconn():
    conn = connector.connect(
        INSTANCE_CONNECTION_NAME, 'pg8000',
        user=DB_USER, password=DB_PASS, db=DB_NAME)
    return conn

pool = sqlalchemy.create_engine('postgresql+pg8000://', creator=getconn)


def download_from_gcs(bucket_name, filepath, filename):
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(filepath)
    blob.download_to_filename(filename)


def upload_to_gcs(bucket_name, filepath, filename):
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(filepath)
    blob.upload_from_filename(filename)


def delete_doc(docid):
    with pool.connect() as db_conn:
        delete_stmt = sqlalchemy.text(
            'DELETE FROM docs_embeddings WHERE docid=:docid;'
        )
        parameters = {'docid': docid}
        db_conn.execute(delete_stmt, parameters=parameters)
        db_conn.commit()


def insert_doc(docid, uid, filename, page, content, embedding_vector):
    with pool.connect() as db_conn:
        insert_stmt = sqlalchemy.text(
            'INSERT INTO docs_embeddings \
             (docid, uid, filename, page, content, embedding) \
             VALUES (:docid, :uid, :filename, :page, :content, :embedding);'
        )
        parameters = {
            'docid': docid,
            'uid': uid,
            'filename': filename,
            'page': page,
            'content': content,
            'embedding': embedding_vector
        }
        db_conn.execute(insert_stmt, parameters=parameters)
        db_conn.commit()


# This handler is triggered by storage events
@app.route('/api/post', methods=['POST'])
def process_event():
    event = from_http(request.headers, request.data)
    event_type = event['type']
    event_id = event['id']
    bucket_name = event.data['bucket']
    filepath = event.data['name']
    filesize = int(event.data['size'])
    content_type = event.data['contentType']
    print('{} - Target file: {}'.format(event_id, filepath))

    uid = filepath.split('/')[0]
    docid = '{}:{}/{}'.format(uid, bucket_name, filepath)

    # Check if the file is pdf.
    if content_type != 'application/pdf':
        print('{} - {} is not a pdf file.'.format(event_id, filepath))
        return ('This is not a pdf file.', 200)

    # Delete existing records
    delete_doc(docid)
    if event_type.split('.')[-1] == 'deleted':
        print('{} - Deleted DB records of {}.'.format(event_id, filepath))
        return ('Succeeded.', 200)

    # Limit the file size <= 10MB
    if filesize > 1024*1024*10:
        print('{} - {} is too large.'.format(event_id, filepath))
        return ('File is too large.', 200)

    # Store embedding vectores
    filename = os.path.basename(filepath)
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            local_filepath = os.path.join(temp_dir, filename)
            download_from_gcs(bucket_name, filepath, local_filepath)
            pages = PyPDFLoader(local_filepath).load()
    except Exception as e:
        print('{} - {} is not accessible. It may have been deleted.'.format(
            event_id, filepath))
        print('Error message: {}'.format(e))
        return ('File is not accessible.', 200)

    page_contents = [
        page.page_content.encode('utf-8').replace(b'\x00', b'').decode('utf-8')
        for page in pages]
    embedding_vectors = embeddings.embed_documents(page_contents, batch_size=10)
    for c, embedding_vector in enumerate(embedding_vectors):
        page = c+1
        insert_doc(docid, uid, filename, page,
                   page_contents[c], str(embedding_vector))

    print('{} - Processed {} pages of {}'.format(
        event_id, len(pages), filepath))

    return ('Succeeded.', 200)


@app.route('/api/question', methods=['POST'])
def answer_question():
    json_data = request.get_json()
    uid = json_data['uid']
    question = json_data['question']
    question_embedding = embeddings.embed_query(question)

    with pool.connect() as db_conn:
        search_stmt = sqlalchemy.text(
            'SELECT filename, page, content, \
                    1 - (embedding <=> :question) AS similarity \
             FROM docs_embeddings \
             WHERE uid=:uid \
             ORDER BY similarity DESC LIMIT 3;'
        )
        parameters = {'uid': uid, 'question': str(question_embedding)}
        results = db_conn.execute(search_stmt, parameters=parameters)

    text = ''
    source = []
    for filename, page, content, _ in results:
        source.append({'filename': filename, 'page': page})
        text += content + '\n'

    if len(source) == 0:
        answer = '回答に必要な情報がありませんでした。'
    else:
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=6000, chunk_overlap=200)
        qa_chain = load_qa_chain(llm, chain_type='refine')
        qa_document_chain = AnalyzeDocumentChain(
            combine_docs_chain=qa_chain, text_splitter=text_splitter)
        prompt = '{} 日本語で3文程度にまとめて教えてください。'.format(question)
        answer = qa_document_chain.invoke(
            {'input_document': text, 'question': prompt})['output_text']

    resp = {
        'answer': answer,
        'source': source
    }

    return resp, 200
