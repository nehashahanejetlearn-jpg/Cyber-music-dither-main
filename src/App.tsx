/**
 * CYBER DITHER - Main Application Entry
 * 3D Web Audio Visualizer with Dithering Shaders, GSAP transitions,
 * and high-performance WebGL scene graph.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SceneManager } from './three/SceneManager';
import { audioEngine } from './audio/AudioEngine';
import { LandingScreen } from './components/LandingScreen';
import { FuturisticHUD } from './components/FuturisticHUD';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const [sceneManager, setSceneManager] = useState<SceneManager | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [, setTick] = useState(0);

  // Force re-render helper for settings updates
  const forceUpdate = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  // Initialize Three.js SceneManager once canvas container is mounted
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const manager = new SceneManager(canvasContainerRef.current);
    setSceneManager(manager);

    return () => {
      manager.dispose();
      audioEngine.stop();
    };
  }, []);

  // Handle Initialize Visualizer clicked on Landing Screen
  const handleInitialize = async () => {
    // 1. Initialize Web Audio API AudioContext with user gesture
    await audioEngine.initContext();

    // 2. Play initial high-energy cyberpunk synth track
    await audioEngine.playPreset('neon_protocol');

    // 3. Trigger cinematic camera flythrough into visualizer core
    sceneManager?.cinematicZoomEntrance(() => {
      setHasInitialized(true);
    });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#030407] select-none text-slate-100">
      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={canvasContainerRef}
        className="absolute inset-0 w-full h-full z-0 cursor-grab active:cursor-grabbing"
      />

      {/* Cyber Scanlines & CRT Distortion Overlay */}
      <div className="absolute inset-0 scanlines-overlay pointer-events-none z-10 opacity-70" />

      {/* Landing Experience Screen (Visible prior to initialization) */}
      {!hasInitialized && (
        <LandingScreen onInitialize={handleInitialize} />
      )}

      {/* Futuristic Sci-Fi HUD (Visible once initialized) */}
      {hasInitialized && (
        <FuturisticHUD
          sceneManager={sceneManager}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onReopenLanding={() => setHasInitialized(false)}
        />
      )}

      {/* Settings & Shader Optics Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        sceneManager={sceneManager}
        onUpdate={forceUpdate}
      />
    </div>
  );
}
