// const apm = require('elastic-apm-node').start({
//   appName: 'Video Streaming Service',
//   serverUrl: 'http://localhost:8200',
// });
const express = require('express');
const bodyParser = require('body-parser');
const cluster = require('cluster');
const routes = require('./routes');
const redis = require('redis');
const genPath = require('../videos/assets/content_generators/generatePath');
const fs = require('fs');

let client = redis.createClient();

client.on('error', function (err) {
  // console.log('Error ' + err);
});

let app = express();

app.use(bodyParser.json());
// app.use(apm.middleware.express());
app.use(routes);

// if in the master process
let serve = (port) => {
  if (cluster.isMaster) {
    let cpuCount = require('os').cpus().length;
    for (let i = 0; i < cpuCount; i++) {
      cluster.fork();
    }
  } else {
    // if in worker process
    app.get('/video/:Id', (req, res) => {
      console.log(port);
      let videoID = req.params.Id;
      let bytesSent = 0;
      // retrieve video path from redis cache
      client.get(videoID, (error, result) => {
        if (result) {
          // get file size
          let stats = fs.statSync(`${result}`);
          let fileSizeInBytes = stats.size;

          // send video stream 
          res.writeHead(200, { 'Content-Type': 'video/mp4' });
          // create stream to collect data
          let stream = fs.createReadStream(`${result}`);
          stream.on('data', (chunk) => {
            bytesSent += chunk.length;
            // console.log(`Sent: ${chunk.length} bytes, Total: ${bytesSent}/${fileSizeInBytes} bytes`);
          }).pipe(res);
          stream.on('end', () => {
            // console.log(`Sent ${fileSizeInBytes}/${fileSizeInBytes} bytes`);
          });
        } else {
          // if video not in cache and id less than 5000 get store video[id]
          if (videoID <= 5000) {
            // add to video cache
            client.set(videoID, `../videos/video_files/${videoID}.mp4`);
            // console.log(`Added video ID:${videoID} to cache`);

            let stats = fs.statSync(`../videos/video_files/${videoID}.mp4`);
            let fileSizeInBytes = stats.size;

            res.writeHead(200, { 'Content-Type': 'video/mp4' });
            let stream = fs.createReadStream(`../videos/video_files/${videoID}.mp4`);
            stream.on('data', (chunk) => {
              bytesSent += chunk.length;
              // console.log(`Sent: ${chunk.length} bytes, Total: ${bytesSent}/${fileSizeInBytes} bytes`);
            }).pipe(res);
            stream.on('end', () => {
              // console.log(`Sent ${fileSizeInBytes}/${fileSizeInBytes} bytes`);
            });
          } else {
            // if not in cache and id > 5000 generate path to video and store 
            let path = genPath();

            client.set(videoID, `../videos/video_files/${path}.mp4`);
            // console.log(`Added video ID:${videoID} to cache`);

            let stats = fs.statSync(`../videos/video_files/${path}.mp4`);
            let fileSizeInBytes = stats.size;

            res.writeHead(200, { 'Content-Type': 'video/mp4' });
            let stream = fs.createReadStream(`../videos/video_files/${path}.mp4`);
            stream.on('data', (chunk) => {
              bytesSent += chunk.length;
              // console.log(`Sent: ${chunk.length} bytes, Total: ${bytesSent}/${fileSizeInBytes} bytes`);
            }).pipe(res);
            stream.on('end', () => {
              // console.log(`Sent ${fileSizeInBytes}/${fileSizeInBytes} bytes`);
            });
          }
        }
      });
    });
    app.listen(port, () => {
      console.log(`Listening on port ${port}`,  cluster.worker.id);
    });
  }
};

serve(3000);
serve(3001);
