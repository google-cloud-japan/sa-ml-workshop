import base64
import json
import os
import vertexai
from flask import Flask, request
from vertexai.preview.language_models import TextGenerationModel
from vertexai.preview.vision_models import Image
from vertexai.preview.vision_models import ImageCaptioningModel
from vertexai.preview.vision_models import ImageQnAModel

vertexai.init(location='asia-northeast1')
generation_model = TextGenerationModel.from_pretrained('text-bison@002')
image_captioning_model = ImageCaptioningModel.from_pretrained('imagetext@001')
image_qna_model = ImageQnAModel.from_pretrained('imagetext@001')

app = Flask(__name__)


def get_image_description(image):
    try:
        results = image_captioning_model.get_captions(
            image=image, number_of_results=3)
        results.sort(key=len)
        return results[-1]
    except:
        return None


def get_fashion_items(image):
    try:
        results = image_qna_model.ask_question(
            image=image,
            question='details of the fashion items in the picture.',
            number_of_results=3)
        results.sort(key=len)
        return results[-1]
    except:
        return None


def get_compliment_message(image):
    prompt = '''\
ファッションアドバイザーの立場で、以下の様に記述される人物を褒め称える文章を作ってください。
ファッションアイテムに言及しながら、その人物に語りかける様に、数行の文章を作ってください。
個人を特定する名前は使用しないでください。

記述：{}

ファッションアイテム：{}
'''
    description = get_image_description(image)
    items = get_fashion_items(image)

    if description is None or items is None:
        return '他の画像をアップロードしてください。'

    response = generation_model.predict(
        prompt.format(description, items),
        temperature=0.2, max_output_tokens=1024)
    return response.text.lstrip()


@app.route('/api/compliment', methods=['POST'])
def fashion_compliment():
    json_data = request.get_json()
    image_base64 = json_data['image']
    image = Image(base64.b64decode(image_base64))
    message = get_compliment_message(image)
    resp = {'message': message}

    return resp, 200
