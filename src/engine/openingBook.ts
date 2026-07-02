import { Chess } from 'chess.js';
import { POLYGLOT_RANDOM_ARRAY } from './polyglotConstants';

const PIECE_CODES = {
  p: { w: 1, b: 0 },
  n: { w: 3, b: 2 },
  b: { w: 5, b: 4 },
  r: { w: 7, b: 6 },
  q: { w: 9, b: 8 },
  k: { w: 11, b: 10 }
};

export function getPolyglotHash(chess: Chess): bigint {
  let hash = 0n;

  // 1. Pieces on squares
  // In Polyglot: rank 1-8 is 0-7, file A-H is 0-7. A1 is index 0.
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const squareName = String.fromCharCode(97 + file) + (rank + 1);
      const piece = chess.get(squareName as any);
      if (piece) {
        const pieceCode = PIECE_CODES[piece.type][piece.color];
        const squareIndex = rank * 8 + file;
        const randomIdx = pieceCode * 64 + squareIndex;
        hash ^= POLYGLOT_RANDOM_ARRAY[randomIdx];
      }
    }
  }

  // 2. Castling rights
  const fenParts = chess.fen().split(' ');
  const castlingStr = fenParts[2];
  if (castlingStr.includes('K')) hash ^= POLYGLOT_RANDOM_ARRAY[768];
  if (castlingStr.includes('Q')) hash ^= POLYGLOT_RANDOM_ARRAY[769];
  if (castlingStr.includes('k')) hash ^= POLYGLOT_RANDOM_ARRAY[770];
  if (castlingStr.includes('q')) hash ^= POLYGLOT_RANDOM_ARRAY[771];

  // 3. En passant file
  const epSquare = fenParts[3];
  if (epSquare !== '-') {
    const file = epSquare.charCodeAt(0) - 97;
    const turn = fenParts[1];
    const targetRank = turn === 'w' ? '5' : '4';
    let hasPawn = false;

    if (file > 0) {
      const leftSquare = String.fromCharCode(97 + file - 1) + targetRank;
      const piece = chess.get(leftSquare as any);
      if (piece && piece.type === 'p' && piece.color === turn) hasPawn = true;
    }
    if (file < 7) {
      const rightSquare = String.fromCharCode(97 + file + 1) + targetRank;
      const piece = chess.get(rightSquare as any);
      if (piece && piece.type === 'p' && piece.color === turn) hasPawn = true;
    }

    if (hasPawn) {
      hash ^= POLYGLOT_RANDOM_ARRAY[772 + file];
    }
  }

  // 4. Side to move (XOR if White to move)
  if (chess.turn() === 'w') {
    hash ^= POLYGLOT_RANDOM_ARRAY[780];
  }

  return hash;
}

export interface DecodedBookMove {
  from: string;
  to: string;
  promotion: string;
  weight: number;
  learn: number;
  uci: string;
}

export function decodeBookMove(moveVal: number, weight: number, learn: number): DecodedBookMove {
  const toSq = moveVal & 0x3f;
  const fromSq = (moveVal >> 6) & 0x3f;
  const promoVal = (moveVal >> 12) & 0x7;

  const toFile = toSq % 8;
  const toRank = Math.floor(toSq / 8);
  const fromFile = fromSq % 8;
  const fromRank = Math.floor(fromSq / 8);

  const from = String.fromCharCode(97 + fromFile) + (fromRank + 1);
  const to = String.fromCharCode(97 + toFile) + (toRank + 1);

  let promotion = '';
  if (promoVal === 1) promotion = 'n';
  else if (promoVal === 2) promotion = 'b';
  else if (promoVal === 3) promotion = 'r';
  else if (promoVal === 4) promotion = 'q';

  return {
    from,
    to,
    promotion,
    weight,
    learn,
    uci: from + to + promotion,
  };
}

export class OpeningBook {
  private view: DataView | null = null;
  public numEntries = 0;

  constructor(arrayBuffer: ArrayBuffer | null) {
    if (arrayBuffer) {
      this.view = new DataView(arrayBuffer);
      this.numEntries = Math.floor(arrayBuffer.byteLength / 16);
    }
  }

  public getBookMoves(hash: bigint): DecodedBookMove[] {
    if (!this.view || this.numEntries === 0) return [];

    let low = 0;
    let high = this.numEntries - 1;
    let foundIndex = -1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const midKey = this.view.getBigUint64(mid * 16, false);

      if (midKey === hash) {
        foundIndex = mid;
        break;
      } else if (midKey < hash) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    if (foundIndex === -1) return [];

    const results: DecodedBookMove[] = [];

    // Scan backwards for duplicate hashes
    let i = foundIndex;
    while (i >= 0 && this.view.getBigUint64(i * 16, false) === hash) {
      const moveVal = this.view.getUint16(i * 16 + 8, false);
      const weight = this.view.getUint16(i * 16 + 10, false);
      const learn = this.view.getUint32(i * 16 + 12, false);
      results.push(decodeBookMove(moveVal, weight, learn));
      i--;
    }

    // Scan forwards for duplicate hashes
    i = foundIndex + 1;
    while (i < this.numEntries && this.view.getBigUint64(i * 16, false) === hash) {
      const moveVal = this.view.getUint16(i * 16 + 8, false);
      const weight = this.view.getUint16(i * 16 + 10, false);
      const learn = this.view.getUint32(i * 16 + 12, false);
      results.push(decodeBookMove(moveVal, weight, learn));
      i++;
    }

    return results;
  }
}

// Global cached book promise/instance
let cachedBookPromise: Promise<OpeningBook> | null = null;

export function loadOpeningBook(): Promise<OpeningBook> {
  if (cachedBookPromise) return cachedBookPromise;

  // Append a unique cache buster query parameter to force loading the latest regenerated bin file
  cachedBookPromise = fetch(`/opening-book.bin?v=1.0.2-cb-${Date.now()}`)
    .then((res) => {
      if (!res.ok) throw new Error('Opening book file not found');
      return res.arrayBuffer();
    })
    .then((buf) => new OpeningBook(buf))
    .catch((err) => {
      console.warn('Failed to load opening book, proceeding without it:', err);
      return new OpeningBook(null);
    });

  return cachedBookPromise;
}
