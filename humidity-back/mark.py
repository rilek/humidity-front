# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import requests
from time import sleep

# tabele przykładowych zmiennych

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

for j in range(50):
	for i in range(len(hum)):

		print("humidity: " + str(hum[i]))
		print("temperature: " + str(temp[i]))

		payload = {'humid': str(hum[i]), 'temp': str(temp[i])}
		#r = requests.post("51.15.87.74", data=payload)
		r = requests.post(url="http://127.0.0.1:5253/quarks", json=payload)

		sleep(1)

	print("Minela petla " + format(j))