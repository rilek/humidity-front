# Post must send json structure like: {'humid': humidity, 'temp': temperature, 'ts': time.time()}

# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from flask import Flask, request, jsonify

app = Flask(__name__)

# base settings
User = 'harnas'
Passw = 'wojciech'
Hostt = '51.15.87.74'
dtbs = 'humidity'
port = '5432'

@app.route('/humidity', methods=['POST'])

def humidity_post():
    print (request.is_json)
    content = request.get_json()
    print (content)
    content_send(content)

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



if __name__ is '__main__':
	try:
        connect = pymysql.connect(host=Hostt, user=User, password=Passw, db=dtbs)
        base = connect.cursor
    except:
		connector()
	app.run(host='51.15.87.74', port= 5432)



