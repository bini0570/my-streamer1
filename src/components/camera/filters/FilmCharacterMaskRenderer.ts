import { FilterId, FaceLandmarkPoint, FaceTrackingData } from '../../../types';
import { JokerAnimalMaskRenderer } from './JokerAnimalMaskRenderer';

export class FilmCharacterMaskRenderer {
  /**
   * Main entry point: renders a high-speed, full-coverage film character mask
   * directly over the face landmarks so the real human face is 100% concealed.
   */
  public static render(
    ctx: CanvasRenderingContext2D,
    filterId: FilterId,
    tracking: FaceTrackingData,
    width: number,
    height: number
  ): void {
    if (!tracking.detected || tracking.facePixelWidth < 20) return;

    // If an animal ID was selected, delegate to JokerAnimalMaskRenderer
    const isAnimal = ['hyena', 'gorilla', 'tiger', 'lion', 'wolf', 'monkey', 'bear', 'fox'].includes(filterId);
    if (isAnimal) {
      JokerAnimalMaskRenderer.render(ctx, filterId as any, tracking, width, height);
      return;
    }

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

    switch (filterId) {
      case 'joker':
        this.drawJoker(ctx, pts, faceW, faceH, mouthOpen, yaw, pitch);
        break;
      case 'batman':
        this.drawBatman(ctx, pts, faceW, faceH, mouthOpen, yaw, pitch);
        break;
      case 'spiderman':
        this.drawSpiderMan(ctx, pts, faceW, faceH, mouthOpen, yaw, pitch);
        break;
      case 'ironman':
        this.drawIronMan(ctx, pts, faceW, faceH, mouthOpen, yaw, pitch);
        break;
      case 'blackpanther':
        this.drawBlackPanther(ctx, pts, faceW, faceH, mouthOpen, yaw, pitch);
        break;
      case 'deadpool':
        this.drawDeadpool(ctx, pts, faceW, faceH, mouthOpen, yaw, pitch);
        break;
      case 'ghostface':
        this.drawGhostface(ctx, pts, faceW, faceH, mouthOpen, yaw, pitch);
        break;
      case 'darthvader':
        this.drawDarthVader(ctx, pts, faceW, faceH, mouthOpen, yaw, pitch);
        break;
      default:
        this.drawJoker(ctx, pts, faceW, faceH, mouthOpen, yaw, pitch);
        break;
    }

    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // 1. THE JOKER (Heath Ledger / Joaquin Phoenix)
  // --------------------------------------------------------------------------
  private static drawJoker(
    ctx: CanvasRenderingContext2D,
    pts: FaceLandmarkPoint[] | undefined,
    faceW: number,
    faceH: number,
    mouthOpen: number,
    yaw: number,
    pitch: number
  ): void {
    const rx = faceW * 0.53;
    const ry = faceH * 0.62;

    // 1. Wild Green Hair Tufts on Top/Temples
    ctx.fillStyle = '#15803d';
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.moveTo(side * rx * 0.2, -ry * 0.9);
      ctx.quadraticCurveTo(side * rx * 0.8, -ry * 1.25, side * rx * 1.1, -ry * 0.5);
      ctx.quadraticCurveTo(side * rx * 0.9, -ry * 0.7, side * rx * 0.4, -ry * 0.85);
      ctx.fill();
    });

