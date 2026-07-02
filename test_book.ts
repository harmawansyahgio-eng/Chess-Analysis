import * as fs from 'fs';
import { decodeBookMove } from './src/engine/openingBook';

const buf = fs.readFileSync('public/opening-book.bin');
const numEntries = Math.floor(buf.byteLength / 16);
console.log(`Total entries: ${numEntries}`);

for (let i = 0; i < numEntries; i++) {
  const offset = i * 16;
  const hash = buf.readBigUInt64BE(offset);
  const moveVal = buf.readUInt16BE(offset + 8);
  const weight = buf.readUInt16BE(offset + 10);
  const learn = buf.readUInt32BE(offset + 12);
  const decoded = decodeBookMove(moveVal, weight, learn);
  console.log(`Entry ${i}: Hash: ${hash.toString(16)}, Move: ${decoded.uci} (${decoded.from} -> ${decoded.to}), Weight: ${weight}`);
}
