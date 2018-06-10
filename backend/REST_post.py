# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from flask import Flask
from flask import jsonify
from flask import request
import sys, os, getopt
import json
import psycopg2


app = Flask(__name__)


@app.route('/', methods=['GET'])
def hello_world():
    return jsonify({'message' : 'Humidity system @HILERCompany'})

@app.route('/quarks', methods=['POST'])
def newMeasurement():
    new_quark = request.get_json()

    print("new_quark:")
    print(format(new_quark))

    sensor_id = new_quark['id_sensor']
    humidity = float(new_quark['humid'])
    temperture = float(new_quark['temp'])
    measured_at = new_quark['measured_at']

    if humidity>0.0 and humidity<100.0:
      print ("humidity: " + str(humidity))
      print ("temperature: " + str(temperture))

      return content_send(jsonify, sensor_id, humidity, temperture, measured_at)
    else:
      print("Invalid humidity!")
      return jsonify(500)

def content_send(jsonify, sensor_id, f_humid, f_temp, measured_at):
  global cur, conn

  try:
    cur.execute("INSERT INTO measurements (id_sensor, temperature, humidity, measured_at) VALUES (%s, %s, %s, %s);", (sensor_id, f_temp, f_humid, measured_at) )
    conn.commit()
  except Exception as e:
    print("Error sending date to database!")
    print(e)
    return jsonify(500)
  return jsonify(200)



if __name__ == "__main__":
  port = None
  config_path = None

  opts, args = getopt.getopt(sys.argv[1:], "p:c:", ["port=", "config="])
  for opt, arg in opts:

    # pyton REST_post.py -p 1234
    if opt in ('-p', '--port'):
      port = arg

    # pyton REST_post.py -c ./path/to/config_file.json
    elif opt in ('-c', '--config'):
      config_path = arg

  with open(config_path or os.path.dirname(os.path.abspath(__file__)) + "/../config/config.json") as json_file:
    config = json.load(json_file)

  try:
    db_conf = config['db']
    conn = psycopg2.connect(host=db_conf['host'], user=db_conf['username'], password=db_conf['password'], dbname=db_conf['name'])
    cur = conn.cursor()
  except:
    print("Unable to connect to the database")

  app.run(host='0.0.0.0', port=port or config['backend']['port'], debug=True)
