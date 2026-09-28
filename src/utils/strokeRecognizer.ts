// Instant client-side stroke recognizer for handwritten numbers, alpha characters, and math symbols
// Provides 100% offline, zero-latency detection so "Calculated Result" always shows immediately,
// even when cloud AI models are overloaded or experiencing rate limits.

import { evaluateBasicMath, isValidMathAnswer, isCompleteMathExpression, hasOperandsToCalculate } from "./mathEvaluator";

export interface StrokePoint {
  x: number;
  y: number;
  color?: string;
  size?: number;
}

export interface RecognizedCharacter {
  char: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  confidence: number;
}

export interface StrokeRecognitionResult {
  expression: string;
  answer: string;
  fullEquation: string;
  hasEqual: boolean;
  confidence: number;
  characters: RecognizedCharacter[];
  appliedRule?: string;
  steps?: string[];
  shortExplanation?: string;
}

// Bounding box and geometric measurements of a stroke
export function getStrokeBounds(stroke: StrokePoint[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of stroke) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    minX: minX === Infinity ? 0 : minX,
    maxX: maxX === -Infinity ? 0 : maxX,
    minY: minY === Infinity ? 0 : minY,
    maxY: maxY === -Infinity ? 0 : maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    midX: (minX + maxX) / 2,
    midY: (minY + maxY) / 2,
  };
}

// Compute total stroke path length
export function getStrokeLength(stroke: StrokePoint[]): number {
  if (stroke.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < stroke.length; i++) {
    const dx = stroke[i].x - stroke[i - 1].x;
    const dy = stroke[i].y - stroke[i - 1].y;
    total += Math.hypot(dx, dy);
  }
  return total;
}

// Cluster strokes that belong to the same character box (overlapping, crossing, or closely adjacent)
export function clusterStrokes(
  strokeList: StrokePoint[][]
): { strokes: StrokePoint[][]; bounds: ReturnType<typeof getStrokeBounds> }[] {
  if (strokeList.length === 0) return [];

  // Retain all valid strokes, including dots / decimal points (single point or tiny stroke)
  const validStrokes = strokeList.filter((s) => s && s.length > 0);
  if (validStrokes.length === 0) return [];

  const clusters: { strokes: StrokePoint[][]; bounds: ReturnType<typeof getStrokeBounds> }[] = [];

  for (const stroke of validStrokes) {
    const sb = getStrokeBounds(stroke);
    let merged = false;

    for (const cluster of clusters) {
      const cb = cluster.bounds;
      const xOverlap = Math.min(sb.maxX, cb.maxX) - Math.max(sb.minX, cb.minX);
      const yOverlap = Math.min(sb.maxY, cb.maxY) - Math.max(sb.minY, cb.minY);
      const xDist = Math.max(0, Math.max(sb.minX, cb.minX) - Math.min(sb.maxX, cb.maxX));
      const yDist = Math.max(0, Math.max(sb.minY, cb.minY) - Math.min(sb.maxY, cb.maxY));

      // 1. Equal sign check: two horizontal parallel strokes stacked vertically
      const bothHorizontal = sb.width > sb.height * 1.15 && cb.width > cb.height * 1.15;
      const isEqualBars =
        bothHorizontal &&
        Math.abs(sb.midX - cb.midX) < Math.max(sb.width, cb.width) * 0.8 &&
        yDist < 50;

      // 2. Plus sign, letter X, or crossing stroke check
      const crossesInX = sb.minX <= cb.maxX + 4 && sb.maxX >= cb.minX - 4;
      const crossesInY = sb.minY <= cb.maxY + 4 && sb.maxY >= cb.minY - 4;
      const isCrossing = crossesInX && crossesInY && xDist < 6 && yDist < 6 && (xOverlap > -2 || yOverlap > -2);

      // 3. Dot over/under stem: i, j, !, or % dots
      const isDotAccent =
        (sb.width < 16 && sb.height < 16 && Math.abs(sb.midX - cb.midX) < cb.width * 0.9 && yDist < 40) ||
        (cb.width < 16 && cb.height < 16 && Math.abs(cb.midX - sb.midX) < sb.width * 0.9 && yDist < 40);

      // Separate distinct side-by-side vertical strokes (e.g. '1 1', '1 2', '1 3'):
      // They must remain separate characters if they are side by side with gap and do NOT cross
      const bothVertical = sb.height > sb.width * 1.35 && cb.height > cb.width * 1.35;
      if (bothVertical && !isCrossing && !isEqualBars && !isDotAccent && xDist > 4) {
        continue;
      }

      // 4. Overlap for multi-stroke characters (e.g. '4', '5' with top hat, '7', 't', 'k')
      const isOverlapComponent =
        (xOverlap > Math.min(sb.width, cb.width) * 0.35 && yDist < 18) ||
        (crossesInX && yOverlap > 2);

      if (isEqualBars || isCrossing || isDotAccent || isOverlapComponent) {
        cluster.strokes.push(stroke);
        const newMinX = Math.min(cb.minX, sb.minX);
        const newMaxX = Math.max(cb.maxX, sb.maxX);
        const newMinY = Math.min(cb.minY, sb.minY);
        const newMaxY = Math.max(cb.maxY, sb.maxY);
        cluster.bounds = {
          minX: newMinX,
          maxX: newMaxX,
          minY: newMinY,
          maxY: newMaxY,
          width: newMaxX - newMinX,
          height: newMaxY - newMinY,
          midX: (newMinX + newMaxX) / 2,
          midY: (newMinY + newMaxY) / 2,
        };
        merged = true;
        break;
      }
    }

    if (!merged) {
      clusters.push({
        strokes: [stroke],
        bounds: sb,
      });
    }
  }

  // Sort clusters horizontally from left to right
  clusters.sort((a, b) => a.bounds.minX - b.bounds.minX);
  return clusters;
}

