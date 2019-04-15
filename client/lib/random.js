'use strict';

const AMOUNT_MIN = 1;
const AMOUNT_MAX = 1000000000;
const DATE_START = Date.UTC(2016, 0, 1);
const DATE_END = Date.UTC(2017, 0, 1);
const NAMES = [
  'Alex',
  'Gloria',
  'Marty',
  'Melman',
  'Mort',
  'Maurice',
  'Julien',
  'Skipper',
  'Private',
  'Kowalski',
  'Rico'
];

const num = (min, max) => min + Math.round((max - min) * Math.random());
const frames = (max) => num(1, max);
const element = (array) => array[num(0, array.length - 1)];

function frame() {
  const sender = element(NAMES);
  const senderIndex = NAMES.indexOf(sender);
  const restNames = NAMES.slice(0, senderIndex).concat(
    NAMES.slice(senderIndex + 1));
  const receiver = element(restNames);
  const amount = num(AMOUNT_MIN, AMOUNT_MAX);
  const timestamp = num(DATE_START, DATE_END);
  return { sender, receiver, amount, timestamp };
}

module.exports = { frames, frame };
