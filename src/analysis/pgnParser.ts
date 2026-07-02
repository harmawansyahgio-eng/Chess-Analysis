import { Chess } from 'chess.js';
import type { Move } from '../store/chessStore';

export interface ParsedGame {
  moves: Move[];
  startingFen: string;
}

export function parsePgn(pgn: string): ParsedGame {
  const chess = new Chess();
  
  // Clean PGN input by removing annotations and RAV variations if any (standard requirement)
  // Chess.js loadPgn does a decent job, but it is safer to clean up first or let it parse.
  // Standard PGN parsing in Chess.js will parse the main line, but we can also strip brackets or comment tokens if needed.
  // In v1.0.0, chess.loadPgn(pgn) will load the game, and we can just traverse the main line.
  
  try {
    chess.loadPgn(pgn);
  } catch (err) {
    throw new Error('Format PGN tidak valid');
  }

  const history = chess.history({ verbose: true });
  
  // Map verbose history to our Move interface
  const moves: Move[] = history.map((m) => ({
    san: m.san,
    from: m.from,
    to: m.to,
    piece: m.piece,
    color: m.color,
    fenBefore: m.before,
    fenAfter: m.after,
    promotion: m.promotion,
  }));

  // Reconstruct the starting FEN of the game
  // If the game has a custom FEN in its headers, use that; otherwise use standard starting FEN
  const startingFen = history.length > 0 ? history[0].before : chess.fen();

  return {
    moves,
    startingFen,
  };
}
