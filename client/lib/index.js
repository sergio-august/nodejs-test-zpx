'use strict';

const defaults = require('./defaults');
const makeRequest = require('./make-request');

module.exports = { single, spam };

function single(opts) {
  const options = Object.assign({}, defaults, opts);

  makeRequest(options, showResponse);

  function showResponse(err, data) {
    if (err) {
      throw err;
    }
    else {
      console.log(data);
    }
  }
}

function spam(opts) {
  const options = Object.assign({}, defaults, opts);
  console.log('Spamming with options', options);

  for (let i = 0; i < options.concurrent; i++) {
    endlessSpam(options);
  }
}

function endlessSpam(options) {
  makeRequest(options, andAgain);

  function andAgain(err) {
    if (err) {
      throw err;
    }

    makeRequest(options, andAgain);
  }
}
