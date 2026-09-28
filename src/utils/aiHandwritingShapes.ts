// Authentic vector-based handwriting stroke shape engine for AI-generated math results

export interface Point {
  x: number;
  y: number;
}

export interface DrawStrokeOptions {
  color?: string;
  size?: number;
  isGhost?: boolean;
  scale?: number;
  showBadge?: boolean;
}

/**
 * Renders authentic handwriting stroke shapes (digits, operators, decimals)
 * onto an HTML5 Canvas 2D context.
 */
export function drawAIHandwritingShape(
  ctx: CanvasRenderingContext2D,
  text: string,
  startX: number,
  centerY: number,
  options?: DrawStrokeOptions
): { totalWidth: number; endX: number } {
  const scale = options?.scale ?? 1.0;
  const strokeColor = options?.color ?? "rgba(99, 102, 241, 0.72)";
  const strokeSize = options?.size ?? Math.max(3, 3.8 * scale);
  const isGhost = options?.isGhost ?? false;
  const showBadge = options?.showBadge ?? false;

  const charWidth = 24 * scale;
  const charHeight = 44 * scale;
  const spacing = 8 * scale;

  ctx.save();
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = strokeColor;
  ctx.lineWidth = strokeSize;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  let curX = startX + 6 * scale;
  let clean = text.trim();
  if (clean.includes("=")) {
    const parts = clean.split("=");
    clean = parts[parts.length - 1].trim();
  }
  const rawText = clean.replace(/^[=\s]+/, "").replace(/[=\s]+$/, "").trim();

  // Draw each character using natural handwritten curves
  for (let i = 0; i < rawText.length; i++) {
    const char = rawText[i];
    const x = curX + charWidth / 2;
    const y = centerY;
    const w = charWidth;
    const h = charHeight;

    ctx.beginPath();

    switch (char) {
      case "0": {
        // Natural handwritten oval with slight counter-clockwise slant
        ctx.beginPath();
        const startP = { x: x + w * 0.15, y: y - h * 0.44 };
        ctx.moveTo(startP.x, startP.y);
        ctx.bezierCurveTo(x - w * 0.35, y - h * 0.44, x - w * 0.45, y - h * 0.1, x - w * 0.4, y + h * 0.12);
        ctx.bezierCurveTo(x - w * 0.35, y + h * 0.44, x + w * 0.15, y + h * 0.46, x + w * 0.38, y + h * 0.2);
        ctx.bezierCurveTo(x + w * 0.46, y - h * 0.1, x + w * 0.42, y - h * 0.42, startP.x, startP.y);
        ctx.stroke();
        curX += charWidth + spacing;
        break;
      }

      case "1": {
        // Small initial up-tick and smooth confident downward stroke
        ctx.beginPath();
        ctx.moveTo(x - w * 0.22, y - h * 0.26);
        ctx.bezierCurveTo(x - w * 0.1, y - h * 0.38, x, y - h * 0.44, x + w * 0.05, y - h * 0.44);
        ctx.bezierCurveTo(x + w * 0.06, y - h * 0.1, x + w * 0.04, y + h * 0.2, x + w * 0.04, y + h * 0.44);
        ctx.stroke();
        curX += charWidth * 0.75 + spacing;
        break;
      }

      case "2": {
        // Upper arch, sweeping diagonal stroke, and fluid base wave
        ctx.beginPath();
        ctx.moveTo(x - w * 0.32, y - h * 0.24);
        ctx.bezierCurveTo(x - w * 0.26, y - h * 0.46, x + w * 0.36, y - h * 0.46, x + w * 0.36, y - h * 0.2);
        ctx.bezierCurveTo(x + w * 0.36, y - h * 0.05, x + w * 0.05, y + h * 0.15, x - w * 0.34, y + h * 0.42);
        ctx.bezierCurveTo(x - w * 0.1, y + h * 0.38, x + w * 0.15, y + h * 0.46, x + w * 0.42, y + h * 0.42);
        ctx.stroke();
        curX += charWidth + spacing;
        break;
      }

      case "3": {
        // Top loop, center touch-point, and rounder bottom belly loop
        ctx.beginPath();
        ctx.moveTo(x - w * 0.3, y - h * 0.36);
        ctx.bezierCurveTo(x - w * 0.1, y - h * 0.46, x + w * 0.36, y - h * 0.44, x + w * 0.32, y - h * 0.16);
        ctx.bezierCurveTo(x + w * 0.28, y - h * 0.04, x + w * 0.1, y - h * 0.02, x - w * 0.04, y - h * 0.02);
        ctx.bezierCurveTo(x + w * 0.16, y - h * 0.02, x + w * 0.4, y + h * 0.08, x + w * 0.36, y + h * 0.26);
        ctx.bezierCurveTo(x + w * 0.32, y + h * 0.46, x - w * 0.15, y + h * 0.46, x - w * 0.34, y + h * 0.34);
        ctx.stroke();
        curX += charWidth + spacing;
        break;
      }

      case "4": {
        // Diagonal down-left, horizontal bar, vertical stem
        ctx.beginPath();
        ctx.moveTo(x + w * 0.18, y - h * 0.44);
        ctx.lineTo(x - w * 0.36, y + h * 0.08);
        ctx.lineTo(x + w * 0.4, y + h * 0.08);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + w * 0.14, y - h * 0.22);
        ctx.lineTo(x + w * 0.14, y + h * 0.44);
        ctx.stroke();
        curX += charWidth + spacing;
        break;
      }

      case "5": {
        // Top cap, down-stroke, and wide sweeping bottom loop
        ctx.beginPath();
        ctx.moveTo(x + w * 0.34, y - h * 0.44);
        ctx.lineTo(x - w * 0.26, y - h * 0.44);
        ctx.lineTo(x - w * 0.28, y - h * 0.1);
        ctx.bezierCurveTo(x - w * 0.05, y - h * 0.18, x + w * 0.38, y - h * 0.06, x + w * 0.36, y + h * 0.18);
        ctx.bezierCurveTo(x + w * 0.34, y + h * 0.44, x - w * 0.1, y + h * 0.46, x - w * 0.32, y + h * 0.34);
        ctx.stroke();
        curX += charWidth + spacing;
        break;
      }

      case "6": {
        // Curving downward hook into a complete rounded belly
        ctx.beginPath();
        ctx.moveTo(x + w * 0.26, y - h * 0.42);
        ctx.bezierCurveTo(x - w * 0.08, y - h * 0.32, x - w * 0.38, y - h * 0.06, x - w * 0.36, y + h * 0.18);
        ctx.bezierCurveTo(x - w * 0.34, y + h * 0.44, x + w * 0.34, y + h * 0.44, x + w * 0.34, y + h * 0.16);
        ctx.bezierCurveTo(x + w * 0.34, y - h * 0.04, x - w * 0.1, y - h * 0.04, x - w * 0.36, y + h * 0.1);
        ctx.stroke();
        curX += charWidth + spacing;
        break;
      }

      case "7": {
        // Horizontal top bar, slightly curved diagonal stem
        ctx.beginPath();
        ctx.moveTo(x - w * 0.34, y - h * 0.44);
        ctx.bezierCurveTo(x - w * 0.1, y - h * 0.46, x + w * 0.2, y - h * 0.44, x + w * 0.36, y - h * 0.44);
        ctx.bezierCurveTo(x + w * 0.22, y - h * 0.12, x + w * 0.04, y + h * 0.18, x - w * 0.14, y + h * 0.44);
        ctx.stroke();

        // Optional small middle tick for European / Indian handwriting clarity
        ctx.beginPath();
        ctx.moveTo(x - w * 0.08, y);
        ctx.lineTo(x + w * 0.16, y);
        ctx.stroke();
        curX += charWidth + spacing;
        break;
      }

      case "8": {
        // Continuous figure-8 loops
        ctx.beginPath();
        ctx.moveTo(x, y - h * 0.02);
        ctx.bezierCurveTo(x + w * 0.32, y - h * 0.18, x + w * 0.32, y - h * 0.44, x, y - h * 0.44);
        ctx.bezierCurveTo(x - w * 0.32, y - h * 0.44, x - w * 0.32, y - h * 0.18, x, y - h * 0.02);
        ctx.bezierCurveTo(x + w * 0.38, y + h * 0.14, x + w * 0.38, y + h * 0.44, x, y + h * 0.44);
        ctx.bezierCurveTo(x - w * 0.38, y + h * 0.44, x - w * 0.38, y + h * 0.14, x, y - h * 0.02);
        ctx.stroke();
        curX += charWidth + spacing;
        break;
      }

      case "9": {
        // Rounded top loop and sweeping tail
        ctx.beginPath();
        ctx.moveTo(x + w * 0.28, y - h * 0.06);
        ctx.bezierCurveTo(x + w * 0.28, y - h * 0.44, x - w * 0.34, y - h * 0.44, x - w * 0.34, y - h * 0.2);
        ctx.bezierCurveTo(x - w * 0.34, y + h * 0.04, x + w * 0.15, y + h * 0.04, x + w * 0.28, y - h * 0.06);
        ctx.bezierCurveTo(x + w * 0.28, y + h * 0.16, x + w * 0.2, y + h * 0.36, x - w * 0.12, y + h * 0.44);
        ctx.stroke();
        curX += charWidth + spacing;
        break;
      }

      case "-": {
        // Slight organic slant for minus sign
        ctx.beginPath();
        ctx.moveTo(x - w * 0.35, y);
        ctx.bezierCurveTo(x - w * 0.1, y - h * 0.02, x + w * 0.15, y - h * 0.02, x + w * 0.35, y - h * 0.01);
        ctx.stroke();
        curX += charWidth * 0.85 + spacing;
        break;
      }

      case ".": {
        // Organic pen point dab
        ctx.beginPath();
        ctx.arc(x, y + h * 0.38, strokeSize * 0.75, 0, Math.PI * 2);
        ctx.fill();
        curX += charWidth * 0.4 + spacing;
        break;
      }

      case "/": {
        // Diagonal stroke
        ctx.beginPath();
        ctx.moveTo(x + w * 0.28, y - h * 0.44);
        ctx.lineTo(x - w * 0.28, y + h * 0.44);
        ctx.stroke();
        curX += charWidth * 0.75 + spacing;
        break;
      }

      case "x":
      case "X": {
        ctx.beginPath();
        ctx.moveTo(x - w * 0.28, y - h * 0.32);
        ctx.lineTo(x + w * 0.28, y + h * 0.32);
        ctx.moveTo(x - w * 0.28, y + h * 0.32);
        ctx.lineTo(x + w * 0.28, y - h * 0.32);
        ctx.stroke();
        curX += charWidth * 0.85 + spacing;
        break;
      }

      case " ": {
        curX += charWidth * 0.6;
        break;
      }

      case "=": {
        // Explicitly suppress equality operator - canvas answer should only be the evaluated result
        break;
      }

      default: {
        // Fallback for letters, pi, fractions: draw using Kalam/Caveat cursive handwriting font with stroke and fill
        ctx.font = `600 ${Math.round(40 * scale)}px 'Kalam', 'Caveat', 'Patrick Hand', cursive`;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.strokeText(char, x, y);
        ctx.fillText(char, x, y);
        curX += charWidth + spacing;
        break;
      }
    }
  }

  // Draw a tasteful "✨ AI Writing" badge above the handwriting shape
  if (showBadge && rawText.length > 0) {
    const totalW = Math.max(48, curX - startX);
    const badgeX = startX + totalW / 2;
    const badgeY = centerY - charHeight * 0.65;

    ctx.save();
    // Pill background
    const pillW = 86;
    const pillH = 18;
    const pillR = 9;
    const px = badgeX - pillW / 2;
    const py = badgeY - pillH / 2;

    ctx.fillStyle = isGhost ? "rgba(99, 102, 241, 0.16)" : "rgba(99, 102, 241, 0.22)";
    ctx.strokeStyle = isGhost ? "rgba(99, 102, 241, 0.40)" : "rgba(99, 102, 241, 0.60)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(px, py, pillW, pillH, pillR) : ctx.rect(px, py, pillW, pillH);
    ctx.fill();
    ctx.stroke();

    // Badge text
    ctx.font = "bold 10px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = isGhost ? "rgba(79, 70, 229, 0.95)" : "rgba(67, 56, 202, 1)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✨ AI Writing", badgeX, badgeY);
    ctx.restore();
  }

  ctx.restore();

  return {
    totalWidth: curX - startX,
    endX: curX,
  };
}

