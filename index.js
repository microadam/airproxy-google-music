var PlayMusic = require('playmusic');
var pm = new PlayMusic();
var lame = require('lame');
var request = require('request');
var async = require('async');
var http = require('http');
var AirTunes = require('airtunes').AirTunes;
var player = new AirTunes();

var isPlaying = false;

var googleEmail = process.env.EMAIL;
var googlePassword = process.env.PASSWORD;
var airproxyHost = process.env.AIRPROXY_HOST;
var airproxyPort = process.env.AIRPROXY_PORT;

if (!googleEmail || !googlePassword || !airproxyHost || !airproxyPort) {
  console.log('Please provide google user / pass and airproxy host / port');
  process.exit(1);
}

player.on('buffer', function (status) {
  console.log('player status:', status);
});

http.createServer(function (req, res) {
  console.log(req.url);
  var urlParts = req.url.split('/');
  var stationId = urlParts[1];
  var action = urlParts[2];

  if (action === 'on' && isPlaying) {
    res.writeHead(409, {'Content-Type': 'text/plain'});
    res.end('on');
  } else if (action === 'on' && !isPlaying) {
    isPlaying = true;
    playStation(stationId);
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('on');
  } else if (action === 'off') {
    if (isPlaying) {
      player.stopAll(function () {
        console.log('all stopped');
        isPlaying = false;
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('off');
      });
    } else {
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('off');
    }
  } else if (action === 'status') {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end(isPlaying ? 'on' : 'off');
  }

}).listen(7637, '0.0.0.0');

function playStation(stationId) {
  pm.init({ email: googleEmail, password: googlePassword }, function(error) {
    if (error) throw error;
    if (stationId === 'random') {
      playRandomStation();
    } else {
      playSpecficStation(stationId);
    }
  });
}

function playRandomStation() {
  pm.getStations(function(error, data) {
    if (error) throw error;
    var items = data.data.items;
    var station = items[Math.floor(Math.random() * items.length)];
    console.log('playing station:', station.name);
    playSpecificStation(station.id);
  });
}

function playSpecificStation(stationId) {
  pm.getStationTracks(stationId, 100, function (error, data) {
    if (error) throw error;
    var tracks = data.data.stations[0].tracks;
    console.log('num tracks:', tracks.length);
    var device = player.add(airproxyHost, { port: airproxyPort });
    async.eachSeries(tracks, playTrack.bind(null, device));
  });
}

function playTrack(device, track, callback) {
  console.log('playing:', track.artist, '-', track.album, '-', track.title);
  pm.getStreamUrl(track.storeId, function (error, res) {
    if (error) throw error;

    var decoder = new lame.Decoder();
    var mp3Stream = request(res);

    device.on('status', function (status) {
      console.log('device status:', status);
      if (status === 'stopped') {
        endTrack(true);
      }
    });

    var finished = false;

    function endTrack(completelyEnd) {
      if (!finished) {
        finished = true;
        mp3Stream.end();
        decoder.end();
        callback(completelyEnd);
      }
    }

    mp3Stream.on('error', function (error) {
      console.log('request error:', error);
      endTrack();
    });

    mp3Stream.on('close', function (error) {
      console.log('closing...');
      endTrack();
    });

    mp3Stream.on('end', function (error) {
      console.log('ending...');
      endTrack();
    });

    mp3Stream.pipe(decoder).pipe(player, { end: false });
  });
}
