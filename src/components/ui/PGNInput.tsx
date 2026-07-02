import React, { useState } from 'react';
import { useChessStore } from '../../store/chessStore';
import { parsePgn } from '../../analysis/pgnParser';
import { useStockfish } from '../../engine/useStockfish';
import { Upload, Play, AlertCircle, RefreshCw } from 'lucide-react';


interface PGNInputProps {
  onStart?: () => void;
}

export const PGNInput: React.FC<PGNInputProps> = ({ onStart }) => {
  const [pgn, setPgn] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { analyzeGame, stopAnalysis, isAnalyzing, progress } = useStockfish();
  const setGame = useChessStore((state) => state.setGame);

  const handleAnalyze = async () => {
    setError(null);
    if (!pgn.trim()) {
      setError('PGN tidak boleh kosong');
      return;
    }

    try {
      // 1. Parse PGN
      const parsed = parsePgn(pgn);
      
      // 2. Set parsed game in store
      setGame(pgn, parsed.moves, parsed.startingFen);
      
      // 3. Trigger modal close callback immediately
      if (onStart) onStart();
      
      // 4. Trigger Stockfish analysis asynchronously
      await analyzeGame(parsed.moves, parsed.startingFen);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memproses PGN');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pgn')) {
      setError('File harus berformat .pgn');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setPgn(text);
      setError(null);
    };
    reader.onerror = () => {
      setError('Gagal membaca file');
    };
    reader.readAsText(file);
  };

  const progressPercent = progress.total > 0 ? Math.round((progress.analyzed / progress.total) * 100) : 0;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm flex flex-col gap-4 shadow-lg h-full">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm text-slate-200">Impor Game (PGN)</h3>
        {!isAnalyzing && (
          <button
            onClick={() => setPgn('')}
            className="text-[10px] text-slate-400 hover:text-slate-200 hover:underline transition-colors"
          >
            Bersihkan
          </button>
        )}
      </div>

      {/* PGN Textarea */}
      <textarea
        value={pgn}
        onChange={(e) => setPgn(e.target.value)}
        disabled={isAnalyzing}
        placeholder="Paste your PGN here..."
        className="w-full h-36 sm:h-48 bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors resize-none disabled:opacity-50"
      />

      {/* File Uploader */}
      {!isAnalyzing && (
        <div className="flex items-center justify-between gap-3 bg-slate-800/20 border border-slate-800/40 p-2.5 rounded-lg">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400">Pilih file .pgn</span>
          </div>
          <input
            type="file"
            accept=".pgn"
            onChange={handleFileUpload}
            className="hidden"
            id="pgn-file-upload"
          />
          <label
            htmlFor="pgn-file-upload"
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-750 text-slate-200 rounded text-xs font-medium cursor-pointer transition-colors shadow-sm"
          >
            Telusuri
          </label>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 flex items-start gap-2 text-xs">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action / Progress Buttons */}
      {isAnalyzing ? (
        <div className="flex flex-col gap-2.5 bg-slate-800/15 border border-slate-800/40 p-4 rounded-lg">
          <div className="flex justify-between text-xs font-medium text-slate-300">
            <span className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              Menganalisis langkah...
            </span>
            <span className="font-mono text-indigo-300">
              {progress.analyzed} / {progress.total} ({progressPercent}%)
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(99,102,241,0.5)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {/* Stop Button */}
          <button
            onClick={stopAnalysis}
            className="w-full py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-md mt-1 cursor-pointer"
          >
            Hentikan Analisis
          </button>
        </div>
      ) : (
        <button
          onClick={handleAnalyze}
          className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:from-indigo-700 active:to-indigo-800 text-white rounded-lg text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] cursor-pointer"
        >
          <Play className="w-4 h-4 fill-white" />
          Mulai Analisis
        </button>
      )}
    </div>
  );
};
