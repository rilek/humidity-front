const http = require('http');
const express = require('express');
const pg = require('pg');
const socketio = require('socket.io');
const c = require('./config/config.json');

const app = express();
const PORT = process.env.PORT || c.port;
const db_con_string = `tcp://${c.db.username}:${c.db.password}@${c.db.host}:${c.db.port}/${c.db.name}`;
const postgre = new pg.Client(db_con_string);

postgre.connect();
let query = postgre.query('LISTEN new_data');

// Express routes and statics setup
app.use('/statics', express.static(__dirname + '/statics'));
app.use(express.static(__dirname + '/statics/html'));

app.get('/', (req, res) => res.sendFile(__dirname + '/statics/html/index.html'));


// Create SocketIO server and configure messages
const server = http.createServer(app);
const io = socketio(server);

io.on('connection', client => {
  postgre.query(
    `SELECT * FROM sensors
     INNER JOIN places ON sensors.id_place=places.id_place
     INNER JOIN measurements ON measurements.id_sensor=sensors.id_sensor
     ORDER BY measurements.measured_at ASC
     LIMIT 100`,
    (err, data) => {
      if(data.rows.length > 0) {
        _data = Array.from(data.rows).reduce((result, obj) => {
            const oid = obj['id_sensor'];
            let measurement = {id_measurement: obj.id_measurement,
                               temperature: obj.temperature,
                               humidity: obj.humidity,
                               measured_at: obj.measured_at};

            if(!result[oid]) {
              result[oid] = {id_sensor: obj.id_sensor,
                             id_place: obj.id_place,
                             building: obj.building,
                             room: obj.room,
                             measurements: [measurement]};
            } else {
              result[oid].measurements.push(measurement);
            }
            return result;
        }, {});
        client.emit('connected', _data);
      }
    });

  postgre.on('notification', function(new_data) {
    client.emit('new_data', JSON.parse(new_data.payload));
  });
  client.on('ready for data', function (data) {
  });

  client.on('event', function(data){});
  client.on('disconnect', function(){});
});


server.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`));

// const query = postgre.query("INSERT INTO places(building, floor, room) values (1, 1, 'kuchnia')");
// const query = postgre.query(`INSERT INTO measurements(id_sensor, temperature, humidity, timestamp)
//                                                      values (1, 10.0, 12.0, ${new Date().valueOf()})`);
// console.log(new Date().valueOf());
// postgre.query("SELECT * FROM measurements", (err, data) => {
//   console.log(data.rows);
// });