// Classify a cluster into NUMBERS (0-9), ALPHA (a-z), or SYMBOLS (+, -, *, /, =, ^, √, etc.)
function classifyCluster(cluster: {
  strokes: StrokePoint[][];
  bounds: ReturnType<typeof getStrokeBounds>;
}): RecognizedCharacter {
  const { strokes, bounds } = cluster;
  const { width, height, minX, maxX, minY, maxY, midX, midY } = bounds;
  const aspectRatio = height / Math.max(1, width);

  // ----------------------------------------------------
  // MULTI-STROKE CLUSTERS: 2 or more strokes
  // ----------------------------------------------------
  if (strokes.length >= 2) {
    if (strokes.length === 2) {
      const s1 = getStrokeBounds(strokes[0]);
      const s2 = getStrokeBounds(strokes[1]);
      const w1 = s1.width;
      const w2 = s2.width;
      const h1 = s1.height;
      const h2 = s2.height;

      // Equal sign (=): two horizontal bars stacked
      if (w1 > h1 * 1.5 && w2 > h2 * 1.5 && Math.abs(s1.midX - s2.midX) < Math.max(w1, w2) * 0.75) {
        const yDiff = Math.abs(s1.midY - s2.midY);
        if (yDiff > 4 && yDiff < 55) {
          return { char: "=", minX, maxX, minY, maxY, confidence: 0.96 };
        }
      }

      // Multiply / Alpha 'x' / 'X': two intersecting diagonal strokes
      const s1Start = strokes[0][0];
      const s1End = strokes[0][strokes[0].length - 1];
      const s2Start = strokes[1][0];
      const s2End = strokes[1][strokes[1].length - 1];
      const s1Dx = s1End.x - s1Start.x;
      const s1Dy = s1End.y - s1Start.y;
      const s2Dx = s2End.x - s2Start.x;
      const s2Dy = s2End.y - s2Start.y;
      const isBothDiagonals =
        w1 > 6 &&
        h1 > 6 &&
        w2 > 6 &&
        h2 > 6 &&
        Math.abs(s1Dy / Math.max(0.1, Math.abs(s1Dx))) >= 0.35 &&
        Math.abs(s2Dy / Math.max(0.1, Math.abs(s2Dx))) >= 0.35 &&
        s1Dx * s1Dy * (s2Dx * s2Dy) < 0;

      if (
        isBothDiagonals &&
        Math.abs(s1.midX - s2.midX) < width * 0.45 &&
        Math.abs(s1.midY - s2.midY) < height * 0.45
      ) {
        return { char: "*", minX, maxX, minY, maxY, confidence: 0.93 };
      }

      // Plus sign (+): 1 horizontal, 1 vertical intersecting near center
      const s1IsPureHoriz = w1 > h1 * 1.8;
      const s2IsPureHoriz = w2 > h2 * 1.8;
      const s1IsPureVert = h1 > w1 * 1.8;
      const s2IsPureVert = h2 > w2 * 1.8;

      if ((s1IsPureHoriz && s2IsPureVert) || (s2IsPureHoriz && s1IsPureVert)) {
        const horiz = s1IsPureHoriz ? s1 : s2;
        const vert = s1IsPureVert ? s1 : s2;
        const xDiff = Math.abs(horiz.midX - vert.midX);
        const yDiff = Math.abs(horiz.midY - vert.midY);
        if (xDiff < Math.max(horiz.width, vert.width) * 0.45 && yDiff < Math.max(horiz.height, vert.height) * 0.45) {
          return { char: "+", minX, maxX, minY, maxY, confidence: 0.95 };
        }
      }

      // Digit '4': vertical stem crossed by angled / L stroke
      const hasTallVert = (h1 > height * 0.55 && h1 > w1 * 1.4) || (h2 > height * 0.55 && h2 > w2 * 1.4);
      const vertStroke = h1 > w1 * 1.4 ? s1 : s2;
      const otherStroke = vertStroke === s1 ? s2 : s1;
      const otherRaw = vertStroke === s1 ? strokes[1] : strokes[0];
      const otherStart = otherRaw[0];

      if (hasTallVert && otherStroke.width > width * 0.38) {
        if (otherStroke.height > 6 && otherStart.y < minY + height * 0.5) {
          return { char: "4", minX, maxX, minY, maxY, confidence: 0.92 };
        }
      }

      // Letter 't' or 'T': vertical stem with top/middle horizontal crossbar
      const vStroke = h1 > w1 * 1.4 ? s1 : h2 > w2 * 1.4 ? s2 : null;
      const hStroke = vStroke === s1 ? s2 : vStroke === s2 ? s1 : null;
      if (vStroke && hStroke && hStroke.width > hStroke.height * 1.3) {
        if (hStroke.midY < vStroke.minY + vStroke.height * 0.5) {
          return { char: "t", minX, maxX, minY, maxY, confidence: 0.9 };
        }
      }

      // Letter 'k' or 'K': vertical line on left with angular arms
      if (
        (s1.minX < s2.minX && s1.height > s1.width * 1.8) ||
        (s2.minX < s1.minX && s2.height > s2.width * 1.8)
      ) {
        return { char: "k", minX, maxX, minY, maxY, confidence: 0.88 };
      }

      // Dot over vertical stem: 'i' or 'j'
      const isS1Dot = s1.width < 16 && s1.height < 16;
      const isS2Dot = s2.width < 16 && s2.height < 16;
      if (isS1Dot && s2.height > s2.width * 1.2 && s1.maxY < s2.minY + 12) {
        return { char: "i", minX, maxX, minY, maxY, confidence: 0.9 };
      }
      if (isS2Dot && s1.height > s1.width * 1.2 && s2.maxY < s1.minY + 12) {
        return { char: "i", minX, maxX, minY, maxY, confidence: 0.9 };
      }

      // Dot under vertical stem: exclamation mark '!'
      if (isS1Dot && s2.height > s2.width * 1.4 && s1.minY > s2.maxY - 10) {
        return { char: "!", minX, maxX, minY, maxY, confidence: 0.9 };
      }
      if (isS2Dot && s1.height > s1.width * 1.4 && s2.minY > s1.maxY - 10) {
        return { char: "!", minX, maxX, minY, maxY, confidence: 0.9 };
      }

      // Square root (√): checkmark / tick + diagonal or top bar
      const hasTick = strokes.some((st) => {
        const b = getStrokeBounds(st);
        return b.width < width * 0.5 && b.height < height * 0.6;
      });
      const hasOverline = strokes.some((st) => {
        const b = getStrokeBounds(st);
        return b.width > width * 0.5 && b.minY < minY + height * 0.3;
      });
      if (hasTick && hasOverline) {
        return { char: "√", minX, maxX, minY, maxY, confidence: 0.91 };
      }
    }

    // Digit '4': fallback for 2 or 3 stroke 4
    const hasTallVertical = strokes.some((st) => {
      const b = getStrokeBounds(st);
      return b.height > height * 0.6 && b.height > b.width * 1.4;
    });
    const hasCrossOrL = strokes.some((st) => {
      const b = getStrokeBounds(st);
      return b.width > width * 0.45;
    });
    if (hasTallVertical && hasCrossOrL) {
      return { char: "4", minX, maxX, minY, maxY, confidence: 0.89 };
    }

    // Digit '5': horizontal top hat with neck & belly stroke below
    const hasTopHat = strokes.some((st) => {
      const b = getStrokeBounds(st);
      return b.minY < minY + height * 0.35 && b.width > width * 0.45;
    });
    if (hasTopHat) {
      return { char: "5", minX, maxX, minY, maxY, confidence: 0.88 };
    }

    // Pi symbol (π): top horizontal bar + 2 vertical legs
    if (strokes.length === 3) {
      const horizontalBar = strokes.find((st) => {
        const b = getStrokeBounds(st);
        return b.width > width * 0.7 && b.minY < minY + height * 0.35;
      });
      if (horizontalBar) {
        return { char: "π", minX, maxX, minY, maxY, confidence: 0.92 };
      }
    }

    // Division symbol (÷): horizontal bar with dot above and dot below
    if (strokes.length === 3) {
      const middleBar = strokes.find((st) => {
        const b = getStrokeBounds(st);
        return b.width > height * 1.5 && Math.abs(b.midY - midY) < height * 0.3;
      });
      if (middleBar) {
        return { char: "÷", minX, maxX, minY, maxY, confidence: 0.94 };
      }
    }

    // Percentage (%): diagonal slash with 2 dots or small loops
    if (strokes.length === 3) {
      const slash = strokes.find((st) => {
        const b = getStrokeBounds(st);
        return b.height > height * 0.6 && b.width > width * 0.4;
      });
      if (slash) {
        return { char: "%", minX, maxX, minY, maxY, confidence: 0.92 };
      }
    }

    // Letters A, H, E, F
    if (strokes.length >= 2 && height > 24) {
      const twoVerticals = strokes.filter((st) => {
        const b = getStrokeBounds(st);
        return b.height > height * 0.65;
      }).length >= 2;
      if (twoVerticals) {
        return { char: "H", minX, maxX, minY, maxY, confidence: 0.85 };
      }
    }
  }

  // ----------------------------------------------------
  // SINGLE-STROKE CLUSTERS
  // ----------------------------------------------------
  if (strokes.length === 1) {
    const s = strokes[0];
    const firstP = s[0];
    const lastP = s[s.length - 1];
    const strokeLen = getStrokeLength(s);

    // Decimal point / dot (.): very small width and height or single point
    if (
      (s.length <= 3 && width <= 12 && height <= 12) ||
      (strokeLen < 14 && width < 14 && height < 14)
    ) {
      return { char: ".", minX, maxX, minY, maxY, confidence: 0.94 };
    }

    // Horizontal minus sign (-): width is at least 2.0x height and height is small
    if (width > height * 2.0 && height < 30) {
      return { char: "-", minX, maxX, minY, maxY, confidence: 0.95 };
    }

    // Exponent / Caret (^): starts bottom-left, reaches apex at top-middle, ends bottom-right
    if (
      firstP.y > midY &&
      lastP.y > midY &&
      s.some((p) => p.y < minY + height * 0.25 && Math.abs(p.x - midX) < width * 0.4)
    ) {
      return { char: "^", minX, maxX, minY, maxY, confidence: 0.92 };
    }

    // Square root symbol (√): starts with small tick down-up, then down, then long up-right stroke
    const hasSqrtHook =
      firstP.y < maxY - height * 0.2 &&
      firstP.x < minX + width * 0.35 &&
      s.some((p) => p.y > maxY - 8 && p.x < midX) &&
      lastP.x > maxX - width * 0.25 &&
      lastP.y < minY + height * 0.4;
    if (hasSqrtHook) {
      return { char: "√", minX, maxX, minY, maxY, confidence: 0.93 };
    }

    // Loop check: start and end are close together (closed loop: 0 or 8)
    const distStartEnd = Math.hypot(firstP.x - lastP.x, firstP.y - lastP.y);
    const diag = Math.hypot(width, height);
    const isClosedLoop = distStartEnd < diag * 0.42;

    if (isClosedLoop) {
      // In '8': the stroke crosses right through the center waist (midX, midY)
      const midPoints = s.filter((p) => Math.abs(p.y - midY) < height * 0.15);
      const hasCenterPoint = midPoints.some((p) => Math.abs(p.x - midX) < width * 0.22);

      let midYCrossings = 0;
      for (let i = 1; i < s.length; i++) {
        if ((s[i - 1].y - midY) * (s[i].y - midY) < 0) midYCrossings++;
      }

      if (hasCenterPoint || midYCrossings >= 3) {
        return { char: "8", minX, maxX, minY, maxY, confidence: 0.94 };
      }

      // If loop has a vertical right stem descending below: letter 'a'
      if (lastP.x > maxX - width * 0.3 && lastP.y > maxY - height * 0.25 && width > 18) {
        return { char: "a", minX, maxX, minY, maxY, confidence: 0.86 };
      }

      // Smooth closed loop without center waist: '0'
      return { char: "0", minX, maxX, minY, maxY, confidence: 0.95 };
    }

    // Left parenthesis '(': curved stroke bowing outward to left (endpoints to right of apex near mid-height)
    const minXP = s.reduce((min, p) => (p.x < min.x ? p : min), s[0]);
    const minRelY = (minXP.y - minY) / height;
    const isConvexLeft =
      aspectRatio > 1.3 &&
      firstP.y < minY + height * 0.35 &&
      lastP.y > maxY - height * 0.35 &&
      minRelY >= 0.3 &&
      minRelY <= 0.7 &&
      minXP.x < firstP.x - width * 0.25 &&
      minXP.x < lastP.x - width * 0.25;
    if (isConvexLeft) {
      return { char: "(", minX, maxX, minY, maxY, confidence: 0.92 };
    }

    // Right parenthesis ')': curved stroke bowing outward to right (endpoints to left of apex near mid-height)
    const maxXP = s.reduce((max, p) => (p.x > max.x ? p : max), s[0]);
    const maxRelY = (maxXP.y - minY) / height;
    const isConvexRight =
      aspectRatio > 1.3 &&
      firstP.y < minY + height * 0.35 &&
      lastP.y > maxY - height * 0.35 &&
      maxRelY >= 0.3 &&
      maxRelY <= 0.7 &&
      maxXP.x > firstP.x + width * 0.25 &&
      maxXP.x > lastP.x + width * 0.25;
    if (isConvexRight) {
      return { char: ")", minX, maxX, minY, maxY, confidence: 0.92 };
    }

    // Digit '1': single vertical or near-vertical downward stroke
    const topQuarterPoints = s.filter((p) => p.y < minY + height * 0.25);
    const topQuarterWidth =
      topQuarterPoints.length >= 2
        ? Math.max(...topQuarterPoints.map((p) => p.x)) - Math.min(...topQuarterPoints.map((p) => p.x))
        : 0;

    if (
      aspectRatio > 1.8 &&
      firstP.y < minY + height * 0.4 &&
      lastP.y > maxY - height * 0.25 &&
      (width < 14 || (width < height * 0.45 && topQuarterWidth < width * 0.65))
    ) {
      return { char: "1", minX, maxX, minY, maxY, confidence: 0.96 };
    }

    // Digit '6': starts top/top-right, sweeps down left, forms a loop in bottom half, ends in mid height
    if (
      firstP.y < minY + height * 0.35 &&
      lastP.y > minY + height * 0.35 &&
      lastP.y < maxY - height * 0.15
    ) {
      const lowerPoints = s.filter((p) => p.y > midY);
      if (lowerPoints.length >= 3) {
        const lowerMinX = Math.min(...lowerPoints.map((p) => p.x));
        const lowerMaxX = Math.max(...lowerPoints.map((p) => p.x));
        if (lowerMaxX - lowerMinX > width * 0.5) {
          return { char: "6", minX, maxX, minY, maxY, confidence: 0.93 };
        }
      }
    }

    // Digit '2': starts top arc, diagonals to bottom-left, ends with flat horizontal base to right
    const hasBottomLeft = s.some((p) => p.x < minX + width * 0.35 && p.y > maxY - height * 0.3);
    const endsBottomRight = lastP.x > minX + width * 0.55 && lastP.y > maxY - height * 0.3;
    if (hasBottomLeft && endsBottomRight) {
      return { char: "2", minX, maxX, minY, maxY, confidence: 0.94 };
    }

    // Digit '7': starts top-left, moves right across top bar, diagonals down-left, no lower-right belly
    const bottomThirdPoints = s.filter((p) => p.y > maxY - height * 0.35);
    const bottomMaxX = bottomThirdPoints.length > 0 ? Math.max(...bottomThirdPoints.map((p) => p.x)) : minX;
    const reachesRightInBottom = bottomMaxX > minX + width * 0.72;

    const startsTopLeft = firstP.y < minY + height * 0.35 && firstP.x < minX + width * 0.45;
    const endsBottom = lastP.y > maxY - height * 0.3;

    if (startsTopLeft && endsBottom && !reachesRightInBottom) {
      const topPoints = s.filter((p) => p.y < minY + height * 0.3);
      const topMaxX = topPoints.length > 0 ? Math.max(...topPoints.map((p) => p.x)) : minX;
      if (topMaxX > minX + width * 0.75) {
        return { char: "7", minX, maxX, minY, maxY, confidence: 0.94 };
      }
    }

    // Digit '9': top half has loop/arc, bottom stem stays on right, ends bottom
    if (lastP.y > maxY - height * 0.25) {
      const lowerPoints = s.filter((p) => p.y > midY);
      const lowerAllRight = lowerPoints.length >= 1 && lowerPoints.every((p) => p.x >= midX - width * 0.25);
      const topHalf = s.filter((p) => p.y < midY);
      const topSpan =
        topHalf.length >= 2 ? Math.max(...topHalf.map((p) => p.x)) - Math.min(...topHalf.map((p) => p.x)) : 0;
      if (lowerAllRight && topSpan > width * 0.6) {
        return { char: "9", minX, maxX, minY, maxY, confidence: 0.93 };
      }
    }

    // Digit '3' vs '5':
    if (reachesRightInBottom) {
      const topQuarter = s.slice(0, Math.max(3, Math.floor(s.length / 4)));
      const movesLeft = topQuarter[0].x > topQuarter[topQuarter.length - 1].x;
      if (movesLeft && firstP.x > minX + width * 0.5) {
        return { char: "5", minX, maxX, minY, maxY, confidence: 0.93 };
      }
      return { char: "3", minX, maxX, minY, maxY, confidence: 0.93 };
    }

    // Slanted slash (/ or division): diagonal from top-right to bottom-left or bottom-left to top-right
    const slashDx = lastP.x - firstP.x;
    const slashDy = lastP.y - firstP.y;
    const isSlantedSlash =
      aspectRatio >= 0.7 &&
      aspectRatio <= 4.2 &&
      slashDx * slashDy < 0 &&
      Math.abs(slashDx) > width * 0.55 &&
      strokeLen < Math.hypot(width, height) * 1.5;
    if (isSlantedSlash) {
      return { char: "/", minX, maxX, minY, maxY, confidence: 0.93 };
    }

    // Digit '4': single stroke down-left, horizontal right, vertical down
    if (lastP.y > maxY - height * 0.25 && width > height * 0.35) {
      const hasHorizontalCross = s.some((p) => Math.abs(p.y - midY) < height * 0.25 && p.x > midX);
      if (hasHorizontalCross) {
        return { char: "4", minX, maxX, minY, maxY, confidence: 0.88 };
      }
    }

    // Letter 'c' or 'C': open curve to the right (starts top-right, curves left, ends bottom-right)
    if (
      firstP.x > minX + width * 0.4 &&
      firstP.y < minY + height * 0.35 &&
      lastP.x > minX + width * 0.4 &&
      lastP.y > maxY - height * 0.35 &&
      s.some((p) => p.x < minX + width * 0.2)
    ) {
      return { char: "c", minX, maxX, minY, maxY, confidence: 0.89 };
    }

    // Letter 'u' or 'U': open curve to the top
    if (
      firstP.y < minY + height * 0.35 &&
      lastP.y < minY + height * 0.35 &&
      s.some((p) => p.y > maxY - height * 0.25)
    ) {
      return { char: "u", minX, maxX, minY, maxY, confidence: 0.88 };
    }

    // Letter 'v' or 'V': 2 diagonal lines meeting at a bottom point
    if (
      firstP.y < minY + height * 0.35 &&
      lastP.y < minY + height * 0.35 &&
      s.some((p) => p.y > maxY - height * 0.2 && Math.abs(p.x - midX) < width * 0.3)
    ) {
      return { char: "v", minX, maxX, minY, maxY, confidence: 0.88 };
    }

    // Letter 'z' or 'Z': horizontal right, diagonal down-left, horizontal right
    if (
      firstP.x < minX + width * 0.4 &&
      firstP.y < minY + height * 0.35 &&
      lastP.x > maxX - width * 0.4 &&
      lastP.y > maxY - height * 0.35
    ) {
      const hasDiagDownLeft = s.some((p) => p.x < minX + width * 0.3 && p.y > midY);
      if (hasDiagDownLeft) {
        return { char: "z", minX, maxX, minY, maxY, confidence: 0.88 };
      }
    }

    // Letter 's' or 'S': S-shape curve
    let rightBumps = 0;
    let prevDx = 0;
    for (let i = 2; i < s.length; i++) {
      const dx = s[i].x - s[i - 2].x;
      if (prevDx > 0 && dx < 0 && s[i].x > midX) {
        rightBumps++;
      }
      prevDx = dx;
    }
    if (rightBumps >= 2) {
      return { char: "s", minX, maxX, minY, maxY, confidence: 0.85 };
    }

    // Letter 'b': tall vertical stem on left with loop on bottom right
    if (firstP.y < minY + height * 0.3 && firstP.x < minX + width * 0.4 && lastP.x < midX) {
      return { char: "b", minX, maxX, minY, maxY, confidence: 0.86 };
    }

    // Letter 'y': diagonal from top-left to middle, then longer descending tail
    if (lastP.y > maxY - height * 0.2 && lastP.x < midX) {
      return { char: "y", minX, maxX, minY, maxY, confidence: 0.85 };
    }
  }

  // Fallbacks: only classify as digit '1' or '-' if stroke conforms to strict geometric thresholds
  if (strokes.length === 1) {
    const s = strokes[0];
    const firstP = s[0];
    const lastP = s[s.length - 1];
    if (
      aspectRatio > 2.0 &&
      width < height * 0.45 &&
      firstP.y < minY + height * 0.35 &&
      lastP.y > maxY - height * 0.35 &&
      Math.abs(firstP.x - lastP.x) < width * 0.65
    ) {
      return { char: "1", minX, maxX, minY, maxY, confidence: 0.85 };
    }
    if (width > height * 2.2 && height < 26) {
      return { char: "-", minX, maxX, minY, maxY, confidence: 0.88 };
    }
  }

  // Unclassified or in-progress stroke: do not force arbitrary digits
  return { char: "?", minX, maxX, minY, maxY, confidence: 0 };
}

