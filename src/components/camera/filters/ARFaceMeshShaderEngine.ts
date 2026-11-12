import * as THREE from 'three';
import { FilterId, FaceTrackingData, FaceCalibrationProfile } from '../../../types';
import { FACEMESH_TESSELATION } from '../../../data/faceMeshConnections';

/**
 * 21 Landmark points defining the lower jawline and chin contour
 * from left ear tragus (234) around the jaw through chin (152) to right ear tragus (454).
 */
export const JAW_CONTOUR_LANDMARKS = [
  234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454
];

export const NUM_FACE_VERTICES = 468;
export const NUM_NECK_RING1 = JAW_CONTOUR_LANDMARKS.length; // 21
export const NUM_NECK_RING2 = JAW_CONTOUR_LANDMARKS.length; // 21
export const TOTAL_VERTICES = NUM_FACE_VERTICES + NUM_NECK_RING1 + NUM_NECK_RING2; // 510

/**
 * High-Fidelity 3D Face + Upper Neck Deformable Mesh AR Shader Engine
 *
 * Full 3D deformable mesh mask (similar to high-fidelity 'Koker' masks) that completely
 * covers the entire face area AND the upper neck/throat collar area with 100% OPACITY.
 * Synchronizes with 468 MediaPipe landmark points, dynamic facial feature tracking
 * (eyes, nose, mouth, jawline), and animated cyber sketch mesh during biometric scanning.
 */
