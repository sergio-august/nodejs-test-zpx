'use strict';

const http = require('http');
const pack = require('./pack');
const random = require('./random');
const urlParse = require('url').parse;

const HTTP_METHOD = 'POST';

module.exports = makeRequest;

function makeRequest(options, callback) {
  const url = urlParse(options.url);
  const frames = random.frames(options.maxFrames);
  const request = createRequest(url, handleResponse);

  request.on('error', callback);

  function handleResponse(res) {
    let out = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => out += chunk.toString('utf8'));
    res.on('end', () => callback(null, out));
  }

  send(request, options, frames);
}

function createRequest(url, callback) {
  return http.request({
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port,
    method: HTTP_METHOD,
    path: url.path,
    headers: {
      'Content-Type': 'application/octet-stream'
    }
  }, callback);
}

function send(req, options, remaining) {
  const frame = random.frame();
  const buffer = pack(frame, options.frameSize, options.offset);

  req.write(buffer);

  if (remaining > 1) {
    setImmediate(send, req, options, remaining - 1);
  }
  else {
    req.end();
  }
}
