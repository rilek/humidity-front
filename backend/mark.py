# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import sys
import getopt
import os
import json
import requests
import datetime
from time import sleep

# tabele przykładowych zmiennych

id_sensor = 1

hum = ['44.1',
  '44.3',
  '44.1',
  '44.2',
  '44.2',
  '44.2',
  '44.3',
  '44.1',
  '44.0',
  '44.1',
  '44.1',
 ]

temp = ['22.5',
  '22.5',
  '22.5',
  '22.4',
  '22.4',
  '22.5',
  '22.5',
  '22.5',
  '22.4',
  '22.5',
  '22.5',
 ]


if __name__ == '__main__':
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

  for j in range(50):
    for i in range(len(hum)):

      print("humidity: " + str(hum[i]))
      print("temperature: " + str(temp[i]))

      payload = {'id_sensor': id_sensor, 'humid': str(hum[i]), 'temp': str(temp[i]), 'measured_at': str(datetime.datetime.now())}
      #r = requests.post("51.15.87.74", data=payload)
      r = requests.post(url="http://127.0.0.1:5253/quarks", json=payload)

      sleep(1)

    print("Minela petla " + format(j))