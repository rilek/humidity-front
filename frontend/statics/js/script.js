let state = {disabledAlarm: {temperature: getCookie('disabled_temperature') === "1",
                             humidity: getCookie('disabled_humidity') === "1"},
             sensors: {}};

(function() {
  'use strict';

  const socket = io.connect('http://' + document.domain + ':' + location.port);
  extendChart();

  socket.on('connected', function(data) {
    Object.keys(data).forEach(key => {
      const sensor = data[key];
      const lastMeasurement = sensor['measurements'] !== null ? sensor['measurements'].slice(-1)[0]  : null;
      const html_string = prepareHTML(`
        <div class="sensor_wrapper">
          <h2>Czujnik ${sensor['id_sensor']}: ${sensor['room']}</h2>
          <p>
            Temperatura min/maks: ${sensor['min_temperature']}/${sensor['max_temperature']} °C<br>
            Wilgotność min/maks: ${sensor['min_humidity']}/${sensor['max_humidity']} %
          </p>
          <div class="chart_wrapper">
            <canvas height="300" width="1400" id="chart${sensor['id_sensor']}"></div>
          </div>
        </div>`);
      $('#app').append(html_string);

      state.sensors[sensor['id_sensor']] = Object.assign({}, sensor, {chart: createChart(sensor)});
      if(lastMeasurement)
        checkForAlaramValues(sensor['id_sensor'], lastMeasurement['temperature'], lastMeasurement['humidity']);
    });
  });

  socket.on('new_data', function(data) {
    const sensor = state.sensors[data.id_sensor];
    delete sensor.measurements;

    const chart = state.sensors[data.id_sensor].chart;
    const _data = Object.assign({}, data, sensor);

    chart.data.labels = newRow(chart.data.labels, _data.measured_at);
    chart.data.datasets.forEach(dataset => {
      dataset.data = newRow(dataset.data, _data[dataset.id])
    });

    checkForAlaramValues(data.id_sensor, data['temperature'], data['humidity']);

    chart.update();
  });
})();


function newRow(dataset, row) {
  return [...dataset, row].slice(-100);
}

function setAlarm(text, reason) {
  if(state.disabledAlarm[reason] !== true) {
    const expirationTime = 5 * 60 * 1000; // 5 minutes
    let date = moment().add(expirationTime, 'milliseconds');
    document.cookie=`disabled_${reason}=1;expires=${date};path=/`;

    setTimeout(() => state.disabledAlarm[reason] = false, expirationTime);
    setTimeout(() => alert(text), 2000);
  }
}

function prepareHTML(str) {
  return str.replace(/(^[\n\r\s]+)/g, "").replace(/>[\n\r\s]+</g, "><");
}

function checkForAlaramValues(id_sensor, temperature, humidity) {
    if(temperature > state.sensors[id_sensor].max_temperature)
      setAlarm(`Temperatura czujnika ${id_sensor} jest zbyt wysoka!`, "temperature");
    else if(temperature < state.sensors[id_sensor].min_temperature)
      setAlarm(`Temperatura czujnika ${id_sensor} jest zbyt niska!`, "temperature");

    if(humidity > state.sensors[id_sensor].max_humidity)
      setAlarm(`Wilgotność czujnika ${id_sensor} jest zbyt wysoka!`, "humidity");
    else if(humidity < state.sensors[id_sensor].min_humidity)
      setAlarm(`Wilgotność czujnika ${id_sensor} jest zbyt niska!`, "humidity");
}

function getCookie(name) {
  var value = "; " + document.cookie;
  var parts = value.split("; " + name + "=");
  if (parts.length == 2) return parts.pop().split(";").shift();
}

// Chart's utility functions
function createChart(sensor) {
  const ctx = document.getElementById(`chart${sensor.id_sensor}`).getContext('2d');
  if(sensor.measurements)
    return myLineChart = new Chart(ctx, genParams(sensor));
}

