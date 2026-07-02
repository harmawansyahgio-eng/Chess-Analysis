import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChessStore } from '../../store/chessStore';
import type { Classification } from '../../store/chessStore';

export const CLASSIFICATION_STYLES: Record<
  Classification,
  { symbol: string; bg: string; text: string; label: string }
> = {
  BOOK: { symbol: '📖', bg: 'bg-amber-500/20 border-amber-500/30', text: 'text-amber-300', label: 'Book' },
  BRILLIANT: {
    symbol: '!!',
    bg: 'bg-cyan-500/30 border-cyan-400/50 shadow-[0_0_8px_rgba(34,211,238,0.2)]',
    text: 'text-cyan-200 font-extrabold',
    label: 'Brilliant',
  },
  GREAT: { symbol: '!', bg: 'bg-indigo-500/25 border-indigo-500/40', text: 'text-indigo-300 font-bold', label: 'Great' },
  BEST: { symbol: '★', bg: 'bg-green-500/25 border-green-500/40', text: 'text-green-300 font-bold', label: 'Best' },
  EXCELLENT: { symbol: '✓', bg: 'bg-emerald-500/25 border-emerald-500/40', text: 'text-emerald-300', label: 'Excellent' },
  GOOD: { symbol: '👍', bg: 'bg-teal-500/20 border-teal-500/30', text: 'text-teal-300', label: 'Good' },
  FORCED: { symbol: '→', bg: 'bg-slate-500/20 border-slate-500/30', text: 'text-slate-300 font-bold', label: 'Forced' },
  INACCURACY: {
    symbol: '?!',
    bg: 'bg-yellow-500/25 border-yellow-500/40',
    text: 'text-yellow-300 font-bold',
    label: 'Inaccuracy',
  },
  MISTAKE: { symbol: '?', bg: 'bg-orange-500/25 border-orange-500/40', text: 'text-orange-300 font-bold', label: 'Mistake' },
  BLUNDER: {
    symbol: '??',
    bg: 'bg-red-500/30 border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.2)]',
    text: 'text-red-300 font-extrabold',
    label: 'Blunder',
  },
  MISS: { symbol: '✗', bg: 'bg-fuchsia-500/25 border-fuchsia-500/40', text: 'text-fuchsia-300 font-bold', label: 'Miss' },
};

import { BarChart2, RefreshCw } from 'lucide-react';
import { useStockfish } from '../../engine/useStockfish';

interface MoveListProps {
  onShowDetail?: () => void;
}

