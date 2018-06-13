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
  const limitsOrder = ['id_sensor', 'min_temperature', 'max_temperature', 'min_humidity', 'max_humidity', 'date_from', 'date_to'];

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
                             ORDER BY measured_at ASC) AS measurements),
       'custom_limits', (SELECT json_agg(row_to_json(custom_limits))
                         FROM custom_limits
                         WHERE sensors.id_sensor=custom_limits.id_sensor))
    FROM sensors, places
    WHERE places.id_place=sensors.id_place
  `,
  (err, data) => {
    const _data = data.rows.map(item => item.json_build_object);
    client.emit('connected', _data);
  });

  // Event triggered on new row in measurements table
  postgre.on('notification', function(new_data) {
    const payload = JSON.parse(new_data.payload);

    if(payload.id_limit) {
      client.emit('new_limits', payload);
    } else {
      client.emit('new_data', payload);
    }
  });

  client.on('delete_custom_limit', data => {
    postgre.query(`DELETE FROM custom_limits WHERE id_limit=${data.id_limit}`, err =>
      err ? console.log(err) : null);
  });


  client.on('add_custom_limit', data => {
    const values = [
      parseInt(data["id_sensor"]),
      parseFloat(data['min_temperature']), parseFloat(data['max_temperature']),
      parseFloat(data['min_humidity']), parseFloat(data['max_humidity']),
      `'${data["date_from"]}'`, `'${data["date_to"]}'`
    ];
    // limitsOrder.map(key => data[key] || "null").join(', ');
    console.log(values);
    postgre.query(
      `INSERT INTO custom_limits(id_sensor, min_temperature, max_temperature, min_humidity, max_humidity, date_from, date_to) values(${values})`,
      err => err ? console.log(err) : null
    );
  });
});


server.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`));
