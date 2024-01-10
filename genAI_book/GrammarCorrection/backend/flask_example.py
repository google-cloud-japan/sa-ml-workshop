import json
import os
from flask import Flask, request

app = Flask(__name__)

@app.route('/api/hello', methods=['POST'])
def hello_service():
    json_data = request.get_json()
    name = json_data['name']
    resp = { 'message': 'Hello, {}!'.format(name) }
    return resp, 200
