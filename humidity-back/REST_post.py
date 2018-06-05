# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from flask import Flask
from flask import jsonify
from flask import request
import numpy as np
import psycopg2

app = Flask(__name__)

# id sensor

sensor_id = 0

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
    if humidity > 0.0 and humidity < 100.0 :
      content_send(humidity, temperture)
      return jsonify(200)
    else:
      print("Valid humidity!")
      return jsonify(500)

def connector():
    global User, Passw, Hostt, dtbs, base, connect
    try:
        connect = psycopg2.connect(host=Hostt, user=User, password=Passw, dbname=dtbs)
    except:
        print("Error database connection !")
        sleep(1)
        connector()

def content_send(f_humid, f_temp):
    global base, connect, sensor_id

    cursor = connect.cursor()
    try:
      cursor.execute( """INSERT INTO measurements (id_sensor, temperature, humidity, timestamp) VALUES (""" + sensor_id + """, """ + f_humid + """, """ + f_temp + """, """ + time.time()+ """);""" )
    except:
      print("Error sending date to database!")



if __name__ == "__main__":
    try:
        connect = psycopg2.connect(host=Hostt, user=User, password=Passw, dbname=dtbs)
    except:
        connector()

    app.run(host=Hostt, port= port, debug=True)






