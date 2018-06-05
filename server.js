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
// const query = postgre.query("INSERT INTO places(building, floor, room) values (1, 1, 'kuchnia')");

// Express routes and statics setup
app.use('/statics', express.static(__dirname + '/statics'));
app.use(express.static(__dirname + '/statics/html'));

app.get('/', (req, res) => res.sendFile(__dirname + '/statics/html/index.html'));


// Create SocketIO server and configure messages
const server = http.createServer(app);
const io = socketio(server);

io.on('connection', client => {
  postgre.query("SELECT * FROM places", (err, data) => {
    client.emit('connected', data.rows);
  });

  client.on('event', function(data){});
  client.on('disconnect', function(){});
});


server.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`));