# Zatrilysis

A client-side chess analysis platform featuring real-time Stockfish engine evaluation, move classifications, opening book lookups, and visual game phase analytics.

## Key Features

- **Local Stockfish WASM Integration:** Multi-threaded parallel position analysis running directly in the browser via Web Workers.
- **Interactive Evaluation Chart:** SVG-based advantage curve that tracks evaluation swings and supports step-navigation by clicking nodes.
- **Move Classification Engine:** Real-time categorization of moves into categories (Brilliant, Great, Best, Excellent, Good, Book, Inaccuracy, Mistake, Blunder).
- **Offline Opening Book:** Local lookup for opening lines using Polyglot binary book files (.bin).
- **Responsive Theme:** Sleek dark UI optimized for chessboards and evaluation visualizers.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite 8, Zustand, Tailwind CSS v4
- **Engine:** Stockfish 18 WASM
- **Audio:** Web Audio API (physical modeling & chiptune synthesis)

## Getting Started

### Prerequisites

- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/<username>/<repo-name>.git
   cd <repo-name>
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the local development server:

   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Configuration

The Stockfish engine parameters (depth and search times) can be adjusted in `src/engine/useStockfish.ts`.