export const MoveList: React.FC<MoveListProps> = ({ onShowDetail }) => {
  const { 
    moves, 
    activeMoveIndex, 
    classifications, 
    setActiveMoveIndex, 
    isAnalyzing, 
    accuracies, 
    analysisProgress 
  } = useChessStore();
  const { stopAnalysis } = useStockfish();
  const listRef = useRef<HTMLDivElement>(null);

  // Group moves into pairs (rounds)
  const rounds: Array<{
    roundNumber: number;
    white: { moveIndex: number; san: string } | null;
    black: { moveIndex: number; san: string } | null;
  }> = [];

  for (let i = 0; i < moves.length; i += 2) {
    rounds.push({
      roundNumber: Math.floor(i / 2) + 1,
      white: { moveIndex: i, san: moves[i].san },
      black: i + 1 < moves.length ? { moveIndex: i + 1, san: moves[i + 1].san } : null,
    });
  }

  // Scroll active move into view automatically without scrolling the window
  useEffect(() => {
    if (activeMoveIndex !== -1 && listRef.current) {
      const container = listRef.current;
      const activeEl = container.querySelector(`[data-move-index="${activeMoveIndex}"]`) as HTMLElement;
      
      if (activeEl) {
        const elTop = activeEl.offsetTop;
        const elHeight = activeEl.offsetHeight;
        const containerHeight = container.clientHeight;
        const containerScrollTop = container.scrollTop;

        // If the element is below the visible area, scroll down
        if (elTop + elHeight > containerScrollTop + containerHeight) {
          container.scrollTo({
            top: elTop + elHeight - containerHeight + 4,
            behavior: 'smooth',
          });
        }
        // If the element is above the visible area, scroll up
        else if (elTop < containerScrollTop) {
          container.scrollTo({
            top: elTop - 4,
            behavior: 'smooth',
          });
        }
      }
    }
  }, [activeMoveIndex]);

  return (
    <div className="flex flex-col h-full bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-800/40 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-slate-200">Daftar Langkah</h3>
          {isAnalyzing && (
            <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full animate-pulse border border-indigo-500/20">
              Menganalisis...
            </span>
          )}
        </div>

        {accuracies && onShowDetail && (
          <button
            onClick={onShowDetail}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 border border-slate-700/60 rounded-lg text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Detail
          </button>
        )}
      </div>

      {/* Moves Container */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 max-h-[300px] sm:max-h-full relative flex flex-col">
        {isAnalyzing ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center gap-4 my-auto select-none">
            <div className="relative w-12 h-12 flex items-center justify-center">
              {/* Spinner ring */}
              <div className="absolute inset-0 border-4 border-slate-800 rounded-full" />
              <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <RefreshCw className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-200">Menganalisis Permainan...</span>
              <span className="text-[10px] text-slate-400">Mesin Stockfish sedang mengevaluasi langkah demi langkah.</span>
            </div>

            {analysisProgress && analysisProgress.total > 0 && (
              <div className="w-full max-w-[200px] flex flex-col gap-2 mt-2">
                <div className="flex justify-between text-[10px] font-bold text-indigo-400 font-mono">
                  <span>PROGRES</span>
                  <span>
                    {analysisProgress.analyzed} / {analysisProgress.total} ({Math.round((analysisProgress.analyzed / analysisProgress.total) * 100)}%)
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-850 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                    style={{ width: `${Math.round((analysisProgress.analyzed / analysisProgress.total) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={stopAnalysis}
              className="mt-2 px-4 py-1.5 bg-red-600/90 hover:bg-red-500 active:bg-red-700 text-white rounded-lg text-[10px] sm:text-xs font-bold transition-all shadow-md cursor-pointer hover:shadow-red-500/10"
            >
              Hentikan Analisis
            </button>
          </div>
        ) : rounds.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-xs text-slate-500">
            Belum ada langkah. Silakan impor PGN.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1 text-sm w-full">
            {rounds.map((round) => (
              <div
                key={round.roundNumber}
                className="grid grid-cols-12 py-1 px-2 rounded hover:bg-slate-800/20 transition-colors"
              >
                {/* Round Number */}
                <div className="col-span-2 text-slate-500 font-mono select-none">
                  {round.roundNumber}.
                </div>

                {/* White Move */}
                <div className="col-span-5 flex items-center gap-1.5 pr-2">
                  {round.white && (
                    <button
                      onClick={() => setActiveMoveIndex(round.white!.moveIndex)}
                      data-move-index={round.white.moveIndex}
                      className={`flex-1 text-left px-2 py-0.5 rounded transition-all flex items-center justify-between cursor-pointer ${
                        activeMoveIndex === round.white.moveIndex
                          ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">{round.white.san}</span>
                      
                      {/* Classification Badge */}
                      <AnimatePresence>
                        {classifications[round.white.moveIndex] && (
                          <motion.span
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`text-[9px] px-1 py-0.2 rounded border ${
                              CLASSIFICATION_STYLES[classifications[round.white.moveIndex]].bg
                            } ${CLASSIFICATION_STYLES[classifications[round.white.moveIndex]].text}`}
                            title={CLASSIFICATION_STYLES[classifications[round.white.moveIndex]].label}
                          >
                            {CLASSIFICATION_STYLES[classifications[round.white.moveIndex]].symbol}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  )}
                </div>

                {/* Black Move */}
                <div className="col-span-5 flex items-center gap-1.5 pl-2">
                  {round.black && (
                    <button
                      onClick={() => setActiveMoveIndex(round.black!.moveIndex)}
                      data-move-index={round.black.moveIndex}
                      className={`flex-1 text-left px-2 py-0.5 rounded transition-all flex items-center justify-between cursor-pointer ${
                        activeMoveIndex === round.black.moveIndex
                          ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">{round.black.san}</span>
                      
                      {/* Classification Badge */}
                      <AnimatePresence>
                        {classifications[round.black.moveIndex] && (
                          <motion.span
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`text-[9px] px-1 py-0.2 rounded border ${
                              CLASSIFICATION_STYLES[classifications[round.black.moveIndex]].bg
                            } ${CLASSIFICATION_STYLES[classifications[round.black.moveIndex]].text}`}
                            title={CLASSIFICATION_STYLES[classifications[round.black.moveIndex]].label}
                          >
                            {CLASSIFICATION_STYLES[classifications[round.black.moveIndex]].symbol}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
