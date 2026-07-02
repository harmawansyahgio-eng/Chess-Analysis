import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import type { Classification, EvalResult } from '../store/chessStore';

export function isSacrifice(
  fenBefore: string,
  fenAfter: string,
  playerColor: 'w' | 'b',
  playedMoveUci: string
): boolean {
  const boardBefore = new Chess(fenBefore);
  const boardAfter = new Chess(fenAfter);
  
  // If the player was in check before the move, it is a forced defense, not a Brilliant sacrifice
  if (boardBefore.inCheck()) {
    return false;
  }

  const opponentColor = playerColor === 'w' ? 'b' : 'w';

  // Find all squares where the player has a major piece of value >= 3 (excluding King and Pawns)
  const playerSquares: string[] = [];
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = String.fromCharCode(97 + f) + (r + 1);
      const piece = boardAfter.get(sq as Square);
      if (piece && piece.color === playerColor && piece.type !== 'p' && piece.type !== 'k') {
        playerSquares.push(sq);
      }
    }
  }

  // Check if any of our major pieces is hanging or offered as a sacrifice
  for (const sq of playerSquares) {
    const piece = boardAfter.get(sq as Square);
    if (!piece) continue;

    const isAttackedByOpponent = boardAfter.isAttacked(sq as Square, opponentColor);
    if (!isAttackedByOpponent) continue;

    const isDefendedByPlayer = boardAfter.isAttacked(sq as Square, playerColor);
    
    let isHanging = false;

    // Case 1: Attacked and completely undefended
    if (!isDefendedByPlayer) {
      isHanging = true;
    } 
    // Case 2: Defended, but attacked by a lower-value piece
    else {
      const file = sq.charCodeAt(0) - 97;
      const rank = sq.charCodeAt(1) - 49;

      // Check if attacked by a pawn (pawn attacks anything >= 3 is a sacrifice)
      const pawnRank = playerColor === 'w' ? rank + 1 : rank - 1;
      if (pawnRank >= 0 && pawnRank < 8) {
        if (file > 0) {
          const adjSq = String.fromCharCode(97 + file - 1) + (pawnRank + 1);
          const p = boardAfter.get(adjSq as Square);
          if (p && p.type === 'p' && p.color === opponentColor) isHanging = true;
        }
        if (file < 7) {
          const adjSq = String.fromCharCode(97 + file + 1) + (pawnRank + 1);
          const p = boardAfter.get(adjSq as Square);
          if (p && p.type === 'p' && p.color === opponentColor) isHanging = true;
        }
      }

      // Check if Queen is attacked by anything defended (we treat Queen offers as sacrifices)
      if (piece.type === 'q') {
        isHanging = true; 
      }
      
      // Check if Rook is attacked by a Knight (exchange sacrifice)
      if (piece.type === 'r') {
        const knightOffsets = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (const [df, dr] of knightOffsets) {
          const nf = file + df;
          const nr = rank + dr;
          if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
            const adjSq = String.fromCharCode(97 + nf) + (nr + 1);
            const p = boardAfter.get(adjSq as Square);
            if (p && p.type === 'n' && p.color === opponentColor) isHanging = true;
          }
        }
      }
    }

    if (isHanging) {
      // Ensure the piece was NOT already hanging in the same undefended way before our move
      const fromSquare = playedMoveUci.substring(0, 2);
      const wasHangingBefore = boardBefore.isAttacked(fromSquare as Square, opponentColor) && !boardBefore.isAttacked(fromSquare as Square, playerColor);
      if (!wasHangingBefore) {
        return true;
      }
    }
  }

  return false;
}

export interface ClassifyParams {
  prevEval: EvalResult;
  currEval: EvalResult;
  isWhite: boolean;
  playedMoveUci: string; // e.g. "e2e4"
  bestMoveUci: string | undefined; // best move from prev position (before playedMove)
  isInBook: boolean;
  fenBefore: string;
  fenAfter: string;
  opponentBestResponseUci: string | undefined; // best move from curr position (after playedMove)
  prevMoveClassification?: Classification;
}

export function classifyMove({
  prevEval,
  currEval,
  isWhite,
  playedMoveUci,
  bestMoveUci,
  isInBook,
  fenBefore,
  fenAfter,
  opponentBestResponseUci: _opponentBestResponseUci,
  prevMoveClassification,
}: ClassifyParams): Classification {
  if (isInBook) return 'BOOK';

  // Check if there is only 1 legal move in the position before the move
  const board = new Chess(fenBefore);
  if (board.moves().length === 1) {
    return 'FORCED';
  }

  // 1. Convert evaluations to win probability from White's perspective
  // Formula: W = 1 / (1 + e^(-0.0055 * score))
  const getWinProb = (ev: EvalResult): number => {
    if (ev.isMate) {
      return ev.score > 0 ? 1.0 : 0.0;
    }
    return 1 / (1 + Math.exp(-0.0055 * ev.score));
  };

  const wpBeforeWhite = getWinProb(prevEval);
  const wpAfterWhite = getWinProb(currEval);

  const wpBefore = isWhite ? wpBeforeWhite : 1.0 - wpBeforeWhite;
  const wpAfter = isWhite ? wpAfterWhite : 1.0 - wpAfterWhite;

  const epLoss = Math.max(0, wpBefore - wpAfter);

  const hadMate = prevEval.isMate && (isWhite ? prevEval.score > 0 : prevEval.score < 0);
  const hasMateNow = currEval.isMate && (isWhite ? currEval.score > 0 : currEval.score < 0);

  const isTopMove = bestMoveUci && playedMoveUci.toLowerCase() === bestMoveUci.toLowerCase();

  // 2. Sacrifice detection
  const isSac = isSacrifice(fenBefore, fenAfter, isWhite ? 'w' : 'b', playedMoveUci);

  // Brilliant: Sacrifice that is good, doesn't blunder, is not already completely winning, and leaves a playable position
  if (isSac && (isTopMove || epLoss <= 0.02) && wpBefore < 0.90 && wpAfter >= 0.48) {
    return 'BRILLIANT';
  }

  // Missed Forced Mate or Missed Win (wpBefore >= 0.70, wpAfter < 0.60, epLoss >= 0.10)
  const missedMate = hadMate && !hasMateNow;
  const missedWin = wpBefore >= 0.70 && wpAfter < 0.60 && epLoss >= 0.10;
  if (missedMate || missedWin) {
    return 'MISS';
  }

  // Great: Only good move or finding a critical path
  if (isTopMove) {
    const isPunishment = prevMoveClassification === 'BLUNDER' || 
                         prevMoveClassification === 'MISTAKE' || 
                         prevMoveClassification === 'MISS';
    const isDefensiveSave = wpBefore <= 0.35 && wpAfter >= wpBefore;
    const foundMate = hasMateNow && !hadMate;

    if (isPunishment || isDefensiveSave || foundMate) {
      return 'GREAT';
    }
    return 'BEST';
  }

  // Standard Expected Points loss classification (Chess.com thresholds)
  if (epLoss === 0) return 'BEST';
  if (epLoss <= 0.02) return 'EXCELLENT';
  if (epLoss <= 0.05) return 'GOOD';
  if (epLoss <= 0.10) return 'INACCURACY';
  if (epLoss <= 0.20) return 'MISTAKE';
  return 'BLUNDER';
}
