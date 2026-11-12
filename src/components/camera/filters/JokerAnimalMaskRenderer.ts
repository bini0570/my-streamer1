import { AnimalFilterId, FaceLandmarkPoint, FaceTrackingData } from '../../../types';
import { FACEMESH_FACE_OVAL } from '../../../data/faceMeshConnections';

export class JokerAnimalMaskRenderer {
  /**
   * Main entry point: renders a complete, full-coverage Joker-style theatrical animal mask
   * directly over the face landmarks so the real face is 100% concealed.
   */
  public static render(
    ctx: CanvasRenderingContext2D,
    filterId: AnimalFilterId,
    tracking: FaceTrackingData,
    width: number,
    height: number
  ): void {
    if (!tracking.detected || tracking.facePixelWidth < 20) return;

    ctx.save();

    const pts = tracking.screenLandmarks;
    const centerX = tracking.x * width;
    const centerY = tracking.y * height;
    const faceW = tracking.facePixelWidth;
    const faceH = tracking.facePixelHeight;
    const mouthOpen = tracking.mouthOpenness;
    const roll = tracking.rotationZ;
    const yaw = tracking.rotationY;
    const pitch = tracking.rotationX;

    // Apply head orientation transform centered at face bridge
    ctx.translate(centerX, centerY);
    ctx.rotate(roll);

    // 1. Draw Outer Ears (Behind the face mask)
    this.drawAnimalEars(ctx, filterId, faceW, faceH, yaw, pitch);

    // 2. Full-Face Solid Mask Base (100% Covers & Conceals the Human Face)
    this.drawFaceMaskBase(ctx, filterId, pts, faceW, faceH, yaw, pitch);

    // 3. Theatrical Animal Warpaint / Markings (Joker Mask Patterns)
    this.drawCharacterMarkings(ctx, filterId, faceW, faceH, yaw, pitch);

    // 4. Dramatic Theatrical Animal Eyes (Completely masks real eyes & brows)
    this.drawAnimalEyes(ctx, filterId, faceW, faceH, yaw, pitch);

    // 5. Stylized Animal Muzzle & Snout
    this.drawAnimalMuzzle(ctx, filterId, faceW, faceH, yaw, pitch);

    // 6. Dynamic Mouth & Fanged Jaw (Hinged to user mouth opening)
    this.drawAnimalJaw(ctx, filterId, faceW, faceH, mouthOpen, yaw, pitch);

    ctx.restore();
  }

