import json
import os

from flask import Flask, request
from vertexai.preview.language_models import TextGenerationModel

generation_model = TextGenerationModel.from_pretrained("text-bison@001")


app = Flask(__name__)


@app.route('/')
def index():
    return 'GenAI grammar correction service.'


def get_response(prompt):
    answer = generation_model.predict(
      prompt, temperature=0.2, max_output_tokens=1024, top_k=40, top_p=0.8
    ).text
    return answer


@app.route('/grammar-service/api/v1/correction', methods=['POST'])
def grammar_correction():
    json_data = request.get_json()
    text = json_data['text']
    text = ' '.join(text.splitlines())

    prompt = """
convert the following text into grammatically correct one.
text: {}
""".format(text)
    corrected = get_response(prompt)

    prompt = """
convert the following text into three examples of more sophisticated and grammatically correct texts written by a professional writer. Here's an example.

text: I went to school yesterday. I ate an apple for lunch. I like to eat apples.
answer:
- Yesterday, I went to school and had an apple for lunch. I enjoy eating apples.
- I enjoyed a delicious apple for lunch yesterday at school.
- Yesterday, I had the pleasure of enjoying an apple for lunch at school.

Here's the text I want your answer to.

text: {}
answer:    
""".format(text)
    samples = get_response(prompt)

    resp = {
        'corrected': corrected,
        'samples': samples
    }

    return resp, 200


if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
