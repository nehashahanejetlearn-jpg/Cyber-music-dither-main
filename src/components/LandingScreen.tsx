/**
 * CYBER DITHER - Futuristic Landing Screen & Initialization Sequence
 */

import React, { useState } from 'react';
import { Play, Activity, Sparkles, Disc, Radio, ShieldCheck } from 'lucide-react';
import gsap from 'gsap';

interface LandingScreenProps {
  onInitialize: () => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({ onInitialize }) => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [initStep, setInitStep] = useState(0);

  const steps = [
    'CONNECTING AUDIO ENGINE & WEBAUDIO CONTEXT...',
    'COMPILING DITHER POST-PROCESSING SHADER MATRIX...',
    'ALLOCATING 18,432-POINT GPU PARTICLE SYSTEM BUFFER...',
    'CALIBRATING FAST FOURIER FREQUENCY ANALYZER...',
    'CYBER DITHER PIPELINE ONLINE — LAUNCHING...'
  ];

  const handleStart = () => {
    setIsInitializing(true);

    // Sequence the loading messages with GSAP
    let current = 0;
    const interval = setInterval(() => {
      current++;
      if (current < steps.length) {
        setInitStep(current);
      } else {
        clearInterval(interval);
        // Animate landing screen fade out and zoom into 3D visualizer
        gsap.to('#landing-container', {
          opacity: 0,
          scale: 1.08,
          duration: 0.8,
          ease: 'power3.in',
          onComplete: () => {
            onInitialize();
          }
        });
      }
    }, 420);
  };

  return (
    <div
      id="landing-container"
      className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 md:p-12 pointer-events-auto bg-gradient-to-b from-black/85 via-black/40 to-black/90 backdrop-blur-xs select-none"
    >
      {/* Top Header Tag */}
      <div className="w-full flex items-center justify-between text-xs font-mono-data tracking-wider text-cyan-400/80 border-b border-cyan-500/20 pb-4">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-white font-semibold tracking-widest">SYSTEM SPEC: AUDIO-REACTIVE 3D WEBGL</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-slate-400">
          <span>PRECISION FFT: 512 BINS</span>
          <span aria-hidden="true">·</span>
          <span>GPU DITHER: ACTIVE</span>
          <span aria-hidden="true">·</span>
          <span className="text-cyan-400">STATUS: READY</span>
        </div>
      </div>

      {/* Central Hero Block */}
      <div className="flex flex-col items-center text-center my-auto max-w-3xl">
        {/* Subtle Cyber Badge */}
        <div className="flex items-center gap-2 px-3 py-1 mb-6 text-xs font-mono-data tracking-widest uppercase border border-cyan-500/40 bg-cyan-950/40 text-cyan-300">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>Interactive Audio Visualizer</span>
        </div>

        {/* Main Title */}
        <h1 className="text-5xl md:text-8xl font-black font-display tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-fuchsia-500 drop-shadow-[0_0_35px_rgba(6,182,212,0.4)]">
          CYBER DITHER
        </h1>

        {/* Subtitle */}
        <p className="mt-4 text-sm md:text-lg font-tech tracking-[0.25em] text-cyan-200/90 uppercase">
          Real-Time Audio Visualization System
        </p>

        <p className="mt-3 text-xs md:text-sm text-slate-400 max-w-lg leading-relaxed font-tech">
          Experience real-time Web Audio frequency analysis mapped directly to 3D morphing geometries,
          ordered Bayer dithering shaders, and dynamic particle storms.
        </p>

        {/* Initialize Button or Loading State */}
        <div className="mt-10 min-h-[90px] flex flex-col items-center justify-center">
          {!isInitializing ? (
            <button
              onClick={handleStart}
              className="group relative px-8 py-4 font-display font-bold text-sm tracking-widest uppercase text-slate-900 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-white transition-all duration-300 cyber-chamfer shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:shadow-[0_0_45px_rgba(6,182,212,0.8)] active:scale-95 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Play className="w-4 h-4 fill-slate-950 text-slate-950 transition-transform group-hover:scale-125" />
                <span>Initialize Visualizer</span>
              </div>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3 w-full max-w-md">
              <div className="w-full bg-slate-900/80 border border-cyan-500/40 p-3 cyber-chamfer">
                <div className="flex items-center justify-between text-xs font-mono-data text-cyan-400 mb-2">
                  <span>SYSTEM INITIALIZATION</span>
                  <span>{Math.round(((initStep + 1) / steps.length) * 100)}%</span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 bg-black/60 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-cyan-400 transition-all duration-300"
                    style={{ width: `${((initStep + 1) / steps.length) * 100}%` }}
                  />
                </div>
                <div className="mt-2 text-[11px] font-mono-data text-slate-300 tracking-wide truncate">
                  &gt; {steps[initStep]}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feature Pills replaced with clean unboxed metadata */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-mono-data">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ordered Dithering Shaders</span>
          </div>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <div className="flex items-center gap-1.5">
            <Disc className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>5 Visual Dimension Modes</span>
          </div>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>MP3 / WAV / Mic / Procedural Synth</span>
          </div>
        </div>
      </div>

      {/* Bottom Footer Note */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono-data text-slate-500 pt-4 border-t border-cyan-500/10 gap-2">
        <div>
          <span>HIGH-ENERGY AUDIO HARDWARE ACCELERATION READY</span>
        </div>
        <div className="flex items-center gap-2 text-cyan-500/80">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>CYBER DITHER CORE v1.0.0</span>
        </div>
      </div>
    </div>
  );
};
