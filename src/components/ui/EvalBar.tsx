import React from 'react';
import { motion } from 'framer-motion';
import { useChessStore } from '../../store/chessStore';

export const EvalBar: React.FC = () => {
  const evals = useChessStore(state => state.evals);
  const activeMoveIndex = useChessStore(state => state.activeMoveIndex);
  const boardFlipped = useChessStore(state => state.boardFlipped);
  
  // Get active evaluation
  const activeEval = evals[activeMoveIndex];
  
  let percentage = 50; // default equal (50% White, 50% Black)
  let label = '0.0';

  if (activeEval) {
    if (activeEval.isMate) {
      const mateIn = activeEval.mateIn || 0;
      label = `M${Math.abs(mateIn)}`;
      const isWhiteWinningMate = mateIn > 0;
      percentage = isWhiteWinningMate ? 100 : 0;
    } else {
      const pawns = activeEval.score / 100;
      // Format label
      label = (pawns >= 0 ? '+' : '') + pawns.toFixed(1);
      
      // Clamp pawns to [-10, 10] for visualization
      const clampedPawns = Math.max(-10, Math.min(10, pawns));
      // Map -10..10 to 0%..100% of White's share
      percentage = ((clampedPawns + 10) / 20) * 100;
    }
  }

  const displayLabel = activeEval ? label : '0.0';
  const isWhiteWinning = percentage >= 50;

  // Anchoring of White area: bottom if White is at bottom, top if flipped
  const whiteAreaAlignClass = boardFlipped ? 'top-0' : 'bottom-0';

  // Determine label position (always show on the larger/winning side's area)
  let showAtTop = false;
  let textClass = 'text-white font-extrabold';

  if (isWhiteWinning) {
    // Show in White Area (which has a light background, so text is black)
    textClass = 'text-black font-extrabold';
    showAtTop = boardFlipped; // White is at top if flipped, bottom if not
  } else {
    // Show in Black Area (which has a dark background, so text is white)
    textClass = 'text-white font-extrabold';
    showAtTop = !boardFlipped; // Black is at top if not flipped, bottom if flipped
  }

  const positionClass = showAtTop ? 'top-2' : 'bottom-2';

  return (
    <div className="relative w-7 sm:w-10 h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col shadow-inner select-none pointer-events-none">
      {/* Black Area (acting as the default dark background) */}
      <div className="absolute inset-0 bg-slate-800" />
      
      {/* White Area - Animated height, anchored dynamically */}
      <motion.div
        className={`absolute left-0 right-0 bg-slate-100 shadow-[0_-4px_12px_rgba(255,255,255,0.4)] ${whiteAreaAlignClass}`}
        initial={{ height: '50%' }}
        animate={{ height: `${percentage}%` }}
        transition={{ type: 'spring', stiffness: 80, damping: 20 }}
      />

      {/* Numerical Eval Label */}
      <div 
        className={`absolute left-0 right-0 z-10 text-center text-[10px] sm:text-xs select-none pointer-events-none transition-all duration-300 ${positionClass} ${textClass}`}
      >
        {displayLabel}
      </div>
    </div>
  );
};

export default EvalBar;
