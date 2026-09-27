/**
 * CYBER DITHER - Custom WebGL Post-Processing Dither Shader
 * Implements Ordered Dithering (Bayer 4x4 & 8x8), Halftone, Digital Grain,
 * RGB Chromatic Aberration, Scanlines, and Dynamic Cyberpunk Palettes.
 */

import * as THREE from 'three';

export const DitherShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uTime: { value: 0.0 },
    uDitherScale: { value: 2.0 },
    uDitherIntensity: { value: 0.85 },
    uDitherMode: { value: 0 }, // 0: Bayer 4x4, 1: Bayer 8x8, 2: Halftone, 3: Digital Noise, 4: Crosshatch
    uPaletteMode: { value: 0 }, // 0: Cyber Neon, 1: Emerald Terminal, 2: Amber Phosphor, 3: Hyper Vapor, 4: Quantized RGB
    uGlitchIntensity: { value: 0.0 },
    uRGBShift: { value: 0.003 },
    uScanlines: { value: 0.25 },
    uEnergy: { value: 0.0 },
    uBass: { value: 0.0 },
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uDitherScale;
    uniform float uDitherIntensity;
    uniform int uDitherMode;
    uniform int uPaletteMode;
    uniform float uGlitchIntensity;
    uniform float uRGBShift;
    uniform float uScanlines;
    uniform float uEnergy;
    uniform float uBass;

    varying vec2 vUv;

    // 4x4 Bayer Matrix
    float bayer4(vec2 p) {
      int x = int(mod(p.x, 4.0));
      int y = int(mod(p.y, 4.0));
      int index = x + y * 4;
      
      float m[16];
      m[0]  =  0.0/16.0; m[1]  =  8.0/16.0; m[2]  =  2.0/16.0; m[3]  = 10.0/16.0;
      m[4]  = 12.0/16.0; m[5]  =  4.0/16.0; m[6]  = 14.0/16.0; m[7]  =  6.0/16.0;
      m[8]  =  3.0/16.0; m[9]  = 11.0/16.0; m[10] =  1.0/16.0; m[11] =  9.0/16.0;
      m[12] = 15.0/16.0; m[13] =  7.0/16.0; m[14] = 13.0/16.0; m[15] =  5.0/16.0;
      
      for (int i = 0; i < 16; i++) {
        if (i == index) return m[i] - 0.5;
      }
      return 0.0;
    }

    // 8x8 Bayer Matrix
    float bayer8(vec2 p) {
      int x = int(mod(p.x, 8.0));
      int y = int(mod(p.y, 8.0));
      int index = x + y * 8;
      
      float m[64];
      m[0]  =  0.0/64.0; m[1]  = 32.0/64.0; m[2]  =  8.0/64.0; m[3]  = 40.0/64.0; m[4]  =  2.0/64.0; m[5]  = 34.0/64.0; m[6]  = 10.0/64.0; m[7]  = 42.0/64.0;
      m[8]  = 48.0/64.0; m[9]  = 16.0/64.0; m[10] = 56.0/64.0; m[11] = 24.0/64.0; m[12] = 50.0/64.0; m[13] = 18.0/64.0; m[14] = 58.0/64.0; m[15] = 26.0/64.0;
      m[16] = 12.0/64.0; m[17] = 44.0/64.0; m[18] =  4.0/64.0; m[19] = 36.0/64.0; m[20] = 14.0/64.0; m[21] = 46.0/64.0; m[22] =  6.0/64.0; m[23] = 38.0/64.0;
      m[24] = 60.0/64.0; m[25] = 28.0/64.0; m[26] = 52.0/64.0; m[27] = 20.0/64.0; m[28] = 62.0/64.0; m[29] = 30.0/64.0; m[30] = 54.0/64.0; m[31] = 22.0/64.0;
      m[32] =  3.0/64.0; m[33] = 35.0/64.0; m[34] = 11.0/64.0; m[35] = 43.0/64.0; m[36] =  1.0/64.0; m[37] = 33.0/64.0; m[38] =  9.0/64.0; m[39] = 41.0/64.0;
      m[40] = 51.0/64.0; m[41] = 19.0/64.0; m[42] = 59.0/64.0; m[43] = 27.0/64.0; m[44] = 49.0/64.0; m[45] = 17.0/64.0; m[46] = 57.0/64.0; m[47] = 25.0/64.0;
      m[48] = 15.0/64.0; m[49] = 47.0/64.0; m[50] =  7.0/64.0; m[51] = 39.0/64.0; m[52] = 13.0/64.0; m[53] = 45.0/64.0; m[54] =  5.0/64.0; m[55] = 37.0/64.0;
      m[56] = 63.0/64.0; m[57] = 31.0/64.0; m[58] = 55.0/64.0; m[59] = 23.0/64.0; m[60] = 61.0/64.0; m[61] = 29.0/64.0; m[62] = 53.0/64.0; m[63] = 21.0/64.0;
      
      for (int i = 0; i < 64; i++) {
        if (i == index) return m[i] - 0.5;
      }
      return 0.0;
    }

    // Halftone dots
    float halftone(vec2 p, float lum) {
      vec2 grid = mod(p, 6.0) - vec2(3.0);
      float dist = length(grid);
      float radius = lum * 3.2;
      return dist < radius ? 0.35 : -0.35;
    }

    // Digital Noise / Grain
    float digitalNoise(vec2 p, float t) {
      return (fract(sin(dot(p + vec2(t * 12.3, t * 7.1), vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.45;
    }

    // Crosshatch
    float crosshatch(vec2 p, float lum) {
      float threshold = 0.0;
      float diag1 = mod(p.x + p.y, 4.0);
      float diag2 = mod(p.x - p.y, 4.0);
      if (lum < 0.8 && diag1 < 1.0) threshold -= 0.25;
      if (lum < 0.6 && diag2 < 1.0) threshold -= 0.25;
      if (lum < 0.4 && mod(p.x, 3.0) < 1.0) threshold -= 0.25;
      if (lum < 0.2 && mod(p.y, 3.0) < 1.0) threshold -= 0.25;
      return threshold;
    }

    // Cyberpunk Color Palettes
    vec3 applyCyberPalette(float lum, vec3 orig) {
      // 0: Cyber Neon (Deep navy -> Electric Purple -> Neon Cyan -> White)
      if (uPaletteMode == 0) {
        if (lum < 0.15) return vec3(0.02, 0.03, 0.07);
        if (lum < 0.45) return vec3(0.35, 0.05, 0.55); // Neon Purple
        if (lum < 0.8)  return vec3(0.02, 0.85, 0.95); // Neon Cyan
        return vec3(0.95, 0.98, 1.0); // Bright white
      }
      // 1: Emerald Terminal (Classic 80s matrix/cyber terminal)
      if (uPaletteMode == 1) {
        if (lum < 0.15) return vec3(0.01, 0.05, 0.02);
        if (lum < 0.5)  return vec3(0.05, 0.55, 0.2);
        if (lum < 0.85) return vec3(0.2, 0.95, 0.4);
        return vec3(0.8, 1.0, 0.85);
      }
      // 2: Amber Phosphor
      if (uPaletteMode == 2) {
        if (lum < 0.15) return vec3(0.06, 0.02, 0.01);
        if (lum < 0.5)  return vec3(0.7, 0.3, 0.02);
        if (lum < 0.85) return vec3(1.0, 0.65, 0.1);
        return vec3(1.0, 0.95, 0.8);
      }
      // 3: Hyper Vapor (Magenta & Hot Cyan)
      if (uPaletteMode == 3) {
        if (lum < 0.15) return vec3(0.04, 0.01, 0.08);
        if (lum < 0.5)  return vec3(0.9, 0.1, 0.55); // Hot Pink
        if (lum < 0.85) return vec3(0.1, 0.85, 0.9); // Electric Cyan
        return vec3(1.0, 0.95, 0.9);
      }
      // 4: Quantized RGB steps with rich contrast
      float steps = 5.0;
      return floor(orig * steps + 0.5) / steps;
    }

    void main() {
      vec2 uv = vUv;

      // Audio beat glitch artifacts
      if (uGlitchIntensity > 0.01) {
        float slice = floor(uv.y * 32.0);
        float sliceNoise = fract(sin(slice + floor(uTime * 30.0)) * 43758.5453);
        if (sliceNoise > 0.85) {
          float shift = (fract(sliceNoise * 10.0) - 0.5) * uGlitchIntensity * 0.08;
          uv.x += shift;
        }
      }

      // Pixelation coordinates
      float scale = max(1.0, uDitherScale);
      vec2 pixelCoord = floor(uv * uResolution / scale);
      vec2 ditherUv = (pixelCoord * scale) / uResolution;

      // RGB Chromatic Aberration (widened on bass hits)
      float shift = uRGBShift * (1.0 + uBass * 3.5);
      vec2 shiftOffset = vec2(shift, 0.0);

      float r = texture2D(tDiffuse, ditherUv - shiftOffset).r;
      float g = texture2D(tDiffuse, ditherUv).g;
      float b = texture2D(tDiffuse, ditherUv + shiftOffset).b;
      vec3 color = vec3(r, g, b);

      // Raw unquantized color for smooth blending
      vec3 rawColor = texture2D(tDiffuse, uv).rgb;

      // Calculate luminance
      float lum = dot(color, vec3(0.299, 0.587, 0.114));

      // Compute dither threshold offset based on selected mode
      float ditherValue = 0.0;
      if (uDitherMode == 0) {
        ditherValue = bayer4(pixelCoord);
      } else if (uDitherMode == 1) {
        ditherValue = bayer8(pixelCoord);
      } else if (uDitherMode == 2) {
        ditherValue = halftone(pixelCoord, lum);
      } else if (uDitherMode == 3) {
        ditherValue = digitalNoise(pixelCoord, uTime);
      } else if (uDitherMode == 4) {
        ditherValue = crosshatch(pixelCoord, lum);
      }

      // Energy modulates dither threshold amplitude
      float ditherMod = ditherValue * (0.8 + uEnergy * 0.6);
      float ditheredLum = clamp(lum + ditherMod, 0.0, 1.0);

      // Quantize / Palette mapping
      vec3 ditheredColor = applyCyberPalette(ditheredLum, color);

      // CRT Scanlines
      if (uScanlines > 0.01) {
        float scanline = sin(uv.y * uResolution.y * 1.5) * 0.5 + 0.5;
        ditheredColor *= 1.0 - (scanline * uScanlines * 0.45);
      }

      // Blend between raw 3D scene and dithered result based on uDitherIntensity
      vec3 finalColor = mix(rawColor, ditheredColor, uDitherIntensity);

      // Subtle edge vignette
      float distFromCenter = distance(uv, vec2(0.5));
      finalColor *= smoothstep(0.9, 0.25, distFromCenter);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};
