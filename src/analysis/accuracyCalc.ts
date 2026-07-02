import type { Classification } from '../store/chessStore';

/**
 * Calculates accuracy for a single move based on expected points loss and classification.
 * Formula: accuracy = 103.1668 * e^(-0.05 * epLoss * 100) - 3.1669
 */
export function calculateMoveAccuracy(epLoss: number, classification: Classification): number {
  if (classification === 'BOOK' || classification === 'BRILLIANT' || classification === 'GREAT' || classification === 'FORCED') return 100;
  if (classification === 'MISS') return 0;
  
  const diff = Math.max(0, epLoss) * 100;
  const acc = 103.1668 * Math.exp(-0.05 * diff) - 3.1669;
  return Math.min(100, Math.max(0, acc));
}

export interface PlayerStats {
  accuracy: number;
  counts: Record<Classification, number>;
}

export interface PhaseStats {
  accuracy: number;
  assessment: string;
}

export interface GameSummary {
  accuracies: { white: number; black: number };
  counts: {
    white: Record<Classification, number>;
    black: Record<Classification, number>;
  };
  estimatedRatings: { white: number; black: number };
  phases: {
    opening: { white: PhaseStats; black: PhaseStats };
    middlegame: { white: PhaseStats; black: PhaseStats };
    endgame: { white: PhaseStats; black: PhaseStats };
  };
}

const initialCounts = (): Record<Classification, number> => ({
  BOOK: 0,
  BRILLIANT: 0,
  BEST: 0,
  GREAT: 0,
  EXCELLENT: 0,
  GOOD: 0,
  FORCED: 0,
  INACCURACY: 0,
  MISTAKE: 0,
  BLUNDER: 0,
  MISS: 0,
});

/**
 * Helper to programmatically classify a move FEN into Opening, Middlegame, or Endgame.
 */
export function getGamePhase(fen: string, index: number): 'OPENING' | 'MIDDLEGAME' | 'ENDGAME' {
  // If we are within the first 8 moves (16 plies), it is Opening
  if (index < 16) {
    return 'OPENING';
  }

  const boardPart = fen.split(' ')[0];
  let whiteMaterial = 0;
  let blackMaterial = 0;
  let hasWhiteQueen = false;
  let hasBlackQueen = false;

  for (const char of boardPart) {
    switch (char) {
      case 'Q': hasWhiteQueen = true; whiteMaterial += 9; break;
      case 'q': hasBlackQueen = true; blackMaterial += 9; break;
      case 'R': whiteMaterial += 5; break;
      case 'r': blackMaterial += 5; break;
      case 'B': whiteMaterial += 3; break;
      case 'b': blackMaterial += 3; break;
      case 'N': whiteMaterial += 3; break;
      case 'n': blackMaterial += 3; break;
    }
  }

  // Standard endgame condition: no queens and other pieces <= 13 points, or queens present but no minor/major pieces
  const isWhiteEndgame = !hasWhiteQueen ? (whiteMaterial <= 13) : (whiteMaterial === 9);
  const isBlackEndgame = !hasBlackQueen ? (blackMaterial <= 13) : (blackMaterial === 9);

  if (isWhiteEndgame && isBlackEndgame) {
    return 'ENDGAME';
  }
  return 'MIDDLEGAME';
}

