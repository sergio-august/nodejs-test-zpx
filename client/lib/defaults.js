'use strict';

module.exports = {
  url: 'http://127.0.0.1:3000/api/v1/process',
  concurrent: 10,
  maxFrames: 100,
  frameSize: 74,
  offset: {
    sender: 0,
    receiver: 32,
    amount: 64,
    timestamp: 68
  }
};