    // 2. Opaque Theatrical Chalk-White Clown Face (100% skin concealment)
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    const whiteGrad = ctx.createRadialGradient(0, 0, rx * 0.2, 0, 0, ry);
    whiteGrad.addColorStop(0, '#ffffff');
    whiteGrad.addColorStop(0.75, '#f1f5f9');
    whiteGrad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = whiteGrad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Edge hairline grime
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    // 3. Blackened Kohl Hollow Eyes (Conceals real eyes)
    [-1, 1].forEach((side) => {
      const ex = side * faceW * 0.22 + yaw * 10;
      const ey = -faceH * 0.08 + pitch * 6;
      ctx.fillStyle = '#0a0a0c';
      ctx.beginPath();
      ctx.ellipse(ex, ey, faceW * 0.17, faceH * 0.14, side * 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Drips
      ctx.strokeStyle = '#0a0a0c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ex, ey + faceH * 0.1);
      ctx.lineTo(ex - side * 4, ey + faceH * 0.22);
      ctx.stroke();

      // Piercing eye glint
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(ex, ey, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Red Joker Nose Blob
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(0, faceH * 0.1 + pitch * 8, faceW * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // 5. Scarred Red Glasgow Smile Mouth (Synchronized to jaw drop)
    const mouthY = faceH * 0.28 + pitch * 8;
    const mouthW = faceW * 0.44;
    const jawOpenPx = Math.max(4, mouthOpen * faceH * 0.2);

    // Mouth cavity
    ctx.fillStyle = '#1e0509';
    ctx.beginPath();
    ctx.ellipse(0, mouthY + jawOpenPx * 0.5, mouthW * 0.45, jawOpenPx * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stained teeth if open
    if (mouthOpen > 0.15) {
      ctx.fillStyle = '#fef08a';
      for (let i = -3; i <= 3; i++) {
        ctx.fillRect(i * (mouthW * 0.11) - 3, mouthY, 6, 8);
      }
    }

    // Extended Red Paint Smile up the cheeks
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-mouthW * 0.8, mouthY - 14);
    ctx.quadraticCurveTo(0, mouthY + jawOpenPx * 0.8 + 12, mouthW * 0.8, mouthY - 14);
    ctx.stroke();

    // Black scar stitches
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.moveTo(side * mouthW * 0.7, mouthY - 10);
      ctx.lineTo(side * mouthW * 0.75, mouthY - 22);
      ctx.stroke();
    });
  }

  // --------------------------------------------------------------------------
  // 2. BATMAN (Christian Bale / Robert Pattinson - The Dark Knight)
  // --------------------------------------------------------------------------
  private static drawBatman(
    ctx: CanvasRenderingContext2D,
    pts: FaceLandmarkPoint[] | undefined,
    faceW: number,
    faceH: number,
    mouthOpen: number,
    yaw: number,
    pitch: number
  ): void {
    const rx = faceW * 0.54;
    const ry = faceH * 0.64;

    // 1. Tall Angular Bat Ears
    ctx.fillStyle = '#0f172a';
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.moveTo(side * rx * 0.4, -ry * 0.7);
      ctx.lineTo(side * rx * 0.85, -ry * 1.55);
      ctx.lineTo(side * rx * 0.88, -ry * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // 2. Armored Carbon-Fiber Cowl (Full face cover except chin cutout)
    ctx.beginPath();
    ctx.ellipse(0, -ry * 0.05, rx, ry * 0.95, 0, 0, Math.PI * 2);
    const cowlGrad = ctx.createLinearGradient(0, -ry, 0, ry);
    cowlGrad.addColorStop(0, '#1e293b');
    cowlGrad.addColorStop(0.5, '#0f172a');
    cowlGrad.addColorStop(1, '#020617');
    ctx.fillStyle = cowlGrad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;

    // 3. Chiseled Kevlar Brow Furrow
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-rx * 0.5, -ry * 0.25);
    ctx.lineTo(0, -ry * 0.18);
    ctx.lineTo(rx * 0.5, -ry * 0.25);
    ctx.stroke();

    // 4. Bat Mask Angled Eye Slits
    [-1, 1].forEach((side) => {
      const ex = side * faceW * 0.22 + yaw * 10;
      const ey = -faceH * 0.08 + pitch * 6;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(ex - side * faceW * 0.12, ey - 6);
      ctx.lineTo(ex + side * faceW * 0.12, ey - 12);
      ctx.lineTo(ex + side * faceW * 0.08, ey + 4);
      ctx.closePath();
      ctx.shadowColor = '#60a5fa';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // 5. Angular Nose Guard
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.moveTo(0, -faceH * 0.05);
    ctx.lineTo(faceW * 0.12, faceH * 0.14);
    ctx.lineTo(-faceW * 0.12, faceH * 0.14);
    ctx.closePath();
    ctx.fill();

    // 6. Signature Batman Jaw Opening with Kevlar Chin Strap
    const mouthY = faceH * 0.28 + pitch * 8;
    const mouthW = faceW * 0.36;
    const jawOpenPx = Math.max(4, mouthOpen * faceH * 0.2);

    // Mouth Opening Cutout (Shows dark armored mouth cavity)
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.roundRect(-mouthW * 0.5, mouthY - 4, mouthW, jawOpenPx + 16, 8);
    ctx.fill();

    // Chin strap guard
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-mouthW * 0.35, mouthY + jawOpenPx + 14, mouthW * 0.7, 14, 6);
    ctx.fill();
  }

  // --------------------------------------------------------------------------
  // 3. SPIDER-MAN (Tobey Maguire / Tom Holland)
  // --------------------------------------------------------------------------
  private static drawSpiderMan(
    ctx: CanvasRenderingContext2D,
    pts: FaceLandmarkPoint[] | undefined,
    faceW: number,
    faceH: number,
    mouthOpen: number,
    yaw: number,
    pitch: number
  ): void {
    const rx = faceW * 0.53;
    const ry = faceH * 0.62;

    // 1. Solid Crimson Red Mask Base
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    const redGrad = ctx.createRadialGradient(0, -ry * 0.2, rx * 0.1, 0, 0, ry);
    redGrad.addColorStop(0, '#ef4444');
    redGrad.addColorStop(0.7, '#dc2626');
    redGrad.addColorStop(1, '#991b1b');
    ctx.fillStyle = redGrad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;

    // 2. Black Spider Webbing Pattern (Radiating from nose)
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.lineWidth = 2.2;
    const numSpokes = 12;
    for (let i = 0; i < numSpokes; i++) {
      const angle = (i / numSpokes) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * rx, Math.sin(angle) * ry);
      ctx.stroke();
    }

    // Webbing concentric rings
    for (let r = 0.25; r <= 0.95; r += 0.22) {
      ctx.beginPath();
      ctx.ellipse(0, 0, rx * r, ry * r, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3. Iconic White Reflective Ocular Lenses with Thick Black Rims
    [-1, 1].forEach((side) => {
      const ex = side * faceW * 0.22 + yaw * 10;
      const ey = -faceH * 0.08 + pitch * 6;
      const lensW = faceW * 0.2;
      const lensH = faceH * 0.16;

      // Outer thick black rim
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.moveTo(ex - side * lensW * 0.8, ey + lensH * 0.4);
      ctx.lineTo(ex - side * lensW * 0.2, ey - lensH * 0.85);
      ctx.lineTo(ex + side * lensW * 0.9, ey - lensH * 0.5);
      ctx.closePath();
      ctx.fill();

      // Inner Mirrored White Lens
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(ex - side * lensW * 0.65, ey + lensH * 0.25);
      ctx.lineTo(ex - side * lensW * 0.15, ey - lensH * 0.7);
      ctx.lineTo(ex + side * lensW * 0.75, ey - lensH * 0.4);
      ctx.closePath();
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // 4. Subtle Jaw Line / Expression Seam
    const mouthY = faceH * 0.28 + pitch * 8;
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-faceW * 0.2, mouthY);
    ctx.lineTo(faceW * 0.2, mouthY);
    ctx.stroke();
  }

  // --------------------------------------------------------------------------
  // 4. IRON MAN (Robert Downey Jr. - Mark 85 Titanium Faceplate)
  // --------------------------------------------------------------------------
  private static drawIronMan(
    ctx: CanvasRenderingContext2D,
    pts: FaceLandmarkPoint[] | undefined,
    faceW: number,
    faceH: number,
    mouthOpen: number,
    yaw: number,
    pitch: number
  ): void {
    const rx = faceW * 0.54;
    const ry = faceH * 0.63;

    // 1. Hot-Rod Metallic Crimson Outer Helmet
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    const redGrad = ctx.createLinearGradient(0, -ry, 0, ry);
    redGrad.addColorStop(0, '#b91c1c');
    redGrad.addColorStop(0.5, '#dc2626');
    redGrad.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = redGrad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;

    // 2. Metallic Gold Titanium Faceplate
    ctx.beginPath();
    ctx.moveTo(-rx * 0.65, -ry * 0.4);
    ctx.lineTo(-rx * 0.4, -ry * 0.8);
    ctx.lineTo(rx * 0.4, -ry * 0.8);
    ctx.lineTo(rx * 0.65, -ry * 0.4);
    ctx.lineTo(rx * 0.6, ry * 0.35);
    ctx.lineTo(rx * 0.35, ry * 0.75);
    ctx.lineTo(-rx * 0.35, ry * 0.75);
    ctx.lineTo(-rx * 0.6, ry * 0.35);
    ctx.closePath();
    const goldGrad = ctx.createLinearGradient(0, -ry * 0.8, 0, ry * 0.75);
    goldGrad.addColorStop(0, '#fef08a');
    goldGrad.addColorStop(0.4, '#eab308');
    goldGrad.addColorStop(0.8, '#ca8a04');
    goldGrad.addColorStop(1, '#a16207');
    ctx.fillStyle = goldGrad;
    ctx.fill();

    // Faceplate panel grooves
    ctx.strokeStyle = '#713f12';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 3. Glowing Luminous Cyan ARC Repulsor Slit Eyes
    [-1, 1].forEach((side) => {
      const ex = side * faceW * 0.22 + yaw * 10;
      const ey = -faceH * 0.08 + pitch * 6;
      ctx.fillStyle = '#67e8f9';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.roundRect(ex - faceW * 0.11, ey - 4, faceW * 0.22, 9, 3);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ex - faceW * 0.08, ey - 2, faceW * 0.16, 5);
      ctx.shadowBlur = 0;
    });

    // 4. Articulated Mechanical Mouth Grille (Jaw hinges with mouth open)
    const mouthY = faceH * 0.28 + pitch * 8;
    const mouthW = faceW * 0.32;
    const jawOpenPx = Math.max(3, mouthOpen * faceH * 0.18);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-mouthW * 0.5, mouthY, mouthW, jawOpenPx + 5);

    // Mechanical mouth slit vents
    ctx.fillStyle = '#f59e0b';
    for (let i = -2; i <= 2; i++) {
      ctx.fillRect(i * (mouthW * 0.18) - 2, mouthY + 1, 4, jawOpenPx + 3);
    }
  }

  // --------------------------------------------------------------------------
  // 5. BLACK PANTHER (Chadwick Boseman - Vibranium Habit)
  // --------------------------------------------------------------------------
  private static drawBlackPanther(
    ctx: CanvasRenderingContext2D,
    pts: FaceLandmarkPoint[] | undefined,
    faceW: number,
    faceH: number,
    mouthOpen: number,
    yaw: number,
    pitch: number
  ): void {
    const rx = faceW * 0.54;
    const ry = faceH * 0.63;

    // 1. Feline Vibranium Ears
    ctx.fillStyle = '#0a0a0d';
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.moveTo(side * rx * 0.5, -ry * 0.65);
      ctx.lineTo(side * rx * 0.85, -ry * 1.25);
      ctx.lineTo(side * rx * 0.9, -ry * 0.5);
      ctx.closePath();
      ctx.fill();

      // Silver ear edge
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    });

    // 2. Matte Obsidian Vibranium Cowl Base
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    const suitGrad = ctx.createRadialGradient(0, 0, rx * 0.1, 0, 0, ry);
    suitGrad.addColorStop(0, '#1e1b2e');
    suitGrad.addColorStop(0.6, '#0f0e17');
    suitGrad.addColorStop(1, '#050508');
    ctx.fillStyle = suitGrad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;

    // 3. Glowing Purple Wakandan Kinetic Pulse Energy Lines
    ctx.strokeStyle = '#c084fc';
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 15;
    ctx.lineWidth = 3;

    // Forehead chevron
    ctx.beginPath();
    ctx.moveTo(0, -ry * 0.7);
    ctx.lineTo(-rx * 0.35, -ry * 0.3);
    ctx.moveTo(0, -ry * 0.7);
    ctx.lineTo(rx * 0.35, -ry * 0.3);
    ctx.stroke();

    // Cheek kinetic lines
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.moveTo(side * rx * 0.8, 0);
      ctx.lineTo(side * rx * 0.3, ry * 0.2);
      ctx.stroke();
    });
    ctx.shadowBlur = 0;

