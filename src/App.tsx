import React, { useEffect, useState, useRef } from 'react';
import { ChessBoard } from './components/board/ChessBoard';
import { EvalBar } from './components/ui/EvalBar';
import { PGNInput } from './components/ui/PGNInput';
import { MoveList } from './components/ui/MoveList';
import { AccuracyChart } from './components/ui/AccuracyChart';
import { EvalChart } from './components/ui/EvalChart';
import { useChessStore } from './store/chessStore';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, Camera, Upload, X, BarChart2, Volume2, VolumeX } from 'lucide-react';
import { toPng } from 'html-to-image';
import { AnimatePresence, motion } from 'framer-motion';
import { ChessAudio } from './utils/audio';
import logoImg from './assets/logo.png';

export const App: React.FC = () => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('chess_muted');
    return saved === 'true';
  });
  const [soundTheme, setSoundTheme] = useState<'synth' | 'classic' | 'retro'>(() => {
    const saved = localStorage.getItem('chess_sound_theme');
    return (saved as any) || 'synth';
  });

  const moves = useChessStore(state => state.moves);
  const activeMoveIndex = useChessStore(state => state.activeMoveIndex);
  const setActiveMoveIndex = useChessStore(state => state.setActiveMoveIndex);
  const toggleBoardFlip = useChessStore(state => state.toggleBoardFlip);
  const isAnalyzing = useChessStore(state => state.isAnalyzing);
  const accuracies = useChessStore(state => state.accuracies);

  const prevAnalyzing = useRef(isAnalyzing);

  // Synchronize muted state with ChessAudio engine
  useEffect(() => {
    ChessAudio.setMuted(isMuted);
    localStorage.setItem('chess_muted', String(isMuted));
  }, [isMuted]);

  // Synchronize sound theme with ChessAudio engine
  useEffect(() => {
    ChessAudio.setTheme(soundTheme);
    localStorage.setItem('chess_sound_theme', soundTheme);
  }, [soundTheme]);

  // Play sound effect whenever the active viewed move changes
  useEffect(() => {
    if (activeMoveIndex >= 0 && activeMoveIndex < moves.length) {
      const move = moves[activeMoveIndex];
      const isCheck = move.san.includes('+') || move.san.includes('#');
      const isCapture = move.san.includes('x');

      if (isCheck) {
        ChessAudio.play('check');
      } else if (isCapture) {
        ChessAudio.play('capture');
      } else {
        ChessAudio.play('move');
      }
    }
  }, [activeMoveIndex, moves]);

  // Monitor analysis status to auto-close import and open detail modal on completion
  useEffect(() => {
    if (prevAnalyzing.current && !isAnalyzing && accuracies) {
      setIsImportModalOpen(false);
      setIsDetailModalOpen(true);
    }
    prevAnalyzing.current = isAnalyzing;
  }, [isAnalyzing, accuracies]);

  // Keyboard navigation listener (ArrowLeft / ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        return;
      }

      if (e.key === 'ArrowLeft') {
        ChessAudio.unlock();
        if (activeMoveIndex > -1) {
          setActiveMoveIndex(activeMoveIndex - 1);
        }
      } else if (e.key === 'ArrowRight') {
        ChessAudio.unlock();
        if (activeMoveIndex < moves.length - 1) {
          setActiveMoveIndex(activeMoveIndex + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMoveIndex, moves.length, setActiveMoveIndex]);

  const exportPng = () => {
    const boardEl = document.getElementById('chessboard-capture-area');
    if (!boardEl) return;

    toPng(boardEl, { cacheBust: true, backgroundColor: '#020617' })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `zatrilysis-position-${activeMoveIndex === -1 ? 'start' : 'move-' + (activeMoveIndex + 1)}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('Failed to export board image:', err);
      });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Header */}
      <header className="px-6 py-4 bg-slate-900/60 border-b border-slate-900/80 backdrop-blur-md sticky top-0 z-30 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-11 h-11 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/10 overflow-hidden">
            <img
              src={logoImg}
              alt="Zatrilysis Logo"
              className="w-10 h-10 object-contain filter drop-shadow-[0_0_6px_rgba(99,102,241,0.25)]"
              style={{ transform: 'scaleX(-1)' }}
            />
          </div>
          <div>
            <h1 className="font-extrabold text-lg bg-gradient-to-r from-slate-100 via-indigo-200 to-indigo-400 bg-clip-text text-transparent leading-tight tracking-tight">
              Zatrilysis
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">platform analisis catur</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors hidden sm:inline-block"
          >
            v1.0.0
          </a>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start justify-center">
        {/* Left Column: Board and Controls */}
        <section className="lg:col-span-7 flex flex-col items-center w-full">
          <div className="bg-slate-900/40 border border-slate-900/60 rounded-2xl p-4 sm:p-6 flex flex-col items-center shadow-lg backdrop-blur-sm w-full max-w-[620px]">
            
            {/* Grid Container for Board and Controls */}
            <div className="grid grid-cols-[auto_1fr] gap-x-3 sm:gap-x-5 gap-y-4 items-stretch w-full max-w-[340px] xs:max-w-[400px] sm:max-w-[540px] md:max-w-[600px] justify-center">
              
              {/* Column 1, Row 1: EvalBar stretching to Row 1 height */}
              <div className="col-start-1 row-start-1 h-full flex flex-col">
                <EvalBar />
              </div>

              {/* Column 2, Row 1: ChessBoard determining Row 1 height */}
              <div className="col-start-2 row-start-1 w-full aspect-square">
                <ChessBoard />
              </div>

              {/* Column 2, Row 2: Navigation Controls */}
              <div className="col-start-2 w-full">
                <div className="flex items-center justify-between w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2 shadow-inner">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { ChessAudio.unlock(); setActiveMoveIndex(-1); }}
                      disabled={activeMoveIndex === -1}
                      className="p-1.5 hover:bg-slate-800 active:bg-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer"
                      title="Posisi Awal"
                    >
                      <ChevronsLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => { ChessAudio.unlock(); setActiveMoveIndex(activeMoveIndex - 1); }}
                      disabled={activeMoveIndex === -1}
                      className="p-1.5 hover:bg-slate-800 active:bg-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer"
                      title="Langkah Sebelumnya (←)"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Fixed width container to prevent right-side buttons from shifting */}
                  <div className="w-24 sm:w-32 text-center text-xs font-mono font-bold text-slate-400 select-none truncate">
                    {activeMoveIndex === -1 ? 'AWAL' : `Langkah ${activeMoveIndex + 1}/${moves.length}`}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { ChessAudio.unlock(); setActiveMoveIndex(activeMoveIndex + 1); }}
                      disabled={activeMoveIndex === moves.length - 1 || moves.length === 0}
                      className="p-1.5 hover:bg-slate-800 active:bg-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer"
                      title="Langkah Selanjutnya (→)"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => { ChessAudio.unlock(); setActiveMoveIndex(moves.length - 1); }}
                      disabled={activeMoveIndex === moves.length - 1 || moves.length === 0}
                      className="p-1.5 hover:bg-slate-800 active:bg-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer"
                      title="Posisi Akhir"
                    >
                      <ChevronsRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Column 2, Row 3: Utility Buttons */}
              <div className="col-start-2 w-full">
                <div className="flex items-center justify-between gap-2 w-full border-t border-slate-800/40 pt-4">
                  <button
                    onClick={toggleBoardFlip}
                    className="flex-1 py-2 bg-slate-800/80 hover:bg-slate-700 active:bg-slate-800 border border-slate-700/60 rounded-xl text-[10px] sm:text-xs font-bold text-slate-200 transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm hover:shadow-indigo-500/5"
                    title="Putar Papan"
                  >
                    <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    Flip
                  </button>
                  
                  {/* Sound controls group */}
                  <div className="flex-1 flex items-center gap-1 bg-slate-800/40 p-0.5 border border-slate-700/40 rounded-xl">
                    <button
                      onClick={() => { ChessAudio.unlock(); setIsMuted(!isMuted); }}
                      className="px-2 py-1.5 bg-slate-800/80 hover:bg-slate-700 active:bg-slate-800 rounded-lg text-slate-200 transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                      title={isMuted ? "Aktifkan Suara" : "Bisukan Suara"}
                    >
                      {isMuted ? <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-400" /> : <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-400" />}
                    </button>
                    <div className="relative flex-1">
                      <select
                        value={soundTheme}
                        onChange={(e) => { ChessAudio.unlock(); setSoundTheme(e.target.value as any); }}
                        disabled={isMuted}
                        className="w-full py-1.5 pl-1 pr-4 bg-transparent text-[9px] sm:text-xs font-bold text-slate-200 transition-colors appearance-none cursor-pointer focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed text-center"
                      >
                        <option value="synth" className="bg-slate-900">🤖 Synth</option>
                        <option value="classic" className="bg-slate-900">🪵 Wood</option>
                        <option value="retro" className="bg-slate-900">👾 8-Bit</option>
                      </select>
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[6px] sm:text-[8px]">
                        ▼
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex-1 py-2 bg-slate-800/80 hover:bg-slate-700 active:bg-slate-800 border border-slate-700/60 rounded-xl text-[10px] sm:text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm hover:shadow-indigo-500/10"
                    title="Impor Game PGN"
                  >
                    <Upload className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    Import PGN
                  </button>
                  <button
                    onClick={exportPng}
                    className="flex-1 py-2 bg-slate-800/80 hover:bg-slate-700 active:bg-slate-800 border border-slate-700/60 rounded-xl text-[10px] sm:text-xs font-bold text-slate-200 transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm hover:shadow-indigo-500/5"
                    title="Ekspor Posisi Papan sebagai PNG"
                  >
                    <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    Share
                  </button>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Right Column: Move List (fixed height of 11 moves) & Eval Chart */}
        <section className="lg:col-span-5 flex flex-col gap-4 h-auto lg:h-[596px] w-full">
          <div className="h-[396px] flex flex-col">
            <MoveList onShowDetail={() => setIsDetailModalOpen(true)} />
          </div>
          <EvalChart />
        </section>
      </main>

      {/* Footer */}
      <footer className="relative mt-auto border-t border-slate-900 bg-slate-950/90 text-slate-400 overflow-hidden backdrop-blur-md">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-44 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06)_0%,transparent_70%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-12 gap-8 relative z-10">
          {/* Column 1: Branding and tagline */}
          <div className="md:col-span-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/10 overflow-hidden">
                <img
                  src={logoImg}
                  alt="Zatrilysis Logo"
                  className="w-7 h-7 object-contain"
                  style={{ transform: 'scaleX(-1)' }}
                />
              </div>
              <div>
                <h2 className="font-extrabold text-base text-slate-100 tracking-tight">Zatrilysis</h2>
                <p className="text-[9px] text-indigo-400/90 font-medium tracking-wide uppercase">platform analisis catur</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed mt-2">
              Analisis game catur Anda secara instan menggunakan mesin catur Stockfish 18 WASM langsung di browser Anda. 100% privat, aman, dan tanpa iklan.
            </p>
          </div>

          {/* Column 2: Quick Features */}
          <div className="md:col-span-3 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Fitur Utama</h3>
            <ul className="text-xs space-y-2 mt-1">
              <li className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-400 transition-colors">
                <span className="w-1 h-1 rounded-full bg-indigo-500" />
                Evaluasi Pararel Stockfish
              </li>
              <li className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-400 transition-colors">
                <span className="w-1 h-1 rounded-full bg-indigo-500" />
                Klasifikasi Kualitas Langkah
              </li>
              <li className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-400 transition-colors">
                <span className="w-1 h-1 rounded-full bg-indigo-500" />
                Pencarian Buku Pembuka
              </li>
              <li className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-400 transition-colors">
                <span className="w-1 h-1 rounded-full bg-indigo-500" />
                Grafik Evaluasi Interaktif
              </li>
            </ul>
          </div>

          {/* Column 3: Tech Badges */}
          <div className="md:col-span-4 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Spesifikasi Teknologi</h3>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="px-2.5 py-1 text-[10px] font-medium bg-slate-900 border border-slate-800 text-slate-300 rounded-md shadow-sm">
                Engine: <strong className="text-slate-100">Stockfish 18 WASM</strong>
              </span>
              <span className="px-2.5 py-1 text-[10px] font-medium bg-slate-900 border border-slate-800 text-slate-300 rounded-md shadow-sm">
                Framework: <strong className="text-slate-100">React 19</strong>
              </span>
              <span className="px-2.5 py-1 text-[10px] font-medium bg-slate-900 border border-slate-800 text-slate-300 rounded-md shadow-sm">
                Styling: <strong className="text-slate-100">Tailwind CSS v4</strong>
              </span>
              <span className="px-2.5 py-1 text-[10px] font-medium bg-slate-900 border border-slate-800 text-slate-300 rounded-md shadow-sm">
                State: <strong className="text-slate-100">Zustand Store</strong>
              </span>
              <span className="px-2.5 py-1 text-[10px] font-medium bg-slate-900 border border-slate-800 text-slate-300 rounded-md shadow-sm">
                Audio: <strong className="text-slate-100">Web Audio API</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-900/60 bg-slate-950/60 relative z-10">
          <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500 font-medium">
            <p>&copy; {new Date().getFullYear()} Zatrilysis. Seluruh hak cipta dilindungi undang-undang.</p>
            <div className="flex items-center gap-1.5 text-[11px] bg-slate-900/40 border border-slate-800/50 px-3 py-1 rounded-full text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Dijalankan secara lokal (Client-Side)
            </div>
          </div>
        </div>
      </footer>

      {/* Modals Container */}
      <AnimatePresence>
        {/* Import PGN Modal */}
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isAnalyzing) setIsImportModalOpen(false);
              }}
            />

            {/* Modal Body */}
            <motion.div
              className="relative bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[90vh]"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 220 }}
            >
              {/* Header */}
              <div className="px-6 py-4 bg-slate-800/40 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-sm text-slate-100">Impor Game PGN</h3>
                </div>
                {!isAnalyzing && (
                  <button
                    onClick={() => setIsImportModalOpen(false)}
                    className="p-1 hover:bg-slate-800 active:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Input Component */}
              <div className="flex-1 overflow-y-auto">
                <PGNInput onStart={() => setIsImportModalOpen(false)} />
              </div>
            </motion.div>
          </div>
        )}

        {/* Detail Analysis Modal */}
        {isDetailModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailModalOpen(false)}
            />

            {/* Modal Body */}
            <motion.div
              className="relative bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[90vh]"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 220 }}
            >
              {/* Header */}
              <div className="px-6 py-4 bg-slate-800/40 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-sm text-slate-100">Detail Perincian Kualitas Langkah</h3>
                </div>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-1 hover:bg-slate-800 active:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chart Component */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-950/20">
                <AccuracyChart />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
