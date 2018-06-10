# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import dht11

def main():
    global humidity, temperature
    Connector()
    while True:
        zero()
        result = instance.read()
        d = str(datetime.datetime.now())
        if result.is_valid():
            print("Last valid input: " + d)
            print("Temperature: %d C" % result.temperature)
            print("Humidity: %d %%" % result.humidity)
            humidity = float(result.humidity)
            temperature = float(result.temperature)
            Send_post(id_sensor, humidity, temperature, d)
        time.sleep(1)

if __name__ ==  "__main__":
    zero()
    main()


