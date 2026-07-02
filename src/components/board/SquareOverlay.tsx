import React from 'react';
import { motion } from 'framer-motion';
import { useChessStore } from '../../store/chessStore';
import type { Classification } from '../../store/chessStore';

interface SquareOverlayProps {
  classification: Classification;
  square?: string;
}

const BADGE_CONFIGS: Record<
  Classification,
  {
    symbol: string;
    badgeBg: string;
    squareBg: string;
    textColor: string;
    border: string;
    shadow: string;
  }
> = {
  BOOK: {
    symbol: '📖',
    badgeBg: 'bg-amber-700',
    squareBg: 'bg-amber-500/[0.08]',
    textColor: 'text-amber-100',
    border: 'border-amber-800',
    shadow: 'shadow-[0_2px_4px_rgba(180,83,9,0.3)]',
  },
  BRILLIANT: {
    symbol: '!!',
    badgeBg: 'bg-cyan-500',
    squareBg: 'bg-cyan-500/[0.12]',
    textColor: 'text-white font-extrabold',
    border: 'border-cyan-600',
    shadow: 'shadow-[0_2px_8px_rgba(6,182,212,0.4)]',
  },
  GREAT: {
    symbol: '!',
    badgeBg: 'bg-indigo-600',
    squareBg: 'bg-indigo-500/10',
    textColor: 'text-white font-extrabold',
    border: 'border-indigo-700',
    shadow: 'shadow-[0_2px_6px_rgba(99,102,241,0.4)]',
  },
  BEST: {
    symbol: '★',
    badgeBg: 'bg-green-600',
    squareBg: 'bg-green-500/10',
    textColor: 'text-white font-bold text-[8px]',
    border: 'border-green-700',
    shadow: 'shadow-[0_2px_4px_rgba(22,163,74,0.3)]',
  },
  EXCELLENT: {
    symbol: '✓',
    badgeBg: 'bg-emerald-600',
    squareBg: 'bg-emerald-500/10',
    textColor: 'text-white font-bold',
    border: 'border-emerald-700',
    shadow: 'shadow-[0_2px_4px_rgba(16,185,129,0.3)]',
  },
  GOOD: {
    symbol: '👍',
    badgeBg: 'bg-teal-600',
    squareBg: 'bg-teal-500/[0.08]',
    textColor: 'text-white text-[8px]',
    border: 'border-teal-700',
    shadow: 'shadow-[0_2px_4px_rgba(20,184,166,0.3)]',
  },
  FORCED: {
    symbol: '→',
    badgeBg: 'bg-slate-600',
    squareBg: 'bg-slate-500/[0.04]',
    textColor: 'text-white font-bold',
    border: 'border-slate-700',
    shadow: 'shadow-[0_2px_4px_rgba(71,85,105,0.3)]',
  },
  INACCURACY: {
    symbol: '?!',
    badgeBg: 'bg-yellow-500',
    squareBg: 'bg-yellow-500/[0.08]',
    textColor: 'text-slate-950 font-bold',
    border: 'border-yellow-600',
    shadow: 'shadow-[0_2px_4px_rgba(234,179,8,0.3)]',
  },
  MISTAKE: {
    symbol: '?',
    badgeBg: 'bg-orange-500',
    squareBg: 'bg-orange-500/10',
    textColor: 'text-white font-bold',
    border: 'border-orange-600',
    shadow: 'shadow-[0_2px_4px_rgba(249,115,22,0.3)]',
  },
  BLUNDER: {
    symbol: '??',
    badgeBg: 'bg-red-600',
    squareBg: 'bg-red-500/[0.12]',
    textColor: 'text-white font-extrabold',
    border: 'border-red-700',
    shadow: 'shadow-[0_2px_8px_rgba(239,68,68,0.4)]',
  },
  MISS: {
    symbol: '✗',
    badgeBg: 'bg-fuchsia-600',
    squareBg: 'bg-fuchsia-500/10',
    textColor: 'text-white font-bold',
    border: 'border-fuchsia-700',
    shadow: 'shadow-[0_2px_6px_rgba(217,70,239,0.3)]',
  },
};

export const SquareOverlay: React.FC<SquareOverlayProps> = ({ classification, square }) => {
  const { boardFlipped } = useChessStore();
  const config = BADGE_CONFIGS[classification];
  if (!config) return null;

  // Shake animation for Mistakes and Blunders
  const getAnimateType = () => {
    if (classification === 'BLUNDER') return 'shake';
    if (classification === 'MISTAKE') return 'shakeSubtle';
    return 'none';
  };

  const containerVariants = {
    shake: {
      x: [0, -4, 4, -4, 4, -2, 2, 0],
      transition: { duration: 0.4 },
    },
    shakeSubtle: {
      x: [0, -2, 2, -2, 2, 0],
      transition: { duration: 0.3 },
    },
    none: { x: 0 },
  };

  // Determine edge positioning based on board orientation
  // Not flipped (White): top edge is rank 8, right edge is H file
  // Flipped (Black): top edge is rank 1, right edge is A file
  const isTopEdge = boardFlipped ? square?.endsWith('1') : square?.endsWith('8');
  const isRightEdge = boardFlipped ? square?.startsWith('a') : square?.startsWith('h');

  let badgePositionClass = '-top-1.5 -right-1.5'; // Default (looks like Chess.com overlapping badge)
  if (isTopEdge) {
    badgePositionClass = 'top-0 right-0'; // Top edge: exactly touch top and right boundary, not exceed
  } else if (isRightEdge) {
    badgePositionClass = '-top-1.5 right-0'; // Right edge: overlap top, touch right boundary, not exceed
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* 1. Square Background Highlight */}
      <motion.div
        className={`absolute inset-0 ${config.squareBg}`}
        variants={containerVariants}
        animate={getAnimateType()}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />

      {/* 2. Special Effects (Sparkles for Brilliant, Pulsing Rings for Great) */}
      {classification === 'BRILLIANT' && (
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Sparkles (Particles) */}
          {[...Array(6)].map((_, i) => {
            const angle = (i * Math.PI) / 3;
            const distance = 24;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            return (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 bg-cyan-200 rounded-full"
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{ x, y, scale: [0, 1.2, 0], opacity: [1, 1, 0] }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.05 }}
              />
            );
          })}
          {/* Cyan center burst */}
          <motion.div
            className="w-4 h-4 bg-cyan-300 rounded-full"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: [0, 2.2, 0], opacity: [1, 0.8, 0] }}
            transition={{ duration: 0.4 }}
          />
        </div>
      )}

      {classification === 'GREAT' && (
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Pulsing ring */}
          <motion.div
            className="w-[90%] h-[90%] border-2 border-indigo-400/40 rounded-full"
            initial={{ scale: 0.3, opacity: 1 }}
            animate={{ scale: 1.1, opacity: 0 }}
            transition={{ repeat: 2, duration: 1.5, ease: 'easeOut' }}
          />
        </div>
      )}

      {/* 3. Top-Right Corner Circular Badge */}
      <motion.div
        className={`absolute ${badgePositionClass} w-[25px] h-[25px] sm:w-[29px] sm:h-[29px] rounded-full ${config.badgeBg} border-2 border-slate-950 flex items-center justify-center ${config.textColor} text-[10px] sm:text-[12px] font-black ${config.shadow}`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17, delay: 0.05 }}
      >
        {classification === 'BOOK' ? (
          <svg
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-100"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        ) : classification === 'FORCED' ? (
          <svg
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={4.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
            />
          </svg>
        ) : (
          config.symbol
        )}
      </motion.div>
    </div>
  );
};

export default SquareOverlay;
