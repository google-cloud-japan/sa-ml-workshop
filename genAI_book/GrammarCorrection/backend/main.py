import json
import os
import vertexai
from flask import Flask, request
from vertexai import generative_models

vertexai.init(location='asia-northeast1')
generation_model = generative_models.GenerativeModel('gemini-1.5-flash-001')
app = Flask(__name__)


def get_response(prompt, temperature=0.2):
    response = generation_model.generate_content(
        prompt, generation_config={'temperature': temperature, 'max_output_tokens': 1024})
    return response.text.lstrip()


@app.route('/api/correction', methods=['POST'])
def grammar_correction():
    json_data = request.get_json()
    text = json_data['text']
    # Join multiple lines into a single line
    text = ' '.join(text.splitlines())

    prompt = '''\
「text:」以下の英文を正しい英文法の文章に書き直してください。
書き直した文章のみを出力すること。

text: {}
'''.format(text)
    corrected = get_response(prompt)

    prompt = '''\
「text:」以下の英文をより自然で洗練された英文に書き直した例を３つ示してください。書き直した文章のみを出力すること。

text: I went to school yesterday. I ate an apple for lunch. I like eat apple.
answer:
- I went to school yesterday. I had an apple for lunch. I love apples.
- Yesterday, I went to school. I had an apple for lunch. I really enjoy eating apples.
- Yesterday, I went to school. I had an apple for lunch. Apples are my favorite fruit.

次が本当の質問です。これに回答してください。
text: {}
answer:
'''.format(text)
    samples = get_response(prompt, temperature=0.4)

    resp = {
        'corrected': corrected,
        'samples': samples
    }

    return resp, 200
