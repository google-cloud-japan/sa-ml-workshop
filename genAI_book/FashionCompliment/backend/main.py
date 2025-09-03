import base64
import json
import os
from PIL import Image
from io import BytesIO
from flask import Flask, request
from google import genai, auth
from google.genai.types import Part, Content
import vertexai

_, PROJECT_ID = auth.default()
vertexai.init(project=PROJECT_ID, location='us-central1')
client = genai.Client(vertexai=True, project=PROJECT_ID, location='us-central1')

app = Flask(__name__)


def get_compliment_message(image):
    instruction = '''
ファッションアドバイザーの立場で、画像に含まれる人物を褒め称える文章を作ってください。
ファッションアイテムに言及しながら、その人物に語りかける様に、数行の文章を作ってください。
個人を特定する名前は使用しないでください。
'''
    img_byte = BytesIO()
    image.save(img_byte, format='PNG')
    parts = [
        Part(text='[image]'),
        Part.from_bytes(data=img_byte.getvalue(), mime_type='image/png')
    ]
    contents = [Content(role='user', parts=parts)]

    response = client.models.generate_content(
        model='gemini-2.5-flash-lite',
        contents=contents,
        config=genai.types.GenerateContentConfig(
            system_instruction=instruction,
            temperature=0.2, max_output_tokens=1024
        )
    )
    return response.candidates[0].content.parts[-1].text


@app.route('/api/compliment', methods=['POST'])
def fashion_compliment():
    json_data = request.get_json()
    image_base64 = json_data['image']
    image_data = base64.b64decode(image_base64)
    image = Image.open(io.BytesIO(image_data))

    message = get_compliment_message(image)
    resp = {'message': message}

    return resp, 200
