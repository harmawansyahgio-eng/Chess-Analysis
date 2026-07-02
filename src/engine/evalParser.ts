export interface ParsedEval {
  depth: number;
  score: number; // Centipawns from White's perspective
  isMate: boolean;
  mateIn?: number;
  bestMove?: string; // in UCI format, e.g., "e2e4"
}

/**
 * Parses a Stockfish "info" line to extract depth, score, mate, and bestmove.
 * Stockfish returns scores from the perspective of the side to move (active side).
 * We convert it to White's perspective (positive = White advantage).
 */
export function parseUciInfoLine(line: string, isWhiteActive: boolean): Partial<ParsedEval> | null {
  if (!line.startsWith('info ')) return null;

  const parts = line.split(' ');
  const result: Partial<ParsedEval> = {};

  // Parse Depth
  const depthIdx = parts.indexOf('depth');
  if (depthIdx !== -1 && depthIdx + 1 < parts.length) {
    result.depth = parseInt(parts[depthIdx + 1], 10);
  }

  // Parse Score
  const scoreIdx = parts.indexOf('score');
  if (scoreIdx !== -1 && scoreIdx + 1 < parts.length) {
    const scoreType = parts[scoreIdx + 1]; // "cp" or "mate"
    if (scoreIdx + 2 < parts.length) {
      const scoreVal = parseInt(parts[scoreIdx + 2], 10);
      
      if (scoreType === 'cp') {
        result.isMate = false;
        // Convert to White's perspective:
        // If Black is active, positive cp score means Black is better, so White score is negative.
        result.score = isWhiteActive ? scoreVal : -scoreVal;
      } else if (scoreType === 'mate') {
        result.isMate = true;
        result.mateIn = isWhiteActive ? scoreVal : -scoreVal;
        // In mate score, represent White advantage as positive score
        result.score = result.mateIn > 0 ? 10000 : -10000;
      }
    }
  }

  return result;
}

/**
 * Parses a Stockfish "bestmove" line.
 * Example: "bestmove e2e4 ponder e7e5" -> "e2e4"
 */
export function parseUciBestMoveLine(line: string): string | null {
  if (!line.startsWith('bestmove ')) return null;
  const parts = line.split(' ');
  if (parts.length >= 2) {
    return parts[1]; // The first move after "bestmove" is the best move
  }
  return null;
}
