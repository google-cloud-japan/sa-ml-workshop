import base64
import json
import os

from flask import Flask, request
from vertexai.preview.language_models import TextGenerationModel
from vertexai.preview.vision_models import ImageQnAModel, ImageCaptioningModel, Image

generation_model = TextGenerationModel.from_pretrained('text-bison@001')
image_captioning_model = ImageCaptioningModel.from_pretrained('imagetext@001')
image_qna_model = ImageQnAModel.from_pretrained('imagetext@001')


app = Flask(__name__)


@app.route('/')
def index():
    return 'GenAI fashion compliment service.'

def get_image_description(image):
    results = image_captioning_model.get_captions(
        image=image,
        number_of_results=3)
    results.sort(key=len)
    return results[-1]


def get_fashion_items(image):
    results = image_qna_model.ask_question(
      image=image,
      question='details of the fashion items in this picture.',
      number_of_results=3)
    results.sort(key=len)
    return results[-1]


def get_compliment_message(image):
    prompt = '''\
ファッションアドバイザーの立場で、以下の様に記述される人物を褒め称える文章を作ってください。
その人物に語りかける様に、数行の文章を作ってください。
個人を特定する名前は使用しないでください。

記述：{}

ファッションアイテム：{}
'''

    description = get_image_description(image)
    items = get_fashion_items(image)
    answer = generation_model.predict(
        prompt.format(description, items),
        temperature=0.2, max_output_tokens=1024,
        top_k=40, top_p=0.8).text
    return answer 


@app.route('/fashion-compliment-service/api/v1/get-compliment', methods=['POST'])
def fashion_compliment():
    json_data = request.get_json()
    image_base64 = json_data['image']
    image = Image(base64.b64decode(image_base64))
    message = get_compliment_message(image)
    resp = {'message': message}

    return resp, 200


if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))