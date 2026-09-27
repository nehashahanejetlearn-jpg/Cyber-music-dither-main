/**
 * CYBER DITHER - Visual & Shader Configuration Modal
 */

import React from 'react';
import { X, Sliders, Layers, Palette, Eye, Activity, RotateCcw } from 'lucide-react';
import { SceneManager } from '../three/SceneManager';
import { audioEngine } from '../audio/AudioEngine';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sceneManager: SceneManager | null;
  onUpdate: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  sceneManager,
  onUpdate,
}) => {
  if (!isOpen || !sceneManager) return null;

  const ditherModes = [
    { id: 0, label: 'Bayer 4x4 (Classic)' },
    { id: 1, label: 'Bayer 8x8 (High Res)' },
    { id: 2, label: 'Halftone Matrix' },
    { id: 3, label: 'Digital Grain' },
    { id: 4, label: 'Crosshatch' },
  ];

  const palettes = [
    { id: 0, label: 'Cyber Neon', desc: 'Cyan, Magenta & Deep Obsidian' },
    { id: 1, label: 'Emerald Terminal', desc: '1980s Phosphor Matrix Green' },
    { id: 2, label: 'Amber Phosphor', desc: 'Warm CRT Amber Display' },
    { id: 3, label: 'Hyper Vapor', desc: 'Electric Hot Pink & Sky Cyan' },
    { id: 4, label: 'Quantized RGB', desc: 'High Dynamic Color Stepping' },
  ];

  const handleResetDefaults = () => {
    sceneManager.ditherModeIndex = 0;
    sceneManager.paletteModeIndex = 0;
    sceneManager.ditherScale = 2.0;
    sceneManager.ditherIntensity = 0.85;
    sceneManager.visualIntensity = 1.0;
    sceneManager.scanlines = 0.25;
    audioEngine.setSensitivity(1.0);
    onUpdate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-xl cyber-panel border border-cyan-500/40 p-6 cyber-chamfer-tl-br text-slate-100 shadow-[0_0_50px_rgba(6,182,212,0.2)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="font-display font-bold text-lg tracking-wider text-cyan-300 uppercase">
              Shader &amp; Optics Engine
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-cyan-950/60 rounded transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="mt-5 space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          {/* 1. DITHER PATTERN MODE */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs font-mono-data text-cyan-400 uppercase tracking-wider">
              <Layers className="w-4 h-4" />
              <span>Dither Matrix Pattern</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ditherModes.map((dm) => (
                <button
                  key={dm.id}
                  onClick={() => {
                    sceneManager.ditherModeIndex = dm.id;
                    onUpdate();
                  }}
                  className={`px-3 py-2 text-xs font-tech tracking-wide text-left transition-all border cyber-chamfer cursor-pointer ${
                    sceneManager.ditherModeIndex === dm.id
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                      : 'bg-black/40 border-slate-700/60 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  {dm.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. COLOR PALETTE */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs font-mono-data text-fuchsia-400 uppercase tracking-wider">
              <Palette className="w-4 h-4" />
              <span>Cyber Dither Palette</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {palettes.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    sceneManager.paletteModeIndex = p.id;
                    onUpdate();
                  }}
                  className={`p-2.5 text-left transition-all border cyber-chamfer cursor-pointer ${
                    sceneManager.paletteModeIndex === p.id
                      ? 'bg-fuchsia-950/40 border-fuchsia-400 text-fuchsia-200 shadow-[0_0_12px_rgba(236,72,153,0.3)]'
                      : 'bg-black/40 border-slate-700/60 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-tech font-bold">{p.label}</div>
                  <div className="text-[11px] text-slate-400 font-mono-data truncate">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. SLIDERS: Dither Intensity & Pixel Scale */}
          <div className="space-y-4 pt-2 border-t border-cyan-500/10">
            {/* Dither Blend Intensity */}
            <div>
              <div className="flex justify-between text-xs font-mono-data text-slate-300 mb-1">
                <span>DITHER BLEND INTENSITY</span>
                <span className="text-cyan-400">{Math.round(sceneManager.ditherIntensity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={sceneManager.ditherIntensity}
                onChange={(e) => {
                  sceneManager.ditherIntensity = parseFloat(e.target.value);
                  onUpdate();
                }}
                className="w-full cyber-slider cursor-pointer"
              />
            </div>

            {/* Dither Pixel Scale */}
            <div>
              <div className="flex justify-between text-xs font-mono-data text-slate-300 mb-1">
                <span>PIXELATION DOWNSCALE</span>
                <span className="text-cyan-400">{sceneManager.ditherScale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="6"
                step="0.5"
                value={sceneManager.ditherScale}
                onChange={(e) => {
                  sceneManager.ditherScale = parseFloat(e.target.value);
                  onUpdate();
                }}
                className="w-full cyber-slider cursor-pointer"
              />
            </div>

            {/* Visual Intensity / Displacement */}
            <div>
              <div className="flex justify-between text-xs font-mono-data text-slate-300 mb-1">
                <span>VISUAL DISPLACEMENT INTENSITY</span>
                <span className="text-fuchsia-400">{sceneManager.visualIntensity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="2.2"
                step="0.1"
                value={sceneManager.visualIntensity}
                onChange={(e) => {
                  sceneManager.visualIntensity = parseFloat(e.target.value);
                  onUpdate();
                }}
                className="w-full cyber-slider cursor-pointer"
              />
            </div>

            {/* Audio Sensitivity */}
            <div>
              <div className="flex justify-between text-xs font-mono-data text-slate-300 mb-1">
                <span>AUDIO SENSITIVITY CALIBRATION</span>
                <span className="text-cyan-400">{audioEngine.sensitivity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="2.5"
                step="0.1"
                value={audioEngine.sensitivity}
                onChange={(e) => {
                  audioEngine.setSensitivity(parseFloat(e.target.value));
                  onUpdate();
                }}
                className="w-full cyber-slider cursor-pointer"
              />
            </div>

            {/* CRT Scanlines */}
            <div>
              <div className="flex justify-between text-xs font-mono-data text-slate-300 mb-1">
                <span>CRT SCANLINE EFFECT</span>
                <span className="text-cyan-400">{Math.round(sceneManager.scanlines * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.05"
                value={sceneManager.scanlines}
                onChange={(e) => {
                  sceneManager.scanlines = parseFloat(e.target.value);
                  onUpdate();
                }}
                className="w-full cyber-slider cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-between pt-4 border-t border-cyan-500/20 text-xs font-mono-data">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET DEFAULTS</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 font-display font-semibold tracking-wider text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-colors cyber-chamfer cursor-pointer"
          >
            APPLY CONFIG
          </button>
        </div>
      </div>
    </div>
  );
};
