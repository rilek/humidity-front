(function() {
  'use strict';

  let sensors = {};
  const socket = io.connect('http://' + document.domain + ':' + location.port);

  socket.on('connected', function(data) {
    Object.keys(data).forEach(key => {
      const sensor = data[key];
      const html_string = `
        <div class="sensor_wrapper">
          <h2>Czujnik: ${sensor.room}</h2>
          <canvas id="chart${sensor.id_sensor}"></div>
        </div>`.replace(/(^[\n\r\s]+)/g, "").replace(/>[\n\r\s]+</g, "><");
      $('#app').append(html_string);

      sensors[sensor.id_sensor] = Object.assign({}, sensor,{chart: createChart(sensor)});
    });
  });

  socket.on('new_data', function(data) {
    console.log(data);
    const chart = sensors[data.id_sensor].chart;

    chart.data.labels.push(data.measured_at);
    chart.data.datasets.forEach(dataset => {
      dataset.data.push(data[dataset.id]);
    });
    chart.update();
  });
})();


function createChart(sensor) {
  const ctx = document.getElementById(`chart${sensor.id_sensor}`).getContext('2d');
  return myLineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: sensor.measurements.map(item => parseInt(item.measured_at)),
        datasets: [{
          id: 'temperature',
          label: "Temperatura",
          data: sensor.measurements.map(item => item.temperature),
          borderColor: 'red',
          backgroundColor: 'transparent',
          fill: false
        }, {
          id: 'humidity',
          label: "Wilgotność",
          data: sensor.measurements.map(item => item.humidity),
          borderColor: 'blue',
          backgroundColor: 'transparent',
          fill: false
        }]
      },
      options: {
        scales: {
          xAxes: [{
            type: 'time',
            time: {
             displayFormats: {
                 'millisecond': 'hh:ss:SSS',
              }
            }
          }]
        }
      }
  });
}
