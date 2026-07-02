import { useRef } from 'react';
import { useChessStore } from '../store/chessStore';
import type { Move, EvalResult, Classification } from '../store/chessStore';
import { parseUciInfoLine, parseUciBestMoveLine } from './evalParser';
import { getPolyglotHash, loadOpeningBook, OpeningBook } from './openingBook';
import { Chess } from 'chess.js';
import { classifyMove } from '../analysis/classifier';
import { calculateSummary } from '../analysis/accuracyCalc';

let globalWorkers: Worker[] = [];
let globalBook: OpeningBook | null = null;

export function useStockfish() {
  const store = useChessStore();
  const currentAnalysisId = useRef<number>(0);

  const stopAnalysis = () => {
    currentAnalysisId.current++;
    globalWorkers.forEach((w) => w.terminate());
    globalWorkers = [];
    useChessStore.getState().resetAnalysis();
  };

  const analyzeGame = async (moves: Move[], startingFen: string, depth = 16) => {
    stopAnalysis();
    
    const analysisId = ++currentAnalysisId.current;
    
    // Prepare list of positions to evaluate
    const positionsToAnalyze: Array<{ index: number; fen: string; isWhiteActive: boolean }> = [
      {
        index: -1,
        fen: startingFen,
        isWhiteActive: startingFen.split(' ')[1] === 'w',
      },
    ];

    moves.forEach((move, i) => {
      positionsToAnalyze.push({
        index: i,
        fen: move.fenAfter,
        isWhiteActive: move.fenAfter.split(' ')[1] === 'w',
      });
    });

    const total = positionsToAnalyze.length;
    store.startAnalysis(total);

    // Load opening book if not already loaded
    if (!globalBook || globalBook.numEntries === 0) {
      globalBook = await loadOpeningBook();
    }

    // Pre-calculate opening book matches once at the start to avoid redundant hashing/creation later
    const bookMatches: Record<number, boolean> = {};
    if (globalBook && moves.length > 0) {
      for (let i = 0; i < moves.length; i++) {
        const move = moves[i];
        try {
          const tempChess = new Chess(move.fenBefore);
          const hash = getPolyglotHash(tempChess);
          const bookMoves = globalBook.getBookMoves(hash);
          const playedMoveUci = move.from + move.to + (move.promotion || '');
          bookMatches[i] = bookMoves.some((bm) => bm.uci.toLowerCase() === playedMoveUci.toLowerCase());
        } catch (e) {
          bookMatches[i] = false;
        }
      }
    }

    const evaluations: Record<number, EvalResult> = {};
    const classifications: Record<number, Classification> = {};

    // Helper to evaluate a single FEN on a given worker
    const evaluatePosition = (
      worker: Worker,
      fen: string,
      isWhiteActive: boolean,
      index: number
    ): Promise<EvalResult> => {
      return new Promise((resolve) => {
        let latestEval: Partial<EvalResult> = {
          depth: 0,
          score: 0,
          isMate: false,
        };
        let lastUpdateTime = 0;

        const handleMessage = (e: MessageEvent) => {
          if (analysisId !== currentAnalysisId.current) {
            worker.removeEventListener('message', handleMessage);
            worker.removeEventListener('error', handleError);
            return;
          }

          const line = e.data as string;

          if (line.startsWith('info ')) {
            if (!line.includes('score')) return;
            const parsed = parseUciInfoLine(line, isWhiteActive);
            if (parsed) {
              latestEval = { ...latestEval, ...parsed };
              
              // CRITICAL OPTIMIZATION: Only update the store for intermediate updates
              // if this is the active move that the user is currently viewing!
              const isActive = index === useChessStore.getState().activeMoveIndex;
              if (isActive && latestEval.score !== undefined) {
                const now = Date.now();
                if (now - lastUpdateTime > 250) {
                  useChessStore.getState().setEvalResult(index, latestEval as EvalResult);
                  lastUpdateTime = now;
                }
              }
            }
          } else if (line.startsWith('bestmove ')) {
            const bestMove = parseUciBestMoveLine(line);
            worker.removeEventListener('message', handleMessage);
            worker.removeEventListener('error', handleError);
            
            const finalEval: EvalResult = {
              depth: latestEval.depth || depth,
              score: latestEval.score !== undefined ? latestEval.score : 0,
              isMate: latestEval.isMate || false,
              mateIn: latestEval.mateIn,
              bestMove: bestMove || undefined,
            };
            resolve(finalEval);
          }
        };

        const handleError = () => {
          worker.removeEventListener('message', handleMessage);
          worker.removeEventListener('error', handleError);
          resolve({
            depth: 0,
            score: 0,
            isMate: false,
          });
        };

        worker.addEventListener('message', handleMessage);
        worker.addEventListener('error', handleError);
        
        // Start Stockfish evaluation with optimized depth and movetime limits
        worker.postMessage('ucinewgame');
        worker.postMessage(`position fen ${fen}`);
        worker.postMessage(`go depth ${depth} movetime 1200`);
      });
    };

    // Determine parallel concurrency (up to 4 workers)
    const concurrency = Math.min(4, navigator.hardwareConcurrency || 4);
    const workers: Worker[] = [];
    
    // Resolve relative worker URL dynamically based on Vite's base path and host location
    const baseUrl = import.meta.env.BASE_URL || '/';
    const workerPath = baseUrl === '/' 
      ? '/stockfish-18-lite-single.js' 
      : new URL(`${baseUrl}stockfish-18-lite-single.js`, window.location.href).href;

    for (let w = 0; w < concurrency; w++) {
      workers.push(new Worker(workerPath));
    }
    globalWorkers = workers;

    let activeIndex = 0;
    let finishedCount = 0;

    const runWorker = async (worker: Worker) => {
      while (activeIndex < positionsToAnalyze.length) {
        if (analysisId !== currentAnalysisId.current) return;
        const taskIdx = activeIndex++;
        const pos = positionsToAnalyze[taskIdx];
        if (!pos) break;

        const result = await evaluatePosition(worker, pos.fen, pos.isWhiteActive, pos.index);
        
        if (analysisId !== currentAnalysisId.current) return;
        
        evaluations[pos.index] = result;
        
        finishedCount++;

        // Try to classify moves in real time (best effort)
        const localClassifications: Record<number, Classification> = {};
        
        const tryClassify = (moveIdx: number) => {
          if (moveIdx < 0 || moveIdx >= moves.length) return;
          const prev = evaluations[moveIdx - 1];
          const curr = evaluations[moveIdx];
          if (prev && curr && !classifications[moveIdx] && !localClassifications[moveIdx]) {
            const move = moves[moveIdx];
            const isInBook = bookMatches[moveIdx] || false; // Fast cache lookup!

            const playedMoveUci = move.from + move.to + (move.promotion || '');
            const classification = classifyMove({
              prevEval: prev,
              currEval: curr,
              isWhite: move.color === 'w',
              playedMoveUci,
              bestMoveUci: prev.bestMove,
              isInBook,
              fenBefore: move.fenBefore,
              fenAfter: move.fenAfter,
              opponentBestResponseUci: curr.bestMove,
              prevMoveClassification: moveIdx > 0 ? (classifications[moveIdx - 1] || localClassifications[moveIdx - 1]) : undefined,
            });

            localClassifications[moveIdx] = classification;
            classifications[moveIdx] = classification;
          }
        };

        tryClassify(pos.index);
        tryClassify(pos.index + 1);

        // BATCH STATE UPDATE: Update evaluations, classifications, and progress in a single render cycle!
        useChessStore.setState((state) => ({
          evals: { ...state.evals, [pos.index]: result },
          classifications: { ...state.classifications, ...localClassifications },
          analysisProgress: { ...state.analysisProgress, analyzed: finishedCount }
        }));
      }
    };

    try {
      // Evaluate all positions concurrently using the worker pool
      await Promise.all(workers.map((w) => runWorker(w)));

      if (analysisId !== currentAnalysisId.current) return;

      // Run a final sequential classification pass to ensure Great Move detection is 100% accurate
      for (let i = 0; i < moves.length; i++) {
        const move = moves[i];
        const prevEval = evaluations[i - 1];
        const currEval = evaluations[i];
        const isInBook = bookMatches[i] || false; // Fast cache lookup!

        const playedMoveUci = move.from + move.to + (move.promotion || '');
        const classification = classifyMove({
          prevEval,
          currEval,
          isWhite: move.color === 'w',
          playedMoveUci,
          bestMoveUci: prevEval.bestMove,
          isInBook,
          fenBefore: move.fenBefore,
          fenAfter: move.fenAfter,
          opponentBestResponseUci: currEval.bestMove,
          prevMoveClassification: i > 0 ? classifications[i - 1] : undefined,
        });

        classifications[i] = classification;
        useChessStore.getState().setClassification(i, classification);
      }

      // Terminate all workers as the analysis has finished successfully
      workers.forEach((w) => w.terminate());
      globalWorkers = [];

      // Calculate overall accuracy and summary stats
      const summary = calculateSummary(moves, evaluations, classifications, store.pgn);
      useChessStore.getState().finishAnalysis(
        summary.accuracies,
        summary.counts,
        summary.estimatedRatings,
        summary.phases
      );
    } catch (err) {
      console.error('Error during analysis loop:', err);
      workers.forEach((w) => w.terminate());
      globalWorkers = [];
      store.resetAnalysis();
    }
  };

  return {
    analyzeGame,
    stopAnalysis,
    isAnalyzing: store.isAnalyzing,
    progress: store.analysisProgress,
  };
}
