/**
 * CYBER DITHER - Three.js 3D Scene Manager
 * Controls 3D scenes, 5 audio-reactive visual modes, particle storm,
 * cinematic camera choreography, post-processing dither pass, and user orbit.
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { audioEngine, AudioAnalysisData } from '../audio/AudioEngine';
import { DitherShader } from '../shaders/DitherShader';

export type VisualModeId = 'dither_core' | 'cyber_grid' | 'particle_storm' | 'neon_vortex' | 'digital_void';

export interface VisualModeConfig {
  id: VisualModeId;
  name: string;
  code: string;
  description: string;
}

export const VISUAL_MODES: VisualModeConfig[] = [
  {
    id: 'dither_core',
    name: 'DITHER CORE',
    code: 'MODE 01',
    description: 'Hyper-distorted morphing core with orbital rings and reactive wireframes',
  },
  {
    id: 'cyber_grid',
    name: 'CYBER GRID',
    code: 'MODE 02',
    description: 'Massive undulating 3D synthwave landscape reacting to bass frequencies',
  },
  {
    id: 'particle_storm',
    name: 'PARTICLE STORM',
    code: 'MODE 03',
    description: '18,432 cosmic particles forming evolving galaxy structures and shockwaves',
  },
  {
    id: 'neon_vortex',
    name: 'NEON VORTEX',
    code: 'MODE 04',
    description: 'Hyperspace geometric tunnel pulsing to real-time audio spectrum bands',
  },
  {
    id: 'digital_void',
    name: 'DIGITAL VOID',
    code: 'MODE 05',
    description: 'Minimal zero-g space with floating platonic shards and reactive beam spotlights',
  },
];

export class SceneManager {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;

  // Post-processing Dither Pass
  private renderTarget!: THREE.WebGLRenderTarget;
  private postScene!: THREE.Scene;
  private postCamera!: THREE.OrthographicCamera;
  private ditherQuad!: THREE.Mesh;
  public ditherMaterial!: THREE.ShaderMaterial;

  // Visual Mode Groups
  private currentMode: VisualModeId = 'dither_core';
  private modeGroups: Map<VisualModeId, THREE.Group> = new Map();

  // Mode 1: Dither Core Objects
  private coreMesh!: THREE.Mesh;
  private coreWireframe!: THREE.Mesh;
  private coreInnerCrystal!: THREE.Mesh;
  private coreRing1!: THREE.Mesh;
  private coreRing2!: THREE.Mesh;
  private coreRing3!: THREE.Mesh;
  private coreOriginalPositions!: Float32Array;

  // Mode 2: Cyber Grid Objects
  private gridMesh!: THREE.Mesh;
  private gridOriginalZ!: Float32Array;
  private gridPillars: THREE.Mesh[] = [];

  // Mode 3: Particle Storm
  private stormParticles!: THREE.Points;
  private stormBasePositions!: Float32Array;
  private stormVelocities!: Float32Array;
  private stormColors!: Float32Array;
  public readonly particleCount = 18432;

  // Mode 4: Neon Vortex Objects
  private vortexRings: THREE.LineSegments[] = [];
  private readonly vortexRingCount = 36;

  // Mode 5: Digital Void Objects
  private voidFragments: THREE.Mesh[] = [];
  private spotLightCyan!: THREE.SpotLight;
  private spotLightMagenta!: THREE.SpotLight;

  // Global background ambient particles
  private ambientParticles!: THREE.Points;

  // Camera & Interaction
  public autoCamera = true;
  private cameraTarget = new THREE.Vector3(0, 0, 0);
  private cameraBaseDistance = 18;
  private cameraAngle = 0;
  private isUserInteracting = false;
  private mousePrevX = 0;
  private mousePrevY = 0;
  private userPolarAngle = Math.PI / 3;
  private userAzimuthAngle = 0;

  // Settings
  public visualIntensity = 1.0;
  public ditherIntensity = 0.85;
  public ditherScale = 2.0;
  public ditherModeIndex = 0;
  public paletteModeIndex = 0;
  public scanlines = 0.25;

  // Performance Telemetry
  public fps = 60;
  private frameCount = 0;
  private lastFpsTime = performance.now();
  private animationFrameId: number | null = null;
  private clock = new THREE.Clock();

  constructor(container: HTMLElement) {
    this.container = container;
    this.initThree();
    this.initDitherPostProcessing();
    this.initAmbientAtmosphere();
    this.initMode1DitherCore();
    this.initMode2CyberGrid();
    this.initMode3ParticleStorm();
    this.initMode4NeonVortex();
    this.initMode5DigitalVoid();
    this.setupEventListeners();
    this.setMode('dither_core', false);
    this.animate();
  }

  private initThree() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020408);
    this.scene.fog = new THREE.FogExp2(0x020408, 0.015);

    // Camera
    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    this.camera.position.set(0, 4, 18);
    this.camera.lookAt(this.cameraTarget);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: false, // Dithering works best without native blur
      stencil: false,
      depth: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x101a2c, 1.2);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x00f0ff, 2.0);
    dirLight1.position.set(10, 20, 15);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xff0088, 2.0);
    dirLight2.position.set(-10, -10, -15);
    this.scene.add(dirLight2);
  }

  private initDitherPostProcessing() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // Render target for primary 3D scene
    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    });

    // Orthographic post-processing quad
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postScene = new THREE.Scene();

    this.ditherMaterial = new THREE.ShaderMaterial({
      vertexShader: DitherShader.vertexShader,
      fragmentShader: DitherShader.fragmentShader,
      uniforms: THREE.UniformsUtils.clone(DitherShader.uniforms),
      depthTest: false,
      depthWrite: false,
    });

    this.ditherMaterial.uniforms.tDiffuse.value = this.renderTarget.texture;
    this.ditherMaterial.uniforms.uResolution.value.set(width, height);
    this.ditherMaterial.uniforms.uDitherScale.value = this.ditherScale;
    this.ditherMaterial.uniforms.uDitherIntensity.value = this.ditherIntensity;

    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    this.ditherQuad = new THREE.Mesh(quadGeometry, this.ditherMaterial);
    this.postScene.add(this.ditherQuad);
  }

  // --- AMBIENT FLOATING PARTICLES (Visible across all modes) ---
  private initAmbientAtmosphere() {
    const count = 1200;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      positions[idx] = (Math.random() - 0.5) * 60;
      positions[idx + 1] = (Math.random() - 0.5) * 40;
      positions[idx + 2] = (Math.random() - 0.5) * 60;

      // Cyan to Magenta gradient
      const isCyan = Math.random() > 0.4;
      colors[idx] = isCyan ? 0.05 : 0.95;
      colors[idx + 1] = isCyan ? 0.85 : 0.1;
      colors[idx + 2] = isCyan ? 1.0 : 0.85;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });

    this.ambientParticles = new THREE.Points(geom, mat);
    this.scene.add(this.ambientParticles);
  }

  // --- MODE 1: DITHER CORE ---
  private initMode1DitherCore() {
    const group = new THREE.Group();

    // 1. Organic Morphed Sphere
    const sphereGeom = new THREE.IcosahedronGeometry(3.5, 5);
    this.coreOriginalPositions = new Float32Array(sphereGeom.attributes.position.array);

    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x050e18,
      metalness: 0.85,
      roughness: 0.15,
      emissive: 0x004455,
      emissiveIntensity: 0.4,
      wireframe: false,
    });
    this.coreMesh = new THREE.Mesh(sphereGeom, sphereMat);
    group.add(this.coreMesh);

    // 2. Outer Wireframe Shell
    const wireGeom = new THREE.IcosahedronGeometry(3.7, 3);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.65,
    });
    this.coreWireframe = new THREE.Mesh(wireGeom, wireMat);
    group.add(this.coreWireframe);

    // 3. Inner Energy Crystal
    const octaGeom = new THREE.OctahedronGeometry(1.8, 0);
    const octaMat = new THREE.MeshBasicMaterial({
      color: 0xff00a0,
      wireframe: true,
    });
    this.coreInnerCrystal = new THREE.Mesh(octaGeom, octaMat);
    group.add(this.coreInnerCrystal);

    // 4. Orbital Cyber Rings
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true });
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0xff0077, wireframe: true });
    const ringMat3 = new THREE.MeshBasicMaterial({ color: 0x7928ca, wireframe: true });

    this.coreRing1 = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.05, 8, 48), ringMat1);
    this.coreRing2 = new THREE.Mesh(new THREE.TorusGeometry(6.4, 0.05, 8, 64), ringMat2);
    this.coreRing3 = new THREE.Mesh(new THREE.TorusGeometry(7.8, 0.05, 8, 80), ringMat3);

    this.coreRing1.rotation.x = Math.PI / 4;
    this.coreRing2.rotation.y = Math.PI / 3;
    this.coreRing3.rotation.z = Math.PI / 6;

    group.add(this.coreRing1);
    group.add(this.coreRing2);
    group.add(this.coreRing3);

    this.scene.add(group);
    this.modeGroups.set('dither_core', group);
  }

  // --- MODE 2: CYBER GRID ---
  private initMode2CyberGrid() {
    const group = new THREE.Group();
    group.position.y = -3;

    const width = 60;
    const height = 60;
    const segments = 48;
    const planeGeom = new THREE.PlaneGeometry(width, height, segments, segments);
    planeGeom.rotateX(-Math.PI / 2);

    this.gridOriginalZ = new Float32Array(planeGeom.attributes.position.array);

    const planeMat = new THREE.MeshStandardMaterial({
      color: 0x030712,
      wireframe: true,
      emissive: 0x00d8ff,
      emissiveIntensity: 0.35,
    });

    this.gridMesh = new THREE.Mesh(planeGeom, planeMat);
    group.add(this.gridMesh);

    // Cyber Monolith Pillars lining the horizon
    const pillarGeom = new THREE.BoxGeometry(1.2, 12, 1.2);
    for (let i = 0; i < 16; i++) {
      const isLeft = i % 2 === 0;
      const x = (isLeft ? -1 : 1) * (14 + Math.random() * 8);
      const z = -20 + (i / 16) * 45;

      const pillarMat = new THREE.MeshStandardMaterial({
        color: 0x070c18,
        emissive: isLeft ? 0x00f0ff : 0xff0066,
        emissiveIntensity: 0.4,
        metalness: 0.9,
        roughness: 0.1,
      });

      const pillar = new THREE.Mesh(pillarGeom, pillarMat);
      pillar.position.set(x, 2, z);
      this.gridPillars.push(pillar);
      group.add(pillar);
    }

    this.scene.add(group);
    this.modeGroups.set('cyber_grid', group);
  }

  // --- MODE 3: PARTICLE STORM (18,432 Particles) ---
  private initMode3ParticleStorm() {
    const group = new THREE.Group();
    const count = this.particleCount;

    const geom = new THREE.BufferGeometry();
    this.stormBasePositions = new Float32Array(count * 3);
    this.stormVelocities = new Float32Array(count * 3);
    this.stormColors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      // Galaxy / Cosmic double-spiral arm distribution
      const arm = i % 2 === 0 ? 0 : Math.PI;
      const radius = 1.0 + Math.pow(Math.random(), 0.6) * 16.0;
      const spinAngle = radius * 0.8 + arm + (Math.random() - 0.5) * 0.7;

      const x = Math.cos(spinAngle) * radius;
      const z = Math.sin(spinAngle) * radius;
      const y = (Math.random() - 0.5) * (4.0 * (1.0 - radius / 18.0));

      this.stormBasePositions[idx] = x;
      this.stormBasePositions[idx + 1] = y;
      this.stormBasePositions[idx + 2] = z;

      // Velocities
      this.stormVelocities[idx] = (Math.random() - 0.5) * 0.02;
      this.stormVelocities[idx + 1] = (Math.random() - 0.5) * 0.02;
      this.stormVelocities[idx + 2] = (Math.random() - 0.5) * 0.02;

      // Colors: Cyan core transitioning to magenta and electric violet edges
      const t = radius / 16.0;
      if (t < 0.35) {
        // Bright Cyan
        this.stormColors[idx] = 0.1;
        this.stormColors[idx + 1] = 0.95;
        this.stormColors[idx + 2] = 1.0;
      } else if (t < 0.7) {
        // Neon Purple
        this.stormColors[idx] = 0.65;
        this.stormColors[idx + 1] = 0.1;
        this.stormColors[idx + 2] = 0.95;
      } else {
        // Vivid Magenta
        this.stormColors[idx] = 1.0;
        this.stormColors[idx + 1] = 0.05;
        this.stormColors[idx + 2] = 0.55;
      }
    }

    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.stormBasePositions), 3));
    geom.setAttribute('color', new THREE.BufferAttribute(this.stormColors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    this.stormParticles = new THREE.Points(geom, mat);
    group.add(this.stormParticles);

    this.scene.add(group);
    this.modeGroups.set('particle_storm', group);
  }

  // --- MODE 4: NEON VORTEX ---
  private initMode4NeonVortex() {
    const group = new THREE.Group();
    this.vortexRings = [];

    const segments = 8; // Octagonal tunnel
    for (let i = 0; i < this.vortexRingCount; i++) {
      const radius = 2.5 + (i * 0.35);
      const ringGeom = new THREE.CircleGeometry(radius, segments);
      const edges = new THREE.EdgesGeometry(ringGeom);

      // Alternating cyan, magenta, and electric blue
      const colorVal = i % 3 === 0 ? 0x00f0ff : i % 3 === 1 ? 0xff0088 : 0x7000ff;
      const mat = new THREE.LineBasicMaterial({
        color: colorVal,
        linewidth: 1.5,
        transparent: true,
        opacity: Math.max(0.2, 1.0 - (i / this.vortexRingCount) * 0.75),
      });

      const line = new THREE.LineSegments(edges, mat);
      line.position.z = -i * 3.5;
      this.vortexRings.push(line);
      group.add(line);
    }

    this.scene.add(group);
    this.modeGroups.set('neon_vortex', group);
  }

  // --- MODE 5: DIGITAL VOID ---
  private initMode5DigitalVoid() {
    const group = new THREE.Group();
    this.voidFragments = [];

    const geometries = [
      new THREE.IcosahedronGeometry(1.2, 0),
      new THREE.OctahedronGeometry(1.4, 0),
      new THREE.TetrahedronGeometry(1.5, 0),
      new THREE.DodecahedronGeometry(1.3, 0),
      new THREE.BoxGeometry(1.5, 1.5, 1.5),
    ];

    for (let i = 0; i < 30; i++) {
      const geom = geometries[i % geometries.length];
      const isWire = i % 2 === 0;

      const mat = isWire
        ? new THREE.MeshBasicMaterial({
            color: i % 4 === 0 ? 0x00f0ff : i % 4 === 1 ? 0xff0099 : 0x00ff88,
            wireframe: true,
          })
        : new THREE.MeshStandardMaterial({
            color: 0x0a101d,
            roughness: 0.1,
            metalness: 0.9,
            emissive: 0x040812,
          });

      const mesh = new THREE.Mesh(geom, mat);
      const angle = (i / 30) * Math.PI * 2;
      const radius = 6 + Math.random() * 10;
      mesh.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 12,
        Math.sin(angle) * radius
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

      this.voidFragments.push(mesh);
      group.add(mesh);
    }

    // Spotlights
    this.spotLightCyan = new THREE.SpotLight(0x00ffff, 4.0, 40, Math.PI / 5, 0.4);
    this.spotLightCyan.position.set(10, 15, 10);
    this.spotLightCyan.target.position.set(0, 0, 0);
    group.add(this.spotLightCyan);
    group.add(this.spotLightCyan.target);

    this.spotLightMagenta = new THREE.SpotLight(0xff00a0, 4.0, 40, Math.PI / 5, 0.4);
    this.spotLightMagenta.position.set(-10, -10, 10);
    this.spotLightMagenta.target.position.set(0, 0, 0);
    group.add(this.spotLightMagenta);
    group.add(this.spotLightMagenta.target);

    this.scene.add(group);
    this.modeGroups.set('digital_void', group);
  }

  // --- MODE SWITCHING WITH GSAP ---
  public setMode(modeId: VisualModeId, animate = true) {
    if (this.currentMode === modeId && animate) return;
    this.currentMode = modeId;

    this.modeGroups.forEach((grp, key) => {
      if (key === modeId) {
        grp.visible = true;
        if (animate) {
          gsap.killTweensOf(grp.position);
          gsap.killTweensOf(grp.rotation);
          grp.position.set(0, key === 'cyber_grid' ? -3 : 0, 0);
          gsap.fromTo(grp.scale, { x: 0.1, y: 0.1, z: 0.1 }, { x: 1, y: 1, z: 1, duration: 1.2, ease: 'power3.out' });
        } else {
          grp.scale.set(1, 1, 1);
          grp.position.set(0, key === 'cyber_grid' ? -3 : 0, 0);
        }
      } else {
        if (animate) {
          gsap.to(grp.scale, {
            x: 0.05,
            y: 0.05,
            z: 0.05,
            duration: 0.6,
            ease: 'power2.in',
            onComplete: () => {
              grp.visible = false;
            },
          });
        } else {
          grp.visible = false;
        }
      }
    });

    // Camera preset adjustments per mode
    if (animate) {
      if (modeId === 'neon_vortex') {
        gsap.to(this.camera.position, { x: 0, y: 0, z: 6, duration: 1.4, ease: 'expo.out' });
      } else if (modeId === 'cyber_grid') {
        gsap.to(this.camera.position, { x: 0, y: 6, z: 16, duration: 1.4, ease: 'power3.out' });
      } else if (modeId === 'particle_storm') {
        gsap.to(this.camera.position, { x: 0, y: 12, z: 20, duration: 1.4, ease: 'power3.out' });
      } else {
        gsap.to(this.camera.position, { x: 0, y: 3, z: 17, duration: 1.4, ease: 'power3.out' });
      }
    }
  }

  // --- CINEMATIC CAMERA FLYTHROUGH (Landing to Visualizer) ---
  public cinematicZoomEntrance(onComplete?: () => void) {
    this.autoCamera = true;
    this.camera.position.set(0, 0, 45);

    gsap.timeline({ onComplete })
      .to(this.camera.position, {
        x: 0,
        y: 4,
        z: 17,
        duration: 2.2,
        ease: 'expo.inOut',
      })
      .to(this.camera.rotation, {
        z: 0,
        duration: 1.5,
        ease: 'power2.out',
      }, '-=1.2');
  }

  // --- EVENT LISTENERS ---
  private setupEventListeners() {
    window.addEventListener('resize', this.onResize);

    const dom = this.renderer.domElement;
    dom.addEventListener('mousedown', (e) => {
      this.isUserInteracting = true;
      this.mousePrevX = e.clientX;
      this.mousePrevY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isUserInteracting = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isUserInteracting) {
        const deltaX = (e.clientX - this.mousePrevX) * 0.005;
        const deltaY = (e.clientY - this.mousePrevY) * 0.005;

        this.userAzimuthAngle -= deltaX;
        this.userPolarAngle = Math.max(0.1, Math.min(Math.PI - 0.1, this.userPolarAngle - deltaY));

        this.mousePrevX = e.clientX;
        this.mousePrevY = e.clientY;
      }
    });

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraBaseDistance = Math.max(6, Math.min(40, this.cameraBaseDistance + e.deltaY * 0.02));
    }, { passive: false });
  }

  private onResize = () => {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.renderTarget.setSize(width, height);
    this.ditherMaterial.uniforms.uResolution.value.set(width, height);
  };

  // --- ANIMATION / RENDER LOOP ---
  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // 1. Fetch real-time audio analysis
    const audio = audioEngine.getAnalysis();

    // 2. Update HUD Telemetry / FPS
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      this.frameCount = 0;
      this.lastFpsTime = now;
    }

    // 3. Update Camera Movement
    this.updateCamera(delta, time, audio);

    // 4. Update Ambient Atmosphere
    if (this.ambientParticles) {
      this.ambientParticles.rotation.y = time * 0.03;
      this.ambientParticles.rotation.x = time * 0.01;
    }

    // 5. Update Current Visual Mode
    this.updateActiveMode(delta, time, audio);

    // 6. Update Dither Shader Uniforms
    this.updateDitherShader(time, audio);

    // 7. Render 3D scene to offscreen render target
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    // 8. Render Dither Post-Processing pass to screen
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCamera);
  };

  private updateCamera(delta: number, time: number, audio: AudioAnalysisData) {
    if (this.autoCamera && !this.isUserInteracting) {
      // Cinematic auto-orbit
      this.cameraAngle += (0.25 + audio.energy * 0.45) * delta;
      const bassPulse = audio.bass * 1.5 * this.visualIntensity;
      const dist = this.cameraBaseDistance - bassPulse;

      if (this.currentMode === 'neon_vortex') {
        this.camera.position.x = Math.sin(time * 0.8) * 0.8;
        this.camera.position.y = Math.cos(time * 0.6) * 0.6;
        this.camera.position.z = 4.5 - audio.bass * 2.0;
        this.camera.lookAt(0, 0, -40);
      } else {
        const camY = (this.currentMode === 'cyber_grid' ? 6 : 3) + Math.sin(time * 0.4) * 2;
        this.camera.position.x = Math.sin(this.cameraAngle) * dist;
        this.camera.position.z = Math.cos(this.cameraAngle) * dist;
        this.camera.position.y = camY;

        // Camera micro-shake on beat drops
        if (audio.isBeat) {
          this.camera.position.x += (Math.random() - 0.5) * 0.3 * audio.beatIntensity;
          this.camera.position.y += (Math.random() - 0.5) * 0.3 * audio.beatIntensity;
        }

        this.camera.lookAt(this.cameraTarget);
      }
    } else if (this.isUserInteracting) {
      // Spherical coordinate orbit
      const dist = this.cameraBaseDistance;
      this.camera.position.x = dist * Math.sin(this.userPolarAngle) * Math.sin(this.userAzimuthAngle);
      this.camera.position.y = dist * Math.cos(this.userPolarAngle);
      this.camera.position.z = dist * Math.sin(this.userPolarAngle) * Math.cos(this.userAzimuthAngle);
      this.camera.lookAt(this.cameraTarget);
    }
  }

  private updateActiveMode(delta: number, time: number, audio: AudioAnalysisData) {
    const intensity = this.visualIntensity;

    // --- MODE 1: DITHER CORE ---
    if (this.currentMode === 'dither_core') {
      const posAttr = this.coreMesh.geometry.attributes.position;
      const positions = posAttr.array as Float32Array;
      const orig = this.coreOriginalPositions;

      const bassDisplace = audio.bass * 1.4 * intensity;
      const midMorph = audio.mid * 2.0 * intensity;
      const trebleSpike = audio.treble * 0.9 * intensity;

      for (let i = 0; i < positions.length; i += 3) {
        const ox = orig[i];
        const oy = orig[i + 1];
        const oz = orig[i + 2];
        const len = Math.sqrt(ox * ox + oy * oy + oz * oz);

        // Sinusoidal vertex ripples
        const wave = Math.sin(ox * 2.0 + time * 3.0) * Math.cos(oy * 2.0 + time * 2.5);
        const factor = 1.0 + (wave * 0.15 * midMorph) + (bassDisplace * 0.25) + (trebleSpike * 0.1);

        positions[i] = ox * factor;
        positions[i + 1] = oy * factor;
        positions[i + 2] = oz * factor;
      }
      posAttr.needsUpdate = true;
      this.coreMesh.geometry.computeVertexNormals();

      // Rotation & Scale
      this.coreMesh.rotation.y += (0.4 + audio.mid * 1.2) * delta;
      this.coreMesh.rotation.x += 0.2 * delta;

      this.coreWireframe.rotation.y -= (0.6 + audio.mid * 1.5) * delta;
      this.coreWireframe.rotation.z += 0.3 * delta;
      const wireScale = 1.0 + audio.bass * 0.35 * intensity;
      this.coreWireframe.scale.set(wireScale, wireScale, wireScale);

      // Inner crystal spin & emissive flash
      this.coreInnerCrystal.rotation.x += 2.0 * delta;
      this.coreInnerCrystal.rotation.y += 2.5 * delta;
      const crystalScale = 1.0 + audio.treble * 0.8 * intensity;
      this.coreInnerCrystal.scale.set(crystalScale, crystalScale, crystalScale);

      // Orbital rings
      this.coreRing1.rotation.z += (0.8 + audio.bass * 1.5) * delta;
      this.coreRing2.rotation.x += (0.9 + audio.mid * 1.8) * delta;
      this.coreRing3.rotation.y += (0.7 + audio.treble * 2.0) * delta;
    }

    // --- MODE 2: CYBER GRID ---
    else if (this.currentMode === 'cyber_grid') {
      const posAttr = this.gridMesh.geometry.attributes.position;
      const positions = posAttr.array as Float32Array;
      const orig = this.gridOriginalZ;

      const spectrum = audio.rawSpectrum;
      const bassEnergy = audio.bass * 5.0 * intensity;

      for (let i = 0; i < positions.length; i += 3) {
        const x = orig[i];
        const z = orig[i + 2];
        const distFromCenter = Math.abs(x);

        // Map frequency bands across grid
        const freqBin = Math.floor((Math.abs(x) / 30) * 80) % spectrum.length;
        const freqVal = (spectrum[freqBin] / 255) * intensity;

        const wave = Math.sin(z * 0.3 + time * 4.0) * Math.cos(x * 0.2 + time * 2.0);
        positions[i + 1] = wave * (1.5 + bassEnergy) + (distFromCenter > 8 ? freqVal * 4.0 : 0);
      }
      posAttr.needsUpdate = true;

      // Pulse pillars on bass hits
      this.gridPillars.forEach((pillar, idx) => {
        const pScale = 1.0 + audio.bass * 2.0 * intensity * (1.0 + (idx % 3) * 0.3);
        pillar.scale.y = pScale;
      });
    }

    // --- MODE 3: PARTICLE STORM ---
    else if (this.currentMode === 'particle_storm') {
      const posAttr = this.stormParticles.geometry.attributes.position;
      const positions = posAttr.array as Float32Array;
      const orig = this.stormBasePositions;
      const count = this.particleCount;

      const bassPulse = audio.bass * 2.5 * intensity;
      const trebleScatter = audio.treble * 3.0 * intensity;
      const spin = (0.5 + audio.energy * 2.0) * delta;

      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        const ox = orig[idx];
        const oy = orig[idx + 1];
        const oz = orig[idx + 2];

        // Cosmic rotation
        const cosA = Math.cos(spin);
        const sinA = Math.sin(spin);
        const rx = ox * cosA - oz * sinA;
        const rz = ox * sinA + oz * cosA;

        orig[idx] = rx;
        orig[idx + 2] = rz;

        // Bass expands outwards, treble adds sparkle turbulence
        const dist = Math.sqrt(rx * rx + rz * rz) + 0.01;
        const expand = 1.0 + (bassPulse * 0.25 * (dist / 12.0));
        const turbY = Math.sin(i + time * 5.0) * trebleScatter * 0.4;

        positions[idx] = rx * expand;
        positions[idx + 1] = oy * expand + turbY;
        positions[idx + 2] = rz * expand;
      }
      posAttr.needsUpdate = true;
    }

    // --- MODE 4: NEON VORTEX ---
    else if (this.currentMode === 'neon_vortex') {
      const speed = (25 + audio.energy * 45) * delta;
      const spectrum = audio.rawSpectrum;

      for (let i = 0; i < this.vortexRings.length; i++) {
        const ring = this.vortexRings[i];
        ring.position.z += speed;

        // Loop rings forward to infinite tunnel
        if (ring.position.z > 8) {
          ring.position.z = -this.vortexRingCount * 3.5 + 8;
        }

        // Twist and frequency scale
        const freqVal = (spectrum[(i * 6) % spectrum.length] / 255) * intensity;
        const scaleVal = 1.0 + freqVal * 0.8 + audio.bass * 0.4;
        ring.scale.set(scaleVal, scaleVal, 1.0);
        ring.rotation.z += (0.2 + (i % 2 === 0 ? 0.3 : -0.3)) * delta;
      }
    }

    // --- MODE 5: DIGITAL VOID ---
    else if (this.currentMode === 'digital_void') {
      this.voidFragments.forEach((mesh, idx) => {
        mesh.rotation.x += (0.3 + (idx % 3) * 0.2) * delta;
        mesh.rotation.y += (0.2 + (idx % 2) * 0.3) * delta;

        // Zero-G audio float
        const floatY = Math.sin(time * 1.5 + idx) * (0.8 + audio.mid * 2.0);
        mesh.position.y += floatY * delta;

        // Beat scale burst
        if (audio.isBeat) {
          const beatScale = 1.0 + audio.beatIntensity * 0.6;
          mesh.scale.set(beatScale, beatScale, beatScale);
        } else {
          mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
        }
      });

      // Spotlights flare with audio
      this.spotLightCyan.intensity = 3.0 + audio.bass * 8.0 * intensity;
      this.spotLightMagenta.intensity = 3.0 + audio.treble * 8.0 * intensity;
    }
  }

  private updateDitherShader(time: number, audio: AudioAnalysisData) {
    const uniforms = this.ditherMaterial.uniforms;
    uniforms.uTime.value = time;
    uniforms.uDitherScale.value = this.ditherScale;
    uniforms.uDitherIntensity.value = this.ditherIntensity;
    uniforms.uDitherMode.value = this.ditherModeIndex;
    uniforms.uPaletteMode.value = this.paletteModeIndex;
    uniforms.uScanlines.value = this.scanlines;
    uniforms.uEnergy.value = audio.energy * this.visualIntensity;
    uniforms.uBass.value = audio.bass * this.visualIntensity;

    // Transient glitch effect triggered on heavy beat drops
    if (audio.isBeat && audio.beatIntensity > 0.4) {
      uniforms.uGlitchIntensity.value = audio.beatIntensity * 0.8;
    } else {
      uniforms.uGlitchIntensity.value *= 0.88;
    }
  }

  public dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    this.renderTarget.dispose();
  }
}
