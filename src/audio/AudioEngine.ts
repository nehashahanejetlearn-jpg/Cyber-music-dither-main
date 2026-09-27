/**
 * CYBER DITHER - Audio Engine
 * Real-time audio analysis with Web Audio API, procedural synth engine,
 * file upload support, and mic streaming.
 */

export interface AudioAnalysisData {
  bass: number;        // 0.0 - 1.0
  mid: number;         // 0.0 - 1.0
  treble: number;      // 0.0 - 1.0
  energy: number;      // 0.0 - 1.0
  isBeat: boolean;     // transient spike
  beatIntensity: number; // 0.0 - 1.0 decaying
  rawSpectrum: Uint8Array;
  waveformData: Uint8Array;
}

export type AudioSourceType = 'synth' | 'file' | 'mic';

export interface PresetTrack {
  id: string;
  name: string;
  bpm: number;
  genre: string;
  description: string;
}

export const PRESET_TRACKS: PresetTrack[] = [
  {
    id: 'neon_protocol',
    name: 'NEON PROTOCOL',
    bpm: 138,
    genre: 'DARKSYNTH',
    description: 'Relentless arpeggiated cyberpunk drive with heavy sub-bass punches.',
  },
  {
    id: 'chroma_overdrive',
    name: 'CHROMA OVERDRIVE',
    bpm: 152,
    genre: 'CYBERPUNK GLITCH',
    description: 'Aggressive industrial pulses, resonant sweeps, and syncopated beats.',
  },
  {
    id: 'void_drift',
    name: 'VOID DRIFT',
    bpm: 104,
    genre: 'SYNTH NOIR',
    description: 'Deep atmospheric cosmic voyage with low rumble and ethereal leads.',
  },
];

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private mediaElementSource: MediaElementAudioSourceNode | null = null;
  private micStreamSource: MediaStreamAudioSourceNode | null = null;
  private micStream: MediaStream | null = null;

  // File audio element
  public audioElement: HTMLAudioElement;

  // Analysis buffers
  private frequencyData: Uint8Array = new Uint8Array(256);
  private timeDomainData: Uint8Array = new Uint8Array(256);

  // Beat detection & smoothing
  private beatCutoff = 0.5;
  private beatDecay = 0.95;
  private currentBeatIntensity = 0;
  private smoothedBass = 0;
  private smoothedMid = 0;
  private smoothedTreble = 0;
  private smoothedEnergy = 0;

  // State
  public sourceType: AudioSourceType = 'synth';
  public currentPresetId: string = 'neon_protocol';
  public isPlaying = false;
  public volume = 0.85;
  public sensitivity = 1.0;
  public trackTitle = 'NEON PROTOCOL';

  // Synth Sequencer
  private synthInterval: number | null = null;
  private synthStep = 0;
  private synthMasterGain: GainNode | null = null;

  // Callbacks
  private onStateChangeCallbacks: Array<() => void> = [];

  constructor() {
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.loop = true;

    this.audioElement.addEventListener('ended', () => {
      this.isPlaying = false;
      this.notifyStateChange();
    });

    this.audioElement.addEventListener('timeupdate', () => {
      this.notifyStateChange();
    });

    this.audioElement.addEventListener('play', () => {
      this.isPlaying = true;
      this.notifyStateChange();
    });

    this.audioElement.addEventListener('pause', () => {
      this.isPlaying = false;
      this.notifyStateChange();
    });
  }

  public subscribe(cb: () => void): () => void {
    this.onStateChangeCallbacks.push(cb);
    return () => {
      this.onStateChangeCallbacks = this.onStateChangeCallbacks.filter((c) => c !== cb);
    };
  }

  private notifyStateChange() {
    for (const cb of this.onStateChangeCallbacks) {
      cb();
    }
  }

  public async initContext(): Promise<boolean> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.82;

      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);

      this.synthMasterGain = this.ctx.createGain();
      this.synthMasterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.synthMasterGain.connect(this.analyser);

      // Route analyser -> master gain -> destination
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);

      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeDomainData = new Uint8Array(this.analyser.frequencyBinCount);
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    return true;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
    this.audioElement.volume = this.volume;
    this.notifyStateChange();
  }

  public setSensitivity(val: number) {
    this.sensitivity = Math.max(0.2, Math.min(3.0, val));
    this.notifyStateChange();
  }

  // --- AUDIO FILE HANDLING ---
  public async loadUserFile(file: File) {
    await this.initContext();
    this.stop();

    const url = URL.createObjectURL(file);
    this.audioElement.src = url;
    this.audioElement.load();
    this.sourceType = 'file';
    this.trackTitle = file.name.replace(/\.[^/.]+$/, '');

    if (this.ctx && this.analyser) {
      if (!this.mediaElementSource) {
        this.mediaElementSource = this.ctx.createMediaElementSource(this.audioElement);
      }
      this.mediaElementSource.disconnect();
      this.mediaElementSource.connect(this.analyser);
    }

    await this.play();
  }

  public async playPreset(presetId: string) {
    await this.initContext();
    this.stop();

    this.sourceType = 'synth';
    this.currentPresetId = presetId;
    const preset = PRESET_TRACKS.find((p) => p.id === presetId) || PRESET_TRACKS[0];
    this.trackTitle = preset.name;
    this.startProceduralSynth(preset);
    this.isPlaying = true;
    this.notifyStateChange();
  }

  public async enableMicrophone(): Promise<boolean> {
    try {
      await this.initContext();
      this.stop();

      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (this.ctx && this.analyser) {
        this.micStreamSource = this.ctx.createMediaStreamSource(this.micStream);
        this.micStreamSource.connect(this.analyser);
      }
      this.sourceType = 'mic';
      this.trackTitle = 'LIVE AUDIO FEED';
      this.isPlaying = true;
      this.notifyStateChange();
      return true;
    } catch (err) {
      console.error('Microphone access denied or unavailable', err);
      return false;
    }
  }

  public async play() {
    await this.initContext();

    if (this.sourceType === 'file') {
      try {
        await this.audioElement.play();
        this.isPlaying = true;
      } catch (e) {
        console.warn('Playback error', e);
      }
    } else if (this.sourceType === 'synth') {
      const preset = PRESET_TRACKS.find((p) => p.id === this.currentPresetId) || PRESET_TRACKS[0];
      this.startProceduralSynth(preset);
      this.isPlaying = true;
    }
    this.notifyStateChange();
  }

  public pause() {
    if (this.sourceType === 'file') {
      this.audioElement.pause();
    } else if (this.sourceType === 'synth') {
      this.stopProceduralSynth();
    }
    this.isPlaying = false;
    this.notifyStateChange();
  }

  public stop() {
    this.pause();
    if (this.sourceType === 'file') {
      this.audioElement.currentTime = 0;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.micStreamSource) {
      this.micStreamSource.disconnect();
      this.micStreamSource = null;
    }
    this.isPlaying = false;
    this.notifyStateChange();
  }

  public seek(seconds: number) {
    if (this.sourceType === 'file' && this.audioElement.duration) {
      this.audioElement.currentTime = Math.max(0, Math.min(seconds, this.audioElement.duration));
      this.notifyStateChange();
    }
  }

  // --- PROCEDURAL CYBERPUNK SYNTHESIS ENGINE ---
  private startProceduralSynth(preset: PresetTrack) {
    this.stopProceduralSynth();
    if (!this.ctx || !this.synthMasterGain) return;

    const bpm = preset.bpm;
    const stepDuration = (60 / bpm) / 4; // 16th note in seconds

    // Scales for cyberpunk atmosphere (Minor Pentatonic / Dorian / Phrygian)
    let rootFreq = 55; // A1
    let scale = [0, 3, 5, 7, 10, 12, 15, 17]; // A Minor Pentatonic
    if (preset.id === 'chroma_overdrive') {
      rootFreq = 61.74; // B1
      scale = [0, 1, 5, 7, 8, 12, 13, 17]; // Phrygian
    } else if (preset.id === 'void_drift') {
      rootFreq = 43.65; // F1
      scale = [0, 3, 7, 10, 12, 14, 15, 19]; // Dorian
    }

    this.synthStep = 0;
    const intervalMs = Math.round(stepDuration * 1000);

    const stepTick = () => {
      if (!this.ctx || !this.synthMasterGain) return;
      const t = this.ctx.currentTime;
      const step = this.synthStep % 16;
      const bar = Math.floor(this.synthStep / 16);

      // 1. KICK DRUM (Heavy 808-style punch on 0, 4, 8, 12 + syncopation)
      const hasKick = step === 0 || step === 4 || step === 8 || step === 12 || (step === 10 && bar % 2 === 1);
      if (hasKick) {
        this.triggerKick(t, preset.id === 'chroma_overdrive' ? 1.3 : 1.0);
      }

      // 2. SNARE / CLAP (Steps 4 and 12)
      if (step === 4 || step === 12) {
        this.triggerSnare(t);
      }

      // 3. HI-HAT (16th notes with velocity swing)
      const hatVelocity = step % 2 === 0 ? 0.25 : 0.12;
      this.triggerHat(t, hatVelocity);

      // 4. BASSLINE (Punchy driving rolling bass)
      if (step % 2 === 0) {
        const bassNoteOffset = (step === 8 && bar % 4 === 3) ? 5 : (step === 12 && bar % 2 === 1) ? 3 : 0;
        const freq = rootFreq * Math.pow(2, bassNoteOffset / 12);
        this.triggerBass(t, freq, stepDuration * 1.8);
      }

      // 5. CYBER ARPEGGIO / SYNTH LEAD
      const arpNote = scale[(this.synthStep * 3 + (bar % 4)) % scale.length];
      const leadFreq = (rootFreq * 4) * Math.pow(2, arpNote / 12);
      this.triggerLead(t, leadFreq, stepDuration * 0.9, preset.id);

      this.synthStep++;
    };

    stepTick();
    this.synthInterval = window.setInterval(stepTick, intervalMs);
  }

  private stopProceduralSynth() {
    if (this.synthInterval !== null) {
      window.clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
  }

  private triggerKick(time: number, power = 1.0) {
    if (!this.ctx || !this.synthMasterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140 * power, time);
    osc.frequency.exponentialRampToValueAtTime(32, time + 0.12);

    gain.gain.setValueAtTime(0.9 * power, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.32);

    osc.connect(gain);
    gain.connect(this.synthMasterGain);

    osc.start(time);
    osc.stop(time + 0.35);
  }

  private triggerSnare(time: number) {
    if (!this.ctx || !this.synthMasterGain) return;
    // Noise buffer for snap
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.synthMasterGain);

    noise.start(time);
    noise.stop(time + 0.13);
  }

  private triggerHat(time: number, velocity: number) {
    if (!this.ctx || !this.synthMasterGain) return;
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(8000, time);
    filter.Q.value = 3.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(velocity * 0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.synthMasterGain);

    noise.start(time);
    noise.stop(time + 0.05);
  }

  private triggerBass(time: number, freq: number, duration: number) {
    if (!this.ctx || !this.synthMasterGain) return;
    const osc = this.ctx.createOscillator();
    const oscSub = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    oscSub.type = 'sine';
    oscSub.frequency.setValueAtTime(freq * 0.5, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, time);
    filter.frequency.exponentialRampToValueAtTime(140, time + duration);
    filter.Q.value = 4.0;

    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    oscSub.connect(filter);
    filter.connect(gain);
    gain.connect(this.synthMasterGain);

    osc.start(time);
    oscSub.start(time);
    osc.stop(time + duration);
    oscSub.stop(time + duration);
  }

  private triggerLead(time: number, freq: number, duration: number, presetId: string) {
    if (!this.ctx || !this.synthMasterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = presetId === 'chroma_overdrive' ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.5, time);
    filter.Q.value = 2.5;

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.synthMasterGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  // --- REAL-TIME AUDIO ANALYSIS ---
  public getAnalysis(): AudioAnalysisData {
    if (!this.analyser) {
      return {
        bass: 0,
        mid: 0,
        treble: 0,
        energy: 0,
        isBeat: false,
        beatIntensity: 0,
        rawSpectrum: this.frequencyData,
        waveformData: this.timeDomainData,
      };
    }

    this.analyser.getByteFrequencyData(this.frequencyData as any);
    this.analyser.getByteTimeDomainData(this.timeDomainData as any);

    const binCount = this.analyser.frequencyBinCount; // 256
    // Assuming sampleRate = 44100 or 48000, each bin is ~86Hz - 93Hz
    // Bass: bins 0 to 4 (approx 0 - 350 Hz)
    // Mid: bins 5 to 30 (approx 350 - 2800 Hz)
    // Treble: bins 31 to 140 (approx 2800 - 13000 Hz)

    let bassSum = 0;
    let bassCount = 0;
    for (let i = 0; i <= 4 && i < binCount; i++) {
      bassSum += this.frequencyData[i];
      bassCount++;
    }

    let midSum = 0;
    let midCount = 0;
    for (let i = 5; i <= 32 && i < binCount; i++) {
      midSum += this.frequencyData[i];
      midCount++;
    }

    let trebleSum = 0;
    let trebleCount = 0;
    for (let i = 33; i <= 140 && i < binCount; i++) {
      trebleSum += this.frequencyData[i];
      trebleCount++;
    }

    let totalEnergy = 0;
    for (let i = 0; i < binCount; i++) {
      totalEnergy += this.frequencyData[i];
    }

    // Scale with user sensitivity
    const rawBass = (bassCount > 0 ? (bassSum / bassCount) / 255 : 0) * this.sensitivity;
    const rawMid = (midCount > 0 ? (midSum / midCount) / 255 : 0) * this.sensitivity;
    const rawTreble = (trebleCount > 0 ? (trebleSum / trebleCount) / 255 : 0) * this.sensitivity;
    const rawEnergy = ((totalEnergy / binCount) / 255) * this.sensitivity;

    // Smooth values for fluid animation
    const lerpFactor = 0.22;
    this.smoothedBass += (rawBass - this.smoothedBass) * lerpFactor;
    this.smoothedMid += (rawMid - this.smoothedMid) * lerpFactor;
    this.smoothedTreble += (rawTreble - this.smoothedTreble) * lerpFactor;
    this.smoothedEnergy += (rawEnergy - this.smoothedEnergy) * lerpFactor;

    // Transient Beat Detection
    let isBeat = false;
    if (rawBass > this.beatCutoff && rawBass > this.smoothedBass * 1.3) {
      isBeat = true;
      this.currentBeatIntensity = Math.min(1.0, (rawBass - this.beatCutoff) * 2.5);
      this.beatCutoff = rawBass * 1.1; // raise threshold
    } else {
      this.currentBeatIntensity *= this.beatDecay;
      this.beatCutoff *= 0.985; // slowly decay threshold
      if (this.beatCutoff < 0.25) this.beatCutoff = 0.25;
    }

    return {
      bass: Math.min(1.0, this.smoothedBass),
      mid: Math.min(1.0, this.smoothedMid),
      treble: Math.min(1.0, this.smoothedTreble),
      energy: Math.min(1.0, this.smoothedEnergy),
      isBeat,
      beatIntensity: this.currentBeatIntensity,
      rawSpectrum: this.frequencyData,
      waveformData: this.timeDomainData,
    };
  }
}

// Singleton audio engine instance
export const audioEngine = new AudioEngine();
