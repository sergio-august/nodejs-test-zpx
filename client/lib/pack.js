'use strict';

module.exports = pack;

function pack(data, frameSize, offsets) {
  const buf = Buffer.allocUnsafe(frameSize);

  buf.fill(0, offsets.sender, offsets.sender + 32);
  buf.write(data.sender, offsets.sender, 32);

  buf.fill(0, offsets.receiver, offsets.receiver + 32);
  buf.write(data.receiver, offsets.receiver, 32);

  buf.fill(0, offsets.amount, offsets.amount + 4);
  buf.writeUIntBE(data.amount, offsets.amount, 4);

  buf.fill(0, offsets.timestamp, offsets.timestamp + 6);
  buf.writeUIntBE(data.timestamp, offsets.timestamp, 6);

  return buf;
}
