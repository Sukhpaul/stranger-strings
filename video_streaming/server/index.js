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

let client = redis.createClient({ "host": 'redis', "port": "192.168.99.100:9001" });

client.on('error', function (err) {
  console.log('Error: ' + err);
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
    require('./routes');
    app.listen(port, () => {
      console.log(`Listening on port ${port}`,  cluster.worker.id);
    });
  }
};

serve(3000);
serve(3001);
