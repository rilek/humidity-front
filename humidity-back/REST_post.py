# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from flask import Flask
from flask import jsonify
from flask import request
import numpy as np

app = Flask(__name__)

# base settings
User = 'harnas'
Passw = 'wojciech'
Hostt = '51.15.87.74'
dtbs = 'humidity'
port = '5432'

# global measurments
humidity = 0.0
temperture = 0.0

quarks = [{'humid': '0.0'},
          {'temp': '0.0'}]

@app.route('/', methods=['GET'])
def hello_world():
    return jsonify({'message' : 'Humidity system @HILERCompany'})

@app.route('/quarks', methods=['GET'])
def returnAll():
    return jsonify({'quarks' : quarks})

@app.route('/quarks', methods=['POST'])
def addOne():
    global humidity, temperture

    new_quark = request.get_json()

    print("new_quark:")
    print(format(new_quark))

    np_new_quark = np.array(new_quark)

    humid_json = np_new_quark[0]
    temp_json = np_new_quark[1]

    humidity = float(humid_json['humid'])
    temperture = float(temp_json['temp'])

    return jsonify(200)

def connector():
    global User, Passw, Hostt, dtbs, base, connect
    try:
        connect = pymysql.connect(host=Hostt, user=User, password=Passw, db=dtbs)
        base = connect.cursor
    except:
        print("Error database connection !")
        sleep(1)
        connector()

def content_send(content_name):
    global base

    if content_name == "":
        base.execute("INSERT ")

    elif content_name == "":
        base.execute("")

    elif content_name == "":
        base.execute("")


if __name__ == "__main__":
    try:
        connect = pymysql.connect(host=Hostt, user=User, password=Passw, db=dtbs)
        base = connect.cursor
    except:
        connector()

    app.run(host='localhost', port= 8181, debug=True)