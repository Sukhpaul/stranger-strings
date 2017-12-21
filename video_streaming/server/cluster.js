const cluster = require('cluster');

// if in the master process
if (cluster.isMaster) {
  let cpuCount = require('os').cpus().length;
  // if in worker process
  for (let i = 0; i < cpuCount; i++) {
    cluster.fork();
  }
} else {
  require('./index');
  
}