export function calculateSummary(
  moves: Array<{ color: 'w' | 'b'; fenBefore: string; fenAfter: string }>,
  evals: Record<number, { score: number; isMate: boolean }>, // index: -1 is start, 0...N-1
  classifications: Record<number, Classification>,
  pgn: string
): GameSummary {
  const whiteAccs: number[] = [];
  const blackAccs: number[] = [];
  
  const whiteCounts = initialCounts();
  const blackCounts = initialCounts();

  // Phase-specific move accuracy lists
  const whitePhaseAccs: Record<'OPENING' | 'MIDDLEGAME' | 'ENDGAME', number[]> = {
    OPENING: [],
    MIDDLEGAME: [],
    ENDGAME: [],
  };
  const blackPhaseAccs: Record<'OPENING' | 'MIDDLEGAME' | 'ENDGAME', number[]> = {
    OPENING: [],
    MIDDLEGAME: [],
    ENDGAME: [],
  };

  moves.forEach((move, index) => {
    const classification = classifications[index] || 'GOOD';
    const isWhite = move.color === 'w';
    
    // Increment counts
    if (isWhite) {
      whiteCounts[classification]++;
    } else {
      blackCounts[classification]++;
    }

    // Determine expected points loss (epLoss)
    const prevEvalObj = evals[index - 1];
    const currEvalObj = evals[index];
    
    let epLoss = 0;
    
    if (prevEvalObj && currEvalObj) {
      const getWinProb = (score: number, isMate: boolean): number => {
        if (isMate) {
          return score > 0 ? 1.0 : 0.0;
        }
        return 1 / (1 + Math.exp(-0.0055 * score));
      };

      const wpBeforeWhite = getWinProb(prevEvalObj.score, prevEvalObj.isMate);
      const wpAfterWhite = getWinProb(currEvalObj.score, currEvalObj.isMate);

      const wpBefore = isWhite ? wpBeforeWhite : 1.0 - wpBeforeWhite;
      const wpAfter = isWhite ? wpAfterWhite : 1.0 - wpAfterWhite;

      epLoss = Math.max(0, wpBefore - wpAfter);
    }
    
    const acc = calculateMoveAccuracy(epLoss, classification);
    if (isWhite) {
      whiteAccs.push(acc);
    } else {
      blackAccs.push(acc);
    }

    // Classify phase and assign accuracy to phase list
    const phase = getGamePhase(move.fenBefore, index);
    if (isWhite) {
      whitePhaseAccs[phase].push(acc);
    } else {
      blackPhaseAccs[phase].push(acc);
    }
  });

  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 100);

  const whiteAccuracy = avg(whiteAccs);
  const blackAccuracy = avg(blackAccs);

  // 1. Rating Performance Estimation from PGN
  const whiteEloMatch = pgn.match(/\[WhiteElo\s+"(\d+)"\]/);
  const blackEloMatch = pgn.match(/\[BlackElo\s+"(\d+)"\]/);
  const whiteElo = whiteEloMatch ? parseInt(whiteEloMatch[1], 10) : 1500;
  const blackElo = blackEloMatch ? parseInt(blackEloMatch[1], 10) : 1500;

  const resultMatch = pgn.match(/\[Result\s+"([^"]+)"\]/);
  const result = resultMatch ? resultMatch[1] : '*';

  // Base performance curve fitting
  const getBaseRating = (acc: number): number => {
    if (acc <= 30) return 100 + acc * 10;
    if (acc <= 60) return 400 + (acc - 30) * 15;
    if (acc <= 80) return 850 + (acc - 60) * 25;
    if (acc <= 90) return 1350 + (acc - 80) * 40;
    if (acc <= 95) return 1750 + (acc - 90) * 70;
    if (acc <= 98) return 2100 + (acc - 95) * 120;
    return 2460 + (acc - 98) * 180;
  };

  let whiteAdj = 0;
  let blackAdj = 0;
  if (result === '1-0') {
    whiteAdj = 150;
    blackAdj = -150;
  } else if (result === '0-1') {
    whiteAdj = -150;
    blackAdj = 150;
  }

  // Perf blending formula: 50% from accuracy base rating, 50% from opponent rating + result adj
  const whitePerf = Math.round(0.5 * getBaseRating(whiteAccuracy) + 0.5 * (blackElo + whiteAdj));
  const blackPerf = Math.round(0.5 * getBaseRating(blackAccuracy) + 0.5 * (whiteElo + blackAdj));

  // Shrink estimates towards starting rating for short games to prevent accuracy anomalies
  const numMoves = moves.length;
  const confidence = numMoves < 10 ? numMoves / 10 : 1.0;

  const finalWhiteRating = Math.max(100, Math.min(3200, Math.round(confidence * whitePerf + (1 - confidence) * whiteElo)));
  const finalBlackRating = Math.max(100, Math.min(3200, Math.round(confidence * blackPerf + (1 - confidence) * blackElo)));

  // 2. Phase-by-phase Assessment Strings
  const getAssessment = (acc: number): string => {
    if (acc >= 95) return 'Sangat Presisi (Excellent) - Bermain layaknya Master.';
    if (acc >= 85) return 'Solid (Good) - Strategi kuat dan minim kesalahan.';
    if (acc >= 70) return 'Kurang Akurat (Inaccurate) - Mengalami beberapa kelengahan.';
    return 'Lemah (Weak) - Banyak blunder dan kesalahan fatal.';
  };

  const getPhaseStats = (wArr: number[], bArr: number[]) => {
    const wAcc = wArr.length > 0 ? avg(wArr) : -1;
    const bAcc = bArr.length > 0 ? avg(bArr) : -1;

    return {
      white: {
        accuracy: wAcc !== -1 ? Math.round(wAcc * 10) / 10 : -1,
        assessment: wAcc !== -1 ? getAssessment(wAcc) : 'Tidak Terjadi',
      },
      black: {
        accuracy: bAcc !== -1 ? Math.round(bAcc * 10) / 10 : -1,
        assessment: bAcc !== -1 ? getAssessment(bAcc) : 'Tidak Terjadi',
      },
    };
  };

  return {
    accuracies: {
      white: Math.round(whiteAccuracy * 10) / 10,
      black: Math.round(blackAccuracy * 10) / 10,
    },
    counts: {
      white: whiteCounts,
      black: blackCounts,
    },
    estimatedRatings: {
      white: finalWhiteRating,
      black: finalBlackRating,
    },
    phases: {
      opening: getPhaseStats(whitePhaseAccs.OPENING, blackPhaseAccs.OPENING),
      middlegame: getPhaseStats(whitePhaseAccs.MIDDLEGAME, blackPhaseAccs.MIDDLEGAME),
      endgame: getPhaseStats(whitePhaseAccs.ENDGAME, blackPhaseAccs.ENDGAME),
    },
  };
}
