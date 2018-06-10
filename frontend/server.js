const http = require('http');
const express = require('express');
const pg = require('pg');
const socketio = require('socket.io');
const c = require('../config/config.json');

const app = express();
const PORT = process.env.PORT || c.frontend.port;
const db_con_string = `tcp://${c.db.username}:${c.db.password}@${c.db.host}:${c.db.port}/${c.db.name}`;
const postgre = new pg.Client(db_con_string);

postgre.connect();
let query = postgre.query('LISTEN new_data');

// Express routes and statics setup
app.use('/statics', express.static(__dirname + '/statics'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/statics/html/index.html');
  });


// Create SocketIO server and configure messages
const server = http.createServer(app);
const io = socketio(server);

io.on('connection', client => {
  // Fetch measurements
  postgre.query(`
    SELECT json_build_object(
      'id_sensor', id_sensor,
      'id_place', sensors.id_place,
      'min_temperature', sensors.min_temperature,
      'max_temperature', sensors.max_temperature,
      'min_humidity', sensors.min_humidity,
      'max_humidity', sensors.max_humidity,
      'building', places.building,
      'floor', places.floor,
      'room', places.room,
      'measurements', (SELECT json_agg(row_to_json(measurements))
                       FROM (SELECT * FROM (SELECT *
                                            FROM measurements
                                            WHERE measurements.id_sensor=sensors.id_sensor
                                            ORDER BY measured_at DESC
                                            LIMIT 100) measurements
                             ORDER BY measured_at ASC) AS measurements))
    FROM sensors, places
    WHERE places.id_place=sensors.id_place
  `
  ,
  (err, data) => {
    const _data = data.rows.map(item => item.json_build_object);
    client.emit('connected', _data);
  });

  // Event triggered on new row in measurements table
  postgre.on('notification', function(new_data) {
    client.emit('new_data', JSON.parse(new_data.payload));
  });
});


server.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`));
