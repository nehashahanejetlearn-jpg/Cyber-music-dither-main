/**
 * CYBER DITHER - Futuristic Sci-Fi HUD
 * Live frequency readouts, mode switching, audio controls, seek bar,
 * and real-time audio spectrum visualization.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Upload,
  Mic,
  Maximize2,
  Minimize2,
  Sliders,
  Camera,
  Radio,
  Disc,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { audioEngine, AudioAnalysisData, PRESET_TRACKS } from '../audio/AudioEngine';
import { SceneManager, VISUAL_MODES, VisualModeId } from '../three/SceneManager';

interface FuturisticHUDProps {
  sceneManager: SceneManager | null;
  onOpenSettings: () => void;
  onReopenLanding: () => void;
}

export const FuturisticHUD: React.FC<FuturisticHUDProps> = ({
  sceneManager,
  onOpenSettings,
  onReopenLanding,
}) => {
  // Telemetry & Analysis state
  const [analysis, setAnalysis] = useState<AudioAnalysisData>({
    bass: 0,
    mid: 0,
    treble: 0,
    energy: 0,
    isBeat: false,
    beatIntensity: 0,
    rawSpectrum: new Uint8Array(256),
    waveformData: new Uint8Array(256),
  });

  const [fps, setFps] = useState(60);
  const [isPlaying, setIsPlaying] = useState(audioEngine.isPlaying);
  const [volume, setVolume] = useState(audioEngine.volume);
  const [isMuted, setIsMuted] = useState(false);
  const [autoCamera, setAutoCamera] = useState(sceneManager?.autoCamera ?? true);
  const [currentMode, setCurrentMode] = useState<VisualModeId>('dither_core');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasSpectrumRef = useRef<HTMLCanvasElement | null>(null);

  // Sync state from AudioEngine
  useEffect(() => {
    const unsubscribe = audioEngine.subscribe(() => {
      setIsPlaying(audioEngine.isPlaying);
      setVolume(audioEngine.volume);
      if (audioEngine.audioElement) {
        setCurrentTime(audioEngine.audioElement.currentTime || 0);
        setDuration(audioEngine.audioElement.duration || 0);
      }
    });
    return () => unsubscribe();
  }, []);

  // Animation frame loop for HUD telemetry & spectrum bars
  useEffect(() => {
    let animId: number;

    const tick = () => {
      animId = requestAnimationFrame(tick);
      const data = audioEngine.getAnalysis();
      setAnalysis(data);

      if (sceneManager) {
        setFps(sceneManager.fps);
      }

      // Draw mini spectrum equalizer on HUD canvas
      const canvas = canvasSpectrumRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const barCount = 32;
          const barWidth = canvas.width / barCount;
          const spec = data.rawSpectrum;

          for (let i = 0; i < barCount; i++) {
            const specIdx = Math.floor((i / barCount) * 80);
            const val = spec[specIdx] / 255;
            const h = Math.max(2, val * canvas.height);
            const x = i * barWidth;
            const y = canvas.height - h;

            // Gradient cyan to magenta
            const isBass = i < 8;
            ctx.fillStyle = isBass ? '#06b6d4' : i < 20 ? '#a855f7' : '#ec4899';
            ctx.fillRect(x + 1, y, barWidth - 2, h);
          }
        }
      }
    };

    tick();
    return () => cancelAnimationFrame(animId);
  }, [sceneManager]);

  const handlePlayPause = async () => {
    if (isPlaying) {
      audioEngine.pause();
    } else {
      await audioEngine.play();
    }
  };

  const handleStop = () => {
    audioEngine.stop();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    audioEngine.setVolume(val);
    if (val > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    if (isMuted) {
      audioEngine.setVolume(volume || 0.8);
      setIsMuted(false);
    } else {
      audioEngine.setVolume(0);
      setIsMuted(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    audioEngine.seek(val);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      audioEngine.loadUserFile(file);
      setShowPresetsMenu(false);
    }
  };

  const handleSelectPreset = (id: string) => {
    audioEngine.playPreset(id);
    setShowPresetsMenu(false);
  };

  const handleToggleMic = async () => {
    const success = await audioEngine.enableMicrophone();
    if (success) {
      setShowPresetsMenu(false);
    }
  };

  const handleModeChange = (modeId: VisualModeId) => {
    setCurrentMode(modeId);
    sceneManager?.setMode(modeId, true);
  };

  const handleToggleAutoCamera = () => {
    if (sceneManager) {
      sceneManager.autoCamera = !sceneManager.autoCamera;
      setAutoCamera(sceneManager.autoCamera);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 select-none z-20">
      {/* ================= TOP SECTION ================= */}
      <div className="flex items-start justify-between gap-4 pointer-events-auto">
        {/* Top-Left: Brand & System Header */}
        <div className="cyber-panel p-3.5 border-cyan-500/30 cyber-chamfer">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 bg-cyan-400 rotate-45 shadow-[0_0_8px_#06b6d4] animate-pulse" />
            <h1 className="font-display font-black text-xl md:text-2xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white">
              CYBER DITHER
            </h1>
          </div>
          <div className="text-[10px] md:text-xs font-tech tracking-[0.2em] text-cyan-400/90 uppercase mt-0.5">
            AUDIO VISUALIZATION SYSTEM
          </div>
        </div>

        {/* Top-Right: System Telemetry & Status */}
        <div className="flex items-center gap-2">
          {/* Telemetry Box */}
          <div className="cyber-panel p-3 border-cyan-500/30 cyber-chamfer flex items-center gap-3 sm:gap-5 text-xs font-mono-data">
            {/* Online Status */}
            <div className="flex items-center gap-1.5 text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
              <span className="font-semibold tracking-wider">SYSTEM ONLINE</span>
            </div>

            <span aria-hidden="true" className="text-cyan-500/40 hidden sm:inline">|</span>

            {/* FPS */}
            <div className="text-slate-300 hidden sm:block">
              FPS <span className="text-cyan-400 font-bold">{fps}</span>
            </div>

            <span aria-hidden="true" className="text-cyan-500/40 hidden md:inline">|</span>

            {/* Particles */}
            <div className="text-slate-300 hidden md:block">
              PARTICLES <span className="text-fuchsia-400 font-bold">{sceneManager?.particleCount.toLocaleString() || '18,432'}</span>
            </div>
          </div>

          {/* Settings & Fullscreen Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenSettings}
              className="p-2.5 cyber-panel border-cyan-500/40 text-cyan-300 hover:text-white hover:border-cyan-300 transition-colors cyber-chamfer cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.15)]"
              title="Shader & Visual Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2.5 cyber-panel border-cyan-500/40 text-cyan-300 hover:text-white hover:border-cyan-300 transition-colors cyber-chamfer cursor-pointer"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ================= MIDDLE SECTION: Real-time Audio Spectrum & Meters ================= */}
      <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4 pointer-events-none">
        {/* Left Side: Real-time frequency bars */}
        <div className="cyber-panel p-3 border-cyan-500/20 cyber-chamfer pointer-events-auto w-52 md:w-64 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono-data text-cyan-400 border-b border-cyan-500/20 pb-1">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span>FREQUENCY SPECTRUM</span>
            </span>
            <span className="text-[10px] text-slate-400">512 BINS</span>
          </div>

          {/* Mini Canvas Equalizer */}
          <canvas
            ref={canvasSpectrumRef}
            width={240}
            height={36}
            className="w-full h-9 bg-black/40 border border-cyan-500/10"
          />

          {/* BASS */}
          <div>
            <div className="flex justify-between text-[11px] font-mono-data mb-0.5">
              <span className="text-slate-400">BASS</span>
              <span className="text-cyan-400 font-bold">{Math.round(analysis.bass * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-black/60 overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-75"
                style={{ width: `${Math.min(100, analysis.bass * 100)}%` }}
              />
            </div>
          </div>

          {/* MID */}
          <div>
            <div className="flex justify-between text-[11px] font-mono-data mb-0.5">
              <span className="text-slate-400">MID</span>
              <span className="text-purple-400 font-bold">{Math.round(analysis.mid * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-black/60 overflow-hidden">
              <div
                className="h-full bg-purple-400 transition-all duration-75"
                style={{ width: `${Math.min(100, analysis.mid * 100)}%` }}
              />
            </div>
          </div>

          {/* TREBLE */}
          <div>
            <div className="flex justify-between text-[11px] font-mono-data mb-0.5">
              <span className="text-slate-400">TREBLE</span>
              <span className="text-fuchsia-400 font-bold">{Math.round(analysis.treble * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-black/60 overflow-hidden">
              <div
                className="h-full bg-fuchsia-400 transition-all duration-75"
                style={{ width: `${Math.min(100, analysis.treble * 100)}%` }}
              />
            </div>
          </div>

          {/* ENERGY */}
          <div>
            <div className="flex justify-between text-[11px] font-mono-data mb-0.5">
              <span className="text-slate-400">ENERGY</span>
              <span className="text-emerald-400 font-bold">{Math.round(analysis.energy * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-black/60 overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-75"
                style={{ width: `${Math.min(100, analysis.energy * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Side: Camera Mode and Interaction helper */}
        <div className="cyber-panel p-2.5 border-cyan-500/20 cyber-chamfer pointer-events-auto flex flex-col items-end gap-2 text-xs font-mono-data">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleAutoCamera}
              className={`px-3 py-1.5 flex items-center gap-1.5 text-xs font-tech tracking-wider border cyber-chamfer cursor-pointer transition-colors ${
                autoCamera
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                  : 'bg-black/40 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>AUTO CAMERA: {autoCamera ? 'ON' : 'OFF'}</span>
            </button>
          </div>
          <div className="text-[10px] text-slate-500 text-right">
            DRAG MOUSE TO ORBIT · SCROLL TO ZOOM
          </div>
        </div>
      </div>

      {/* ================= BOTTOM SECTION: Mode Switcher & Audio Bar ================= */}
      <div className="flex flex-col gap-2.5 pointer-events-auto">
        {/* 1. VISUAL MODES TABS (Clean Segmented Cyber Controls) */}
        <div className="cyber-panel p-1.5 border-cyan-500/30 cyber-chamfer flex items-center justify-between gap-1 overflow-x-auto">
          <div className="flex items-center gap-1 w-full">
            {VISUAL_MODES.map((mode) => {
              const active = currentMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => handleModeChange(mode.id)}
                  className={`flex-1 py-1.5 px-2 md:px-3 text-xs font-tech tracking-wider whitespace-nowrap transition-all border cyber-chamfer cursor-pointer ${
                    active
                      ? 'bg-cyan-400 text-slate-950 font-bold border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                      : 'bg-black/40 text-slate-400 border-transparent hover:text-slate-200 hover:bg-cyan-950/30'
                  }`}
                >
                  <span className="opacity-70 mr-1.5">{mode.code}</span>
                  <span>{mode.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. AUDIO PLAYBACK BAR */}
        <div className="cyber-panel p-3 md:p-4 border-cyan-500/40 cyber-chamfer flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Left: Playback buttons & Current track info */}
          <div className="flex items-center justify-between w-full md:w-auto gap-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePlayPause}
                className="p-2.5 bg-gradient-to-r from-cyan-400 to-cyan-300 text-slate-950 hover:from-cyan-300 hover:to-white transition-all cyber-chamfer cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.4)] active:scale-95"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950 ml-0.5" />}
              </button>
              <button
                onClick={handleStop}
                className="p-2.5 bg-black/60 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors cyber-chamfer cursor-pointer active:scale-95"
                title="Stop Audio"
              >
                <Square className="w-4 h-4" />
              </button>
            </div>

            {/* Track Info & Mode Badge */}
            <div className="flex flex-col ml-2 truncate max-w-[180px] sm:max-w-[240px]">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono-data text-cyan-400 tracking-wider">
                  SOURCE: {audioEngine.sourceType.toUpperCase()}
                </span>
                {analysis.isBeat && (
                  <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 shadow-[0_0_6px_#ec4899] animate-ping" />
                )}
              </div>
              <span className="font-tech font-bold text-sm md:text-base text-slate-100 truncate tracking-wide">
                {audioEngine.trackTitle}
              </span>
            </div>

            {/* Presets & Audio Source Dropdown Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowPresetsMenu(!showPresetsMenu)}
                className="px-2.5 py-1.5 text-xs font-tech tracking-wider border border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/40 transition-colors cyber-chamfer cursor-pointer flex items-center gap-1.5"
              >
                <Disc className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">TRACKS</span>
              </button>

              {/* Source & Presets Popover Menu */}
              {showPresetsMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-64 cyber-panel border-cyan-500/40 p-2.5 cyber-chamfer-tl-br z-50 text-xs font-tech space-y-2 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                  <div className="text-[10px] font-mono-data text-cyan-400 uppercase tracking-widest pb-1 border-b border-cyan-500/20">
                    CYBER AUDIO SELECTOR
                  </div>

                  {/* Preset Tracks */}
                  <div className="space-y-1">
                    {PRESET_TRACKS.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleSelectPreset(t.id)}
                        className={`w-full text-left p-1.5 cyber-chamfer transition-colors cursor-pointer flex items-center justify-between ${
                          audioEngine.sourceType === 'synth' && audioEngine.currentPresetId === t.id
                            ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                            : 'hover:bg-slate-800/60 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs">{t.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono-data">{t.genre} · {t.bpm} BPM</div>
                        </div>
                        {audioEngine.sourceType === 'synth' && audioEngine.currentPresetId === t.id && (
                          <span className="text-[10px] text-cyan-400 font-mono-data">ACTIVE</span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="pt-1 border-t border-cyan-500/20 space-y-1">
                    {/* Upload Audio File */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full p-1.5 flex items-center gap-2 text-left hover:bg-slate-800/60 text-slate-300 cyber-chamfer cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-cyan-400" />
                      <span>UPLOAD AUDIO (MP3/WAV/OGG)</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {/* Microphone Stream */}
                    <button
                      onClick={handleToggleMic}
                      className="w-full p-1.5 flex items-center gap-2 text-left hover:bg-slate-800/60 text-slate-300 cyber-chamfer cursor-pointer"
                    >
                      <Mic className="w-3.5 h-3.5 text-fuchsia-400" />
                      <span>STREAM MICROPHONE INPUT</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Middle: Seek Bar (when playing uploaded audio) */}
          <div className="flex-1 w-full flex items-center gap-3">
            {audioEngine.sourceType === 'file' ? (
              <>
                <span className="text-[11px] font-mono-data text-slate-400 w-10 text-right">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 cyber-slider cursor-pointer"
                />
                <span className="text-[11px] font-mono-data text-slate-400 w-10">
                  {formatTime(duration)}
                </span>
              </>
            ) : (
              <div className="flex-1 flex items-center gap-3">
                <span className="text-[11px] font-mono-data text-cyan-400 flex items-center gap-1.5">
                  <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                  <span>SYNTH ENGINE ACTIVE</span>
                </span>
                <div className="flex-1 h-1 bg-black/40 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-cyan-400 animate-pulse"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right: Volume & Quick Controls */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 md:w-24 cyber-slider cursor-pointer"
                title="Audio Volume"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
