# Post must send json structure like: {'humid': humidity, 'temp': temperature, 'ts': time.time()}

# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/humidity', methods=['POST'])

def humidity_post():
    print (request.is_json)
    content = request.get_json()
    print (content)

app.run(host='51.15.87.74', port= 5432)



