import React from 'react';
import { useChessStore } from '../../store/chessStore';
import type { Classification } from '../../store/chessStore';
import { CLASSIFICATION_STYLES } from './MoveList';

const ORDERED_CLASSIFICATIONS: Classification[] = [
  'BRILLIANT',
  'BEST',
  'GREAT',
  'EXCELLENT',
  'GOOD',
  'BOOK',
  'FORCED',
  'INACCURACY',
  'MISTAKE',
  'BLUNDER',
  'MISS',
];

export const AccuracyChart: React.FC = () => {
  const { accuracies, counts, estimatedRatings, phases } = useChessStore();

  if (!accuracies || !counts) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center text-xs text-slate-500 h-full flex flex-col justify-center backdrop-blur-sm shadow-inner">
        Analisis belum dimulai atau sedang berjalan. Impor PGN dan tekan "Analyze" untuk melihat ringkasan akurasi.
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm flex flex-col gap-6 shadow-lg h-full">
      {/* Accuracy & Estimated Rating Performance Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* White Player */}
        <div className="bg-slate-800/30 border border-slate-800 rounded-lg p-3.5 text-center flex flex-col gap-1 shadow-sm">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Akurasi Putih</span>
          <span className="text-3xl font-black text-slate-100 font-mono tracking-tight">{accuracies.white}%</span>
          {estimatedRatings && (
            <span className="text-[11px] font-bold text-indigo-300 mt-1">Performa: ~{estimatedRatings.white} Elo</span>
          )}
          <div className="h-1.5 w-full bg-slate-950 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-slate-100 rounded-full" style={{ width: `${accuracies.white}%` }} />
          </div>
        </div>

        {/* Black Player */}
        <div className="bg-slate-800/30 border border-slate-800 rounded-lg p-3.5 text-center flex flex-col gap-1 shadow-sm">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Akurasi Hitam</span>
          <span className="text-3xl font-black text-slate-100 font-mono tracking-tight">{accuracies.black}%</span>
          {estimatedRatings && (
            <span className="text-[11px] font-bold text-indigo-300 mt-1">Performa: ~{estimatedRatings.black} Elo</span>
          )}
          <div className="h-1.5 w-full bg-slate-950 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${accuracies.black}%` }} />
          </div>
        </div>
      </div>

      {/* Game Phases Assessment */}
      {phases && (
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider select-none">
            Analisis Fase Permainan
          </h4>
          <div className="flex flex-col gap-3.5 bg-slate-800/20 border border-slate-800/60 p-4 rounded-xl shadow-sm">
            {(['opening', 'middlegame', 'endgame'] as const).map((phaseKey) => {
              const phaseName = {
                opening: 'Pembukaan (Opening)',
                middlegame: 'Mid Game (Middlegame)',
                endgame: 'End Game (Endgame)',
              }[phaseKey];
              
              const stats = phases[phaseKey];
              
              // Skip if phase didn't occur in the game
              if (stats.white.accuracy === -1 && stats.black.accuracy === -1) {
                return null;
              }

              return (
                <div key={phaseKey} className="flex flex-col gap-2 pb-3.5 border-b border-slate-800/40 last:border-b-0 last:pb-0">
                  <div className="text-xs font-bold text-slate-200">{phaseName}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* White Stats */}
                    <div className="flex flex-col gap-0.5 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/40">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-semibold">Putih</span>
                        <span className="font-mono font-bold text-slate-100">{stats.white.accuracy}%</span>
                      </div>
                      <span className="text-[10px] text-slate-400 leading-tight mt-1">{stats.white.assessment}</span>
                    </div>

                    {/* Black Stats */}
                    <div className="flex flex-col gap-0.5 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/40">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-semibold">Hitam</span>
                        <span className="font-mono font-bold text-indigo-400">{stats.black.accuracy}%</span>
                      </div>
                      <span className="text-[10px] text-slate-400 leading-tight mt-1">{stats.black.assessment}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Classification Breakdown Table */}
      <div className="flex-1 flex flex-col">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 select-none">
          Perincian Kualitas Langkah
        </h4>
        <div className="flex-1 overflow-y-auto max-h-[160px] sm:max-h-full pr-1">
          <div className="flex flex-col gap-1.5">
            {ORDERED_CLASSIFICATIONS.map((cls) => {
              const whiteCount = counts.white[cls] || 0;
              const blackCount = counts.black[cls] || 0;
              const style = CLASSIFICATION_STYLES[cls];

              if (whiteCount === 0 && blackCount === 0) return null;

              return (
                <div
                  key={cls}
                  className="flex items-center justify-between text-xs py-1.5 px-3 bg-slate-800/10 border border-slate-800/40 rounded-lg hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 text-center py-0.2 rounded border text-[10px] ${style.bg} ${style.text}`}
                    >
                      {style.symbol}
                    </span>
                    <span className="font-medium text-slate-300">{style.label}</span>
                  </div>

                  <div className="flex items-center gap-4 font-mono font-bold">
                    <span className="text-slate-200" title={`${whiteCount} kali oleh Putih`}>
                      {whiteCount}
                    </span>
                    <span className="text-slate-600 font-normal">|</span>
                    <span className="text-indigo-400" title={`${blackCount} kali oleh Hitam`}>
                      {blackCount}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