// Evaluates recognized expression string safely
export function evaluateRecognizedExpression(expr: string, _convention?: string): string {
  if (!expr) return "";
  let clean = expr.replace(/[=\s?]+$/, "").trim();
  clean = clean.replace(/×/g, "*").replace(/÷/g, "/");

  // If the expression is syntactically incomplete (ends with operator, unbalanced parentheses, etc.)
  // do NOT attempt evaluation and do NOT return the dangling expression as an answer
  if (!isCompleteMathExpression(clean)) {
    return "";
  }

  // Check using evaluateBasicMath first (handles algebra, powers, linear equations, rules)
  const mathRes = evaluateBasicMath(clean);
  if (mathRes && isValidMathAnswer(mathRes.answer)) {
    return mathRes.answer;
  }

  // Multi-digit single number (e.g. "113", "42", "7", "-5")
  if (/^[+-]?\d+(\.\d+)?$/.test(clean)) {
    return clean;
  }

  // Single variable (e.g. "x", "y", "a", "b")
  if (/^[a-zA-Z]$/.test(clean)) {
    return clean;
  }

  // Basic arithmetic: e.g. "5 + 3", "12 * 4", "10 - 4"
  try {
    if (/^[0-9+\-*/().\s^]+$/.test(clean)) {
      const jsExpr = clean.replace(/\^/g, "**");
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${jsExpr})`)();
      if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
        return Number.isInteger(result) ? `${result}` : `${parseFloat(result.toFixed(4))}`;
      }
    }
  } catch (_e) {}

  return "";
}

// Master function: inspects raw canvas strokes and instantly returns recognized expression & calculated result
export function recognizeStrokesLocally(
  strokes: StrokePoint[][]
): StrokeRecognitionResult | null {
  if (!strokes || strokes.length === 0) return null;

  const clusters = clusterStrokes(strokes);
  if (clusters.length === 0) return null;

  const recognizedChars: RecognizedCharacter[] = [];
  for (const cluster of clusters) {
    const rc = classifyCluster(cluster);
    if (rc.char !== "?") {
      recognizedChars.push(rc);
    }
  }

  if (recognizedChars.length === 0) return null;

  // Build expression string with natural spacing and contextual disambiguation
  let rawExpression = "";
  let hasEqual = false;

  for (let i = 0; i < recognizedChars.length; i++) {
    const curr = recognizedChars[i];
    let charVal = curr.char;

    if (charVal === "=") {
      hasEqual = true;
    }

    // Contextual disambiguation of '*' vs 'x':
    if (charVal === "*") {
      const prevChar = i > 0 ? recognizedChars[i - 1].char : "";
      const nextChar = i + 1 < recognizedChars.length ? recognizedChars[i + 1].char : "";
      const hasEqualsInExpr = recognizedChars.some((c) => c.char === "=");

      if (/\d/.test(prevChar)) {
        // If followed by another digit, it is multiplication (e.g. 5 * 4 =)
        if (/\d/.test(nextChar)) {
          charVal = "*";
        } else if (hasEqualsInExpr || /[+\-]/.test(nextChar)) {
          // In an equation or before an operator (e.g. 2x + 4 = 10, 5x = 20)
          charVal = "x";
        }
      } else if (/[=+\-]/.test(prevChar)) {
        charVal = "x";
      } else if (!prevChar && (/[+\-=]/.test(nextChar) || hasEqualsInExpr)) {
        charVal = "x";
      }
    }

    // Detect if current character should be spaced:
    // Operators (+, -, *, ×, /, ÷, =) get spaces around them
    // Digits and letters adjacent to each other stay grouped (e.g. "113", "2x", "x0")
    if (i > 0) {
      const prev = rawExpression[rawExpression.length - 1];
      const isCurrOp = /[+\-×*÷/=^√]/.test(charVal);
      const isPrevOp = /[+\-×*÷/=^√]/.test(prev);
      if (isCurrOp || isPrevOp) {
        // Do not add space between digit and variable 'x' (e.g. 2x)
        if (/\d/.test(prev) && charVal === "x") {
          // grouped together
        } else {
          rawExpression += " ";
        }
      }
    }
    rawExpression += charVal;
  }

  const formattedExpr = rawExpression.replace(/\s+/g, " ").trim();

  // Evaluate the full expression first using evaluateBasicMath (e.g. "2x + 4 = 10", "1 + 2 =")
  const fullMathResult = evaluateBasicMath(formattedExpr);
  if (fullMathResult && isValidMathAnswer(fullMathResult.answer)) {
    return {
      expression: formattedExpr,
      answer: fullMathResult.answer,
      fullEquation: fullMathResult.fullEquation,
      hasEqual,
      confidence: 0.92,
      characters: recognizedChars,
      appliedRule: fullMathResult.appliedRule || "BODMAS Rule",
      steps: fullMathResult.steps,
      shortExplanation: fullMathResult.shortExplanation,
    };
  }

  // If expression ends with '=' or has '=', evaluate LHS
  let exprToEval = formattedExpr;
  if (exprToEval.includes("=")) {
    exprToEval = exprToEval.split("=")[0].trim();
  }

  const calculatedAnswer = evaluateRecognizedExpression(exprToEval);

  if (calculatedAnswer && isValidMathAnswer(calculatedAnswer)) {
    const fullEquation =
      calculatedAnswer !== exprToEval
        ? `${exprToEval} = ${calculatedAnswer}`
        : formattedExpr.includes("=")
        ? formattedExpr
        : calculatedAnswer;

    return {
      expression: formattedExpr,
      answer: calculatedAnswer,
      fullEquation,
      hasEqual,
      confidence: 0.9,
      characters: recognizedChars,
      appliedRule: "BODMAS Rule",
      steps: [`Input: ${formattedExpr}`, `Calculated Result: ${calculatedAnswer}`],
      shortExplanation: `Evaluated ${fullEquation}`,
    };
  }

  // If expression cannot be evaluated yet (e.g. partial "1 +", single digit without "="):
  // Return answer as "" so no premature/glitched result displays
  return {
    expression: formattedExpr,
    answer: "",
    fullEquation: formattedExpr,
    hasEqual,
    confidence: 0.85,
    characters: recognizedChars,
    appliedRule: "Handwritten Input",
    steps: [`Recognized input: ${formattedExpr}`],
    shortExplanation: `Input captured: ${formattedExpr}`,
  };
}
