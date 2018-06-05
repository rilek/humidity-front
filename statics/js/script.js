(function() {
  'use strict';

  const socket = io.connect('http://' + document.domain + ':' + location.port);

  socket.on('connected', function(data) {
    const html_string = data.reduce((result, data) => {
      const string = `
      <div class="sensor_wrapper">
        <h2>Czujnik: ${data.room}</h2>
        <div id="chart${data.id_place}"></div>
      </div>`.replace(/(^[\n\r\s]+)/g, "").replace(/>[\n\r\s]+</g, "><");
      return result + string;
    },"");
    $('#app').append(html_string);
  });

})();