export class ARFaceMeshShaderEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  // 3D Deformable Face & Neck Mesh
  private faceMeshGroup: THREE.Group;
  private faceMeshGeometry: THREE.BufferGeometry | null = null;
  private faceMeshMaterial: THREE.ShaderMaterial | null = null;
  private sculptedMeshMaterial: THREE.ShaderMaterial | null = null;
  private wireframeOverlayMaterial: THREE.MeshBasicMaterial | null = null;
  private wireframeOverlayMesh: THREE.Mesh | null = null;
  private faceMesh: THREE.Mesh | null = null;

  // 3D Accessory Group (Ears, Bat cowl horns, hair locks, Vader brim, etc.)
  private accessoryGroup: THREE.Group;

  // Active Filter ID and Category (null means no character mask active)
  private currentFilterId: FilterId | null = 'joker';

  // 100% Opaque 3D Shaded Mesh Toggle & Single Mask Fit Scale (85%–135%)
  private show3DShadedMesh = false;
  private maskFitScale = 1.0;

  // High-DPI logical CSS dimensions for 1:1 camera-to-mesh projection
  private logicalWidth = 640;
  private logicalHeight = 480;

  // Orientation flip
  private flipVertical = false;

  public setFlipVertical(flip: boolean): void {
    this.flipVertical = flip;
  }

  public setShow3DShadedMesh(show: boolean): void {
    this.show3DShadedMesh = show;
    if (!show && !this.currentFilterId) {
      this.faceMeshGroup.visible = false;
      this.renderer.clear();
      this.renderer.render(this.scene, this.camera);
    }
  }

  public setMaskFitScale(scale: number): void {
    this.maskFitScale = Math.max(0.85, Math.min(1.35, scale));
  }

  // Scanning Animation State
  private isScanning = false;
  private scanProgress = 0.0;

  public setScanState(isScanning: boolean, progress: number): void {
    this.isScanning = isScanning;
    this.scanProgress = Math.max(0.0, Math.min(1.0, progress));
    if (this.faceMeshMaterial) {
      this.faceMeshMaterial.uniforms.uIsScanning.value = isScanning ? 1.0 : 0.0;
      this.faceMeshMaterial.uniforms.uScanProgress.value = this.scanProgress;
    }
  }

  // Biometric Calibration Data from initial 100% scan
  private calibration: FaceCalibrationProfile | null = null;
  private calibrationScaleX = 1.0;
  private calibrationScaleY = 1.0;
  private calibratedDepthScale = 1.0;

  // Triangle indices cache extracted from MediaPipe canonical tesselation + Upper Neck rings
  private static triangleIndices: number[] | null = null;

  // Animation clock
  private clock = new THREE.Clock();

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();

    // Perspective camera calibrated to webcam / phone FOV
    this.camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 1000);
    this.camera.position.set(0, 0, 5);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      premultipliedAlpha: false,
    });
    this.renderer.setSize(canvas.width, canvas.height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.setupLighting();

    this.faceMeshGroup = new THREE.Group();
    this.accessoryGroup = new THREE.Group();
    this.faceMeshGroup.add(this.accessoryGroup);
    this.scene.add(this.faceMeshGroup);

    this.initFaceMeshGeometry();
    this.updateShaderForFilter(this.currentFilterId);
    this.build3DAccessories(this.currentFilterId);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.45);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5ea, 1.85);
    keyLight.position.set(2, 4, 4);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xd8b4fe, 1.1); // Purple neon rim accent
    fillLight.position.set(-3, -1, 3);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xa855f7, 2.8, 12);
    rimLight.position.set(0, 3, -2);
    this.scene.add(rimLight);
  }

  /**
   * Extract triangle index array from canonical MediaPipe tesselation + Upper Neck Skirt Strips
   */
  private getTriangleIndices(): number[] {
    if (ARFaceMeshShaderEngine.triangleIndices) {
      return ARFaceMeshShaderEngine.triangleIndices;
    }

    const indices: number[] = [];

    // 1. 468-vertex MediaPipe canonical face tesselation
    for (let i = 0; i < FACEMESH_TESSELATION.length; i += 3) {
      if (i + 2 < FACEMESH_TESSELATION.length) {
        indices.push(
          FACEMESH_TESSELATION[i][0],
          FACEMESH_TESSELATION[i + 1][0],
          FACEMESH_TESSELATION[i + 2][0]
        );
      }
    }

    // 2. Upper Neck Skirt Triangle Strips connecting Jawline to Ring 1, and Ring 1 to Ring 2
    const jaw = JAW_CONTOUR_LANDMARKS;
    const ring1Offset = NUM_FACE_VERTICES; // 468
    const ring2Offset = NUM_FACE_VERTICES + NUM_NECK_RING1; // 489

    for (let k = 0; k < jaw.length - 1; k++) {
      const j0 = jaw[k];
      const j1 = jaw[k + 1];
      const n0 = ring1Offset + k;
      const n1 = ring1Offset + k + 1;
      const c0 = ring2Offset + k;
      const c1 = ring2Offset + k + 1;

      // Quad between Jaw and Ring 1 (Upper Neck / Throat)
      indices.push(j0, n0, j1);
      indices.push(j1, n0, n1);

      // Quad between Ring 1 and Ring 2 (Lower Neck / Clavicle Collar)
      indices.push(n0, c0, n1);
      indices.push(n1, c0, c1);
    }

    ARFaceMeshShaderEngine.triangleIndices = indices;
    return indices;
  }

  /**
   * Initializes the 510-vertex 3D deformable face + upper neck mesh geometry with canonical UVs.
   */
  private initFaceMeshGeometry(): void {
    const numVertices = TOTAL_VERTICES; // 510
    const positions = new Float32Array(numVertices * 3);
    const uvs = new Float32Array(numVertices * 2);

    // Initial neutral face shape
    for (let i = 0; i < numVertices; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 1.5;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2.0;
      positions[i * 3 + 2] = 0;
      uvs[i * 2 + 0] = 0.5;
      uvs[i * 2 + 1] = 0.5;
    }

    const indices = this.getTriangleIndices();

    this.faceMeshGeometry = new THREE.BufferGeometry();
    this.faceMeshGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.faceMeshGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.faceMeshGeometry.setIndex(indices);
    this.faceMeshGeometry.computeVertexNormals();

    // 100% Opaque Sculpted 3D Mesh Material (Studio-lit anatomical titanium/clay)
    const sculptedVertexShader = `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const sculptedFragmentShader = `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);

        vec3 keyLight = normalize(vec3(0.4, 0.8, 0.9));
        vec3 fillLight = normalize(vec3(-0.5, -0.2, 0.4));

        float diffKey = max(dot(normal, keyLight), 0.0);
        float diffFill = max(dot(normal, fillLight), 0.0) * 0.45;
        float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0) * 0.65;

        vec3 baseColor = vec3(0.24, 0.28, 0.36);
        vec3 litColor = baseColor * (0.35 + diffKey * 0.7 + diffFill) + vec3(0.25, 0.55, 0.85) * rim;

        // 100% OPACITY - completely conceals real skin underneath
        gl_FragColor = vec4(litColor, 1.0);
      }
    `;

    this.sculptedMeshMaterial = new THREE.ShaderMaterial({
      vertexShader: sculptedVertexShader,
      fragmentShader: sculptedFragmentShader,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });

    this.faceMesh = new THREE.Mesh(this.faceMeshGeometry);
    this.faceMesh.frustumCulled = false;
    this.faceMesh.renderOrder = 1;
    this.faceMeshGroup.add(this.faceMesh);

    // Crisp 3D Edge Topology Overlay Mesh
    this.wireframeOverlayMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8, // Crisp cyan 3D wireframe topology
      wireframe: true,
      transparent: false,
      opacity: 1.0,
      depthTest: true,
      depthWrite: false,
    });
    this.wireframeOverlayMesh = new THREE.Mesh(this.faceMeshGeometry, this.wireframeOverlayMaterial);
    this.wireframeOverlayMesh.renderOrder = 2;
    this.wireframeOverlayMesh.frustumCulled = false;
    this.wireframeOverlayMesh.visible = false;
    this.faceMeshGroup.add(this.wireframeOverlayMesh);
  }

  /**
   * Creates custom AR Shaders for the selected character mask.
   * Completely conceals the real face AND upper neck with 100% OPACITY (no transparency).
   * Supports animated cyber sketch mesh during biometric scanning.
   */
  private updateShaderForFilter(filterId: FilterId): void {
    const filterIndexMap: Record<string, number> = {
      joker: 0,
      batman: 1,
      spiderman: 2,
      ironman: 3,
      blackpanther: 4,
      deadpool: 5,
      ghostface: 6,
      darthvader: 7,
      hyena: 8,
      gorilla: 9,
      tiger: 10,
      lion: 11,
      wolf: 12,
      monkey: 13,
      bear: 14,
      fox: 15,
    };

    const filterIdx = filterIndexMap[filterId] ?? 0;

    const vertexShader = `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      varying vec3 vViewPosition;

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      uniform float uTime;
      uniform float uMouthOpen;
      uniform int uFilterId;
      uniform vec3 uKeyLightDir;
      uniform vec2 uScale;

      // Dynamic Anatomical Feature Landmarks in UV Space
      uniform vec2 uLeftEye;
      uniform vec2 uRightEye;
      uniform vec2 uNose;
      uniform vec2 uMouthCenter;
      uniform vec2 uJawBase;

      // Biometric Scanning & Sketch Animation
      uniform float uScanProgress;
      uniform float uIsScanning;

      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      varying vec3 vViewPosition;

      // Procedural Noise Generator for organic leather, paint cracks, & fur
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        vec3 lightDir = normalize(vec3(0.3, 0.8, 0.9));

        // Diffuse & Specular PBR Lighting
        float diff = max(dot(normal, lightDir), 0.28);
        vec3 halfDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfDir), 0.0), 32.0);
        float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);

        vec2 uv = vUv;
        vec3 baseColor = vec3(1.0);
        float roughness = 0.5;
        float metalness = 0.1;
        vec3 emission = vec3(0.0);

        // -------------------------------------------------------------
        // 0. JOKER / KOKER MASK (Full White Greasepaint & Crimson Smile)
        // -------------------------------------------------------------
        if (uFilterId == 0) {
          // 100% Opaque theatrical white greasepaint base with organic paint cracks
          float crack = noise(uv * 42.0) * 0.09;
          baseColor = vec3(0.96, 0.96, 0.97) - crack;

          // Charcoal kohl sunken eye sockets mapped directly to user's eyes
          float leftEyeDist = distance(uv, uLeftEye);
          float rightEyeDist = distance(uv, uRightEye);
          if (leftEyeDist < 0.14 || rightEyeDist < 0.14) {
            float eyeMask = min(leftEyeDist, rightEyeDist);
            float kohl = smoothstep(0.14, 0.02, eyeMask);
            baseColor = mix(baseColor, vec3(0.04, 0.04, 0.05), kohl * 0.96);
          }

          // Crimson Red Glasgow Smile (Anchored to user's mouth center)
          float mouthDistY = abs(uv.y - uMouthCenter.y);
          float mouthDistX = abs(uv.x - uMouthCenter.x);
          if (mouthDistY < 0.08 && mouthDistX < 0.32) {
            float smileIntensity = smoothstep(0.07, 0.01, mouthDistY);
            baseColor = mix(baseColor, vec3(0.86, 0.06, 0.10), smileIntensity * 0.95);
          }

          // Red Clown Nose Blob (Anchored to user's nose)
          float noseDist = distance(uv, uNose);
          if (noseDist < 0.065) {
            baseColor = mix(baseColor, vec3(0.88, 0.05, 0.08), smoothstep(0.065, 0.01, noseDist));
          }

          // Upper Forehead Emerald Green Hair fringe
          if (uv.y > 0.84) {
            baseColor = mix(baseColor, vec3(0.08, 0.58, 0.22), smoothstep(0.84, 0.97, uv.y));
          }

          // Upper Neck & Throat Collar: White greasepaint neck tapering into dark violet tuxedo lapel
          if (uv.y < uJawBase.y) {
            float neckCollar = smoothstep(uJawBase.y, 0.05, uv.y);
            baseColor = mix(vec3(0.94, 0.94, 0.95), vec3(0.48, 0.08, 0.55), neckCollar);
            roughness = 0.8;
          }
        }

        // -------------------------------------------------------------
        // 1. BATMAN (Armored Kevlar & Carbon Fiber Cowl with Neck Gorget)
        // -------------------------------------------------------------
        else if (uFilterId == 1) {
          // Matte carbon weave texture
          float weave = sin(uv.x * 220.0) * sin(uv.y * 220.0) * 0.05;
          baseColor = vec3(0.08, 0.09, 0.11) + weave;

          // Brow furrow chiseled highlight
          if (abs(uv.y - (uLeftEye.y + 0.08)) < 0.02 && abs(uv.x - 0.5) < 0.28) {
            baseColor += vec3(0.12, 0.14, 0.20);
          }

          // Luminous White/Cyan Ocular Eye Slits
          float leftEyeDist = distance(uv, uLeftEye);
          float rightEyeDist = distance(uv, uRightEye);
          if (leftEyeDist < 0.055 || rightEyeDist < 0.055) {
            emission = vec3(0.85, 0.92, 1.0) * 2.5;
          }

          // Jaw cutout for mouth opening
          float mouthDistY = abs(uv.y - uMouthCenter.y);
          float mouthDistX = abs(uv.x - uMouthCenter.x);
          if (mouthDistY < 0.06 && mouthDistX < 0.18) {
            baseColor = vec3(0.03, 0.03, 0.04);
          }

          // Upper Neck & Throat: Segmented Batsuit Kevlar Neck Slats
          if (uv.y < uJawBase.y) {
            float neckRib = sin(uv.y * 80.0) * 0.06;
            baseColor = vec3(0.06, 0.07, 0.09) + neckRib;
            metalness = 0.85;
            roughness = 0.3;
          } else {
            metalness = 0.7;
            roughness = 0.35;
          }
        }

        // -------------------------------------------------------------
        // 2. SPIDER-MAN (Crimson Red Webbed Mask & Full Upper Neck Suit)
        // -------------------------------------------------------------
        else if (uFilterId == 2) {
          baseColor = vec3(0.88, 0.11, 0.13);

          // Webbing grid lines radiating from nose tip
          vec2 toNose = uv - uNose;
          float angle = atan(toNose.y, toNose.x);
          float dist = length(toNose);
          float spokeLines = abs(fract(angle * 3.82 / 3.14159) - 0.5);
          float ringLines = abs(fract(dist * 13.0) - 0.5);
          float isWeb = smoothstep(0.08, 0.02, min(spokeLines, ringLines));
          baseColor = mix(baseColor, vec3(0.05, 0.05, 0.07), isWeb * 0.88);

          // Giant Mirrored Ocular Lenses fitted directly over user's eyes
          float leftEyeDist = distance(uv, uLeftEye);
          float rightEyeDist = distance(uv, uRightEye);
          if (leftEyeDist < 0.11 || rightEyeDist < 0.11) {
            float eyeMask = min(leftEyeDist, rightEyeDist);
            if (eyeMask < 0.085) {
              baseColor = vec3(0.98, 0.98, 1.0);
              spec *= 3.5;
              emission = vec3(0.2, 0.25, 0.3);
            } else {
              baseColor = vec3(0.03, 0.03, 0.04); // Thick black rim
            }
          }

          // Upper Neck: Seamless continuation of red and black webbed suit
          if (uv.y < uJawBase.y) {
            float neckWeb = abs(fract(uv.x * 14.0) - 0.5);
            baseColor = mix(vec3(0.82, 0.09, 0.11), vec3(0.05, 0.05, 0.07), smoothstep(0.08, 0.02, neckWeb));
          }

          roughness = 0.42;
        }

        // -------------------------------------------------------------
        // 3. IRON MAN (Mark 85 Hot-Rod Red & Gold Titanium Faceplate)
        // -------------------------------------------------------------
        else if (uFilterId == 3) {
          bool isFaceplate = abs(uv.x - 0.5) < 0.28 && uv.y > uMouthCenter.y - 0.08 && uv.y < uLeftEye.y + 0.18;
          if (isFaceplate) {
            baseColor = vec3(0.92, 0.72, 0.18); // Metallic Gold
            metalness = 0.95;
            roughness = 0.2;
          } else {
            baseColor = vec3(0.75, 0.08, 0.10); // Hot-Rod Red
            metalness = 0.85;
            roughness = 0.25;
          }

          // Luminous Cyan ARC Repulsor Eyes
          float leftEyeDist = distance(uv, uLeftEye);
          float rightEyeDist = distance(uv, uRightEye);
          if ((abs(uv.x - uLeftEye.x) < 0.075 && abs(uv.y - uLeftEye.y) < 0.022) ||
              (abs(uv.x - uRightEye.x) < 0.075 && abs(uv.y - uRightEye.y) < 0.022)) {
            emission = vec3(0.2, 0.88, 1.0) * 3.8;
            baseColor = vec3(0.92, 1.0, 1.0);
          }

          // Upper Neck: Titanium Neck Ring Collar with Gold Hydraulic Lateral Plates
          if (uv.y < uJawBase.y) {
            bool isCenterNeck = abs(uv.x - 0.5) < 0.20;
            baseColor = isCenterNeck ? vec3(0.92, 0.72, 0.18) : vec3(0.72, 0.07, 0.09);
            metalness = 0.95;
            roughness = 0.18;
          }
        }

        // -------------------------------------------------------------
        // 4. BLACK PANTHER (Vibranium Woven Habit & Violet Kinetic Teeth)
        // -------------------------------------------------------------
        else if (uFilterId == 4) {
          baseColor = vec3(0.06, 0.06, 0.08);

          // Glowing Purple Wakandan Kinetic Energy Pulse
          float pulseWave = sin(uTime * 4.0 - length(uv - vec2(0.5, 0.5)) * 18.0);
          if (pulseWave > 0.58) {
            float pulseGlow = (pulseWave - 0.58) / 0.42;
            emission += vec3(0.70, 0.22, 1.0) * pulseGlow * 2.2;
          }

          // Silver Feline Eye Slits
          if ((abs(uv.x - uLeftEye.x) < 0.07 && abs(uv.y - uLeftEye.y) < 0.02) ||
              (abs(uv.x - uRightEye.x) < 0.07 && abs(uv.y - uRightEye.y) < 0.02)) {
            baseColor = vec3(0.88, 0.90, 0.96);
            metalness = 0.92;
          }

          // Upper Neck: Vibranium Habit Collar with Glowing Kinetic Teeth
          if (uv.y < uJawBase.y) {
            baseColor = vec3(0.05, 0.05, 0.07);
            float tooth = abs(fract(uv.x * 14.0) - 0.5);
            if (uv.y > 0.08 && uv.y < uJawBase.y - 0.02 && tooth < 0.22) {
              emission += vec3(0.75, 0.25, 1.0) * 2.8;
              baseColor = vec3(0.85, 0.88, 0.95);
            }
          }

          roughness = 0.48;
        }

        // -------------------------------------------------------------
        // 5. DEADPOOL (Tactical Red Mercenary Combat Suit & Neck)
        // -------------------------------------------------------------
        else if (uFilterId == 5) {
          baseColor = vec3(0.82, 0.12, 0.14);

          // Large black leather ocular patches centered on user's eyes
          float leftEyeDist = distance(uv, uLeftEye);
          float rightEyeDist = distance(uv, uRightEye);
          if (leftEyeDist < 0.14 || rightEyeDist < 0.14) {
            float eyeMask = min(leftEyeDist, rightEyeDist);
            if (eyeMask < 0.045) {
              baseColor = vec3(0.98, 0.98, 1.0); // Comic squint white eye
            } else {
              baseColor = vec3(0.06, 0.06, 0.07);
            }
          }

          // Centerline Seam
          if (abs(uv.x - 0.5) < 0.008) {
            baseColor = vec3(0.28, 0.05, 0.05);
          }

          // Upper Neck: Tactical Combat Suit Collar with Black Lateral Straps
          if (uv.y < uJawBase.y) {
            baseColor = abs(uv.x - 0.5) < 0.22 ? vec3(0.80, 0.11, 0.13) : vec3(0.06, 0.06, 0.07);
          }

          roughness = 0.65;
        }

        // -------------------------------------------------------------
        // 6. GHOSTFACE (Porcelain Scream Mask & Flared Black Hood)
        // -------------------------------------------------------------
        else if (uFilterId == 6) {
          baseColor = vec3(0.93, 0.95, 0.97);

          // Deep hollow weeping eye sockets centered on user's eyes
          float leftEyeDist = distance(uv, uLeftEye);
          float rightEyeDist = distance(uv, uRightEye);
          if (leftEyeDist < 0.09 || rightEyeDist < 0.09) {
            baseColor = vec3(0.02, 0.02, 0.03);
          }

          // Screaming mouth cavity that elongates with user's mouth openness
          float mouthY = uMouthCenter.y - uMouthOpen * 0.08;
          float mouthH = 0.12 + uMouthOpen * 0.16;
          vec2 mouthDist = abs(uv - vec2(0.5, mouthY));
          if (mouthDist.x < 0.11 && mouthDist.y < mouthH) {
            baseColor = vec3(0.01, 0.01, 0.02);
          }

          // Upper Neck: Midnight Black Shroud Hood draping over throat
          if (uv.y < uJawBase.y) {
            baseColor = vec3(0.02, 0.02, 0.03);
            roughness = 0.9;
          } else {
            roughness = 0.28;
          }
        }

        // -------------------------------------------------------------
        // 7. DARTH VADER (High-Gloss Obsidian Sith Helmet & Neck Gorget)
        // -------------------------------------------------------------
        else if (uFilterId == 7) {
          baseColor = vec3(0.05, 0.05, 0.07);
          metalness = 0.95;
          roughness = 0.15;

          // Red HUD ocular reflection in eye lenses
          float leftEyeDist = distance(uv, uLeftEye);
          float rightEyeDist = distance(uv, uRightEye);
          if (leftEyeDist < 0.095 || rightEyeDist < 0.095) {
            baseColor = vec3(0.08, 0.02, 0.02);
            emission = vec3(0.85, 0.05, 0.05) * 1.6;
          }

          // Triangular respirator grille over mouth
          if (uv.y < uMouthCenter.y + 0.04 && uv.y > uJawBase.y && abs(uv.x - 0.5) < (uMouthCenter.y + 0.04 - uv.y) * 0.9) {
            float grilleBars = abs(fract(uv.y * 32.0) - 0.5);
            baseColor = mix(vec3(0.02), vec3(0.72, 0.76, 0.82), smoothstep(0.1, 0.0, grilleBars));
          }

          // Upper Neck: Obsidian Neck Gorget with Segmented Armor Ribs
          if (uv.y < uJawBase.y) {
            float neckRib = sin(uv.y * 70.0) * 0.08;
            baseColor = vec3(0.04, 0.04, 0.05) + neckRib;
          }
        }

        // -------------------------------------------------------------
        // 8-15. ANIMAL CHARACTER MASKS (Hyena, Gorilla, Tiger, Lion, etc.)
        // -------------------------------------------------------------
        else if (uFilterId == 8) { // Hyena / ጅቦ
          baseColor = vec3(0.78, 0.62, 0.38);
          float spotNoise = noise(uv * 18.0);
          if (spotNoise > 0.65) baseColor = vec3(0.25, 0.16, 0.10);
          if (uv.y < uJawBase.y) baseColor = vec3(0.35, 0.25, 0.18); // Thick neck ruff
          roughness = 0.92;
        } else if (uFilterId == 9) { // Gorilla / ጎሪ
          baseColor = vec3(0.12, 0.12, 0.14);
          if (uv.y < uJawBase.y) baseColor = vec3(0.08, 0.08, 0.10); // Heavy neck fur
          roughness = 0.75;
        } else if (uFilterId == 10) { // Tiger
          baseColor = vec3(0.92, 0.48, 0.10);
          float stripe = sin(uv.y * 38.0 + sin(uv.x * 20.0)) * 0.5 + 0.5;
          if (stripe > 0.70) baseColor = vec3(0.08, 0.06, 0.05);
          if (uv.y < uJawBase.y) baseColor = vec3(0.85, 0.78, 0.68); // White throat ruff
          roughness = 0.85;
        } else { // Lion / Wolf / Fox / Bear / Monkey
          baseColor = vec3(0.88, 0.65, 0.25);
          if (uv.y < uJawBase.y) baseColor = vec3(0.60, 0.40, 0.15); // Lion mane neck
          roughness = 0.82;
        }

        // -------------------------------------------------------------
        // ANIMATED CYBER SKETCH MESH DURING 0% -> 100% SCAN
        // -------------------------------------------------------------
        if (uIsScanning > 0.5) {
          // Scan line sweeps down from forehead (1.05) through jaw & upper neck (-0.05)
          float scanLineY = 1.05 - uScanProgress * 1.15;
          float distToBeam = abs(uv.y - scanLineY);

          // Neon cyan/violet laser sweep beam
          float laserBeam = smoothstep(0.05, 0.0, distToBeam);

          // Cybernetic wireframe sketch grid
          vec2 gridUV = fract(uv * 38.0) - 0.5;
          float wireGrid = smoothstep(0.06, 0.02, min(abs(gridUV.x), abs(gridUV.y)));

          // Glowing holographic blueprint
          vec3 sketchColor = mix(vec3(0.06, 0.03, 0.20), vec3(0.2, 0.88, 1.0), wireGrid * 0.88);
          sketchColor += vec3(0.75, 0.25, 1.0) * laserBeam * 3.8;

          // Region above scan line is materialized into the solid character mask
          // Region below scan line is sketched as an animated holographic wireframe
          float revealed = smoothstep(scanLineY - 0.02, scanLineY + 0.04, uv.y);
          baseColor = mix(sketchColor, baseColor, revealed * uScanProgress);
          emission += vec3(0.2, 0.8, 1.0) * (1.0 - revealed) * 0.6;
        }

        // Final PBR Lighting Synthesis (100% OPAQUE, alpha = 1.0)
        vec3 finalColor = baseColor * diff + vec3(1.0) * spec * metalness + emission + vec3(0.7, 0.4, 0.9) * fresnel * 0.35;
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    if (this.faceMeshMaterial) {
      this.faceMeshMaterial.dispose();
    }

    this.faceMeshMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uMouthOpen: { value: 0 },
        uFilterId: { value: filterIdx },
        uKeyLightDir: { value: new THREE.Vector3(0.3, 0.8, 0.9) },
        uScale: { value: new THREE.Vector2(1.0, 1.0) },
        uLeftEye: { value: new THREE.Vector2(0.35, 0.62) },
        uRightEye: { value: new THREE.Vector2(0.65, 0.62) },
        uNose: { value: new THREE.Vector2(0.5, 0.48) },
        uMouthCenter: { value: new THREE.Vector2(0.5, 0.34) },
        uJawBase: { value: new THREE.Vector2(0.5, 0.22) },
        uScanProgress: { value: this.scanProgress },
        uIsScanning: { value: this.isScanning ? 1.0 : 0.0 },
      },
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });

    if (this.faceMesh) {
      this.faceMesh.material = this.faceMeshMaterial;
    }
  }

  /**
   * Builds 3D ears, horns, helmets, and accessory appendages for the mask
   */
  private build3DAccessories(filterId: FilterId): void {
    // Clear previous accessories
    while (this.accessoryGroup.children.length > 0) {
      const child = this.accessoryGroup.children[0];
      this.accessoryGroup.remove(child);
      if ((child as any).geometry) (child as any).geometry.dispose();
      if ((child as any).material) (child as any).material.dispose();
    }

    const earMaterial = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.3,
      metalness: 0.6,
    });

    if (filterId === 'batman') {
      // Tall angular 3D Bat Cowl Ears
      [-1, 1].forEach((side) => {
        const earGeom = new THREE.ConeGeometry(0.22, 1.3, 4);
        const earMesh = new THREE.Mesh(earGeom, earMaterial);
        earMesh.position.set(side * 0.72, 1.45, -0.1);
        earMesh.rotation.z = side * -0.18;
        earMesh.rotation.y = side * 0.2;
        this.accessoryGroup.add(earMesh);
      });
    } else if (filterId === 'blackpanther') {
      // 3D Vibranium Panther Feline Ears
      const pantherMat = new THREE.MeshStandardMaterial({ color: 0x09090d, roughness: 0.4, metalness: 0.8 });
      [-1, 1].forEach((side) => {
        const earGeom = new THREE.ConeGeometry(0.25, 0.65, 4);
        const earMesh = new THREE.Mesh(earGeom, pantherMat);
        earMesh.position.set(side * 0.75, 1.25, -0.05);
        earMesh.rotation.z = side * -0.22;
        this.accessoryGroup.add(earMesh);
      });
    } else if (filterId === 'joker') {
      // 3D Wild Green Hair Locks
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 });
      for (let i = -4; i <= 4; i++) {
        const lockGeom = new THREE.ConeGeometry(0.12, 0.65 + Math.abs(i) * 0.08, 5);
        const lockMesh = new THREE.Mesh(lockGeom, hairMat);
        lockMesh.position.set(i * 0.22, 1.35 + Math.sin(i) * 0.1, 0.1);
        lockMesh.rotation.z = i * -0.15;
        this.accessoryGroup.add(lockMesh);
      }
    } else if (filterId === 'darthvader') {
      // Flared 3D Sith Helmet Brim
      const brimGeom = new THREE.TorusGeometry(1.2, 0.18, 8, 24, Math.PI);
      const vaderMat = new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.15, metalness: 0.95 });
      const brimMesh = new THREE.Mesh(brimGeom, vaderMat);
      brimMesh.position.set(0, 0.6, 0.3);
      brimMesh.rotation.x = Math.PI * 0.6;
      this.accessoryGroup.add(brimMesh);
    } else if (['hyena', 'wolf', 'fox'].includes(filterId)) {
      // Pointed Canine Predator Ears (ጅቦ / ተኩላ / ቀበሮ)
      const earColor = filterId === 'fox' ? 0xe11d48 : filterId === 'hyena' ? 0xd97706 : 0x0284c7;
      const furMat = new THREE.MeshStandardMaterial({ color: earColor, roughness: 0.85 });
      [-1, 1].forEach((side) => {
        const earGeom = new THREE.ConeGeometry(0.28, 0.95, 4);
        const earMesh = new THREE.Mesh(earGeom, furMat);
        earMesh.position.set(side * 0.78, 1.35, -0.1);
        earMesh.rotation.z = side * -0.25;
        this.accessoryGroup.add(earMesh);
      });
    } else if (filterId === 'tiger') {
      // Vivid Striped Feline Ears
      const tigerMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.8 });
      [-1, 1].forEach((side) => {
        const earGeom = new THREE.ConeGeometry(0.25, 0.7, 4);
        const earMesh = new THREE.Mesh(earGeom, tigerMat);
        earMesh.position.set(side * 0.72, 1.25, -0.05);
        earMesh.rotation.z = side * -0.2;
        this.accessoryGroup.add(earMesh);
      });
    } else if (filterId === 'lion') {
      // Golden Savanna Lion Mane + Ears
      const lionMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.9 });
      const maneGeom = new THREE.TorusGeometry(1.25, 0.28, 8, 24);
      const maneMesh = new THREE.Mesh(maneGeom, lionMat);
      maneMesh.position.set(0, 0.1, -0.2);
      this.accessoryGroup.add(maneMesh);
      [-1, 1].forEach((side) => {
        const earGeom = new THREE.SphereGeometry(0.22, 8, 8);
        const earMesh = new THREE.Mesh(earGeom, lionMat);
        earMesh.position.set(side * 0.75, 1.15, -0.1);
        this.accessoryGroup.add(earMesh);
      });
    } else if (filterId === 'gorilla') {
      // Silverback Gorilla Heavy Crest Ridge (ጎሪ)
      const gorillaMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });
      const crestGeom = new THREE.CylinderGeometry(0.18, 0.35, 1.2, 8);
      const crestMesh = new THREE.Mesh(crestGeom, gorillaMat);
      crestMesh.position.set(0, 1.3, -0.15);
      crestMesh.rotation.z = Math.PI / 2;
      this.accessoryGroup.add(crestMesh);
    } else if (['bear', 'monkey'].includes(filterId)) {
      // Rounded Ears (ድብ / ዝንጀሮ)
      const earColor = filterId === 'bear' ? 0x78350f : 0xea580c;
      const roundMat = new THREE.MeshStandardMaterial({ color: earColor, roughness: 0.85 });
      [-1, 1].forEach((side) => {
        const earGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.1, 12);
        const earMesh = new THREE.Mesh(earGeom, roundMat);
        earMesh.position.set(side * (filterId === 'monkey' ? 0.95 : 0.75), filterId === 'monkey' ? 0.4 : 1.2, -0.1);
        earMesh.rotation.x = Math.PI / 2;
        this.accessoryGroup.add(earMesh);
      });
    }
  }

  /**
   * Set active character filter (Joker, Batman, Spider-Man, etc.)
   */
  public setFilter(filterId: FilterId | null): void {
    if (this.currentFilterId === filterId) return;
    this.currentFilterId = filterId;
    if (filterId) {
      this.updateShaderForFilter(filterId);
      this.build3DAccessories(filterId);
    } else {
      this.accessoryGroup.clear();
      if (!this.show3DShadedMesh) {
        this.faceMeshGroup.visible = false;
        this.renderer.clear();
        this.renderer.render(this.scene, this.camera);
      }
    }
  }

  public clearFilter(): void {
    this.currentFilterId = null;
    this.accessoryGroup.clear();
    if (!this.show3DShadedMesh) {
      this.faceMeshGroup.visible = false;
      this.renderer.clear();
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Dynamically resizes the 3D mesh based on the initial face scan calibration.
   * Tailors the mask to precisely fit the user's measured cranial width, eye distance, and height!
   */
  public setCalibration(profile: FaceCalibrationProfile): void {
    this.calibration = profile;

    const baselineW = 180;
    const baselineH = 220;

    this.calibrationScaleX = Math.max(0.65, Math.min(1.85, profile.facePixelWidth / baselineW));
    this.calibrationScaleY = Math.max(0.65, Math.min(1.85, profile.facePixelHeight / baselineH));
    this.calibratedDepthScale = (this.calibrationScaleX + this.calibrationScaleY) * 0.5;

    if (this.faceMeshMaterial) {
      this.faceMeshMaterial.uniforms.uScale.value.set(this.calibrationScaleX, this.calibrationScaleY);
    }
  }

  /**
   * Updates the 3D face + upper neck mesh vertices in real time matching the user's 468 landmark points.
   * Completely conceals the real face AND upper neck area with 100% opacity, zero lag, and zero drifting!
   */
  public update(tracking: FaceTrackingData, filterSensitivity = 1.0, mouthSensitivity = 1.0): void {
    if (!tracking.detected || !this.faceMeshGeometry || (!this.currentFilterId && !this.show3DShadedMesh)) {
      this.faceMeshGroup.visible = false;
      this.accessoryGroup.clear();
      this.renderer.clear();
      return;
    }

    this.faceMeshGroup.visible = true;

    // Configure 100% Opaque Shaded Mesh vs Filter rendering modes
    if (this.show3DShadedMesh && !this.currentFilterId) {
      // 1. Shaded Mesh Only (100% Opaque sculpted 3D mesh with crisp edge topology - NO skin shows through)
      if (this.sculptedMeshMaterial && this.faceMesh) {
        this.faceMesh.material = this.sculptedMeshMaterial;
        this.faceMesh.visible = true;
      }
      if (this.wireframeOverlayMesh) this.wireframeOverlayMesh.visible = true;
      this.accessoryGroup.visible = false;
    } else if (this.show3DShadedMesh && this.currentFilterId) {
      // 2. Shaded Mesh + Filter (Overlay crisp 3D edge topology directly on character mask)
      if (this.faceMeshMaterial && this.faceMesh) {
        this.faceMesh.material = this.faceMeshMaterial;
        this.faceMesh.visible = true;
      }
      if (this.wireframeOverlayMesh) this.wireframeOverlayMesh.visible = true;
      this.accessoryGroup.visible = true;
    } else {
      // 3. Filter Only (Smooth 100% opaque 3D character mask)
      if (this.faceMeshMaterial && this.faceMesh) {
        this.faceMesh.material = this.faceMeshMaterial;
        this.faceMesh.visible = true;
      }
      if (this.wireframeOverlayMesh) this.wireframeOverlayMesh.visible = false;
      this.accessoryGroup.visible = true;
    }

    // 1. Map 2D normalized screen coordinates (0..1) to 3D world space at camera Z=0
    const vFOV = (this.camera.fov * Math.PI) / 180;
    const planeHeightAtDistance = 2 * Math.tan(vFOV / 2) * this.camera.position.z;
    const planeWidthAtDistance = planeHeightAtDistance * this.camera.aspect;

    const canvasW = this.logicalWidth || 640;
    const canvasH = this.logicalHeight || 480;
    const worldUnitsPerPixel = planeHeightAtDistance / canvasH;

    const targetWorldX = (tracking.x - 0.5) * planeWidthAtDistance;
    const targetWorldY = -(tracking.y - 0.5) * planeHeightAtDistance;

    this.faceMeshGroup.position.set(targetWorldX, targetWorldY, 0);
    this.faceMeshGroup.rotation.set(0, 0, 0);
    this.faceMeshGroup.scale.set(1, 1, 1);

    // 2. 3D Accessories (horns, ears, hair locks) follow head pose
    const orientationMultiplier = this.flipVertical ? -1 : 1;
    this.accessoryGroup.rotation.y = tracking.rotationY * 1.15;
    this.accessoryGroup.rotation.x = -tracking.rotationX * 1.15 * orientationMultiplier;
    this.accessoryGroup.rotation.z = -tracking.rotationZ * orientationMultiplier;

    const fitScale = this.maskFitScale; // 0.85 to 1.35
    const accessoryScale = Math.max(0.4, Math.min(2.2, (tracking.facePixelHeight * worldUnitsPerPixel / 2.2) * fitScale));
    this.accessoryGroup.scale.set(accessoryScale, accessoryScale * orientationMultiplier, accessoryScale);

    // 3. Real-time 3D Vertex Deformation from 468 MediaPipe Landmarks + Upper Neck Rings
    const positions = this.faceMeshGeometry.attributes.position.array as Float32Array;
    const uvs = this.faceMeshGeometry.attributes.uv.array as Float32Array;

    const landmarks = tracking.screenLandmarks;

    if (landmarks && landmarks.length >= 468) {
      const centerPt = landmarks[168] || { x: tracking.x * canvasW, y: tracking.y * canvasH };
      const centerX = centerPt.x;
      const centerY = centerPt.y;

      const scaleNormX = (tracking.facePixelWidth || 180) * 0.5;
      const scaleNormY = (tracking.facePixelHeight || 220) * 0.5;
      const vSign = orientationMultiplier;

      // 3a. Deform 468 Face Vertices directly mapped to world units
      for (let i = 0; i < 468; i++) {
        const pt = landmarks[i];
        if (!pt) continue;

        const relPixelX = (pt.x - centerX);
        const relPixelY = (pt.y - centerY);

        const localX = relPixelX * worldUnitsPerPixel * 1.05 * fitScale;
        let localY = -relPixelY * worldUnitsPerPixel * 1.05 * vSign * fitScale;
        let localZ = (pt.z !== undefined ? -pt.z * worldUnitsPerPixel * 0.9 * fitScale : 0);

        // Anatomical depth enhancement
        if (i === 4) localZ += 0.25; // Nose tip
        if (i === 168) localZ += 0.10; // Nose bridge
        if (i === 152) localZ += 0.08; // Chin

        // Mouth jaw opening deformation
        if (i >= 13 && i <= 18) {
          localY -= vSign * tracking.mouthOpenness * 0.18 * mouthSensitivity;
        }

        positions[i * 3 + 0] = localX;
        positions[i * 3 + 1] = localY;
        positions[i * 3 + 2] = localZ;

        // Normalized UV coordinates
        const normUvX = relPixelX / Math.max(1, scaleNormX);
        const normUvY = -relPixelY / Math.max(1, scaleNormY) * vSign;
        uvs[i * 2 + 0] = Math.max(0, Math.min(1, 0.5 + normUvX * 0.45));
        uvs[i * 2 + 1] = Math.max(0, Math.min(1, 0.48 + normUvY * 0.42));
      }

      // 3b. Deform Upper Neck & Throat Collar Vertices (Ring 1 & Ring 2)
      const jaw = JAW_CONTOUR_LANDMARKS;
      const ring1Offset = NUM_FACE_VERTICES; // 468
      const ring2Offset = NUM_FACE_VERTICES + NUM_NECK_RING1; // 489

      for (let k = 0; k < jaw.length; k++) {
        const jawLandmarkIdx = jaw[k];
        const jawX = positions[jawLandmarkIdx * 3 + 0];
        const jawY = positions[jawLandmarkIdx * 3 + 1];
        const jawZ = positions[jawLandmarkIdx * 3 + 2];

        // Ring 1: Upper Neck / Throat Level
        const idx1 = ring1Offset + k;
        positions[idx1 * 3 + 0] = jawX * 0.94;
        positions[idx1 * 3 + 1] = jawY - vSign * 0.32;
        positions[idx1 * 3 + 2] = jawZ - 0.15;

        uvs[idx1 * 2 + 0] = Math.max(0, Math.min(1, 0.5 + (jawX / Math.max(0.1, scaleNormX * worldUnitsPerPixel)) * 0.42));
        uvs[idx1 * 2 + 1] = 0.14;

        // Ring 2: Lower Neck / Collar Level
        const idx2 = ring2Offset + k;
        positions[idx2 * 3 + 0] = jawX * 1.15;
        positions[idx2 * 3 + 1] = jawY - vSign * 0.65;
        positions[idx2 * 3 + 2] = jawZ - 0.10;

        uvs[idx2 * 2 + 0] = Math.max(0, Math.min(1, 0.5 + (jawX / Math.max(0.1, scaleNormX * worldUnitsPerPixel)) * 0.50));
        uvs[idx2 * 2 + 1] = 0.02;
      }

      this.faceMeshGeometry.attributes.position.needsUpdate = true;
      this.faceMeshGeometry.attributes.uv.needsUpdate = true;
      this.faceMeshGeometry.computeVertexNormals();

      // 4c. Update Anatomical Feature Uniforms so character mask fits the user's face perfectly!
      if (this.faceMeshMaterial) {
        const lEyePt = landmarks[33] || landmarks[159] || centerPt;
        const rEyePt = landmarks[263] || landmarks[386] || centerPt;
        const nosePt = landmarks[4] || centerPt;
        const mouthPt = landmarks[13] || centerPt;
        const chinPt = landmarks[152] || centerPt;

        const toUv = (pt: { x: number; y: number }) => {
          const lx = (pt.x - centerX) / scaleNormX;
          const ly = vSign * (-(pt.y - centerY) / scaleNormY);
          return new THREE.Vector2(
            Math.max(0, Math.min(1, 0.5 + lx * 0.42)),
            Math.max(0, Math.min(1, 0.46 + ly * 0.38))
          );
        };

        this.faceMeshMaterial.uniforms.uLeftEye.value.copy(toUv(lEyePt));
        this.faceMeshMaterial.uniforms.uRightEye.value.copy(toUv(rEyePt));
        this.faceMeshMaterial.uniforms.uNose.value.copy(toUv(nosePt));
        this.faceMeshMaterial.uniforms.uMouthCenter.value.copy(toUv(mouthPt));
        this.faceMeshMaterial.uniforms.uJawBase.value.copy(toUv(chinPt));
      }
    }

    // 5. Update Shader Uniforms
    if (this.faceMeshMaterial) {
      this.faceMeshMaterial.uniforms.uTime.value = this.clock.getElapsedTime();
      this.faceMeshMaterial.uniforms.uMouthOpen.value = tracking.mouthOpenness * mouthSensitivity;
      this.faceMeshMaterial.uniforms.uIsScanning.value = this.isScanning ? 1.0 : 0.0;
      this.faceMeshMaterial.uniforms.uScanProgress.value = this.scanProgress;
    }

    // Render WebGL frame
    this.renderer.render(this.scene, this.camera);
  }

  public resize(width: number, height: number): void {
    if (width === 0 || height === 0) return;
    this.logicalWidth = width;
    this.logicalHeight = height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  public dispose(): void {
    if (this.faceMeshGeometry) this.faceMeshGeometry.dispose();
    if (this.faceMeshMaterial) this.faceMeshMaterial.dispose();
    this.renderer.dispose();
  }
}