function genParams(sensor) {
  return {
      type: 'line',
      data: {
        labels: sensor.measurements.map(item => item.measured_at),
        datasets: [
        {
          id: 'temperature',
          label: "Temperatura [°C]",
          data: sensor.measurements.map(item => item.temperature),
          borderColor: 'red',
          backgroundColor: 'transparent',
          fill: false
        },
        {
          id: 'humidity',
          label: "Wilgotność [%]",
          data: sensor.measurements.map(item => item.humidity),
          borderColor: 'blue',
          backgroundColor: 'transparent',
          fill: false
        },
        {
          id: 'max_humidity',
          data: Array.apply(null, Array(sensor.measurements.length)).map(Number.prototype.valueOf,sensor.max_humidity),
          fill: false,
          radius: 0,
          borderWidth: 1,
          borderColor: "rgba(0, 0, 255, .2)",
        },
        {
          id: 'min_humidity',
          data: Array.apply(null, Array(sensor.measurements.length)).map(Number.prototype.valueOf,sensor.min_humidity),
          fill: false,
          radius: 0,
          borderWidth: 1,
          borderColor: "rgba(0, 0, 255, .2)",
          fillBetweenSet: 2,
          fillBetweenColor: "rgba(5,5,255, 0.05)"
        },
        {
          id: 'max_temperature',
          data: Array.apply(null, Array(sensor.measurements.length)).map(Number.prototype.valueOf,sensor.max_temperature),
          fill: false,
          radius: 0,
          borderWidth: 1,
          borderColor: "rgba(255, 0, 0, .2)",
        },
        {
          id: 'min_temperature',
          data: Array.apply(null, Array(sensor.measurements.length)).map(Number.prototype.valueOf,sensor.min_temperature),
          fill: false,
          radius: 0,
          borderWidth: 1,
          borderColor: "rgba(255, 0, 0, .2)",
          fillBetweenSet: 4,
          fillBetweenColor: "rgba(255, 0, 0, 0.05)"
        }
        ]
      },
      options: {
        legend: {
          labels: {
            filter: function(legendItem, chartData) {
              return legendItem.text;
            }
          }
        },
        global: {
          responsive: true,
          maintainAspectRatio: false
        },
        scales: {
          xAxes: [{
            type: 'time',
            time: {
             displayFormats: {
                 'millisecond': 'HH:mm',
                 'second': 'HH:mm',
                 'hour': 'HH:mm',
                 'day': 'HH:mm',
                 'week': 'HH:mm',
                 'month': 'HH:mm',
                 'quarter': 'HH:mm',
                 'year': 'HH:mm',
              }
            }
          }],
          yAxes: [{
            ticks: {
              beginAtZero: true,
              suggestedMax: 70
            }
          }]
        }
      }
  };
}

function extendChart() {
  const fillBetweenLinesPlugin = {
    afterDatasetsDraw: function (chart) {
        const ctx = chart.chart.ctx;
        const datasets = chart.data.datasets;
        ctx.save();

        for (let d = 0; d < datasets.length; d++) {
            const dataset = datasets[d];
            if (dataset.fillBetweenSet == undefined) {
                continue;
            }

            // get meta for both data sets
            const meta1 = chart.getDatasetMeta(d);
            const meta2 = chart.getDatasetMeta(dataset.fillBetweenSet);

            // do not draw fill if one of the datasets is hidden
            if (meta1.hidden || meta2.hidden) continue;

            // create fill areas in pairs
            for (let p = 0; p < meta1.data.length-1;p++) {
              // if null skip
              if (dataset.data[p] == null || dataset.data[p+1] == null) continue;

              ctx.beginPath();

              // trace line 1
              const curr = meta1.data[p];
              const next = meta1.data[p+1];
              ctx.moveTo(curr._view.x, curr._view.y);
              ctx.lineTo(curr._view.x, curr._view.y);
              if (curr._view.steppedLine === true) {
                ctx.lineTo(next._view.x, curr._view.y);
                ctx.lineTo(next._view.x, next._view.y);
              }
              else if (next._view.tension === 0) {
                ctx.lineTo(next._view.x, next._view.y);
              }
              else {
                  ctx.bezierCurveTo(
                    curr._view.controlPointNextX,
                    curr._view.controlPointNextY,
                    next._view.controlPointPreviousX,
                    next._view.controlPointPreviousY,
                    next._view.x,
                    next._view.y
                  );
              }

              // connect dataset1 to dataset2
              const _curr = meta2.data[p+1];
              const _next = meta2.data[p];
              ctx.lineTo(_curr._view.x, _curr._view.y);

              // trace BACKWORDS set2 to complete the box
              if (_curr._view.steppedLine === true) {
                ctx.lineTo(_curr._view.x, _next._view.y);
                ctx.lineTo(_next._view.x, _next._view.y);
              }
              else if (_next._view.tension === 0) {
                ctx.lineTo(_next._view.x, _next._view.y);
              }
              else {
                // reverse bezier
                ctx.bezierCurveTo(
                  _curr._view.controlPointPreviousX,
                  _curr._view.controlPointPreviousY,
                  _next._view.controlPointNextX,
                  _next._view.controlPointNextY,
                  _next._view.x,
                  _next._view.y
                );
              }

              // close the loop and fill with shading
              ctx.closePath();
              ctx.fillStyle = dataset.fillBetweenColor || "rgba(0,0,0,0.1)";
              ctx.fill();
            } // end for p loop
        }
    } // end afterDatasetsDraw
}; // end fillBetweenLinesPlugin

Chart.pluginService.register(fillBetweenLinesPlugin);
}