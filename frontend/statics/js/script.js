let state = {app_container: $('#app'),
             disabledAlarm: {temperature: getCookie('disabled_temperature') === "1",
                             humidity: getCookie('disabled_humidity') === "1"},
             sensors: {}};

(function() {
  'use strict';

  const socket = io.connect('http://' + document.domain + ':' + location.port);
  const limitOrder = ['id_limit','id_sensor', 'min_temperature', 'max_temperature', 'min_humidity', 'max_humidity', 'date_from', 'date_to'];

  extendChart();
  prepareForm(socket);

  socket.on('connected', function(data) {
    prepareLimitTable(socket, data, limitOrder);
    Object.keys(data).forEach(key => {
      const sensor = data[key];
      const lastMeasurement = sensor['measurements'] !== null ? sensor['measurements'].slice(-1)[0]  : null;
      const html_string = prepareHTML(`
        <div class="sensor_wrapper" id="sensor-${sensor['id_sensor']}">
          <h2>Czujnik ${sensor['id_sensor']}: ${sensor['room']}</h2>
          <p>
            Ostatnia wartość temperatury: <span class="last_temp">${lastMeasurement ? lastMeasurement['temperature'] + " °C" : "brak danych"}</span><br>
            Ostatnia wartość wilgotności: <span class="last_hum">${lastMeasurement ? lastMeasurement['humidity'] + " %" : "brak danych"}</span><br>
            Ostatni pomiar: <span class="last_meas">${lastMeasurement ? moment(lastMeasurement['measured_at']).format('HH:mm DD/MM/YYYY') : "brak danych"}</span>
          </p>
          <p>
            Temperatura min/maks: ${sensor['min_temperature']}/${sensor['max_temperature']} °C<br>
            Wilgotność min/maks: ${sensor['min_humidity']}/${sensor['max_humidity']} %
          </p>
          <div class="chart_wrapper">
            <canvas height="300" width="1400" id="chart${sensor['id_sensor']}"></div>
          </div>
        </div>`);
      state.app_container.append(html_string);

      state.sensors[sensor['id_sensor']] = Object.assign({}, sensor, {chart: createChart(sensor)});

      if(lastMeasurement)
        checkForAlarmValues(
          sensor,
          lastMeasurement['temperature'],
          lastMeasurement['humidity'],
          lastMeasurement['measured_at'],
          prepareLimitsRow(state.sensors[sensor['id_sensor']], lastMeasurement));
    });
  });

  socket.on('new_data', function(data) {
    const sensor = state.sensors[data.id_sensor];
    const chart = sensor.chart;
    const limitsRow = prepareLimitsRow(sensor, data);
    const _data = Object.assign({}, data, limitsRow);

    chart.data.labels = newRow(chart.data.labels, _data.measured_at);
    chart.data.datasets.forEach(dataset => {
      dataset.data = newRow(dataset.data, _data[dataset.id])
    });
    chart.update();

    checkForAlarmValues(sensor, data['temperature'], data['humidity'], data["measured_at"], limitsRow);

    $(`#sensor-${data.id_sensor} .last_temp`).text(data['temperature']);
    $(`#sensor-${data.id_sensor} .last_hum`).text(data['humidity']);
    $(`#sensor-${data.id_sensor} .last_meas`).text(moment(data['measured_at']).format("HH:mm DD/MM/YYYY"));
  });

  socket.on('new_limits', function(data) {
    const sensor = state.sensors[data.id_sensor];
    const chart = sensor.chart;
    const table = $('table.table');
    const html = prepareTableRowHtml(data, limitOrder);

    if(!sensor.custom_limits)
      sensor.custom_limits = [];
    sensor.custom_limits.push(data);
    updateLimits(chart, sensor);

    console.log(sensor);

    table.append(html);
  });
})();


function newRow(dataset, row) {
  return [...dataset, row].slice(-100);
}

function setAlarm(text, reason) {
  if(state.disabledAlarm[reason] !== true) {
    const expirationTime = 5 * 60 * 1000; // 5 minutes
    let date = moment().local().add(expirationTime, 'milliseconds');
    state.disabledAlarm[reason] = true;
    console.log(date)
    document.cookie=`disabled_${reason}=1;expires=${date};path=/`;

    setTimeout(() => state.disabledAlarm[reason] = false, expirationTime);
    setTimeout(() => alert(text), 2000);
  }
}

function prepareHTML(str) {
  return str.replace(/(^[\n\r\s]+)/g, "").replace(/>[\n\r\s]+</g, "><");
}

