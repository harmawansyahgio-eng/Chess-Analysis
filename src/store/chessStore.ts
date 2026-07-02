import { create } from 'zustand';

export interface Move {
  san: string;
  from: string;
  to: string;
  piece: string;
  color: 'w' | 'b';
  fenBefore: string;
  fenAfter: string;
  promotion?: string;
}

export interface EvalResult {
  depth: number;
  score: number; // Centipawns from White's perspective (positive = White advantage)
  isMate: boolean;
  mateIn?: number;
  bestMove?: string; // e.g. "e2e4"
}

export type Classification =
  | 'BOOK'
  | 'BRILLIANT'
  | 'BEST'
  | 'GREAT'
  | 'EXCELLENT'
  | 'GOOD'
  | 'FORCED'
  | 'INACCURACY'
  | 'MISTAKE'
  | 'BLUNDER'
  | 'MISS';

export interface ChessState {
  // Game Slice
  pgn: string;
  moves: Move[];
  startingFen: string;
  activeMoveIndex: number; // -1 is starting position, 0...N-1 are moves
  activeFen: string;
  boardFlipped: boolean;

  // Analysis Slice
  isAnalyzing: boolean;
  analysisProgress: { analyzed: number; total: number };
  evals: Record<number, EvalResult>; // index: -1 is start, 0...N-1 for moves
  classifications: Record<number, Classification>; // index: 0...N-1 for moves
  accuracies: { white: number; black: number } | null;
  counts: {
    white: Record<Classification, number>;
    black: Record<Classification, number>;
  } | null;
  estimatedRatings: { white: number; black: number } | null;
  phases: {
    opening: { white: { accuracy: number; assessment: string }; black: { accuracy: number; assessment: string } };
    middlegame: { white: { accuracy: number; assessment: string }; black: { accuracy: number; assessment: string } };
    endgame: { white: { accuracy: number; assessment: string }; black: { accuracy: number; assessment: string } };
  } | null;

  // Actions
  setGame: (pgn: string, moves: Move[], startingFen: string) => void;
  setActiveMoveIndex: (index: number) => void;
  toggleBoardFlip: () => void;
  startAnalysis: (total: number) => void;
  updateAnalysisProgress: (analyzed: number) => void;
  setEvalResult: (index: number, result: EvalResult) => void;
  setClassification: (index: number, classification: Classification) => void;
  finishAnalysis: (
    accuracies: { white: number; black: number },
    counts: {
      white: Record<Classification, number>;
      black: Record<Classification, number>;
    },
    estimatedRatings: { white: number; black: number } | null,
    phases: ChessState['phases']
  ) => void;
  resetAnalysis: () => void;
}

export const useChessStore = create<ChessState>((set) => ({
  // Game Slice
  pgn: '',
  moves: [],
  startingFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  activeMoveIndex: -1,
  activeFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  boardFlipped: false,

  // Analysis Slice
  isAnalyzing: false,
  analysisProgress: { analyzed: 0, total: 0 },
  evals: {},
  classifications: {},
  accuracies: null,
  counts: null,
  estimatedRatings: null,
  phases: null,

  // Actions
  setGame: (pgn, moves, startingFen) =>
    set({
      pgn,
      moves,
      startingFen,
      activeMoveIndex: -1,
      activeFen: startingFen,
      evals: {},
      classifications: {},
      accuracies: null,
      counts: null,
      estimatedRatings: null,
      phases: null,
      isAnalyzing: false,
      analysisProgress: { analyzed: 0, total: 0 },
    }),

  setActiveMoveIndex: (index) =>
    set((state) => {
      const fen =
          index === -1
              ? state.startingFen
              : state.moves[index]?.fenAfter || state.startingFen;
      return {
        activeMoveIndex: index,
        activeFen: fen,
      };
    }),

  toggleBoardFlip: () =>
    set((state) => ({ boardFlipped: !state.boardFlipped })),

  startAnalysis: (total) =>
    set({
      isAnalyzing: true,
      analysisProgress: { analyzed: 0, total },
      evals: {},
      classifications: {},
      accuracies: null,
      counts: null,
      estimatedRatings: null,
      phases: null,
    }),

  updateAnalysisProgress: (analyzed) =>
    set((state) => ({
      analysisProgress: { ...state.analysisProgress, analyzed },
    })),

  setEvalResult: (index, result) =>
    set((state) => ({
      evals: { ...state.evals, [index]: result },
    })),

  setClassification: (index, classification) =>
    set((state) => ({
      classifications: { ...state.classifications, [index]: classification },
    })),

  finishAnalysis: (accuracies, counts, estimatedRatings, phases) =>
    set({
      isAnalyzing: false,
      accuracies,
      counts,
      estimatedRatings,
      phases,
    }),

  resetAnalysis: () =>
    set({
      evals: {},
      classifications: {},
      accuracies: null,
      counts: null,
      estimatedRatings: null,
      phases: null,
      isAnalyzing: false,
      analysisProgress: { analyzed: 0, total: 0 },
    }),
}));
