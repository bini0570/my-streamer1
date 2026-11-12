import * as THREE from 'three';
import { AnimalFilterId, FaceTrackingData } from '../../../types';

export class Animal3DFilterEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private currentMaskGroup: THREE.Group | null = null;
  private currentFilterId: AnimalFilterId | null = null;
  private lowerJawMesh: THREE.Object3D | null = null;
  private eyesGroup: THREE.Group | null = null;
  private earsGroup: THREE.Group | null = null;
  private leftPupil: THREE.Mesh | null = null;
  private rightPupil: THREE.Mesh | null = null;

  // Cached procedural textures
  private textureCache = new Map<string, THREE.CanvasTexture>();

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    
    // Perspective camera matched to typical phone/webcam FOV
    this.camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 1000);
    this.camera.position.set(0, 0, 5);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(canvas.width, canvas.height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.setupLighting();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5ea, 1.8);
    keyLight.position.set(2, 4, 4);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xd8b4fe, 0.9); // Purple neon rim accent
    fillLight.position.set(-3, -1, 3);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xa855f7, 2.5, 10);
    rimLight.position.set(0, 3, -2);
    this.scene.add(rimLight);
  }

  public resize(width: number, height: number): void {
    if (width === 0 || height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  public setFilter(filterId: AnimalFilterId): void {
    if (this.currentFilterId === filterId && this.currentMaskGroup) {
      return;
    }

    if (this.currentMaskGroup) {
      this.scene.remove(this.currentMaskGroup);
      this.disposeObject(this.currentMaskGroup);
      this.currentMaskGroup = null;
      this.lowerJawMesh = null;
      this.eyesGroup = null;
      this.earsGroup = null;
      this.leftPupil = null;
      this.rightPupil = null;
    }

    this.currentFilterId = filterId;
    this.currentMaskGroup = this.buildAnimalMask(filterId);
    this.scene.add(this.currentMaskGroup);
  }

  public clearFilter(): void {
    if (this.currentMaskGroup) {
      this.scene.remove(this.currentMaskGroup);
      this.disposeObject(this.currentMaskGroup);
      this.currentMaskGroup = null;
      this.currentFilterId = null;
    }
  }

  public update(tracking: FaceTrackingData, filterSensitivity = 1.0, mouthSensitivity = 1.0): void {
    if (!this.currentMaskGroup) return;

    // Map 2D normalized screen coordinates (0..1) to 3D world space at camera Z=0
    // Camera FOV 45 at distance 5.0:
    const vFOV = (this.camera.fov * Math.PI) / 180;
    const planeHeightAtDistance = 2 * Math.tan(vFOV / 2) * this.camera.position.z;
    const planeWidthAtDistance = planeHeightAtDistance * this.camera.aspect;

    // Exact screen-to-world conversion: Center of mask aligns with user's face center
    const targetWorldX = (tracking.x - 0.5) * planeWidthAtDistance;
    const targetWorldY = -(tracking.y - 0.5) * planeHeightAtDistance;

    // Apply exact positions
    this.currentMaskGroup.position.x = targetWorldX;
    this.currentMaskGroup.position.y = targetWorldY;
    this.currentMaskGroup.position.z = 0;

    // Apply exact 3D Head Rotations
    this.currentMaskGroup.rotation.y = tracking.rotationY * 1.1 * filterSensitivity;
    this.currentMaskGroup.rotation.x = -tracking.rotationX * 1.1 * filterSensitivity;
    this.currentMaskGroup.rotation.z = -tracking.rotationZ;

    // CALIBRATED FACE FRAME SCALE:
    // Scale mask to precisely match the user's measured facial dimensions on screen
    const canvasH = this.renderer.domElement.height || 600;
    const worldUnitsPerPixel = planeHeightAtDistance / canvasH;
    
    // Each animal mask model has a standard cranial height of ~2.2 units
    let fittedScale = 1.0;
    if (tracking.detected && tracking.facePixelHeight > 40) {
      const faceWorldHeight = tracking.facePixelHeight * worldUnitsPerPixel;
      fittedScale = (faceWorldHeight / 2.15) * filterSensitivity;
    } else {
      fittedScale = 0.95 * filterSensitivity;
    }

    // Clamp to prevent abnormal extremes while maintaining true fit
    const finalScale = Math.max(0.35, Math.min(2.5, fittedScale));
    this.currentMaskGroup.scale.set(finalScale, finalScale, finalScale);

    // Mouth movement synchronization (hinging the lower jaw down)
    if (this.lowerJawMesh) {
      const jawDropAngle = Math.min(0.65, tracking.mouthOpenness * 0.75 * mouthSensitivity);
      this.lowerJawMesh.rotation.x = jawDropAngle;
      this.lowerJawMesh.position.y = -0.32 - jawDropAngle * 0.25;
      this.lowerJawMesh.position.z = 0.45 - jawDropAngle * 0.1;
    }

    // Dynamic ear twitch / reaction
    if (this.earsGroup) {
      const twitch = Math.sin(Date.now() * 0.004) * 0.04;
      this.earsGroup.rotation.z = twitch + tracking.rotationZ * 0.15;
    }

    this.renderer.render(this.scene, this.camera);
  }

  // -------------------------------------------------------------
  // PROCEDURAL TEXTURE GENERATORS (Authentic Animal Fur & Markings)
  // -------------------------------------------------------------
  private getTexture(key: string, drawFn: (ctx: CanvasRenderingContext2D, size: number) => void): THREE.CanvasTexture {
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key)!;
    }
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    drawFn(ctx, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.textureCache.set(key, texture);
    return texture;
  }

  private createHyenaTexture(): THREE.CanvasTexture {
    return this.getTexture('hyena_fur', (ctx, size) => {
      // Sandy tawny base
      const grad = ctx.createLinearGradient(0, 0, 0, size);
      grad.addColorStop(0, '#c29d62');
      grad.addColorStop(0.5, '#b08b50');
      grad.addColorStop(1, '#8c6b38');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      // Fine fur fibers
      ctx.fillStyle = 'rgba(70, 50, 25, 0.15)';
      for (let i = 0; i < 8000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.fillRect(x, y, 1, 3);
      }

      // Spotted Hyena signature dark irregular spots
      ctx.fillStyle = '#3a2716';
      for (let i = 0; i < 140; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const rx = 6 + Math.random() * 12;
        const ry = 5 + Math.random() * 9;
        const rot = Math.random() * Math.PI;

        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
        ctx.fill();

        // Dark blurred halo
        ctx.strokeStyle = 'rgba(30, 20, 10, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }

  private createGorillaTexture(): THREE.CanvasTexture {
    return this.getTexture('gorilla_fur', (ctx, size) => {
      // Deep charcoal/ebony base with silverback highlights
      ctx.fillStyle = '#1c1c20';
      ctx.fillRect(0, 0, size, size);

      // Dense coarse dark hair
      ctx.fillStyle = 'rgba(10, 10, 12, 0.7)';
      for (let i = 0; i < 12000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.fillRect(x, y, 1, 4);
      }

      // Silverback frosted sheen streaks
      ctx.fillStyle = 'rgba(195, 200, 210, 0.18)';
      for (let i = 0; i < 3500; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.fillRect(x, y, 1, 5);
      }
    });
  }

  private createTigerTexture(): THREE.CanvasTexture {
    return this.getTexture('tiger_fur', (ctx, size) => {
      // Radiant amber-orange base
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, '#e87216');
      grad.addColorStop(0.5, '#d35400');
      grad.addColorStop(1, '#ff9f43');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      // Distinct black jagged stripes
      ctx.fillStyle = '#110c08';
      for (let y = 30; y < size; y += 45) {
        ctx.beginPath();
        const startX = (Math.random() - 0.2) * size * 0.5;
        ctx.moveTo(startX, y);
        ctx.bezierCurveTo(
          startX + size * 0.3, y - 25,
          startX + size * 0.6, y + 20,
          startX + size * 0.9, y - 5
        );
        ctx.lineWidth = 14 + Math.random() * 8;
        ctx.strokeStyle = '#1a110a';
        ctx.stroke();
      }

      // White whisker / underfur flecks
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      for (let i = 0; i < 3000; i++) {
        ctx.fillRect(Math.random() * size, Math.random() * size, 1, 3);
      }
    });
  }

  private createLionTexture(): THREE.CanvasTexture {
    return this.getTexture('lion_fur', (ctx, size) => {
      const grad = ctx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, size / 2);
      grad.addColorStop(0, '#d4a359');
      grad.addColorStop(0.7, '#b8863b');
      grad.addColorStop(1, '#845722');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      // Golden mane fibers
      ctx.fillStyle = 'rgba(235, 185, 95, 0.25)';
      for (let i = 0; i < 9000; i++) {
        ctx.fillRect(Math.random() * size, Math.random() * size, 1, 4);
      }
    });
  }

  private createWolfTexture(): THREE.CanvasTexture {
    return this.getTexture('wolf_fur', (ctx, size) => {
      ctx.fillStyle = '#4a4d52';
      ctx.fillRect(0, 0, size, size);

      // Multi-tonal grey, charcoal, and icy white guard hairs
      for (let i = 0; i < 14000; i++) {
        const rand = Math.random();
        if (rand < 0.4) ctx.fillStyle = 'rgba(25, 27, 30, 0.4)';
        else if (rand < 0.75) ctx.fillStyle = 'rgba(140, 145, 155, 0.3)';
        else ctx.fillStyle = 'rgba(240, 243, 248, 0.25)';

        ctx.fillRect(Math.random() * size, Math.random() * size, 1, 5);
      }
    });
  }

  private createFoxTexture(): THREE.CanvasTexture {
    return this.getTexture('fox_fur', (ctx, size) => {
      const grad = ctx.createLinearGradient(0, 0, 0, size);
      grad.addColorStop(0, '#d34816');
      grad.addColorStop(0.65, '#e05822');
      grad.addColorStop(0.9, '#f6e2d3');
      grad.addColorStop(1, '#ffffff');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      ctx.fillStyle = 'rgba(255, 230, 210, 0.2)';
      for (let i = 0; i < 6000; i++) {
        ctx.fillRect(Math.random() * size, Math.random() * size, 1, 4);
      }
    });
  }

  private createBearTexture(): THREE.CanvasTexture {
    return this.getTexture('bear_fur', (ctx, size) => {
      ctx.fillStyle = '#442a17';
      ctx.fillRect(0, 0, size, size);

      ctx.fillStyle = 'rgba(30, 16, 8, 0.6)';
      for (let i = 0; i < 12000; i++) {
        ctx.fillRect(Math.random() * size, Math.random() * size, 1, 4);
      }
      ctx.fillStyle = 'rgba(140, 95, 60, 0.25)';
      for (let i = 0; i < 4000; i++) {
        ctx.fillRect(Math.random() * size, Math.random() * size, 1, 4);
      }
    });
  }

  private createMonkeyTexture(): THREE.CanvasTexture {
    return this.getTexture('monkey_fur', (ctx, size) => {
      ctx.fillStyle = '#6e503b';
      ctx.fillRect(0, 0, size, size);

      ctx.fillStyle = 'rgba(40, 25, 15, 0.5)';
      for (let i = 0; i < 9000; i++) {
        ctx.fillRect(Math.random() * size, Math.random() * size, 1, 3);
      }
    });
  }

  // -------------------------------------------------------------
  // 3D ANIMAL MASK BUILDERS
  // -------------------------------------------------------------
  private buildAnimalMask(id: AnimalFilterId): THREE.Group {
    const root = new THREE.Group();

    switch (id) {
      case 'hyena':
        this.buildHyenaMask(root);
        break;
      case 'gorilla':
        this.buildGorillaMask(root);
        break;
      case 'tiger':
        this.buildTigerMask(root);
        break;
      case 'lion':
        this.buildLionMask(root);
        break;
      case 'wolf':
        this.buildWolfMask(root);
        break;
      case 'monkey':
        this.buildMonkeyMask(root);
        break;
      case 'bear':
        this.buildBearMask(root);
        break;
      case 'fox':
        this.buildFoxMask(root);
        break;
    }

    return root;
  }

  // 1. HYENA (ጅቦ - Jibo): Strong bone-crushing muzzle, rounded ears, spotted coat, fangs
  private buildHyenaMask(root: THREE.Group): void {
    const furTex = this.createHyenaTexture();
    const mat = new THREE.MeshStandardMaterial({
      map: furTex,
      roughness: 0.8,
      metalness: 0.1,
    });

    // Cranium / Face structure
    const craniumGeo = new THREE.SphereGeometry(1.05, 24, 20);
    craniumGeo.scale(1.0, 1.15, 0.75);
    const cranium = new THREE.Mesh(craniumGeo, mat);
    cranium.position.set(0, 0.1, 0);
    root.add(cranium);

    // Brow ridge & wide forehead crest
    const browGeo = new THREE.BoxGeometry(1.2, 0.35, 0.5);
    const brow = new THREE.Mesh(browGeo, mat);
    brow.position.set(0, 0.35, 0.45);
    root.add(brow);

    // Large, powerful elongated snout & muzzle
    const snoutGeo = new THREE.CylinderGeometry(0.35, 0.55, 0.85, 18);
    snoutGeo.rotateX(Math.PI / 2);
    const snout = new THREE.Mesh(snoutGeo, mat);
    snout.position.set(0, -0.08, 0.7);
    root.add(snout);

    // Leathery Black Nose pad with nostrils
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.4, bumpScale: 0.05 });
    const noseGeo = new THREE.SphereGeometry(0.24, 16, 14);
    noseGeo.scale(1.3, 0.8, 0.8);
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.05, 1.15);
    root.add(nose);

    // Nostrils
    const nostrilMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
    const nostrilL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 8), nostrilMat);
    nostrilL.rotation.x = Math.PI / 3;
    nostrilL.position.set(-0.09, -0.08, 1.25);
    root.add(nostrilL);
    const nostrilR = nostrilL.clone();
    nostrilR.position.x = 0.09;
    root.add(nostrilR);

    // Broad Rounded Hyena Ears
    this.earsGroup = new THREE.Group();
    const earGeo = new THREE.SphereGeometry(0.48, 16, 14);
    earGeo.scale(0.85, 1.1, 0.25);
    const earMatOuter = mat;
    const earMatInner = new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 0.9 });

    const earL = new THREE.Mesh(earGeo, earMatOuter);
    earL.position.set(-0.95, 0.95, -0.1);
    earL.rotation.set(-0.15, 0.4, 0.35);
    this.earsGroup.add(earL);

    const earR = new THREE.Mesh(earGeo, earMatOuter);
    earR.position.set(0.95, 0.95, -0.1);
    earR.rotation.set(-0.15, -0.4, -0.35);
    this.earsGroup.add(earR);
    root.add(this.earsGroup);

    // Predatory Amber Eyes
    this.createEyes(root, 0xd97706, -0.38, 0.38, 0.26, 0.55);

    // Articulated Lower Jaw with sharp canine fangs
    this.buildJaw(root, mat, 0.45, 0.75, true);
  }

  // 2. GORILLA (ጎሪ - Gori): Prominent sagittal crest, dark leathery muzzle, flared nostrils
  private buildGorillaMask(root: THREE.Group): void {
    const furTex = this.createGorillaTexture();
    const furMat = new THREE.MeshStandardMaterial({
      map: furTex,
      roughness: 0.85,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x242428,
      roughness: 0.55,
      metalness: 0.15,
    });

    // Massive Cranium with Silverback Sagittal Crest
    const headGeo = new THREE.SphereGeometry(1.15, 24, 20);
    headGeo.scale(1.1, 1.25, 0.85);
    const head = new THREE.Mesh(headGeo, furMat);
    head.position.set(0, 0.2, 0);
    root.add(head);

    // Prominent Gorilloid Sagittal Crest Ridge on crown
    const crestGeo = new THREE.BoxGeometry(0.45, 0.55, 1.0);
    const crest = new THREE.Mesh(crestGeo, furMat);
    crest.position.set(0, 1.15, -0.1);
    crest.rotation.x = -0.2;
    root.add(crest);

    // Heavy Supraorbital Brow Ridge
    const browGeo = new THREE.CylinderGeometry(0.25, 0.25, 1.45, 16);
    browGeo.rotateZ(Math.PI / 2);
    const brow = new THREE.Mesh(browGeo, skinMat);
    brow.position.set(0, 0.38, 0.6);
    root.add(brow);

    // Broad Leathery Gorilla Muzzle & Cheeks
    const muzzleGeo = new THREE.SphereGeometry(0.58, 20, 16);
    muzzleGeo.scale(1.2, 0.75, 0.9);
    const muzzle = new THREE.Mesh(muzzleGeo, skinMat);
    muzzle.position.set(0, -0.1, 0.72);
    root.add(muzzle);

    // Broad Flared Nostrils
    const noseGeo = new THREE.BoxGeometry(0.42, 0.25, 0.28);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, 0.05, 1.05);
    root.add(nose);

    // Gorilla Ears
    this.earsGroup = new THREE.Group();
    const earGeo = new THREE.TorusGeometry(0.24, 0.08, 12, 16, Math.PI * 1.2);
    const earL = new THREE.Mesh(earGeo, skinMat);
    earL.position.set(-1.05, 0.2, 0.1);
    earL.rotation.set(0, 0.6, -0.2);
    this.earsGroup.add(earL);

    const earR = new THREE.Mesh(earGeo, skinMat);
    earR.position.set(1.05, 0.2, 0.1);
    earR.rotation.set(0, -0.6, 0.2);
    this.earsGroup.add(earR);
    root.add(this.earsGroup);

    // Deep-set Primate Eyes
    this.createEyes(root, 0x451a03, -0.32, 0.32, 0.32, 0.58);

    // Lower Gorilla Jaw
    this.buildJaw(root, skinMat, 0.55, 0.65, false);
  }

  // 3. TIGER: Orange coat, bold black stripes, whisker pads, fangs
  private buildTigerMask(root: THREE.Group): void {
    const furTex = this.createTigerTexture();
    const mat = new THREE.MeshStandardMaterial({ map: furTex, roughness: 0.75 });

    const headGeo = new THREE.SphereGeometry(1.05, 24, 20);
    headGeo.scale(1.15, 1.05, 0.85);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.set(0, 0.1, 0);
    root.add(head);

    // White Feline Cheek Ruffs
    const cheekMat = new THREE.MeshStandardMaterial({ color: 0xfffcf5, roughness: 0.9 });
    const cheekGeo = new THREE.ConeGeometry(0.55, 0.8, 12);
    cheekGeo.rotateZ(Math.PI / 2.5);
    const cheekL = new THREE.Mesh(cheekGeo, cheekMat);
    cheekL.position.set(-0.95, -0.15, 0.35);
    root.add(cheekL);

    const cheekR = cheekL.clone();
    cheekR.rotation.z = -Math.PI / 2.5;
    cheekR.position.x = 0.95;
    root.add(cheekR);

    // Broad Feline Snout
    const snoutGeo = new THREE.CylinderGeometry(0.32, 0.48, 0.7, 16);
    snoutGeo.rotateX(Math.PI / 2);
    const snout = new THREE.Mesh(snoutGeo, mat);
    snout.position.set(0, -0.05, 0.65);
    root.add(snout);

    // Pink/Terracotta Feline Nose
    const noseMat = new THREE.MeshStandardMaterial({ color: 0xd97768, roughness: 0.4 });
    const noseGeo = new THREE.CylinderGeometry(0.18, 0.08, 0.15, 3);
    noseGeo.rotateX(Math.PI);
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.02, 1.05);
    root.add(nose);

    // Tiger Ears with white dorsal spot
    this.earsGroup = new THREE.Group();
    const earGeo = new THREE.ConeGeometry(0.38, 0.55, 14);
    const earL = new THREE.Mesh(earGeo, mat);
    earL.position.set(-0.75, 0.95, 0.1);
    earL.rotation.set(-0.2, 0.2, 0.4);
    this.earsGroup.add(earL);

    const earR = new THREE.Mesh(earGeo, mat);
    earR.position.set(0.75, 0.95, 0.1);
    earR.rotation.set(-0.2, -0.2, -0.4);
    this.earsGroup.add(earR);
    root.add(this.earsGroup);

    // Emerald/Amber Feline Eyes
    this.createEyes(root, 0x10b981, -0.35, 0.35, 0.24, 0.62);

    // Lower Jaw with Fangs
    this.buildJaw(root, cheekMat, 0.4, 0.6, true);
  }

  // 4. LION: Golden mane ring, royal muzzle, golden eyes
  private buildLionMask(root: THREE.Group): void {
    const furTex = this.createLionTexture();
    const mat = new THREE.MeshStandardMaterial({ map: furTex, roughness: 0.75 });

    // Voluminous Regal Mane Ring surrounding head
    const maneGeo = new THREE.TorusGeometry(1.25, 0.65, 16, 24);
    const maneMat = new THREE.MeshStandardMaterial({
      map: furTex,
      roughness: 0.9,
      bumpScale: 0.1,
    });
    const mane = new THREE.Mesh(maneGeo, maneMat);
    mane.position.set(0, 0.15, -0.2);
    root.add(mane);

    // Face skull
    const headGeo = new THREE.SphereGeometry(1.0, 24, 20);
    headGeo.scale(1.05, 1.1, 0.85);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.set(0, 0.1, 0.1);
    root.add(head);

    // Royal Tawny Snout
    const snoutGeo = new THREE.BoxGeometry(0.65, 0.48, 0.75);
    const snout = new THREE.Mesh(snoutGeo, mat);
    snout.position.set(0, -0.06, 0.7);
    root.add(snout);

    // Dark Nose
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x1f1915, roughness: 0.4 });
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.15), noseMat);
    nose.position.set(0, -0.02, 1.1);
    root.add(nose);

    // Rounded Lion Ears embedded in mane
    this.earsGroup = new THREE.Group();
    const earGeo = new THREE.SphereGeometry(0.35, 14, 12);
    earGeo.scale(0.9, 1.0, 0.3);
    const earL = new THREE.Mesh(earGeo, mat);
    earL.position.set(-0.85, 0.88, 0.2);
    earL.rotation.set(-0.2, 0.3, 0.3);
    this.earsGroup.add(earL);

    const earR = new THREE.Mesh(earGeo, mat);
    earR.position.set(0.85, 0.88, 0.2);
    earR.rotation.set(-0.2, -0.3, -0.3);
    this.earsGroup.add(earR);
    root.add(this.earsGroup);

    // Golden Eyes
    this.createEyes(root, 0xf59e0b, -0.34, 0.34, 0.25, 0.62);

    // Jaw with Fangs
    this.buildJaw(root, mat, 0.45, 0.65, true);
  }

  // 5. WOLF: Elongated canine muzzle, erect triangular ears, timber fur
  private buildWolfMask(root: THREE.Group): void {
    const furTex = this.createWolfTexture();
    const mat = new THREE.MeshStandardMaterial({ map: furTex, roughness: 0.8 });

    const headGeo = new THREE.SphereGeometry(1.0, 24, 20);
    headGeo.scale(1.0, 1.15, 0.8);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.set(0, 0.1, 0);
    root.add(head);

    // Long Slender Canine Snout
    const snoutGeo = new THREE.ConeGeometry(0.42, 1.1, 16);
    snoutGeo.rotateX(Math.PI / 2);
    const snout = new THREE.Mesh(snoutGeo, mat);
    snout.position.set(0, -0.05, 0.85);
    root.add(snout);

    // Black Nose Pad
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), noseMat);
    nose.position.set(0, 0.02, 1.4);
    root.add(nose);

    // Tall Erect Wolf Ears
    this.earsGroup = new THREE.Group();
    const earGeo = new THREE.ConeGeometry(0.38, 0.85, 14);
    earGeo.scale(1.0, 1.0, 0.4);

    const earL = new THREE.Mesh(earGeo, mat);
    earL.position.set(-0.7, 1.15, 0.05);
    earL.rotation.set(-0.15, 0.25, 0.3);
    this.earsGroup.add(earL);

    const earR = new THREE.Mesh(earGeo, mat);
    earR.position.set(0.7, 1.15, 0.05);
    earR.rotation.set(-0.15, -0.25, -0.3);
    this.earsGroup.add(earR);
    root.add(this.earsGroup);

    // Piercing Icy Yellow/Blue Eyes
    this.createEyes(root, 0x38bdf8, -0.32, 0.32, 0.26, 0.58);

    // Lower Canine Jaw
    this.buildJaw(root, mat, 0.35, 0.85, true);
  }

  // 6. MONKEY: Playful primate muzzle, large rounded ears, expressive eyes
  private buildMonkeyMask(root: THREE.Group): void {
    const furTex = this.createMonkeyTexture();
    const furMat = new THREE.MeshStandardMaterial({ map: furTex, roughness: 0.85 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdd9e76, roughness: 0.6 });

    // Round Head
    const headGeo = new THREE.SphereGeometry(1.0, 24, 20);
    const head = new THREE.Mesh(headGeo, furMat);
    head.position.set(0, 0.1, 0);
    root.add(head);

    // Peach Fleshy Simian Face Mask
    const faceMaskGeo = new THREE.SphereGeometry(0.75, 20, 18);
    faceMaskGeo.scale(1.0, 1.05, 0.55);
    const faceMask = new THREE.Mesh(faceMaskGeo, skinMat);
    faceMask.position.set(0, 0.05, 0.5);
    root.add(faceMask);

    // Protruding Simian Snout
    const snoutGeo = new THREE.SphereGeometry(0.48, 18, 14);
    snoutGeo.scale(1.15, 0.75, 0.85);
    const snout = new THREE.Mesh(snoutGeo, skinMat);
    snout.position.set(0, -0.15, 0.75);
    root.add(snout);

    // Cute Round Monkey Ears
    this.earsGroup = new THREE.Group();
    const earGeo = new THREE.TorusGeometry(0.42, 0.12, 12, 18);
    const earL = new THREE.Mesh(earGeo, skinMat);
    earL.position.set(-1.1, 0.2, 0.05);
    earL.rotation.set(0, 0.4, 0.1);
    this.earsGroup.add(earL);

    const earR = new THREE.Mesh(earGeo, skinMat);
    earR.position.set(1.1, 0.2, 0.05);
    earR.rotation.set(0, -0.4, -0.1);
    this.earsGroup.add(earR);
    root.add(this.earsGroup);

    // Expressive Brown Eyes
    this.createEyes(root, 0x854d0e, -0.32, 0.32, 0.28, 0.65);

    // Jaw
    this.buildJaw(root, skinMat, 0.48, 0.6, false);
  }

  // 7. BEAR: Heavy grizzly muzzle, teddy ears, dense brown coat
  private buildBearMask(root: THREE.Group): void {
    const furTex = this.createBearTexture();
    const mat = new THREE.MeshStandardMaterial({ map: furTex, roughness: 0.9 });

    // Heavy round bear cranium
    const headGeo = new THREE.SphereGeometry(1.2, 24, 20);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.set(0, 0.15, 0);
    root.add(head);

    // Broad Grizzly Snout
    const snoutGeo = new THREE.CylinderGeometry(0.45, 0.65, 0.8, 18);
    snoutGeo.rotateX(Math.PI / 2);
    const snout = new THREE.Mesh(snoutGeo, mat);
    snout.position.set(0, -0.1, 0.75);
    root.add(snout);

    // Leathery Black Bear Nose
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.35 });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 14), noseMat);
    nose.position.set(0, -0.05, 1.2);
    root.add(nose);

    // Round Teddy Bear Ears
    this.earsGroup = new THREE.Group();
    const earGeo = new THREE.SphereGeometry(0.42, 16, 14);
    earGeo.scale(1.0, 1.0, 0.35);

    const earL = new THREE.Mesh(earGeo, mat);
    earL.position.set(-0.95, 1.05, 0.0);
    earL.rotation.set(-0.1, 0.3, 0.4);
    this.earsGroup.add(earL);

    const earR = new THREE.Mesh(earGeo, mat);
    earR.position.set(0.95, 1.05, 0.0);
    earR.rotation.set(-0.1, -0.3, -0.4);
    this.earsGroup.add(earR);
    root.add(this.earsGroup);

    // Dark Brown Eyes
    this.createEyes(root, 0x3f2212, -0.38, 0.38, 0.28, 0.65);

    // Powerful Bear Jaw
    this.buildJaw(root, mat, 0.52, 0.7, true);
  }

  // 8. FOX: Triangular mask, sleek orange coat, white cheeks, tall triangular ears
  private buildFoxMask(root: THREE.Group): void {
    const furTex = this.createFoxTexture();
    const mat = new THREE.MeshStandardMaterial({ map: furTex, roughness: 0.75 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });

    // Sleek Triangular Fox Head
    const headGeo = new THREE.ConeGeometry(0.95, 1.4, 20);
    headGeo.rotateX(Math.PI);
    headGeo.scale(1.15, 0.85, 0.75);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.set(0, 0.15, 0.1);
    root.add(head);

    // Pure White Fox Cheeks
    const cheekGeo = new THREE.ConeGeometry(0.45, 0.75, 14);
    cheekGeo.rotateZ(Math.PI / 2.2);
    const cheekL = new THREE.Mesh(cheekGeo, whiteMat);
    cheekL.position.set(-0.82, -0.1, 0.35);
    root.add(cheekL);

    const cheekR = cheekL.clone();
    cheekR.rotation.z = -Math.PI / 2.2;
    cheekR.position.x = 0.82;
    root.add(cheekR);

    // Sharp Pointed Fox Snout
    const snoutGeo = new THREE.ConeGeometry(0.32, 1.0, 16);
    snoutGeo.rotateX(Math.PI / 2);
    const snout = new THREE.Mesh(snoutGeo, mat);
    snout.position.set(0, -0.06, 0.8);
    root.add(snout);

    // Sharp Black Nose Button
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.2 });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), noseMat);
    nose.position.set(0, -0.02, 1.35);
    root.add(nose);

    // Tall Triangular Fox Ears with Black Tips
    this.earsGroup = new THREE.Group();
    const earGeo = new THREE.ConeGeometry(0.42, 1.1, 14);
    earGeo.scale(1.0, 1.0, 0.3);

    const earL = new THREE.Mesh(earGeo, mat);
    earL.position.set(-0.68, 1.25, 0.1);
    earL.rotation.set(-0.2, 0.25, 0.35);
    this.earsGroup.add(earL);

    const earR = new THREE.Mesh(earGeo, mat);
    earR.position.set(0.68, 1.25, 0.1);
    earR.rotation.set(-0.2, -0.25, -0.35);
    this.earsGroup.add(earR);
    root.add(this.earsGroup);

    // Cunning Slit Amber Eyes
    this.createEyes(root, 0xfbbf24, -0.32, 0.32, 0.25, 0.6);

    // Lower Fox Jaw
    this.buildJaw(root, whiteMat, 0.28, 0.8, true);
  }

  // -------------------------------------------------------------
  // REUSABLE 3D ANATOMICAL ELEMENTS (Eyes, Articulated Jaws, Fangs)
  // -------------------------------------------------------------
  private createEyes(
    parent: THREE.Group,
    irisColor: number,
    leftX: number,
    rightX: number,
    y: number,
    z: number
  ): void {
    this.eyesGroup = new THREE.Group();

    const eyeballGeo = new THREE.SphereGeometry(0.18, 16, 14);
    const scleraMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.1 });
    const irisMat = new THREE.MeshStandardMaterial({
      color: irisColor,
      roughness: 0.2,
      metalness: 0.3,
    });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x020202 });

    // Eye Left
    const eyeLeft = new THREE.Mesh(eyeballGeo, scleraMat);
    eyeLeft.position.set(leftX, y, z);

    const irisL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 16), irisMat);
    irisL.rotateX(Math.PI / 2);
    irisL.position.set(0, 0, 0.16);
    eyeLeft.add(irisL);

    this.leftPupil = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 12), pupilMat);
    this.leftPupil.rotateX(Math.PI / 2);
    this.leftPupil.position.set(0, 0, 0.17);
    eyeLeft.add(this.leftPupil);
    this.eyesGroup.add(eyeLeft);

    // Eye Right
    const eyeRight = new THREE.Mesh(eyeballGeo, scleraMat);
    eyeRight.position.set(rightX, y, z);

    const irisR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 16), irisMat);
    irisR.rotateX(Math.PI / 2);
    irisR.position.set(0, 0, 0.16);
    eyeRight.add(irisR);

    this.rightPupil = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 12), pupilMat);
    this.rightPupil.rotateX(Math.PI / 2);
    this.rightPupil.position.set(0, 0, 0.17);
    eyeRight.add(this.rightPupil);
    this.eyesGroup.add(eyeRight);

    parent.add(this.eyesGroup);
  }

  private buildJaw(
    parent: THREE.Group,
    material: THREE.Material,
    width: number,
    length: number,
    includeFangs: boolean
  ): void {
    const jawPivot = new THREE.Group();
    jawPivot.position.set(0, -0.32, 0.45);

    // Jawbone geometry
    const jawGeo = new THREE.BoxGeometry(width, 0.16, length);
    const jawMesh = new THREE.Mesh(jawGeo, material);
    jawMesh.position.set(0, 0, length * 0.35);
    jawPivot.add(jawMesh);

    // Sharp predator canine fangs
    if (includeFangs) {
      const fangMat = new THREE.MeshStandardMaterial({ color: 0xfffff0, roughness: 0.15 });
      const fangGeo = new THREE.ConeGeometry(0.05, 0.22, 10);

      const fangL = new THREE.Mesh(fangGeo, fangMat);
      fangL.position.set(-width * 0.35, 0.12, length * 0.65);
      fangL.rotation.x = Math.PI;
      jawPivot.add(fangL);

      const fangR = new THREE.Mesh(fangGeo, fangMat);
      fangR.position.set(width * 0.35, 0.12, length * 0.65);
      fangR.rotation.x = Math.PI;
      jawPivot.add(fangR);

      // Pink Tongue
      const tongueMat = new THREE.MeshStandardMaterial({ color: 0xdf4c6e, roughness: 0.3 });
      const tongueGeo = new THREE.BoxGeometry(width * 0.5, 0.06, length * 0.5);
      const tongue = new THREE.Mesh(tongueGeo, tongueMat);
      tongue.position.set(0, 0.08, length * 0.4);
      jawPivot.add(tongue);
    }

    this.lowerJawMesh = jawPivot;
    parent.add(jawPivot);
  }

  private disposeObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }

  public dispose(): void {
    this.clearFilter();
    this.renderer.dispose();
    this.textureCache.forEach((tex) => tex.dispose());
    this.textureCache.clear();
  }
}
