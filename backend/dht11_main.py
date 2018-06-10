# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import dht11

def main():
    global humidity, temperature
    Connector()
    while True:
        zero()
        result = instance.read()
        if result.is_valid():
            print("Last valid input: " + str(datetime.datetime.now()))
            print("Temperature: %d C" % result.temperature)
            print("Humidity: %d %%" % result.humidity)
            humidity = float(result.humidity)
            temperature = float(result.temperature)
            Send_post(humidity, temperature)
        time.sleep(1)

if __name__ ==  "__main__":
    zero()
    main()


