import React from 'react';
import { Chessboard } from 'react-chessboard';
import { useChessStore } from '../../store/chessStore';
import { SquareOverlay } from './SquareOverlay';

export const ChessBoard: React.FC = () => {
  const {
    activeFen,
    activeMoveIndex,
    moves,
    classifications,
    evals,
    boardFlipped,
  } = useChessStore();

  const activeMove = activeMoveIndex !== -1 ? moves[activeMoveIndex] : null;
  const activeEval = activeMoveIndex !== -1 ? evals[activeMoveIndex] : null;

  // Custom highlights for source and destination squares
  const customSquareStyles: Record<string, React.CSSProperties> = {};
  if (activeMove) {
    customSquareStyles[activeMove.from] = {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      boxShadow: 'inset 0 0 6px rgba(255, 255, 255, 0.15)',
    };
    customSquareStyles[activeMove.to] = {
      backgroundColor: 'rgba(99, 102, 241, 0.12)',
      boxShadow: 'inset 0 0 6px rgba(99, 102, 241, 0.25)',
    };
  }

  // Draw arrow overlay for Stockfish's best move
  // If we have an evaluation for the current position, draw the best move arrow
  const arrows: any[] = [];
  if (activeEval && activeEval.bestMove) {
    const from = activeEval.bestMove.slice(0, 2);
    const to = activeEval.bestMove.slice(2, 4);
    arrows.push({
      startSquare: from,
      endSquare: to,
      color: 'rgba(129, 140, 248, 0.65)',
    });
  }

  return (
    <div id="chessboard-capture-area" className="w-full max-w-[300px] xs:max-w-[360px] sm:max-w-[480px] md:max-w-[540px] aspect-square bg-slate-900 border-2 border-slate-800 rounded-xl overflow-hidden shadow-2xl p-1 sm:p-2">
      <Chessboard
        options={{
          position: activeFen,
          boardOrientation: boardFlipped ? 'black' : 'white',
          allowDragging: false,
          squareStyles: customSquareStyles,
          arrows: arrows,
          darkSquareStyle: { backgroundColor: '#475569' }, // Tailwind slate-600
          lightSquareStyle: { backgroundColor: '#cbd5e1' }, // Tailwind slate-300
          squareRenderer: ({ square, children }) => {
            const isDestSquare = activeMove && activeMove.to === square;
            const classification = isDestSquare ? classifications[activeMoveIndex] : null;

            return (
              <div className="relative w-full h-full select-none">
                {children}
                {/* Classification visual overlay */}
                {isDestSquare && classification && (
                  <SquareOverlay classification={classification} square={square} />
                )}
              </div>
            );
          },
        }}
      />
    </div>
  );
};
export default ChessBoard;
