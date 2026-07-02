export type ChessSoundTheme = 'synth' | 'classic' | 'retro';
export type ChessSoundType = 'move' | 'capture' | 'check';

class ChessAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private currentTheme: ChessSoundTheme = 'synth';

  // Preloaded Classic Wooden Sounds from Lichess CDN
  private classicMove = new Audio('https://lichess1.org/assets/sound/standard/Move.mp3');
  private classicCapture = new Audio('https://lichess1.org/assets/sound/standard/Capture.mp3');

  constructor() {
    this.classicMove.preload = 'auto';
    this.classicCapture.preload = 'auto';
    this.classicMove.volume = 0.85;
    this.classicCapture.volume = 0.85;
  }

  /**
   * Initializes or resumes the AudioContext.
   * MUST be called directly in a user click event to satisfy browser security policies.
   */
  public unlock() {
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (e) {
      console.warn('AudioContext unlock failed:', e);
    }
  }

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Generates a white noise buffer of specific duration.
   * Used to synthesize realistic organic wooden pop textures.
   */
  private createNoiseBuffer(duration: number): AudioBuffer | null {
    if (!this.ctx) return null;
    try {
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      return buffer;
    } catch (e) {
      return null;
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setTheme(theme: ChessSoundTheme) {
    this.currentTheme = theme;
  }

  public getTheme(): ChessSoundTheme {
    return this.currentTheme;
  }

  public play(type: ChessSoundType) {
    if (this.muted) return;

    if (this.currentTheme === 'classic') {
      this.playClassic(type);
    } else {
      this.playSynthesized(type);
    }
  }

  private playClassic(type: ChessSoundType) {
    try {
      if (type === 'move') {
        this.classicMove.currentTime = 0;
        this.classicMove.play().catch(() => {});
      } else if (type === 'capture') {
        this.classicCapture.currentTime = 0;
        this.classicCapture.play().catch(() => {});
      } else if (type === 'check') {
        this.classicMove.currentTime = 0;
        this.classicMove.play().catch(() => {});
        setTimeout(() => {
          this.classicMove.currentTime = 0;
          this.classicMove.play().catch(() => {});
        }, 110);
      }
    } catch (e) {
      console.warn('Classic playback failed:', e);
    }
  }

  private playSynthesized(type: ChessSoundType) {
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      if (this.currentTheme === 'synth') {
        // --- 1. Organic ASMR / Synth Theme ---
        if (type === 'move') {
          // Organic Wood Tap: Sine wave pitch sweep + resonant noise burst for wood texture
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(110, now + 0.05);

          // Wood fiber impact pop
          const noise = this.ctx.createBufferSource();
          const noiseBuffer = this.createNoiseBuffer(0.015); // 15ms burst
          if (noiseBuffer) {
            noise.buffer = noiseBuffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 600;
            filter.Q.value = 5;

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.3, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(now);
          }

          gain.gain.setValueAtTime(0.5, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.055);
        } 
        else if (type === 'capture') {
          // Ceramic/Marble Click: High-frequency double impact
          const playClick = (time: number, freq: number, vol: number) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            const filter = this.ctx!.createBiquadFilter();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.4, time + 0.025);

            filter.type = 'highpass';
            filter.frequency.value = 800;

            gain.gain.setValueAtTime(vol, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx!.destination);

            osc.start(time);
            osc.stop(time + 0.028);
          };

          // Two clicks spaced 15ms apart to simulate collision
          playClick(now, 1600, 0.45);
          playClick(now + 0.015, 1200, 0.35);
        } 
        else if (type === 'check') {
          // Warm Resonant Tibetan Chime: 3 harmonizing frequencies with vibrato
          const freqs = [440, 554.37, 659.25]; // A4, C#5, E5 (Major triad)
          const masterGain = this.ctx.createGain();
          masterGain.gain.setValueAtTime(0.25, now);
          masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          masterGain.connect(this.ctx.destination);

          freqs.forEach((f, idx) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            
            // Add slight vibrato to make it sound organic/ringing
            const lfo = this.ctx!.createOscillator();
            const lfoGain = this.ctx!.createGain();
            lfo.frequency.value = 6; // 6 Hz vibrato
            lfoGain.gain.value = 3;  // Pitch depth

            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now);

            // Ring-out envelope per note
            gain.gain.setValueAtTime(0.3 - idx * 0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4 - idx * 0.05);

            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            osc.connect(gain);
            gain.connect(masterGain);

            lfo.start(now);
            osc.start(now);
            lfo.stop(now + 0.45);
            osc.stop(now + 0.45);
          });
        }
      } 
      else if (this.currentTheme === 'retro') {
        // --- 2. Retro 8-bit Arcade Theme ---
        if (type === 'move') {
          // Quick retro square wave blip
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.setValueAtTime(450, now + 0.04);

          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.085);
        } 
        else if (type === 'capture') {
          // Downward retro laser sweep
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);

          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.125);
        } 
        else if (type === 'check') {
          // Retro double alarm beep
          const playBeep = (time: number) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, time);
            
            gain.gain.setValueAtTime(0.12, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

            osc.connect(gain);
            gain.connect(this.ctx!.destination);
            osc.start(time);
            osc.stop(time + 0.085);
          };
          playBeep(now);
          playBeep(now + 0.1);
        }
      }
    } catch (e) {
      console.warn('Synth playback failed:', e);
    }
  }
}

export const ChessAudio = new ChessAudioEngine();
export default ChessAudio;