function checkForAlarmValues(sensor, temperature, humidity, measured_at, limits) {
  const id_sensor = sensor["id_sensor"];

  if(temperature > limits.max_temperature)
    setAlarm(`Temperatura czujnika ${id_sensor} jest zbyt wysoka!`, "temperature");
  else if(temperature < limits.min_temperature)
    setAlarm(`Temperatura czujnika ${id_sensor} jest zbyt niska!`, "temperature");

  if(humidity > limits.max_humidity)
    setAlarm(`Wilgotność czujnika ${id_sensor} jest zbyt wysoka!`, "humidity");
  else if(humidity < limits.min_humidity)
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

function prepareForm(socket) {
  const $popup = $('.popup');
  $('.popup .close').on('click', () => {
    $popup.hide()
    // $(document).off('click.popup');
  });
  $('.show-form').on('click', (e) => {
    // e.stopPropagation();
    $popup.show(0.2);
    // $(document).on('click.popup', function (e) {
    //   if($(e.target).parents('.popup').length === 0 && $popup.is(":visible"))
    //     $('.popup').hide();
    // });
  });
  $('form #f-date_from, form #f-date_to').val(moment().local().format().slice(0,16));

  $('form').on('submit', e => {
    e.preventDefault();

    const $inputs = $('form input');
    let values = {};

    $inputs.each(function() {
        values[this.id.split("-")[1]] = $(this).val();
    });

    socket.emit("add_custom_limit", values);
  })
}

function prepareTableRowHtml(o, limitOrder) {
  return (
    "<tr>"
    + limitOrder.reduce((res, key) => res + `<td>${(key == "date_from" || key == "date_to")
                                                     ? moment(o[key]).format('HH:mm DD/MM/YYYY')
                                                     : o[key]}</td>`, '')
    + `<td class="del-row" id="del-${o.id_limit}-${o.id_sensor}">×</td>`
    + "</tr>"
  );
}

function prepareLimitTable(socket, data, limitOrder) {
  const table = $('table.table');
  const custom_limits = data.reduce((res, item) => item.custom_limits ? [...res, ...item.custom_limits] : res, []);
  if (!custom_limits)
    return;

  const str =
    custom_limits.reduce((res, o) => res + prepareTableRowHtml(o, limitOrder), '');

  table.append(str);
  $('.table').on('click', e => {
    const target = e.target;
    const id_limit = e.target.id.split('-')[1];

    if(target.className === 'del-row') {
          $(e.target).parent().remove();
          state.sensors[e.target.id.split('-')[2]]
            .custom_limits.splice(custom_limits.findIndex(item => item.id_limit == id_limit), 1);
          updateLimits(state.sensors[e.target.id.split('-')[2]].chart, state.sensors[e.target.id.split('-')[2]])
          socket.emit("delete_custom_limit", {id_limit: id_limit});
    }
  });
}

function updateLimits(chart, sensor) {
  const new_limits = prepareLimits(sensor);
  // console.log(new_limits);
  Object.keys(new_limits).forEach(limitName => {
    const idx = chart.data.datasets.findIndex(item => item.id === limitName);
    chart.data.datasets[idx].data = new_limits[limitName];
  });
  chart.update();
}

function genParams(sensor) {
  const limits = prepareLimits(sensor);
  const limitsTension = .2;
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
          data: limits.max_humidity,
          fill: false,
          radius: 0,
          borderWidth: 1,
          lineTension: limitsTension,
          borderColor: "rgba(0, 0, 255, .2)",
        },
        {
          id: 'min_humidity',
          data: limits.min_humidity,
          fill: false,
          radius: 0,
          borderWidth: 1,
          borderColor: "rgba(0, 0, 255, .2)",
          fillBetweenSet: 2,
          lineTension: limitsTension,
          fillBetweenColor: "rgba(5,5,255, 0.05)"
        },
        {
          id: 'max_temperature',
          data: limits.max_temperature,
          fill: false,
          radius: 0,
          borderWidth: 1,
          lineTension: limitsTension,
          borderColor: "rgba(255, 0, 0, .2)",
        },
        {
          id: 'min_temperature',
          data: limits.min_temperature,
          fill: false,
          radius: 0,
          borderWidth: 1,
          borderColor: "rgba(255, 0, 0, .2)",
          fillBetweenSet: 4,
          lineTension: limitsTension,
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

const limits = ["min_temperature", "max_temperature", "min_humidity", "max_humidity"];
function prepareLimitsRow(sensor, data) {
  const measured_at = data["measured_at"];
  const custom_limits = sensor.custom_limits;
  const activeLimit = custom_limits ? custom_limits.find(limit => moment(measured_at).isBetween(limit.date_from, limit.date_to)) : null;
  const obj = activeLimit || sensor;

  return limits.reduce((res, key) => Object.assign(res, {[key]: obj[key] || sensor[key]}), {});
}

function prepareLimits(sensor) {
  return limits.reduce((res, key) => {
    return Object.assign({}, res, {[key]: sensor.measurements.map(item => {
      const arr = sensor.custom_limits;
      const limit = arr ? arr.find(limit => limit[key] && moment(item.measured_at).isBetween(limit.date_from, limit.date_to)) : null;
      return limit ? limit[key] : sensor[key];
    })});
  }, {});
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