/**
 * Converts handwritten text into array of canvas strokes so user can trace or adopt it directly.
 */
export function convertTextToHandwritingStrokes(
  text: string,
  startX: number,
  centerY: number,
  color = "#4f46e5",
  size = 4,
  scale = 1.0
): { x: number; y: number; color: string; size: number }[][] {
  const strokes: { x: number; y: number; color: string; size: number }[][] = [];
  const charWidth = 24 * scale;
  const charHeight = 44 * scale;
  const spacing = 8 * scale;
  let curX = startX + 6 * scale;
  const rawText = text.trim();

  for (let i = 0; i < rawText.length; i++) {
    const char = rawText[i];
    const x = curX + charWidth / 2;
    const y = centerY;
    const w = charWidth;
    const h = charHeight;

    const sampleBezier = (
      p0: Point,
      p1: Point,
      p2: Point,
      p3: Point,
      steps = 14
    ): { x: number; y: number; color: string; size: number }[] => {
      const pts: { x: number; y: number; color: string; size: number }[] = [];
      for (let t = 0; t <= 1; t += 1 / steps) {
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * t;
        const px = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
        const py = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
        pts.push({ x: px, y: py, color, size });
      }
      return pts;
    };

    if (char === "0") {
      const p0 = { x: x + w * 0.15, y: y - h * 0.44 };
      const s1 = sampleBezier(p0, { x: x - w * 0.35, y: y - h * 0.44 }, { x: x - w * 0.45, y: y - h * 0.1 }, { x: x - w * 0.4, y: y + h * 0.12 });
      const s2 = sampleBezier({ x: x - w * 0.4, y: y + h * 0.12 }, { x: x - w * 0.35, y: y + h * 0.44 }, { x: x + w * 0.15, y: y + h * 0.46 }, { x: x + w * 0.38, y: y + h * 0.2 });
      const s3 = sampleBezier({ x: x + w * 0.38, y: y + h * 0.2 }, { x: x + w * 0.46, y: y - h * 0.1 }, { x: x + w * 0.42, y: y - h * 0.42 }, p0);
      strokes.push([...s1, ...s2, ...s3]);
      curX += charWidth + spacing;
    } else if (char === "1") {
      const s1 = sampleBezier(
        { x: x - w * 0.22, y: y - h * 0.26 },
        { x: x - w * 0.1, y: y - h * 0.38 },
        { x: x, y: y - h * 0.44 },
        { x: x + w * 0.05, y: y - h * 0.44 }
      );
      const s2 = sampleBezier({ x: x + w * 0.05, y: y - h * 0.44 }, { x: x + w * 0.06, y: y - h * 0.1 }, { x: x + w * 0.04, y: y + h * 0.2 }, { x: x + w * 0.04, y: y + h * 0.44 });
      strokes.push([...s1, ...s2]);
      curX += charWidth * 0.75 + spacing;
    } else if (char === "2") {
      const s1 = sampleBezier(
        { x: x - w * 0.32, y: y - h * 0.24 },
        { x: x - w * 0.26, y: y - h * 0.46 },
        { x: x + w * 0.36, y: y - h * 0.46 },
        { x: x + w * 0.36, y: y - h * 0.2 }
      );
      const s2 = sampleBezier(
        { x: x + w * 0.36, y: y - h * 0.2 },
        { x: x + w * 0.36, y: y - h * 0.05 },
        { x: x + w * 0.05, y: y + h * 0.15 },
        { x: x - w * 0.34, y: y + h * 0.42 }
      );
      const s3 = sampleBezier(
        { x: x - w * 0.34, y: y + h * 0.42 },
        { x: x - w * 0.1, y: y + h * 0.38 },
        { x: x + w * 0.15, y: y + h * 0.46 },
        { x: x + w * 0.42, y: y + h * 0.42 }
      );
      strokes.push([...s1, ...s2, ...s3]);
      curX += charWidth + spacing;
    } else if (char === "3") {
      const s1 = sampleBezier(
        { x: x - w * 0.3, y: y - h * 0.36 },
        { x: x - w * 0.1, y: y - h * 0.46 },
        { x: x + w * 0.36, y: y - h * 0.44 },
        { x: x + w * 0.32, y: y - h * 0.16 }
      );
      const s2 = sampleBezier(
        { x: x + w * 0.32, y: y - h * 0.16 },
        { x: x + w * 0.28, y: y - h * 0.04 },
        { x: x + w * 0.1, y: y - h * 0.02 },
        { x: x - w * 0.04, y: y - h * 0.02 }
      );
      const s3 = sampleBezier(
        { x: x - w * 0.04, y: y - h * 0.02 },
        { x: x + w * 0.16, y: y - h * 0.02 },
        { x: x + w * 0.4, y: y + h * 0.08 },
        { x: x + w * 0.36, y: y + h * 0.26 }
      );
      const s4 = sampleBezier(
        { x: x + w * 0.36, y: y + h * 0.26 },
        { x: x + w * 0.32, y: y + h * 0.46 },
        { x: x - w * 0.15, y: y + h * 0.46 },
        { x: x - w * 0.34, y: y + h * 0.34 }
      );
      strokes.push([...s1, ...s2, ...s3, ...s4]);
      curX += charWidth + spacing;
    } else if (char === "4") {
      const stroke1 = [
        { x: x + w * 0.18, y: y - h * 0.44, color, size },
        { x: x - w * 0.36, y: y + h * 0.08, color, size },
        { x: x + w * 0.4, y: y + h * 0.08, color, size },
      ];
      const stroke2 = [
        { x: x + w * 0.14, y: y - h * 0.22, color, size },
        { x: x + w * 0.14, y: y + h * 0.44, color, size },
      ];
      strokes.push(stroke1, stroke2);
      curX += charWidth + spacing;
    } else if (char === "5") {
      const s1 = [
        { x: x + w * 0.34, y: y - h * 0.44, color, size },
        { x: x - w * 0.26, y: y - h * 0.44, color, size },
        { x: x - w * 0.28, y: y - h * 0.1, color, size },
      ];
      const s2 = sampleBezier(
        { x: x - w * 0.28, y: y - h * 0.1 },
        { x: x - w * 0.05, y: y - h * 0.18 },
        { x: x + w * 0.38, y: y - h * 0.06 },
        { x: x + w * 0.36, y: y + h * 0.18 }
      );
      const s3 = sampleBezier(
        { x: x + w * 0.36, y: y + h * 0.18 },
        { x: x + w * 0.34, y: y + h * 0.44 },
        { x: x - w * 0.1, y: y + h * 0.46 },
        { x: x - w * 0.32, y: y + h * 0.34 }
      );
      strokes.push([...s1, ...s2, ...s3]);
      curX += charWidth + spacing;
    } else if (char === "6") {
      const s1 = sampleBezier(
        { x: x + w * 0.26, y: y - h * 0.42 },
        { x: x - w * 0.08, y: y - h * 0.32 },
        { x: x - w * 0.38, y: y - h * 0.06 },
        { x: x - w * 0.36, y: y + h * 0.18 }
      );
      const s2 = sampleBezier(
        { x: x - w * 0.36, y: y + h * 0.18 },
        { x: x - w * 0.34, y: y + h * 0.44 },
        { x: x + w * 0.34, y: y + h * 0.44 },
        { x: x + w * 0.34, y: y + h * 0.16 }
      );
      const s3 = sampleBezier(
        { x: x + w * 0.34, y: y + h * 0.16 },
        { x: x + w * 0.34, y: y - h * 0.04 },
        { x: x - w * 0.1, y: y - h * 0.04 },
        { x: x - w * 0.36, y: y + h * 0.1 }
      );
      strokes.push([...s1, ...s2, ...s3]);
      curX += charWidth + spacing;
    } else if (char === "7") {
      const s1 = sampleBezier(
        { x: x - w * 0.34, y: y - h * 0.44 },
        { x: x - w * 0.1, y: y - h * 0.46 },
        { x: x + w * 0.2, y: y - h * 0.44 },
        { x: x + w * 0.36, y: y - h * 0.44 }
      );
      const s2 = sampleBezier(
        { x: x + w * 0.36, y: y - h * 0.44 },
        { x: x + w * 0.22, y: y - h * 0.12 },
        { x: x + w * 0.04, y: y + h * 0.18 },
        { x: x - w * 0.14, y: y + h * 0.44 }
      );
      strokes.push([...s1, ...s2]);
      curX += charWidth + spacing;
    } else if (char === "8") {
      const s1 = sampleBezier(
        { x, y: y - h * 0.02 },
        { x: x + w * 0.32, y: y - h * 0.18 },
        { x: x + w * 0.32, y: y - h * 0.44 },
        { x, y: y - h * 0.44 }
      );
      const s2 = sampleBezier(
        { x, y: y - h * 0.44 },
        { x: x - w * 0.32, y: y - h * 0.44 },
        { x: x - w * 0.32, y: y - h * 0.18 },
        { x, y: y - h * 0.02 }
      );
      const s3 = sampleBezier(
        { x, y: y - h * 0.02 },
        { x: x + w * 0.38, y: y + h * 0.14 },
        { x: x + w * 0.38, y: y + h * 0.44 },
        { x, y: y + h * 0.44 }
      );
      const s4 = sampleBezier(
        { x, y: y + h * 0.44 },
        { x: x - w * 0.38, y: y + h * 0.44 },
        { x: x - w * 0.38, y: y + h * 0.14 },
        { x, y: y - h * 0.02 }
      );
      strokes.push([...s1, ...s2, ...s3, ...s4]);
      curX += charWidth + spacing;
    } else if (char === "9") {
      const s1 = sampleBezier(
        { x: x + w * 0.28, y: y - h * 0.06 },
        { x: x + w * 0.28, y: y - h * 0.44 },
        { x: x - w * 0.34, y: y - h * 0.44 },
        { x: x - w * 0.34, y: y - h * 0.2 }
      );
      const s2 = sampleBezier(
        { x: x - w * 0.34, y: y - h * 0.2 },
        { x: x - w * 0.34, y: y + h * 0.04 },
        { x: x + w * 0.15, y: y + h * 0.04 },
        { x: x + w * 0.28, y: y - h * 0.06 }
      );
      const s3 = sampleBezier(
        { x: x + w * 0.28, y: y - h * 0.06 },
        { x: x + w * 0.28, y: y + h * 0.16 },
        { x: x + w * 0.2, y: y + h * 0.36 },
        { x: x - w * 0.12, y: y + h * 0.44 }
      );
      strokes.push([...s1, ...s2, ...s3]);
      curX += charWidth + spacing;
    } else if (char === "=") {
      const b1 = [
        { x: x - w * 0.32, y: y - h * 0.12, color, size },
        { x: x + w * 0.32, y: y - h * 0.12, color, size },
      ];
      const b2 = [
        { x: x - w * 0.32, y: y + h * 0.12, color, size },
        { x: x + w * 0.32, y: y + h * 0.12, color, size },
      ];
      strokes.push(b1, b2);
      curX += charWidth * 0.85 + spacing;
    } else if (char === "+") {
      const hBar = [
        { x: x - w * 0.32, y, color, size },
        { x: x + w * 0.32, y, color, size },
      ];
      const vBar = [
        { x, y: y - h * 0.32, color, size },
        { x, y: y + h * 0.32, color, size },
      ];
      strokes.push(hBar, vBar);
      curX += charWidth + spacing;
    } else if (char === "-") {
      strokes.push([
        { x: x - w * 0.32, y, color, size },
        { x: x + w * 0.32, y, color, size },
      ]);
      curX += charWidth * 0.8 + spacing;
    } else if (char === ".") {
      strokes.push([
        { x, y: y + h * 0.38, color, size },
        { x: x + 1, y: y + h * 0.38 + 1, color, size },
      ]);
      curX += charWidth * 0.4 + spacing;
    } else if (char === " ") {
      curX += charWidth * 0.55 + spacing;
      continue;
    } else if (char === "*" || char === "×") {
      const diag1 = [
        { x: x - w * 0.28, y: y - h * 0.2, color, size },
        { x: x + w * 0.28, y: y + h * 0.2, color, size },
      ];
      const diag2 = [
        { x: x - w * 0.28, y: y + h * 0.2, color, size },
        { x: x + w * 0.28, y: y - h * 0.2, color, size },
      ];
      strokes.push(diag1, diag2);
      curX += charWidth + spacing;
    } else if (char === "/" || char === "÷") {
      const slash = [
        { x: x - w * 0.22, y: y + h * 0.36, color, size },
        { x: x + w * 0.22, y: y - h * 0.36, color, size },
      ];
      strokes.push(slash);
      curX += charWidth * 0.7 + spacing;
    } else if (char === "(") {
      const p1 = sampleBezier(
        { x: x + w * 0.15, y: y - h * 0.44 },
        { x: x - w * 0.25, y: y - h * 0.2 },
        { x: x - w * 0.25, y: y + h * 0.2 },
        { x: x + w * 0.15, y: y + h * 0.44 }
      );
      strokes.push(p1);
      curX += charWidth * 0.6 + spacing;
    } else if (char === ")") {
      const p2 = sampleBezier(
        { x: x - w * 0.15, y: y - h * 0.44 },
        { x: x + w * 0.25, y: y - h * 0.2 },
        { x: x + w * 0.25, y: y + h * 0.2 },
        { x: x - w * 0.15, y: y + h * 0.44 }
      );
      strokes.push(p2);
      curX += charWidth * 0.6 + spacing;
    } else if (char === "x" || char === "X") {
      const d1 = [
        { x: x - w * 0.28, y: y - h * 0.28, color, size },
        { x: x + w * 0.28, y: y + h * 0.28, color, size },
      ];
      const d2 = [
        { x: x - w * 0.28, y: y + h * 0.28, color, size },
        { x: x + w * 0.28, y: y - h * 0.28, color, size },
      ];
      strokes.push(d1, d2);
      curX += charWidth * 0.85 + spacing;
    } else {
      // For any digit or character, interpolate a series of natural points
      const pts: { x: number; y: number; color: string; size: number }[] = [];
      pts.push({ x: x - w * 0.2, y: y - h * 0.3, color, size });
      pts.push({ x, y: y - h * 0.4, color, size });
      pts.push({ x: x + w * 0.2, y: y, color, size });
      pts.push({ x, y: y + h * 0.4, color, size });
      strokes.push(pts);
      curX += charWidth + spacing;
    }
  }

  return strokes;
}
