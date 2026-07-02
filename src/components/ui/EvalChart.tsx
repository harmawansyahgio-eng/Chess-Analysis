import React from 'react';
import { useChessStore } from '../../store/chessStore';
import { TrendingUp } from 'lucide-react';

export const EvalChart: React.FC = () => {
  const { moves, activeMoveIndex, evals, isAnalyzing, setActiveMoveIndex } = useChessStore();

  // 1. Gather all available data points
  const points: Array<{ index: number; x: number; y: number; evalStr: string; score: number }> = [];
  
  // Starting point (index -1 represents starting FEN)
  points.push({
    index: -1,
    x: 0,
    y: 50,
    evalStr: '0.00',
    score: 0
  });

  const N = moves.length;
  let lastAnalyzedIndex = -1;

  for (let i = 0; i < N; i++) {
    const evaluation = evals[i];
    if (!evaluation) break; // Stop drawing the line where evaluations are not yet ready

    lastAnalyzedIndex = i;
    let v = 0;
    let evalStr = '0.00';

    if (evaluation.isMate) {
      const mateIn = evaluation.mateIn || 0;
      v = mateIn > 0 ? 8 : -8;
      evalStr = `M${Math.abs(mateIn)}`;
    } else {
      const scoreVal = evaluation.score;
      v = Math.max(-8, Math.min(8, scoreVal / 100));
      const sign = scoreVal >= 0 ? '+' : '';
      evalStr = `${sign}${(scoreVal / 100).toFixed(2)}`;
    }

    // Map move index (0 to N-1) to X coordinates (0 to 400 SVG units)
    const x = ((i + 1) / N) * 400;
    // Map pawn value (-8 to +8) to Y coordinates (90 to 10 SVG units)
    const y = 50 - (v / 8) * 40; 

    points.push({
      index: i,
      x,
      y,
      evalStr,
      score: v
    });
  }

  // 2. Generate SVG Paths
  let linePath = '';
  let areaPath = '';

  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    
    // Close the area path to the center line (y = 50) for a beautiful filled layout
    areaPath = `${linePath} L ${points[points.length - 1].x} 50 L 0 50 Z`;
  }

  // Find the active point to draw highlights
  const activePoint = points.find(p => p.index === activeMoveIndex);

  // Click handler to jump board position to clicked move index
  const handleChartClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (N === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;
    
    // Map click percentage back to move index (-1 to N-1)
    const rawIdx = Math.round(percent * N) - 1;
    const clickedIdx = Math.max(-1, Math.min(N - 1, rawIdx));
    
    // Only allow clicking if the move has already been analyzed
    if (clickedIdx <= lastAnalyzedIndex) {
      setActiveMoveIndex(clickedIdx);
    }
  };

  // Get score label for currently active position
  let currentEvalStr = '0.00';
  if (activeMoveIndex === -1) {
    currentEvalStr = '0.00';
  } else if (evals[activeMoveIndex]) {
    const eVal = evals[activeMoveIndex];
    if (eVal.isMate) {
      currentEvalStr = `M${Math.abs(eVal.mateIn || 0)}`;
    } else {
      const val = eVal.score / 100;
      currentEvalStr = val >= 0 ? `+${val.toFixed(2)}` : val.toFixed(2);
    }
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col backdrop-blur-sm shadow-lg h-[184px] select-none justify-between">
      {/* Chart Header */}
      <div className="flex justify-between items-center pb-1">
        <div className="flex items-center gap-1.5 text-slate-300">
          <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-bold">Grafik Evaluasi</span>
        </div>
        <div className="flex items-center gap-2">
          {isAnalyzing && (
            <span className="text-[9px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/10 animate-pulse font-bold">
              Menganalisis...
            </span>
          )}
          <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-slate-950/80 rounded border border-slate-850 text-slate-200">
            {currentEvalStr}
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="flex-1 relative w-full bg-slate-950/50 border border-slate-850/60 rounded-lg overflow-hidden py-1 flex items-center justify-center">
        {N === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[10px] text-slate-500 gap-1">
            <span>Belum ada data evaluasi.</span>
            <span>Impor PGN dan mulai analisis game.</span>
          </div>
        ) : (
          <svg
            className="w-full h-full cursor-crosshair"
            viewBox="0 0 400 100"
            preserveAspectRatio="none"
            onClick={handleChartClick}
          >
            <defs>
              {/* Clip-paths for White and Black territories */}
              <clipPath id="clip-white">
                <rect x="0" y="0" width="400" height="50" />
              </clipPath>
              <clipPath id="clip-black">
                <rect x="0" y="50" width="400" height="50" />
              </clipPath>

              {/* Gradients */}
              {/* White advantage gradient (white curve on top half, fading to center baseline) */}
              <linearGradient id="whiteGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
              </linearGradient>
              {/* Black advantage gradient (dark gradient on bottom half, fading to center baseline) */}
              <linearGradient id="blackGrad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#000000" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Background Territories Overlay */}
            {/* White zone (top half) - very subtle light grey */}
            <rect x="0" y="0" width="400" height="50" fill="#ffffff" fillOpacity="0.015" />
            {/* Black zone (bottom half) - very subtle black */}
            <rect x="0" y="50" width="400" height="50" fill="#000000" fillOpacity="0.15" />

            {/* Territory Labels */}
            <text x="10" y="18" fill="#ffffff" fillOpacity="0.75" fontSize="8" fontWeight="bold" fontFamily="sans-serif" letterSpacing="0.75">PUTIH</text>
            <text x="10" y="88" fill="#ffffff" fillOpacity="0.55" fontSize="8" fontWeight="bold" fontFamily="sans-serif" letterSpacing="0.75">HITAM</text>

            {/* Dash grid reference lines (at +-3 and +-6 pawns) */}
            <line x1="0" y1="10" x2="400" y2="10" stroke="#334155" strokeWidth="0.4" strokeDasharray="3,3" strokeOpacity="0.3" />
            <line x1="0" y1="30" x2="400" y2="30" stroke="#334155" strokeWidth="0.4" strokeDasharray="3,3" strokeOpacity="0.3" />
            <line x1="0" y1="70" x2="400" y2="70" stroke="#334155" strokeWidth="0.4" strokeDasharray="3,3" strokeOpacity="0.3" />
            <line x1="0" y1="90" x2="400" y2="90" stroke="#334155" strokeWidth="0.4" strokeDasharray="3,3" strokeOpacity="0.3" />

            {/* Equality baseline (0.00) */}
            <line x1="0" y1="50" x2="400" y2="50" stroke="#64748b" strokeWidth="0.85" strokeDasharray="2,2" strokeOpacity="0.8" />

            {/* Filled area curve with dual colors using clip-paths */}
            {points.length > 0 && (
              <>
                {/* White territory advantage fill */}
                <path
                  d={areaPath}
                  fill="url(#whiteGrad)"
                  clipPath="url(#clip-white)"
                  stroke="none"
                />
                {/* Black territory advantage fill */}
                <path
                  d={areaPath}
                  fill="url(#blackGrad)"
                  clipPath="url(#clip-black)"
                  stroke="none"
                />
              </>
            )}

            {/* Main Indigo line */}
            {points.length > 0 && (
              <path
                d={linePath}
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-[0_0_4px_rgba(99,102,241,0.5)]"
              />
            )}

            {/* Active move vertical tracker line */}
            {activePoint && (
              <line
                x1={activePoint.x}
                y1="0"
                x2={activePoint.x}
                y2="100"
                stroke="rgba(99, 102, 241, 0.35)"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            )}

            {/* Active move indicator nodes */}
            {activePoint && (
              <>
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r="6.5"
                  fill="#6366f1"
                  opacity="0.3"
                  className="animate-ping"
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r="4"
                  fill="#ffffff"
                  stroke="#6366f1"
                  strokeWidth="2"
                />
              </>
            )}
          </svg>
        )}
      </div>
    </div>
  );
};