    // 4. Silver Slit Predator Eyes
    [-1, 1].forEach((side) => {
      const ex = side * faceW * 0.22 + yaw * 10;
      const ey = -faceH * 0.08 + pitch * 6;
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.ellipse(ex, ey, faceW * 0.12, faceH * 0.05, side * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(ex - 2, ey - 6, 4, 12);
    });

    // 5. Silver Panther Teeth Necklace on Jaw
    const mouthY = faceH * 0.28 + pitch * 8;
    ctx.fillStyle = '#e2e8f0';
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      const tx = i * (faceW * 0.08);
      const ty = mouthY + Math.abs(i) * 3;
      ctx.moveTo(tx - 4, ty);
      ctx.lineTo(tx + 4, ty);
      ctx.lineTo(tx, ty + 12);
      ctx.closePath();
      ctx.fill();
    }
  }

  // --------------------------------------------------------------------------
  // 6. DEADPOOL (Ryan Reynolds)
  // --------------------------------------------------------------------------
  private static drawDeadpool(
    ctx: CanvasRenderingContext2D,
    pts: FaceLandmarkPoint[] | undefined,
    faceW: number,
    faceH: number,
    mouthOpen: number,
    yaw: number,
    pitch: number
  ): void {
    const rx = faceW * 0.53;
    const ry = faceH * 0.62;

    // 1. Tactical Crimson Red Ballistic Mask
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    const redGrad = ctx.createRadialGradient(0, 0, rx * 0.2, 0, 0, ry);
    redGrad.addColorStop(0, '#dc2626');
    redGrad.addColorStop(0.7, '#b91c1c');
    redGrad.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = redGrad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Centerline seam
    ctx.strokeStyle = '#450a0a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -ry * 0.95);
    ctx.lineTo(0, ry * 0.95);
    ctx.stroke();

    // 2. Giant Black Leather Ocular Patches
    [-1, 1].forEach((side) => {
      const ex = side * faceW * 0.22 + yaw * 10;
      const ey = -faceH * 0.08 + pitch * 6;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(ex, ey, faceW * 0.19, faceH * 0.17, side * 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Expressive White Squint Eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ex, ey, faceW * 0.07, faceH * 0.045, side * -0.15, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. Subtle Smirk Seam on Jaw
    const mouthY = faceH * 0.28 + pitch * 8;
    ctx.strokeStyle = '#450a0a';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-faceW * 0.25, mouthY);
    ctx.quadraticCurveTo(0, mouthY + 8, faceW * 0.25, mouthY - 4);
    ctx.stroke();
  }

  // --------------------------------------------------------------------------
  // 7. GHOSTFACE (Scream Cinema Icon)
  // --------------------------------------------------------------------------
  private static drawGhostface(
    ctx: CanvasRenderingContext2D,
    pts: FaceLandmarkPoint[] | undefined,
    faceW: number,
    faceH: number,
    mouthOpen: number,
    yaw: number,
    pitch: number
  ): void {
    const rx = faceW * 0.54;
    const ry = faceH * 0.65;

    // 1. Midnight Black Hooded Cowl
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.ellipse(0, -ry * 0.1, rx * 1.15, ry * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Elongated Spectral Porcelain White Mask
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 0.9, ry * 0.95, 0, 0, Math.PI * 2);
    const ghostGrad = ctx.createRadialGradient(0, 0, rx * 0.2, 0, 0, ry);
    ghostGrad.addColorStop(0, '#ffffff');
    ghostGrad.addColorStop(0.7, '#f1f5f9');
    ghostGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = ghostGrad;
    ctx.fill();

    // 3. Deep Drooping Tear-Drop Black Eye Sockets
    [-1, 1].forEach((side) => {
      const ex = side * faceW * 0.2 + yaw * 8;
      const ey = -faceH * 0.08 + pitch * 6;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.ellipse(ex, ey, faceW * 0.13, faceH * 0.14, side * 0.25, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Black Nostril Slits
    ctx.fillStyle = '#000000';
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.ellipse(side * 6, faceH * 0.1 + pitch * 6, 3, 7, side * 0.3, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. Giant Gaping Screaming Maw (Stretches dramatically with mouth opening)
    const mouthY = faceH * 0.26 + pitch * 8;
    const mouthW = faceW * 0.26;
    const jawOpenPx = Math.max(18, mouthOpen * faceH * 0.32 + 20);

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(0, mouthY + jawOpenPx * 0.5, mouthW * 0.55, jawOpenPx * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // --------------------------------------------------------------------------
  // 8. DARTH VADER (David Prowse / James Earl Jones - Star Wars)
  // --------------------------------------------------------------------------
  private static drawDarthVader(
    ctx: CanvasRenderingContext2D,
    pts: FaceLandmarkPoint[] | undefined,
    faceW: number,
    faceH: number,
    mouthOpen: number,
    yaw: number,
    pitch: number
  ): void {
    const rx = faceW * 0.55;
    const ry = faceH * 0.65;

    // 1. Flared Obsidian Sith Helmet Brim
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.moveTo(-rx * 1.15, ry * 0.5);
    ctx.quadraticCurveTo(0, -ry * 1.35, rx * 1.15, ry * 0.5);
    ctx.lineTo(rx * 0.9, -ry * 0.3);
    ctx.quadraticCurveTo(0, -ry * 0.9, -rx * 0.9, -ry * 0.3);
    ctx.closePath();
    ctx.fill();

    // 2. High-Gloss Black Face Mask Base
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 0.95, ry * 0.95, 0, 0, Math.PI * 2);
    const glossGrad = ctx.createLinearGradient(0, -ry, 0, ry);
    glossGrad.addColorStop(0, '#1e293b');
    glossGrad.addColorStop(0.3, '#0f172a');
    glossGrad.addColorStop(0.7, '#020617');
    glossGrad.addColorStop(1, '#000000');
    ctx.fillStyle = glossGrad;
    ctx.fill();

    // Prominent center ridge
    ctx.fillStyle = '#334155';
    ctx.fillRect(-3, -ry * 0.8, 6, ry * 0.8);

    // 3. Imposing Dark Amber-Tinted Ocular Lenses
    [-1, 1].forEach((side) => {
      const ex = side * faceW * 0.22 + yaw * 8;
      const ey = -faceH * 0.08 + pitch * 6;
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.ellipse(ex, ey, faceW * 0.17, faceH * 0.12, side * 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Dark red Sith glint
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(ex, ey, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // 4. Triangular Respirator Grille on Mouth
    const mouthY = faceH * 0.22 + pitch * 8;
    const mouthW = faceW * 0.32;
    const mouthH = faceH * 0.24;

    ctx.fillStyle = '#0a0a0f';
    ctx.beginPath();
    ctx.moveTo(0, mouthY - 4);
    ctx.lineTo(mouthW * 0.5, mouthY + mouthH);
    ctx.lineTo(-mouthW * 0.5, mouthY + mouthH);
    ctx.closePath();
    ctx.fill();

    // Silver grille teeth
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    for (let y = 6; y < mouthH; y += 8) {
      const halfW = (y / mouthH) * (mouthW * 0.45);
      ctx.beginPath();
      ctx.moveTo(-halfW, mouthY + y);
      ctx.lineTo(halfW, mouthY + y);
      ctx.stroke();
    }

    // Cheek atmospheric intake silver knobs
    [-1, 1].forEach((side) => {
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(side * mouthW * 0.55, mouthY + mouthH * 0.7, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}