  /**
   * Step 1: Draw high-speed full face coverage base that completely conceals the user's skin.
   */
  private static drawFaceMaskBase(
    ctx: CanvasRenderingContext2D,
    filterId: AnimalFilterId,
    pts: FaceLandmarkPoint[] | undefined,
    faceW: number,
    faceH: number,
    yaw: number,
    pitch: number
  ): void {
    ctx.save();

    // Trace the exact face boundary
    ctx.beginPath();
    const rx = faceW * 0.54;
    const ry = faceH * 0.62;

    // If MediaPipe points exist, follow the oval closely, else smooth anatomical contour
    if (pts && pts.length >= 468) {
      // Forehead to temple to jaw to chin
      const ovalIndices = [
        10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
        400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
        54, 103, 67, 109,
      ];

      for (let i = 0; i < ovalIndices.length; i++) {
        const pt = pts[ovalIndices[i]];
        if (pt) {
          // Local offset relative to center
          const lx = pt.x - (pts[168]?.x || 0);
          const ly = pt.y - (pts[168]?.y || 0);
          if (i === 0) ctx.moveTo(lx, ly);
          else ctx.lineTo(lx, ly);
        }
      }
      ctx.closePath();
    } else {
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    }

    // High coverage opaque theatrical gradients (Joker Mask style)
    let fillGrad: CanvasGradient;

    switch (filterId) {
      case 'hyena': // ጅቦ: Spotted predator tawny ochre & bone mask
        fillGrad = ctx.createRadialGradient(0, -ry * 0.2, rx * 0.1, 0, 0, ry);
        fillGrad.addColorStop(0, '#e8bc72');
        fillGrad.addColorStop(0.6, '#c49341');
        fillGrad.addColorStop(1, '#664516');
        break;

      case 'gorilla': // ጎሪ: Mountain silverback dark warrior mask
        fillGrad = ctx.createRadialGradient(0, -ry * 0.3, rx * 0.1, 0, 0, ry);
        fillGrad.addColorStop(0, '#35353d');
        fillGrad.addColorStop(0.5, '#1e1e24');
        fillGrad.addColorStop(1, '#0e0e12');
        break;

      case 'tiger': // Bengal Tiger: Fiery orange & white theatrical base
        fillGrad = ctx.createLinearGradient(0, -ry, 0, ry);
        fillGrad.addColorStop(0, '#ea580c');
        fillGrad.addColorStop(0.55, '#f97316');
        fillGrad.addColorStop(0.85, '#ffedd5');
        fillGrad.addColorStop(1, '#ffffff');
        break;

      case 'lion': // Savanna Lion: Royal golden mane base
        fillGrad = ctx.createRadialGradient(0, 0, rx * 0.2, 0, 0, ry);
        fillGrad.addColorStop(0, '#f59e0b');
        fillGrad.addColorStop(0.7, '#d97706');
        fillGrad.addColorStop(1, '#78350f');
        break;

      case 'wolf': // Timber Wolf: Sleek obsidian and icy silver mask
        fillGrad = ctx.createLinearGradient(0, -ry, 0, ry);
        fillGrad.addColorStop(0, '#475569');
        fillGrad.addColorStop(0.5, '#334155');
        fillGrad.addColorStop(0.85, '#94a3b8');
        fillGrad.addColorStop(1, '#e2e8f0');
        break;

      case 'monkey': // Playful Primate: Warm peach and mahogany mask
        fillGrad = ctx.createRadialGradient(0, 0, rx * 0.1, 0, 0, ry);
        fillGrad.addColorStop(0, '#fed7aa');
        fillGrad.addColorStop(0.6, '#ea580c');
        fillGrad.addColorStop(1, '#7c2d12');
        break;

      case 'bear': // Grizzly Bear: Heavy dark umber fur mask
        fillGrad = ctx.createRadialGradient(0, -ry * 0.2, rx * 0.2, 0, 0, ry);
        fillGrad.addColorStop(0, '#78350f');
        fillGrad.addColorStop(0.7, '#451a03');
        fillGrad.addColorStop(1, '#1c0b02');
        break;

      case 'fox': // Red Fox: Fiery crimson & porcelain white masquerade mask
        fillGrad = ctx.createLinearGradient(0, -ry, 0, ry);
        fillGrad.addColorStop(0, '#dc2626');
        fillGrad.addColorStop(0.5, '#ea580c');
        fillGrad.addColorStop(0.75, '#ffffff');
        fillGrad.addColorStop(1, '#ffffff');
        break;
    }

    ctx.fillStyle = fillGrad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 18;
    ctx.fill();

    // Opaque hairline perimeter to ensure zero skin bleed
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(15, 10, 25, 0.9)';
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Step 2: Theatrical Joker-style character markings, warpaint, spots & stripes.
   */
  private static drawCharacterMarkings(
    ctx: CanvasRenderingContext2D,
    filterId: AnimalFilterId,
    faceW: number,
    faceH: number,
    yaw: number,
    pitch: number
  ): void {
    ctx.save();
    const rx = faceW * 0.5;
    const ry = faceH * 0.58;

    if (filterId === 'hyena') {
      // ጅቦ Signature spotted predator spots & bridge warpaint
      ctx.fillStyle = 'rgba(40, 22, 10, 0.85)';
      const spots = [
        { x: -rx * 0.55, y: -ry * 0.35, r: rx * 0.08 },
        { x: -rx * 0.7, y: -ry * 0.1, r: rx * 0.09 },
        { x: -rx * 0.5, y: ry * 0.15, r: rx * 0.07 },
        { x: -rx * 0.65, y: ry * 0.35, r: rx * 0.08 },
        { x: rx * 0.55, y: -ry * 0.35, r: rx * 0.08 },
        { x: rx * 0.7, y: -ry * 0.1, r: rx * 0.09 },
        { x: rx * 0.5, y: ry * 0.15, r: rx * 0.07 },
        { x: rx * 0.65, y: ry * 0.35, r: rx * 0.08 },
        { x: 0, y: -ry * 0.6, r: rx * 0.1 },
      ];

      for (const s of spots) {
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, s.r, s.r * 0.8, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Forehead dark crest line
      ctx.strokeStyle = '#2b180a';
      ctx.lineWidth = rx * 0.1;
      ctx.beginPath();
      ctx.moveTo(0, -ry * 0.85);
      ctx.lineTo(0, -ry * 0.2);
      ctx.stroke();
    } else if (filterId === 'tiger') {
      // Bold black tiger stripes cutting across cheeks and forehead
      ctx.strokeStyle = 'rgba(15, 10, 8, 0.95)';
      ctx.lineWidth = rx * 0.07;
      ctx.lineCap = 'round';

      // Forehead crown stripes
      ctx.beginPath();
      ctx.moveTo(0, -ry * 0.85);
      ctx.lineTo(0, -ry * 0.45);
      ctx.moveTo(-rx * 0.25, -ry * 0.75);
      ctx.lineTo(0, -ry * 0.5);
      ctx.lineTo(rx * 0.25, -ry * 0.75);
      ctx.stroke();

      // Left cheek stripes
      ctx.beginPath();
      ctx.moveTo(-rx * 0.85, -ry * 0.1);
      ctx.quadraticCurveTo(-rx * 0.5, -ry * 0.05, -rx * 0.3, -ry * 0.1);
      ctx.moveTo(-rx * 0.88, ry * 0.12);
      ctx.quadraticCurveTo(-rx * 0.5, ry * 0.15, -rx * 0.25, ry * 0.1);
      ctx.moveTo(-rx * 0.8, ry * 0.35);
      ctx.quadraticCurveTo(-rx * 0.5, ry * 0.32, -rx * 0.3, ry * 0.25);
      ctx.stroke();

      // Right cheek stripes
      ctx.beginPath();
      ctx.moveTo(rx * 0.85, -ry * 0.1);
      ctx.quadraticCurveTo(rx * 0.5, -ry * 0.05, rx * 0.3, -ry * 0.1);
      ctx.moveTo(rx * 0.88, ry * 0.12);
      ctx.quadraticCurveTo(rx * 0.5, ry * 0.15, rx * 0.25, ry * 0.1);
      ctx.moveTo(rx * 0.8, ry * 0.35);
      ctx.quadraticCurveTo(rx * 0.5, ry * 0.32, rx * 0.3, ry * 0.25);
      ctx.stroke();
    } else if (filterId === 'gorilla') {
      // Sagittal crest & warrior brow ridges
      ctx.strokeStyle = 'rgba(216, 180, 254, 0.4)'; // Subtle silverback frost highlights
      ctx.lineWidth = rx * 0.05;
      ctx.beginPath();
      ctx.arc(0, -ry * 0.25, rx * 0.4, Math.PI, 0);
      ctx.stroke();

      // Brow bridge furrow
      ctx.fillStyle = '#0a0a0d';
      ctx.fillRect(-rx * 0.35, -ry * 0.28, rx * 0.7, ry * 0.12);
    } else if (filterId === 'lion') {
      // Golden mane radial strokes around mask edge
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
      ctx.lineWidth = 4;
      for (let a = 0; a < Math.PI * 2; a += 0.25) {
        ctx.beginPath();
        const x1 = Math.cos(a) * rx * 0.9;
        const y1 = Math.sin(a) * ry * 0.9;
        const x2 = Math.cos(a) * rx * 1.25;
        const y2 = Math.sin(a) * ry * 1.25;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    } else if (filterId === 'fox') {
      // Pure porcelain white cheek pads & sharp red eye swooshes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-rx * 0.85, ry * 0.3);
      ctx.quadraticCurveTo(-rx * 0.4, 0, 0, ry * 0.2);
      ctx.quadraticCurveTo(rx * 0.4, 0, rx * 0.85, ry * 0.3);
      ctx.lineTo(0, ry * 0.95);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Step 3: Theatrical Animal Eye Sockets (Conceals human eyes, brows & eyelids).
   */
  private static drawAnimalEyes(
    ctx: CanvasRenderingContext2D,
    filterId: AnimalFilterId,
    faceW: number,
    faceH: number,
    yaw: number,
    pitch: number
  ): void {
    ctx.save();
    const eyeOffsetX = faceW * 0.21;
    const eyeY = -faceH * 0.08;
    const eyeWidth = faceW * 0.14;
    const eyeHeight = faceH * 0.09;

    const eyeColors: Record<AnimalFilterId, { iris: string; glow: string; pupilSlit: boolean }> = {
      hyena: { iris: '#f59e0b', glow: '#d97706', pupilSlit: false },
      gorilla: { iris: '#78350f', glow: '#451a03', pupilSlit: false },
      tiger: { iris: '#10b981', glow: '#059669', pupilSlit: true },
      lion: { iris: '#f59e0b', glow: '#b45309', pupilSlit: false },
      wolf: { iris: '#38bdf8', glow: '#0284c7', pupilSlit: true },
      monkey: { iris: '#92400e', glow: '#b45309', pupilSlit: false },
      bear: { iris: '#451a03', glow: '#78350f', pupilSlit: false },
      fox: { iris: '#fbbf24', glow: '#f59e0b', pupilSlit: true },
    };

    const eyeCfg = eyeColors[filterId] || eyeColors.hyena;

    // Draw Left and Right Eye
    [-1, 1].forEach((side) => {
      const ex = side * eyeOffsetX + yaw * 12;
      const ey = eyeY + pitch * 8;

      // 1. Dark Kohl Joker Mask Eye Socket (100% covers real eyes)
      ctx.fillStyle = '#0a0a0c';
      ctx.beginPath();
      ctx.ellipse(ex, ey, eyeWidth * 1.3, eyeHeight * 1.4, side * 0.15, 0, Math.PI * 2);
      ctx.fill();

      // 2. Heavy Masquerade Winged Eyeliner / Brow Arch
      ctx.strokeStyle = '#050505';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(ex - side * eyeWidth * 1.4, ey - eyeHeight * 0.5);
      ctx.quadraticCurveTo(ex, ey - eyeHeight * 1.8, ex + side * eyeWidth * 1.6, ey - eyeHeight * 0.8);
      ctx.stroke();

      // 3. Animal Sclera
      ctx.fillStyle = '#fffdf0';
      ctx.beginPath();
      ctx.ellipse(ex, ey, eyeWidth * 0.95, eyeHeight * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();

      // 4. Glowing Predator Iris
      const irisGrad = ctx.createRadialGradient(ex, ey, 2, ex, ey, eyeHeight * 0.7);
      irisGrad.addColorStop(0, eyeCfg.iris);
      irisGrad.addColorStop(0.7, eyeCfg.glow);
      irisGrad.addColorStop(1, '#111827');

      ctx.fillStyle = irisGrad;
      ctx.shadowColor = eyeCfg.glow;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(ex, ey, eyeHeight * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 5. Pupil (Slit for feline/canine or round for primate/bear)
      ctx.fillStyle = '#020202';
      ctx.beginPath();
      if (eyeCfg.pupilSlit) {
        ctx.ellipse(ex, ey, 2.5, eyeHeight * 0.55, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(ex, ey, eyeHeight * 0.35, 0, Math.PI * 2);
      }
      ctx.fill();

      // 6. Corneal Light Reflection Dot
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.arc(ex + 3, ey - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  /**
   * Step 4: Stylized Animal Muzzle & Nose.
   */
  private static drawAnimalMuzzle(
    ctx: CanvasRenderingContext2D,
    filterId: AnimalFilterId,
    faceW: number,
    faceH: number,
    yaw: number,
    pitch: number
  ): void {
    ctx.save();
    const noseY = faceH * 0.12 + pitch * 10;
    const noseW = faceW * (filterId === 'gorilla' || filterId === 'bear' ? 0.28 : 0.2);
    const noseH = faceH * 0.1;

    // Nose Bridge Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.moveTo(-noseW * 0.4, -faceH * 0.05);
    ctx.lineTo(noseW * 0.4, -faceH * 0.05);
    ctx.lineTo(noseW * 0.6, noseY);
    ctx.lineTo(-noseW * 0.6, noseY);
    ctx.closePath();
    ctx.fill();

    // Animal Nose Pad
    const noseColor = filterId === 'tiger' ? '#f472b6' : '#111115';
    ctx.fillStyle = noseColor;
    ctx.beginPath();
    ctx.roundRect(-noseW * 0.5, noseY - noseH * 0.5, noseW, noseH, [6, 6, 12, 12]);
    ctx.fill();

    // Nostrils
    ctx.fillStyle = '#000000';
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.ellipse(side * noseW * 0.25, noseY, noseW * 0.1, noseH * 0.25, side * 0.3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Whiskers (Tiger, Wolf, Cat, Hyena, Fox)
    if (filterId === 'tiger' || filterId === 'fox' || filterId === 'hyena' || filterId === 'wolf') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.8;
      [-1, 1].forEach((side) => {
        const startX = side * noseW * 0.7;
        const startY = noseY + noseH * 0.4;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + side * faceW * 0.4, startY - 8);
        ctx.moveTo(startX, startY + 6);
        ctx.lineTo(startX + side * faceW * 0.42, startY + 6);
        ctx.moveTo(startX, startY + 12);
        ctx.lineTo(startX + side * faceW * 0.38, startY + 20);
        ctx.stroke();
      });
    }

    ctx.restore();
  }

  /**
   * Step 5: Dynamic Mouth & Fanged Lower Jaw (Hinges open with user's mouth).
   */
  private static drawAnimalJaw(
    ctx: CanvasRenderingContext2D,
    filterId: AnimalFilterId,
    faceW: number,
    faceH: number,
    mouthOpen: number,
    yaw: number,
    pitch: number
  ): void {
    ctx.save();
    const mouthY = faceH * 0.28 + pitch * 10;
    const mouthW = faceW * 0.36;
    const jawOpenPx = Math.max(4, mouthOpen * faceH * 0.22);

    // Dark Oral Cavity when mouth opens
    ctx.fillStyle = '#1a050b';
    ctx.beginPath();
    ctx.ellipse(0, mouthY + jawOpenPx * 0.4, mouthW * 0.5, jawOpenPx * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pink Animal Tongue (if mouth opened)
    if (mouthOpen > 0.15) {
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.ellipse(0, mouthY + jawOpenPx * 0.6, mouthW * 0.28, jawOpenPx * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Razor Sharp Predator Canines & Fangs
    const numTeeth = 4;
    const toothStep = mouthW / (numTeeth + 1);

    // Upper Teeth (pointing down)
    ctx.fillStyle = '#fffdf0';
    for (let i = 1; i <= numTeeth; i++) {
      const tx = -mouthW * 0.5 + i * toothStep;
      const isCanine = i === 1 || i === numTeeth;
      const tH = isCanine ? Math.min(22, faceH * 0.08) : Math.min(10, faceH * 0.04);
      const tW = isCanine ? 7 : 5;

      ctx.beginPath();
      ctx.moveTo(tx - tW * 0.5, mouthY);
      ctx.lineTo(tx + tW * 0.5, mouthY);
      ctx.lineTo(tx, mouthY + tH);
      ctx.closePath();
      ctx.fill();
    }

    // Lower Teeth (pointing up) if jaw is dropping
    if (mouthOpen > 0.2) {
      for (let i = 1; i <= numTeeth; i++) {
        const tx = -mouthW * 0.5 + i * toothStep;
        const isCanine = i === 1 || i === numTeeth;
        const tH = isCanine ? Math.min(18, faceH * 0.07) : Math.min(8, faceH * 0.035);
        const tW = isCanine ? 6 : 4;
        const by = mouthY + jawOpenPx * 0.8;

        ctx.beginPath();
        ctx.moveTo(tx - tW * 0.5, by);
        ctx.lineTo(tx + tW * 0.5, by);
        ctx.lineTo(tx, by - tH);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Stylized Joker Animal Lip Line / Snarl
    ctx.strokeStyle = '#0a0a0c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-mouthW * 0.6, mouthY - 4);
    ctx.quadraticCurveTo(0, mouthY + 4, mouthW * 0.6, mouthY - 4);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Step 6: 3D Animal Ears flanking the crown.
   */
  private static drawAnimalEars(
    ctx: CanvasRenderingContext2D,
    filterId: AnimalFilterId,
    faceW: number,
    faceH: number,
    yaw: number,
    pitch: number
  ): void {
    ctx.save();
    const earY = -faceH * 0.48;
    const earOffsetX = faceW * 0.42;

    [-1, 1].forEach((side) => {
      const ex = side * earOffsetX;
      const ey = earY;

      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(side * 0.25);

      if (filterId === 'hyena') {
        // Broad rounded spotted hyena ear
        ctx.fillStyle = '#b08b50';
        ctx.beginPath();
        ctx.ellipse(0, 0, faceW * 0.18, faceH * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4a3424'; // Inner ear
        ctx.beginPath();
        ctx.ellipse(side * 4, 4, faceW * 0.1, faceH * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (filterId === 'tiger') {
        // Tufted striped ear with white dorsal spot
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(0, 0, faceW * 0.16, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, -faceW * 0.04, faceW * 0.08, 0, Math.PI * 2);
        ctx.fill();
      } else if (filterId === 'fox' || filterId === 'wolf') {
        // Tall pointed triangular ear with black tip
        const earH = faceH * 0.38;
        const earW = faceW * 0.22;
        ctx.fillStyle = filterId === 'fox' ? '#dc2626' : '#475569';
        ctx.beginPath();
        ctx.moveTo(-earW * 0.5, 0);
        ctx.lineTo(earW * 0.5, 0);
        ctx.lineTo(0, -earH);
        ctx.closePath();
        ctx.fill();

        // Black tip
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(-earW * 0.2, -earH * 0.6);
        ctx.lineTo(earW * 0.2, -earH * 0.6);
        ctx.lineTo(0, -earH);
        ctx.closePath();
        ctx.fill();

        // Inner fur fluff
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-earW * 0.25, -5);
        ctx.lineTo(earW * 0.25, -5);
        ctx.lineTo(0, -earH * 0.55);
        ctx.closePath();
        ctx.fill();
      } else if (filterId === 'gorilla' || filterId === 'monkey' || filterId === 'bear') {
        // Rounded ear
        ctx.fillStyle = filterId === 'gorilla' ? '#1e1e24' : filterId === 'bear' ? '#451a03' : '#fed7aa';
        ctx.beginPath();
        ctx.arc(0, 0, faceW * 0.14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(0, 0, faceW * 0.08, 0, Math.PI * 2);
        ctx.fill();
      } else if (filterId === 'lion') {
        // Voluminous mane tuft
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(0, 0, faceW * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    ctx.restore();
  }
}
