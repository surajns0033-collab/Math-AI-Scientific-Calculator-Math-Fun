import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import {
  Edit3,
  RotateCcw,
  Sparkles,
  Eraser,
  Grid,
  CheckCircle2,
  Trophy,
  Star,
  HelpCircle,
  Play,
  Lightbulb,
  ArrowRight,
  BookOpen,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  X,
  BoxSelect,
  Zap,
  Scale,
  ArrowLeftRight,
  PartyPopper,
  Check,
  Flame,
  RefreshCw,
  ArrowUpDown,
  XCircle,
  Clock,
} from "lucide-react";
import { GradeLevel, HandwrittenSolveResponse, KidsRewardState, QuizQuestion } from "../types";
import { NumberArrangeGame } from "./NumberArrangeGame";
import {
  evaluateBasicMath,
  isValidMathAnswer,
  getOrderOfOperationsComparison,
  OrderOfOpsComparison,
  isCompleteMathExpression,
  hasOperandsToCalculate,
} from "../utils/mathEvaluator";
import { recognizeStrokesLocally } from "../utils/strokeRecognizer";
import { drawAIHandwritingShape, convertTextToHandwritingStrokes } from "../utils/aiHandwritingShapes";
import { triggerCelebrationShower } from "../utils/celebrationShower";

// Fast Geometric Helpers for Box Select & Brush Eraser
function isPointInRect(px: number, py: number, minX: number, maxX: number, minY: number, maxY: number): boolean {
  return px >= minX && px <= maxX && py >= minY && py <= maxY;
}

function lineSegmentsIntersect(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): boolean {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (Math.abs(denom) < 1e-9) return false;
  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

function segmentIntersectsRect(
  x1: number, y1: number, x2: number, y2: number,
  minX: number, maxX: number, minY: number, maxY: number
): boolean {
  if (isPointInRect(x1, y1, minX, maxX, minY, maxY) || isPointInRect(x2, y2, minX, maxX, minY, maxY)) {
    return true;
  }
  // Check intersection with all 4 rectangle edges
  if (lineSegmentsIntersect(x1, y1, x2, y2, minX, minY, maxX, minY)) return true;
  if (lineSegmentsIntersect(x1, y1, x2, y2, minX, maxY, maxX, maxY)) return true;
  if (lineSegmentsIntersect(x1, y1, x2, y2, minX, minY, minX, maxY)) return true;
  if (lineSegmentsIntersect(x1, y1, x2, y2, maxX, minY, maxX, maxY)) return true;
  return false;
}

function isStrokeInBox(
  stroke: { x: number; y: number }[],
  minX: number, maxX: number, minY: number, maxY: number
): boolean {
  if (stroke.length === 0) return false;
  if (stroke.length === 1) {
    return isPointInRect(stroke[0].x, stroke[0].y, minX, maxX, minY, maxY);
  }
  for (let i = 0; i < stroke.length - 1; i++) {
    if (segmentIntersectsRect(stroke[i].x, stroke[i].y, stroke[i + 1].x, stroke[i + 1].y, minX, maxX, minY, maxY)) {
      return true;
    }
  }
  return false;
}

function distToSegmentSquared(px: number, py: number, vx: number, vy: number, wx: number, wy: number): number {
  const l2 = (wx - vx) * (wx - vx) + (wy - vy) * (wy - vy);
  if (l2 === 0) return (px - vx) * (px - vx) + (py - vy) * (py - vy);
  let t = ((px - vx) * (wx - vx) + (py - vy) * (wy - vy)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = vx + t * (wx - vx);
  const projY = vy + t * (wy - vy);
  return (px - projX) * (px - projX) + (py - projY) * (py - projY);
}

function isStrokeNearPoint(
  stroke: { x: number; y: number }[],
  px: number, py: number, radius: number
): boolean {
  const r2 = radius * radius;
  for (let i = 0; i < stroke.length; i++) {
    const dx = stroke[i].x - px;
    const dy = stroke[i].y - py;
    if (dx * dx + dy * dy <= r2) return true;
    if (i < stroke.length - 1) {
      if (distToSegmentSquared(px, py, stroke[i].x, stroke[i].y, stroke[i + 1].x, stroke[i + 1].y) <= r2) {
        return true;
      }
    }
  }
  return false;
}

// Helper to format any step cleanly according to standard order of operations
export function cleanStepText(stepText: string): string {
  if (!stepText) return "";
  let s = stepText;
  s = s.replace(/\[(BODMAS|PEMDAS):\s*([^/\]]+)(\s*\/\s*(BODMAS|PEMDAS):[^\]]+)?\]/gi, "[$2]");
  s = s.replace(/\bPEMDAS\b/gi, "BODMAS");
  s = s.replace(/\bUniversal\s+Order of Operations\b/gi, "BODMAS Rule");
  s = s.replace(/\bUniversal\b/gi, "");
  s = s.replace(/\s{2,}/g, " ").trim();
  return s;
}

export function formatStepForConvention(stepText: string, _convention?: string): string {
  return cleanStepText(stepText);
}

interface HandwritingPadProps {
  gradeLevel: GradeLevel;
  setGradeLevel: (level: GradeLevel) => void;
  rewards: KidsRewardState;
  onIncrementPractice: () => void;
  onRewardTrigger: () => void;
  darkMode: boolean;
}

type CanvasGridType = "ruled" | "graph" | "dotted" | "blank";
type PracticeSubMode = "scratchpad" | "number_trace" | "drag_arrange" | "quiz";
export type TraceProgressionMode = "progressive" | "single_only" | "two_digit_only" | "random";

const playCelebrationChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    // Musical arpeggio chord: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), C6 (1046.5Hz)
    const frequencies = [523.25, 659.25, 783.99, 1046.5];
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.36);
    });
  } catch (_e) {
    // Audio context may be restricted before user gesture
  }
};

const playWrongSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    // Gentle descending negative tone: 330Hz (E4) -> 220Hz (A3)
    const tones = [
      { freq: 330, start: 0, dur: 0.16 },
      { freq: 220, start: 0.14, dur: 0.28 },
    ];
    tones.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.02);
    });
  } catch (_e) {
    // Audio context may be restricted before user gesture
  }
};

// Robust validation for handwritten Quiz Answers against expected target answers
export function checkQuizAnswerMatch(
  userWritten: string,
  userAnswer: string,
  targetAnswer: string,
  fullEquation?: string,
  detectedNumber?: number | string
): boolean {
  if (!targetAnswer) return false;

  const normalize = (val: string) =>
    val
      .toLowerCase()
      .replace(/[\s,;:!?]+/g, "")
      .replace(/^(ans|answer|result)[:=]?/i, "")
      .replace(/\^/g, "")
      .replace(/²/g, "2")
      .replace(/³/g, "3")
      .replace(/⁰/g, "0")
      .replace(/¹/g, "1")
      .replace(/[=]+$/, "")
      .trim();

  const normTarget = normalize(targetAnswer);
  const normWritten = normalize(userWritten || "");
  const normAnswer = normalize(userAnswer || "");
  const normFull = normalize(fullEquation || "");

  // 1. Direct normalized match
  if (normWritten === normTarget || normAnswer === normTarget) return true;

  // 2. Direct match with detectedNumber
  if (detectedNumber !== undefined && detectedNumber !== null && String(detectedNumber).trim() === normTarget) {
    return true;
  }

  // 3. Target has equations like "x = 6" or "F = 49", extract RHS
  if (normTarget.includes("=")) {
    const parts = normTarget.split("=");
    const rhs = normalize(parts[parts.length - 1]);
    if (normWritten === rhs || normAnswer === rhs) return true;
  }

  // 4. User wrote equation like "4 + 3 = 7" or "= 7" or "6 + 7 = 13", extract RHS
  if ((userWritten || "").includes("=")) {
    const parts = (userWritten || "").split("=");
    const userRhs = normalize(parts[parts.length - 1]);
    if (userRhs === normTarget) return true;
  }

  if (normFull.includes("=")) {
    const parts = normFull.split("=");
    const fullRhs = normalize(parts[parts.length - 1]);
    if (fullRhs === normTarget) return true;
  }

  // 5. Numeric equivalence (ignoring units like "N", "deg", etc.)
  const numTarget = parseFloat(targetAnswer.replace(/[^\d.-]/g, ""));
  if (!isNaN(numTarget)) {
    const numUserAnswer = parseFloat((userAnswer || "").replace(/[^\d.-]/g, ""));
    if (!isNaN(numUserAnswer) && Math.abs(numTarget - numUserAnswer) < 0.001) return true;

    const numUserWritten = parseFloat((userWritten || "").replace(/[^\d.-]/g, ""));
    if (!isNaN(numUserWritten) && Math.abs(numTarget - numUserWritten) < 0.001) return true;

    if (detectedNumber !== undefined && detectedNumber !== null) {
      const numDet = typeof detectedNumber === "number" ? detectedNumber : parseFloat(String(detectedNumber));
      if (!isNaN(numDet) && Math.abs(numTarget - numDet) < 0.001) return true;
    }

    // Extract all individual whole numbers from text (e.g. "Ans: 13", "result 13", "6 + 7 = 13")
    const allNums = `${userWritten} ${userAnswer} ${fullEquation || ""}`.match(/-?\d+(?:\.\d+)?/g);
    if (allNums) {
      for (const nStr of allNums) {
        if (Math.abs(parseFloat(nStr) - numTarget) < 0.001) {
          return true;
        }
      }
    }
  }

  // 6. Containment for algebraic derivatives / expressions (e.g. "3x² - 5")
  if (normTarget.length >= 3 && (normWritten.includes(normTarget) || normFull.includes(normTarget))) {
    return true;
  }

  return false;
}

// Evaluates whether the drawn strokes stay within an acceptable envelope around the target number guide,
// or if the line diverts excessively from the guideline.
export function evaluateNumberStrokeDeviation(
  strokes: { x: number; y: number }[][],
  targetNumber: number,
  canvasWidth: number,
  canvasHeight: number
): {
  isDivertedTooMuch: boolean;
  reason?: string;
  maxDistOutside: number;
  outOfBoundsRatio: number;
  totalLength: number;
} {
  if (!strokes || strokes.length === 0) {
    return {
      isDivertedTooMuch: true,
      reason: "Please write the number on the pad.",
      maxDistOutside: 0,
      outOfBoundsRatio: 0,
      totalLength: 0,
    };
  }

  // Calculate total path length
  let totalLength = 0;
  for (const stroke of strokes) {
    for (let i = 0; i < stroke.length - 1; i++) {
      totalLength += Math.hypot(stroke[i + 1].x - stroke[i].x, stroke[i + 1].y - stroke[i].y);
    }
  }

  if (totalLength < 25) {
    return {
      isDivertedTooMuch: true,
      reason: "Stroke is too short. Please write the complete number!",
      maxDistOutside: 0,
      outOfBoundsRatio: 0,
      totalLength,
    };
  }

  const numStr = targetNumber.toString();
  const charCount = numStr.length;
  const baseFontSize =
    charCount > 1
      ? Math.min(130, Math.floor(canvasWidth / (charCount * 0.95)))
      : Math.min(195, Math.floor(canvasHeight * 0.72));

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  // Compute nominal guide bounding box
  let guideMinX = cx - baseFontSize * 0.35;
  let guideMaxX = cx + baseFontSize * 0.35;
  let guideMinY = cy - baseFontSize * 0.44;
  let guideMaxY = cy + baseFontSize * 0.44;

  if (targetNumber === 1 && charCount === 1) {
    const h = baseFontSize;
    const stemX = cx + h * 0.03;
    const beakX = stemX - h * 0.22;
    const baseHalf = h * 0.18;
    guideMinX = beakX - 12;
    guideMaxX = stemX + baseHalf + 12;
    guideMinY = cy - h * 0.42;
    guideMaxY = cy + h * 0.42;
  } else if (charCount > 1) {
    const charWidth = baseFontSize * 0.62;
    const totalWidth = charCount * charWidth;
    guideMinX = cx - totalWidth / 2 - 15;
    guideMaxX = cx + totalWidth / 2 + 15;
    guideMinY = cy - baseFontSize * 0.45;
    guideMaxY = cy + baseFontSize * 0.45;
  }

  // Generous tolerance envelope for kids: allows natural wobble, slight diversion, and broader curves
  // around the number, while strictly flagging lines that shoot out far or wander into margins
  const tolerance = Math.max(55, baseFontSize * 0.38);

  const allowedMinX = guideMinX - tolerance;
  const allowedMaxX = guideMaxX + tolerance;
  const allowedMinY = guideMinY - tolerance;
  const allowedMaxY = guideMaxY + tolerance;

  let totalPoints = 0;
  let outOfBoundsPoints = 0;
  let maxDistOutside = 0;
  let sumX = 0;
  let sumY = 0;

  for (const stroke of strokes) {
    for (const pt of stroke) {
      totalPoints++;
      sumX += pt.x;
      sumY += pt.y;

      let dx = 0;
      if (pt.x < allowedMinX) dx = allowedMinX - pt.x;
      else if (pt.x > allowedMaxX) dx = pt.x - allowedMaxX;

      let dy = 0;
      if (pt.y < allowedMinY) dy = allowedMinY - pt.y;
      else if (pt.y > allowedMaxY) dy = pt.y - allowedMaxY;

      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        outOfBoundsPoints++;
        if (dist > maxDistOutside) {
          maxDistOutside = dist;
        }
      }
    }
  }

  const outOfBoundsRatio = totalPoints > 0 ? outOfBoundsPoints / totalPoints : 0;
  const avgX = totalPoints > 0 ? sumX / totalPoints : cx;
  const avgY = totalPoints > 0 ? sumY / totalPoints : cy;
  const centerOffset = Math.hypot(avgX - cx, avgY - cy);

  // Excessive diversion criteria ("jyada line divert"):
  // 1. Extreme stray: any point strayed more than tolerance * 0.85 outside the allowed envelope
  // 2. Consistent stray: more than 20% of all points lie outside the allowed envelope
  // 3. Gross displacement: strokes drawn in the wrong area of the canvas entirely
  const isDivertedTooMuch =
    maxDistOutside > tolerance * 0.85 ||
    outOfBoundsRatio > 0.20 ||
    centerOffset > baseFontSize * 0.70;

  let reason = "";
  if (maxDistOutside > tolerance * 0.85) {
    reason = "Line diverted too far from the number guideline. Keep strokes closer to the number!";
  } else if (outOfBoundsRatio > 0.20) {
    reason = "Strokes strayed outside the number area. Please follow the guideline!";
  } else if (centerOffset > baseFontSize * 0.70) {
    reason = "Number must be written in the center over the guideline!";
  }

  return {
    isDivertedTooMuch,
    reason,
    maxDistOutside,
    outOfBoundsRatio,
    totalLength,
  };
}

const getNextTargetNumber = (current: number, mode: TraceProgressionMode): number => {
  if (mode === "single_only") {
    return current >= 9 ? 0 : current + 1;
  }
  if (mode === "two_digit_only") {
    if (current < 10) return 10;
    if (current >= 99) return 10;
    return current + 1;
  }
  if (mode === "random") {
    let nextNum = current;
    let attempts = 0;
    while (nextNum === current && attempts < 15) {
      attempts++;
      if (Math.random() < 0.4) {
        nextNum = Math.floor(Math.random() * 90) + 10;
      } else {
        nextNum = Math.floor(Math.random() * 10);
      }
    }
    if (nextNum === current) {
      nextNum = (current + 1) % 100;
    }
    return nextNum;
  }
  // Default "progressive": 0 -> 1 -> 2 ... -> 9, then 10 -> 11 -> 12 ... -> 20, then occasional 2-digit milestones
  if (current < 9) {
    return current + 1;
  } else if (current === 9) {
    return 10; // First 2-digit challenge!
  } else if (current < 20) {
    return current + 1;
  } else {
    const milestones = [25, 30, 40, 50, 99];
    const nextMilestone = milestones.find((m) => m > current);
    return nextMilestone !== undefined ? nextMilestone : 0;
  }
};

export const HandwritingPad: React.FC<HandwritingPadProps> = ({
  gradeLevel,
  setGradeLevel,
  rewards,
  onIncrementPractice,
  onRewardTrigger,
  darkMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<{ x: number; y: number; color: string; size: number }[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number; color: string; size: number }[]>([]);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [eraserMode, setEraserMode] = useState<"box" | "brush">("box");
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    active: boolean;
  } | null>(null);
  const selectionBoxRef = useRef<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    active: boolean;
  } | null>(null);
  const [undoHistory, setUndoHistory] = useState<{ x: number; y: number; color: string; size: number }[][][]>([]);
  const [penColor, setPenColor] = useState<string>("#2563eb"); // default royal blue ink
  const [penSize, setPenSize] = useState<number>(4);
  const [gridType, setGridType] = useState<CanvasGridType>("graph");
  const [subMode, setSubMode] = useState<PracticeSubMode>("scratchpad");
  const [solvingMode, setSolvingMode] = useState<"learn_ai" | "manual">("learn_ai");

  // Active / most recent auto-calculated result
  const [autoAnswer, setAutoAnswer] = useState<{
    text: string;
    fullEquation?: string;
    hasEqual: boolean;
    x: number;
    y: number;
  } | null>(null);
  // Single active calculated result for the current canvas content
  const [activeResult, setActiveResult] = useState<{
    text: string;
    fullEquation: string;
    expression: string;
  } | null>(null);
  const [autoCalculating, setAutoCalculating] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const autoSolveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeSolveRequestIdRef = useRef<number>(0);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const lastAutoSolveTimestampRef = useRef<number>(0);

  // Kids number writing practice state
  const [targetNumber, setTargetNumber] = useState<number>(0);
  const [consecutiveSolves, setConsecutiveSolves] = useState<number>(0);
  const [traceProgression, setTraceProgression] = useState<TraceProgressionMode>("progressive");
  const [traceFeedback, setTraceFeedback] = useState<{
    status: "idle" | "writing" | "checking" | "correct" | "incorrect";
    message?: string;
    writtenNumber?: number | string;
    divergenceReason?: string;
    motivation?: string;
  } | null>(null);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);
  const autoNextTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // AI Solution state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [solveResult, setSolveResult] = useState<HandwrittenSolveResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Quiz Mode State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([
    {
      id: "q-default-1",
      question: "What is 4 + 3 = ?",
      targetAnswer: "7",
      hint: "Count up 3 from 4: 5, 6, 7!",
      explanation: "4 plus 3 equals 7.",
      type: "math",
    },
    {
      id: "q-default-2",
      question: "Solve: 5 × 2 = ?",
      targetAnswer: "10",
      hint: "Two groups of 5",
      explanation: "5 times 2 equals 10.",
      type: "math",
    },
  ]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState<{
    status: "idle" | "writing" | "checking" | "correct" | "incorrect";
    userAnswer?: string;
    targetAnswer?: string;
    message?: string;
    explanation?: string;
  } | null>(null);
  const [quizScore, setQuizScore] = useState<{ correct: number; totalAnswered: number }>({
    correct: 0,
    totalAnswered: 0,
  });
  const [quizResults, setQuizResults] = useState<Record<number, "correct" | "incorrect">>({});

  // Score stats for Quiz Mode
  const totalQuizQuestions = quizQuestions.length;
  const correctCount = Object.values(quizResults).filter((r) => r === "correct").length;
  const incorrectCount = Object.values(quizResults).filter((r) => r === "incorrect").length;
  const remainingCount = Math.max(0, totalQuizQuestions - (correctCount + incorrectCount));

  // Auto-adapt default questions based on grade level
  useEffect(() => {
    if (gradeLevel === "Kindergarten") {
      setQuizQuestions([
        { id: "k1", question: "Write the number 5", targetAnswer: "5", hint: "A short neck, belly fat, number 5 wears a hat!", explanation: "Digit 5", type: "number_trace" },
        { id: "k2", question: "2 + 2 = ?", targetAnswer: "4", hint: "Count 2 and 2 more fingers", explanation: "2 + 2 = 4", type: "math" },
        { id: "k3", question: "3 + 1 = ?", targetAnswer: "4", hint: "Count one after 3", explanation: "3 + 1 = 4", type: "math" },
        { id: "k4", question: "Write the number 8", targetAnswer: "8", hint: "Make an S and do not wait, climb back up to make an 8!", explanation: "Digit 8", type: "number_trace" },
        { id: "k5", question: "5 - 2 = ?", targetAnswer: "3", hint: "Hold 5 fingers, put 2 down", explanation: "5 - 2 = 3", type: "math" },
      ]);
      setGridType("ruled");
    } else if (gradeLevel === "Elementary (1st - 3rd)") {
      setQuizQuestions([
        { id: "e1", question: "6 + 7 = ?", targetAnswer: "13", hint: "6 + 6 is 12, so 6 + 7 is one more", explanation: "6 + 7 = 13", type: "math" },
        { id: "e2", question: "4 × 3 = ?", targetAnswer: "12", hint: "Add 4 three times: 4, 8, 12", explanation: "4 × 3 = 12", type: "math" },
        { id: "e3", question: "15 - 8 = ?", targetAnswer: "7", hint: "8 + 7 = 15", explanation: "15 minus 8 is 7", type: "math" },
        { id: "e4", question: "20 ÷ 4 = ?", targetAnswer: "5", hint: "4 groups of 5 make 20", explanation: "20 ÷ 4 = 5", type: "math" },
        { id: "e5", question: "9 + 8 = ?", targetAnswer: "17", hint: "10 + 8 is 18, so 9 + 8 is 17", explanation: "9 + 8 = 17", type: "math" },
      ]);
      setGridType("graph");
    } else if (gradeLevel === "Middle School (4th - 8th)") {
      setQuizQuestions([
        { id: "m1", question: "Solve for x: 2x + 6 = 18", targetAnswer: "x = 6", hint: "Subtract 6 from both sides, then divide by 2", explanation: "2x = 12 => x = 6", type: "math" },
        { id: "m2", question: "Calculate: (-4) × (-5) = ?", targetAnswer: "20", hint: "A negative times a negative equals a positive", explanation: "Negative times negative is positive 20", type: "math" },
        { id: "m3", question: "Area of triangle: base=8, height=5", targetAnswer: "20", hint: "Formula: A = 0.5 × b × h", explanation: "0.5 × 8 × 5 = 20", type: "math" },
        { id: "m4", question: "Evaluate: 3² + 4² = ?", targetAnswer: "25", hint: "9 + 16 = 25", explanation: "9 + 16 = 25", type: "math" },
        { id: "m5", question: "Solve for y: 3y - 9 = 0", targetAnswer: "y = 3", hint: "3y = 9, so y = 3", explanation: "3y = 9 => y = 3", type: "math" },
      ]);
    } else if (gradeLevel === "High School (9th - 12th)") {
      setQuizQuestions([
        { id: "h1", question: "Evaluate: sin(30°) + cos(60°)", targetAnswer: "1", hint: "sin(30°) = 0.5, cos(60°) = 0.5", explanation: "0.5 + 0.5 = 1", type: "math" },
        { id: "h2", question: "Find derivative: d/dx (x³ - 5x)", targetAnswer: "3x² - 5", hint: "Use power rule d/dx(x^n) = n*x^(n-1)", explanation: "Derivative is 3x² - 5", type: "math" },
        { id: "h3", question: "Physics: F = m*a with m=5kg, a=9.8m/s²", targetAnswer: "49 N", hint: "Multiply 5 by 9.8", explanation: "F = 5 × 9.8 = 49 Newtons", type: "math" },
        { id: "h4", question: "Solve quadratic: x² - 9 = 0 (positive x)", targetAnswer: "3", hint: "x² = 9, square root of 9 is 3", explanation: "x = 3", type: "math" },
        { id: "h5", question: "Logarithm: log₁₀(1000) = ?", targetAnswer: "3", hint: "10 to what power is 1000? 10³ = 1000", explanation: "log10(1000) = 3", type: "math" },
      ]);
    } else {
      // College / Graduate
      setQuizQuestions([
        { id: "g1", question: "Evaluate definite integral: ∫₀¹ (3x² + 2x) dx", targetAnswer: "2", hint: "Antiderivative is [x³ + x²] from 0 to 1", explanation: "[1³ + 1²] - 0 = 2", type: "math" },
        { id: "g2", question: "Calculate: d/dx [ e^(2x) · sin(x) ]", targetAnswer: "e^(2x)(2 sin x + cos x)", hint: "Use product rule: u'v + uv'", explanation: "2e^(2x)sin x + e^(2x)cos x", type: "math" },
        { id: "g3", question: "Limit: lim (x→0) [ sin(x) / x ]", targetAnswer: "1", hint: "Fundamental trigonometric limit", explanation: "lim (x->0) sin(x)/x = 1", type: "math" },
        { id: "g4", question: "Determinant of 2x2 matrix: [[2, 1], [3, 4]]", targetAnswer: "5", hint: "ad - bc = (2*4) - (1*3) = 8 - 3 = 5", explanation: "8 - 3 = 5", type: "math" },
        { id: "g5", question: "Eigenvalue equation: λ² - 4 = 0 (positive λ)", targetAnswer: "2", hint: "λ² = 4 => λ = 2", explanation: "Positive root is 2", type: "math" },
      ]);
    }
    setCurrentQuizIndex(0);
    setQuizFeedback(null);
    setQuizScore({ correct: 0, totalAnswered: 0 });
    setQuizResults({});
    setSolveResult(null);
  }, [gradeLevel]);

  // Adjust ink color based on dark mode if using default
  useEffect(() => {
    if (darkMode && penColor === "#0f172a") {
      setPenColor("#f8fafc");
    } else if (!darkMode && penColor === "#f8fafc") {
      setPenColor("#0f172a");
    }
  }, [darkMode]);

  // Redraw canvas whenever strokes, grid, or target changes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background fill
    ctx.fillStyle = darkMode ? "#0f172a" : "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Draw background grid patterns
    if (gridType === "graph") {
      ctx.strokeStyle = darkMode ? "#1e293b" : "#e2e8f0";
      ctx.lineWidth = 1;
      const step = 28;
      for (let x = 0; x <= width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else if (gridType === "ruled") {
      ctx.strokeStyle = darkMode ? "#334155" : "#cbd5e1";
      ctx.lineWidth = 1.5;
      const step = 44;
      for (let y = step; y <= height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else if (gridType === "dotted") {
      ctx.fillStyle = darkMode ? "#334155" : "#cbd5e1";
      const step = 24;
      for (let x = step; x < width; x += step) {
        for (let y = step; y < height; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // If in number writing mode, draw an accessible faint guide template
    if (subMode === "number_trace") {
      ctx.save();
      const numStr = targetNumber.toString();
      const charCount = numStr.length;
      const baseFontSize = charCount > 1
        ? Math.min(130, Math.floor(width / (charCount * 0.95)))
        : Math.min(195, Math.floor(height * 0.72));

      // Draw custom textbook digit 1 with downward-angled left beak (~42 degrees down)
      const drawTextbookDigitOne = (charX: number, charY: number, h: number) => {
        const topY = charY - h * 0.38;
        const botY = charY + h * 0.38;
        const stemX = charX + h * 0.03;
        const beakX = stemX - h * 0.22;
        const beakY = topY + h * 0.22; // Slanted down from apex at ~45 degrees
        const baseHalf = h * 0.18;

        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // 1. Faint thick guide path
        ctx.strokeStyle = darkMode ? "rgba(148, 163, 184, 0.14)" : "rgba(100, 116, 139, 0.18)";
        ctx.lineWidth = Math.max(16, h * 0.12);

        // Beak to apex to bottom
        ctx.beginPath();
        ctx.moveTo(beakX, beakY);
        ctx.lineTo(stemX, topY);
        ctx.lineTo(stemX, botY);
        ctx.stroke();

        // Baseline foot
        ctx.beginPath();
        ctx.moveTo(stemX - baseHalf, botY);
        ctx.lineTo(stemX + baseHalf, botY);
        ctx.stroke();

        // 2. Dotted center guideline
        ctx.strokeStyle = darkMode ? "rgba(96, 165, 250, 0.45)" : "rgba(59, 130, 246, 0.55)";
        ctx.lineWidth = 3.5;
        ctx.setLineDash([8, 8]);

        ctx.beginPath();
        ctx.moveTo(beakX, beakY);
        ctx.lineTo(stemX, topY);
        ctx.lineTo(stemX, botY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(stemX - baseHalf, botY);
        ctx.lineTo(stemX + baseHalf, botY);
        ctx.stroke();

        // Start dot indicator at the beak
        ctx.setLineDash([]);
        ctx.fillStyle = darkMode ? "rgba(96, 165, 250, 0.85)" : "rgba(59, 130, 246, 0.9)";
        ctx.beginPath();
        ctx.arc(beakX, beakY, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      };

      if (numStr === "1") {
        drawTextbookDigitOne(width / 2, height / 2, baseFontSize);
      } else if (charCount === 1) {
        ctx.font = `bold ${baseFontSize}px 'Plus Jakarta Sans', sans-serif`;
        ctx.fillStyle = darkMode ? "rgba(148, 163, 184, 0.12)" : "rgba(100, 116, 139, 0.15)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(numStr, width / 2, height / 2);

        ctx.strokeStyle = darkMode ? "rgba(96, 165, 250, 0.35)" : "rgba(59, 130, 246, 0.4)";
        ctx.lineWidth = 3.5;
        ctx.setLineDash([8, 8]);
        ctx.strokeText(numStr, width / 2, height / 2);
      } else {
        // Multi-digit numbers (e.g. 10, 11, 12, 25, 99)
        const charWidth = baseFontSize * 0.62;
        const totalWidth = charCount * charWidth;
        const startX = width / 2 - totalWidth / 2 + charWidth / 2;

        ctx.font = `bold ${baseFontSize}px 'Plus Jakarta Sans', sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (let i = 0; i < charCount; i++) {
          const ch = numStr[i];
          const charX = startX + i * charWidth;
          if (ch === "1") {
            drawTextbookDigitOne(charX, height / 2, baseFontSize);
          } else {
            ctx.save();
            ctx.fillStyle = darkMode ? "rgba(148, 163, 184, 0.12)" : "rgba(100, 116, 139, 0.15)";
            ctx.fillText(ch, charX, height / 2);

            ctx.strokeStyle = darkMode ? "rgba(96, 165, 250, 0.35)" : "rgba(59, 130, 246, 0.4)";
            ctx.lineWidth = 3.5;
            ctx.setLineDash([8, 8]);
            ctx.strokeText(ch, charX, height / 2);
            ctx.restore();
          }
        }
      }
      ctx.restore();
    }

    // Render all recorded strokes
    const allStrokes = [...strokes, ...(currentStroke.length > 0 ? [currentStroke] : [])];
    const isSelectionActive = Boolean(selectionBox && selectionBox.active);
    const boxBounds = isSelectionActive && selectionBox
      ? {
          minX: Math.min(selectionBox.startX, selectionBox.currentX),
          maxX: Math.max(selectionBox.startX, selectionBox.currentX),
          minY: Math.min(selectionBox.startY, selectionBox.currentY),
          maxY: Math.max(selectionBox.startY, selectionBox.currentY),
        }
      : null;

    allStrokes.forEach((stroke) => {
      if (stroke.length < 1) return;
      const isInsideSelection =
        boxBounds &&
        isStrokeInBox(stroke, boxBounds.minX, boxBounds.maxX, boxBounds.minY, boxBounds.maxY);

      ctx.save();
      ctx.beginPath();
      if (isInsideSelection) {
        // Visually indicate strokes that will be deleted by box erase
        ctx.strokeStyle = darkMode ? "#f43f5e" : "#e11d48";
        ctx.lineWidth = stroke[0].size + 1;
        ctx.globalAlpha = 0.45;
      } else {
        ctx.strokeStyle = stroke[0].color;
        ctx.lineWidth = stroke[0].size;
      }
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (stroke.length === 1) {
        ctx.arc(stroke[0].x, stroke[0].y, Math.max(2, stroke[0].size / 2), 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
        ctx.restore();
        return;
      }

      ctx.moveTo(stroke[0].x, stroke[0].y);
      if (stroke.length === 2) {
        ctx.lineTo(stroke[1].x, stroke[1].y);
      } else {
        for (let i = 1; i < stroke.length - 1; i++) {
          const midX = (stroke[i].x + stroke[i + 1].x) / 2;
          const midY = (stroke[i].y + stroke[i + 1].y) / 2;
          ctx.quadraticCurveTo(stroke[i].x, stroke[i].y, midX, midY);
        }
        ctx.lineTo(stroke[stroke.length - 1].x, stroke[stroke.length - 1].y);
      }
      ctx.stroke();
      ctx.restore();
    });

    // If Box Eraser marquee box is active, render selection overlay with corner markers & badge
    if (boxBounds && selectionBox && selectionBox.active) {
      const { minX, maxX, minY, maxY } = boxBounds;
      const boxW = maxX - minX;
      const boxH = maxY - minY;

      if (boxW > 2 || boxH > 2) {
        ctx.save();
        // Tinted area fill indicating deletion zone
        ctx.fillStyle = darkMode ? "rgba(244, 63, 94, 0.16)" : "rgba(244, 63, 94, 0.12)";
        ctx.fillRect(minX, minY, boxW, boxH);

        // Dashed bounding rectangle
        ctx.strokeStyle = darkMode ? "#fb7185" : "#e11d48";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(minX, minY, boxW, boxH);
        ctx.setLineDash([]);

        // L-shaped Corner handles
        const cLen = Math.max(8, Math.min(16, Math.min(boxW, boxH) / 2));
        ctx.strokeStyle = darkMode ? "#f43f5e" : "#be123c";
        ctx.lineWidth = 3;
        ctx.lineCap = "square";

        // Top-left
        ctx.beginPath();
        ctx.moveTo(minX, minY + cLen);
        ctx.lineTo(minX, minY);
        ctx.lineTo(minX + cLen, minY);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(maxX - cLen, minY);
        ctx.lineTo(maxX, minY);
        ctx.lineTo(maxX, minY + cLen);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(minX, maxY - cLen);
        ctx.lineTo(minX, maxY);
        ctx.lineTo(minX + cLen, maxY);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(maxX - cLen, maxY);
        ctx.lineTo(maxX, maxY);
        ctx.lineTo(maxX, maxY - cLen);
        ctx.stroke();

        // Floating Erase Quick Badge
        if (boxW > 40 && boxH > 20) {
          const badgeText = `Erase Quick (${Math.round(boxW)}×${Math.round(boxH)})`;
          ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
          const tw = ctx.measureText(badgeText).width;
          const bw = tw + 14;
          const bh = 20;
          const bx = Math.min(maxX - bw - 4, Math.max(minX + 4, minX + 6));
          const by = minY >= 24 ? minY - 23 : minY + 4;

          ctx.fillStyle = darkMode ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.95)";
          ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
          ctx.shadowBlur = 4;
          ctx.beginPath();
          if (typeof ctx.roundRect === "function") {
            ctx.roundRect(bx, by, bw, bh, 4);
          } else {
            ctx.rect(bx, by, bw, bh);
          }
          ctx.fill();
          ctx.shadowColor = "transparent";

          ctx.strokeStyle = darkMode ? "#fb7185" : "#e11d48";
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = darkMode ? "#fda4af" : "#be123c";
          ctx.textBaseline = "middle";
          ctx.fillText(badgeText, bx + 7, by + bh / 2);
        }

        ctx.restore();
      }

      // Floating inline answer badge rendered directly on canvas beside equation
      if (autoAnswer && isValidMathAnswer(autoAnswer.text) && strokes.length > 0) {
        ctx.save();
        const ansLabel = autoAnswer.text.trim();
        const displayLabel = ansLabel.startsWith("=") ? ansLabel : `= ${ansLabel}`;
        
        ctx.font = "bold 17px 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
        const tw = ctx.measureText(displayLabel).width;
        const pw = tw + 38;
        const ph = 36;
        const px = Math.min(width - pw - 12, Math.max(12, autoAnswer.x));
        const py = Math.min(height - ph - 12, Math.max(12, autoAnswer.y - ph / 2));

        ctx.shadowColor = darkMode ? "rgba(0, 0, 0, 0.5)" : "rgba(79, 70, 229, 0.25)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = darkMode ? "#1e1b4b" : "#eef2ff";
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(px, py, pw, ph, 8);
        } else {
          ctx.rect(px, py, pw, ph);
        }
        ctx.fill();
        ctx.shadowColor = "transparent";

        ctx.strokeStyle = darkMode ? "#818cf8" : "#4f46e5";
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.fillStyle = darkMode ? "#c7d2fe" : "#3730a3";
        ctx.textBaseline = "middle";
        ctx.font = "bold 17px 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
        ctx.fillText(displayLabel, px + 10, py + ph / 2);

        ctx.font = "12px system-ui, sans-serif";
        ctx.fillText("✍️", px + tw + 14, py + ph / 2);

        ctx.restore();
      }
    }
  }, [strokes, currentStroke, gridType, subMode, targetNumber, darkMode, selectionBox, autoAnswer]);

  // Geometric detection of equal sign '=' from strokes, returning its exact bounding box & anchor point
  interface EqualSignBox {
    found: boolean;
    maxX: number;
    minX: number;
    midY: number;
    height: number;
    width: number;
    strokeIndices: number[];
  }

  // Detects whether two strokes form a genuine equal sign '='
  // A genuine equal sign consists of TWO horizontal or slightly slanted bars stacked parallel to each other
  const isTwoStrokesEqualSign = (
    s1: { x: number; y: number }[],
    s2: { x: number; y: number }[]
  ): { isMatch: boolean; minX: number; maxX: number; minY: number; maxY: number } => {
    if (!s1 || !s2 || s1.length < 2 || s2.length < 2) {
      return { isMatch: false, minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    const minX1 = Math.min(...s1.map((p) => p.x));
    const maxX1 = Math.max(...s1.map((p) => p.x));
    const minY1 = Math.min(...s1.map((p) => p.y));
    const maxY1 = Math.max(...s1.map((p) => p.y));
    const w1 = maxX1 - minX1;
    const h1 = Math.max(1, maxY1 - minY1);

    const minX2 = Math.min(...s2.map((p) => p.x));
    const maxX2 = Math.max(...s2.map((p) => p.x));
    const minY2 = Math.min(...s2.map((p) => p.y));
    const maxY2 = Math.max(...s2.map((p) => p.y));
    const w2 = maxX2 - minX2;
    const h2 = Math.max(1, maxY2 - minY2);

    // Both strokes must be predominantly horizontal (width significantly greater than height)
    // This strictly excludes vertical strokes, plus signs, numbers (2, 3, 5, 8), and tall letters
    if (w1 < 8 || w2 < 8) return { isMatch: false, minX: 0, maxX: 0, minY: 0, maxY: 0 };
    if (w1 < h1 * 1.25 || w2 < h2 * 1.25) return { isMatch: false, minX: 0, maxX: 0, minY: 0, maxY: 0 };

    const midY1 = (minY1 + maxY1) / 2;
    const midY2 = (minY2 + maxY2) / 2;
    const midX1 = (minX1 + maxX1) / 2;
    const midX2 = (minX2 + maxX2) / 2;

    const yDist = Math.abs(midY1 - midY2);
    const xDist = Math.abs(midX1 - midX2);

    // Vertical distance between the two bars should be between 4px and 45px
    if (yDist < 4 || yDist > 45) return { isMatch: false, minX: 0, maxX: 0, minY: 0, maxY: 0 };

    // Horizontal centers should be well aligned
    const maxW = Math.max(w1, w2);
    if (xDist > maxW * 0.65) return { isMatch: false, minX: 0, maxX: 0, minY: 0, maxY: 0 };

    // Widths should be comparable
    const minW = Math.min(w1, w2);
    if (minW / maxW < 0.35) return { isMatch: false, minX: 0, maxX: 0, minY: 0, maxY: 0 };

    return {
      isMatch: true,
      minX: Math.min(minX1, minX2),
      maxX: Math.max(maxX1, maxX2),
      minY: Math.min(minY1, minY2),
      maxY: Math.max(maxY1, maxY2),
    };
  };

  // Detects whether the user JUST FINISHED drawing an '=' sign in the most recent strokes
  const didJustCompleteEqualSign = (strokeList: { x: number; y: number }[][]): EqualSignBox => {
    const len = strokeList.length;
    if (len < 2) return { found: false, maxX: 0, minX: 0, midY: 0, height: 0, width: 0, strokeIndices: [] };

    const lastIdx = len - 1;
    const sLast = strokeList[lastIdx];
    const candidates = [len - 2, len - 3].filter((idx) => idx >= 0);
    for (const prevIdx of candidates) {
      const sPrev = strokeList[prevIdx];
      const match = isTwoStrokesEqualSign(sPrev, sLast);
      if (match.isMatch) {
        return {
          found: true,
          minX: match.minX,
          maxX: match.maxX,
          midY: (match.minY + match.maxY) / 2,
          height: match.maxY - match.minY,
          width: match.maxX - match.minX,
          strokeIndices: [prevIdx, lastIdx],
        };
      }
    }

    return { found: false, maxX: 0, minX: 0, midY: 0, height: 0, width: 0, strokeIndices: [] };
  };

  // Finds ALL distinct equal signs across the canvas
  const findAllEqualSigns = (strokeList: { x: number; y: number }[][]): EqualSignBox[] => {
    if (strokeList.length < 2) return [];
    const len = strokeList.length;
    const found: EqualSignBox[] = [];
    const usedIndices = new Set<number>();

    for (let i = len - 1; i >= 1; i--) {
      if (usedIndices.has(i)) continue;
      for (let j = i - 1; j >= 0; j--) {
        if (usedIndices.has(j)) continue;
        const match = isTwoStrokesEqualSign(strokeList[j], strokeList[i]);
        if (match.isMatch) {
          const midY = (match.minY + match.maxY) / 2;
          const alreadyFound = found.some(
            (f) => Math.abs(f.midY - midY) < 25 && Math.abs(f.minX - match.minX) < 40
          );
          if (!alreadyFound) {
            found.push({
              found: true,
              minX: match.minX,
              maxX: match.maxX,
              midY,
              height: match.maxY - match.minY,
              width: match.maxX - match.minX,
              strokeIndices: [j, i],
            });
            usedIndices.add(i);
            usedIndices.add(j);
            break;
          }
        }
      }
    }

    return found;
  };

  // Finds the most recent equal sign across the strokes
  const findLatestEqualSignPosition = (strokeList: { x: number; y: number }[][]): EqualSignBox => {
    const all = findAllEqualSigns(strokeList);
    if (all.length === 0) {
      return { found: false, maxX: 0, minX: 0, midY: 0, height: 0, width: 0, strokeIndices: [] };
    }
    return all[0];
  };

  // Extracts strokes belonging to the active equation
  // Guarantees user strokes are NEVER discarded when working on an equation
  const getStrokesForActiveEqual = <T extends { x: number; y: number }>(
    strokeList: T[][],
    equalBox: EqualSignBox,
    allEquals?: EqualSignBox[]
  ): T[][] => {
    if (!equalBox.found) return strokeList;

    const otherEquals = (allEquals || []).filter(
      (eq) => Math.abs(eq.midY - equalBox.midY) > 80 || Math.abs(eq.minX - equalBox.minX) > 90
    );

    // If this is the only equation on the canvas, keep ALL strokes so numbers are never dropped!
    if (otherEquals.length === 0) {
      return strokeList;
    }

    // Generous band height (110px+) preserves tall digits, exponents, and slanted numbers
    const maxLineDist = Math.max(110, equalBox.height * 4.5);

    const rowStrokes = strokeList.filter((st) => {
      if (st.length === 0) return false;
      const minY = Math.min(...st.map((p) => p.y));
      const maxY = Math.max(...st.map((p) => p.y));
      const midY = (minY + maxY) / 2;

      const distToThis = Math.abs(midY - equalBox.midY);
      if (distToThis > maxLineDist) return false;

      // Ensure this stroke is closer to this active equation than any other equation
      for (const other of otherEquals) {
        if (Math.abs(midY - other.midY) < distToThis - 25) {
          return false;
        }
      }

      return true;
    });

    return rowStrokes.length >= 1 ? rowStrokes : strokeList;
  };

  // Counts how many distinct horizontal character clusters exist in the given strokes
  const countHorizontalCharacters = (strokeList: { x: number; y: number }[][]): number => {
    if (strokeList.length === 0) return 0;
    if (strokeList.length === 1) return 1;

    const intervals = strokeList
      .map((st) => {
        const xs = st.map((p) => p.x);
        return { minX: Math.min(...xs), maxX: Math.max(...xs) };
      })
      .sort((a, b) => a.minX - b.minX);

    let mergedCount = 1;
    let currentMax = intervals[0].maxX;

    for (let i = 1; i < intervals.length; i++) {
      // Two distinct digits have a clear horizontal gap between their bounds (at least 6px)
      if (intervals[i].minX > currentMax + 6) {
        mergedCount++;
        currentMax = intervals[i].maxX;
      } else {
        currentMax = Math.max(currentMax, intervals[i].maxX);
      }
    }

    return mergedCount;
  };

  const detectEqualSign = (strokeList: { x: number; y: number }[][]): boolean => {
    return findLatestEqualSignPosition(strokeList).found;
  };

  // Area-based cropping filter:
  // Dynamically computes stroke bounding box, excludes isolated noise points,
  // adds balanced optical padding, upscales small strokes, and renders crisp black strokes on pure white background.
  const generateAreaCroppedHandwritingImage = (
    strokeList: { x: number; y: number; color: string; size: number }[][]
  ): { dataUrl: string; charCount: number; rawW: number; rawH: number; minX: number; maxX: number; minY: number; maxY: number } => {
    if (strokeList.length === 0) {
      return { dataUrl: "", charCount: 0, rawW: 0, rawH: 0, minX: 40, maxX: 200, minY: 60, maxY: 160 };
    }

    // 1. Filter out isolated tiny micro-speckles (accidental taps or screen dust)
    const validStrokes = strokeList.filter((st) => {
      if (st.length === 0) return false;
      if (st.length === 1) return true; // Decimal point or dot
      let len = 0;
      for (let i = 1; i < st.length; i++) {
        const dx = st[i].x - st[i - 1].x;
        const dy = st[i].y - st[i - 1].y;
        len += Math.sqrt(dx * dx + dy * dy);
      }
      return len >= 1.5 || st.length >= 2;
    });

    const activeStrokes = validStrokes.length > 0 ? validStrokes : strokeList;

    // 2. Compute tight bounding box across all active strokes
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    activeStrokes.forEach((st) => {
      st.forEach((p) => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });
    });

    if (minX === Infinity) {
      minX = 40;
      maxX = 200;
      minY = 60;
      maxY = 160;
    }

    const rawW = Math.max(24, maxX - minX);
    const rawH = Math.max(24, maxY - minY);

    // 3. Area-based cropping filter: Add optical padding around the cropped bounding box (at least 28px)
    const padX = Math.max(28, Math.round(rawW * 0.12));
    const padY = Math.max(28, Math.round(rawH * 0.14));

    // 4. Scale factor to ensure high vision resolution for multi-digit handwriting like "113"
    let scale = 1;
    if (rawH < 180) {
      scale = Math.min(3.2, 200 / rawH);
    } else if (rawW > 1200 || rawH > 700) {
      scale = Math.min(1, 800 / Math.max(rawW, rawH));
    }

    const targetW = Math.max(280, Math.round((rawW + padX * 2) * scale));
    const targetH = Math.max(180, Math.round((rawH + padY * 2) * scale));

    const offCanvas = document.createElement("canvas");
    offCanvas.width = targetW;
    offCanvas.height = targetH;
    const offCtx = offCanvas.getContext("2d");

    if (offCtx) {
      // Solid crisp white canvas background
      offCtx.fillStyle = "#ffffff";
      offCtx.fillRect(0, 0, targetW, targetH);

      // Center the cropped strokes within the cropped canvas
      const renderedContentW = rawW * scale;
      const renderedContentH = rawH * scale;
      const offsetX = (targetW - renderedContentW) / 2 - minX * scale;
      const offsetY = (targetH - renderedContentH) / 2 - minY * scale;

      activeStrokes.forEach((stroke) => {
        if (stroke.length < 1) return;
        const baseSize = (stroke[0] as any)?.size || 4;
        const startX = stroke[0].x * scale + offsetX;
        const startY = stroke[0].y * scale + offsetY;

        if (stroke.length === 1) {
          offCtx.beginPath();
          offCtx.fillStyle = "#09090b";
          const radius = Math.max(3.5, (baseSize * scale) / 2);
          offCtx.arc(startX, startY, radius, 0, Math.PI * 2);
          offCtx.fill();
          return;
        }

        offCtx.beginPath();
        offCtx.strokeStyle = "#09090b"; // Pitch black for maximum optical contrast
        offCtx.lineWidth = Math.max(5.0, baseSize * scale);
        offCtx.lineCap = "round";
        offCtx.lineJoin = "round";
        offCtx.moveTo(startX, startY);

        if (stroke.length === 2) {
          offCtx.lineTo(stroke[1].x * scale + offsetX, stroke[1].y * scale + offsetY);
        } else {
          for (let i = 1; i < stroke.length - 1; i++) {
            const p1 = stroke[i];
            const p2 = stroke[i + 1];
            const midX = ((p1.x + p2.x) / 2) * scale + offsetX;
            const midY = ((p1.y + p2.y) / 2) * scale + offsetY;
            offCtx.quadraticCurveTo(p1.x * scale + offsetX, p1.y * scale + offsetY, midX, midY);
          }
          const last = stroke[stroke.length - 1];
          offCtx.lineTo(last.x * scale + offsetX, last.y * scale + offsetY);
        }
        offCtx.stroke();
      });
    }

    // Export as high-clarity PNG to eliminate any JPEG compression artifacts around parallel strokes
    const dataUrl = offCanvas.toDataURL("image/png");
    const charCount = countHorizontalCharacters(activeStrokes);

    return { dataUrl, charCount, rawW, rawH, minX, maxX, minY, maxY };
  };

  // Resize canvas according to container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resize = () => {
      canvas.width = parent.clientWidth;
      const vh = window.innerHeight;
      // Calculate optimal canvas height so the entire handwriting pad stays comfortably within viewport without vertical scrolling
      const available = vh - 290;
      const targetHeight = Math.max(240, Math.min(400, available));
      canvas.height = targetHeight;
      redraw();
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [redraw]);

  // Pointer event handlers (works for stylus, touch, mouse with pressure)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    // When user starts writing or erasing, avoid premature solve, clear stale error, and clear stale floating answer
    if (autoSolveTimerRef.current) {
      clearTimeout(autoSolveTimerRef.current);
      autoSolveTimerRef.current = null;
    }
    // Invalidate any in-flight solve requests so earlier responses cannot overwrite user's latest drawing
    activeSolveRequestIdRef.current = Date.now();
    setErrorMessage(null);
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }

    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setAutoNextCountdown(null);
    if (subMode === "number_trace" && (traceFeedback?.status === "correct" || traceFeedback?.status === "incorrect")) {
      setTraceFeedback({ status: "writing" });
    }
    if (subMode === "quiz") {
      setQuizFeedback(null);
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (autoAnswer && isValidMathAnswer(autoAnswer.text)) {
      const ansLabel = autoAnswer.text.trim();
      const displayLabel = ansLabel.startsWith("=") ? ansLabel : `= ${ansLabel}`;
      const estWidth = displayLabel.length * 12 + 40;
      const pw = estWidth;
      const ph = 38;
      const px = Math.min(canvas.width - pw - 12, Math.max(12, autoAnswer.x));
      const py = Math.min(canvas.height - ph - 12, Math.max(12, autoAnswer.y - ph / 2));
      if (x >= px - 8 && x <= px + pw + 8 && y >= py - 8 && y <= py + ph + 8) {
        handleAdoptAIStrokes();
        return;
      }
      setAutoAnswer(null);
    }

    setIsDrawing(true);

    if (tool === "eraser") {
      if (eraserMode === "box") {
        // Initiate box selection marquee
        const box = { startX: x, startY: y, currentX: x, currentY: y, active: true };
        selectionBoxRef.current = box;
        setSelectionBox(box);
      } else {
        // Brush eraser: rub strokes to erase directly
        eraseAtPoint(x, y);
      }
      return;
    }

    const initialPoint = { x, y, color: penColor, size: penSize };
    setCurrentStroke([initialPoint]);
  };

  const eraseAtPoint = (x: number, y: number) => {
    const eraseRadius = 18;
    setStrokes((prev) => {
      const remaining = prev.filter((st) => !isStrokeNearPoint(st, x, y, eraseRadius));
      if (remaining.length !== prev.length) {
        setUndoHistory((h) => [...h.slice(-15), prev]);
        if (remaining.length === 0) {
          setAutoAnswer(null);
          setActiveResult(null);
          setSolveResult(null);
          setShowExplanation(false);
        }
        return remaining;
      }
      return prev;
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === "eraser") {
      if (eraserMode === "box") {
        if (selectionBoxRef.current && selectionBoxRef.current.active) {
          const updated = { ...selectionBoxRef.current, currentX: x, currentY: y };
          selectionBoxRef.current = updated;
          setSelectionBox(updated);
        }
      } else {
        eraseAtPoint(x, y);
      }
      return;
    }

    setCurrentStroke((prev) => [...prev, { x, y, color: penColor, size: penSize }]);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    setIsDrawing(false);

    if (tool === "eraser") {
      if (eraserMode === "box") {
        const box = selectionBoxRef.current;
        selectionBoxRef.current = null;
        setSelectionBox(null);

        if (box && box.active) {
          const minX = Math.min(box.startX, box.currentX);
          const maxX = Math.max(box.startX, box.currentX);
          const minY = Math.min(box.startY, box.currentY);
          const maxY = Math.max(box.startY, box.currentY);
          const width = maxX - minX;
          const height = maxY - minY;

          let remainingStrokes: { x: number; y: number; color: string; size: number }[][];

          // If box is tiny (just a single click/tap), erase the single stroke under the tap
          if (width <= 6 && height <= 6) {
            remainingStrokes = strokes.filter((st) => !isStrokeNearPoint(st, box.startX, box.startY, 16));
          } else {
            // Marquee box selection: erase every stroke inside or crossing the box instantly!
            remainingStrokes = strokes.filter((st) => !isStrokeInBox(st, minX, maxX, minY, maxY));
          }

          if (remainingStrokes.length !== strokes.length) {
            setUndoHistory((prev) => [...prev.slice(-15), strokes]);
            setStrokes(remainingStrokes);

            if (remainingStrokes.length === 0) {
              setAutoAnswer(null);
              setActiveResult(null);
              setSolveResult(null);
              setShowExplanation(false);
            } else if (solvingMode === "learn_ai") {
              if (autoSolveTimerRef.current) {
                clearTimeout(autoSolveTimerRef.current);
              }
              const justEq = didJustCompleteEqualSign(remainingStrokes);
              if (justEq.found) {
                autoSolveTimerRef.current = setTimeout(() => {
                  executeHandwritingSolve({ isAuto: true, strokeList: remainingStrokes, activeEqualBox: justEq });
                }, 400);
              }
            }
          }
        }
      }
      return;
    }

    if (currentStroke.length > 0) {
      setUndoHistory((prev) => [...prev.slice(-15), strokes]);
      const newStrokes = [...strokes, currentStroke];
      setStrokes(newStrokes);
      setCurrentStroke([]);

      if (autoSolveTimerRef.current) {
        clearTimeout(autoSolveTimerRef.current);
      }

      // Mode-specific handling:
      if (subMode === "number_trace") {
        if (newStrokes.length >= 1) {
          const debounceMs = targetNumber >= 10 ? 1800 : 950;
          setTraceFeedback({ status: "checking", message: `Checking number ${targetNumber}...` });
          autoSolveTimerRef.current = setTimeout(() => {
            executeHandwritingSolve({ isAuto: true, strokeList: newStrokes });
          }, debounceMs);
        }
      } else if (subMode === "quiz") {
        if (newStrokes.length >= 1) {
          // 1800ms debounce gives comfortable time for multi-digit numbers
          autoSolveTimerRef.current = setTimeout(() => {
            setQuizFeedback({ status: "checking", message: "Checking your answer..." });
            executeHandwritingSolve({ isAuto: true, strokeList: newStrokes });
          }, 1800);
        }
      } else {
        // Main Math Scratchpad mode
        // 1. Equal sign check: the universal, deliberate handwritten trigger to solve an equation!
        const justEqual = didJustCompleteEqualSign(newStrokes);

        if (justEqual.found) {
          // When the student draws '=' (e.g. 5 + 3 = or 12 * 4 =), wait 400ms for pen lift, then solve cleanly!
          autoSolveTimerRef.current = setTimeout(() => {
            executeHandwritingSolve({ isAuto: true, strokeList: newStrokes, activeEqualBox: justEqual });
          }, 400);
        } else if (solvingMode === "learn_ai" && newStrokes.length >= 2) {
          // In Auto-Calculate mode without '=' sign:
          // Wait 2200ms of complete inactivity (so writing multi-digit numbers or fractions is never interrupted)
          autoSolveTimerRef.current = setTimeout(() => {
            const local = recognizeStrokesLocally(newStrokes);
            // ONLY execute if strokes form a complete, valid mathematical expression needing calculation
            // (never on incomplete trailing operators like "1 +" or isolated standalone digits)
            if (
              local &&
              local.expression &&
              isCompleteMathExpression(local.expression) &&
              hasOperandsToCalculate(local.expression) &&
              isValidMathAnswer(local.answer)
            ) {
              executeHandwritingSolve({ isAuto: true, strokeList: newStrokes });
            }
          }, 2200);
        }
        // In "manual" mode: no auto calculation timer. The user writes freely without interruption,
        // and clicks "Calculate (=)" whenever they wish to solve.
      }
    }
  };

  const handleClearCanvas = () => {
    if (autoSolveTimerRef.current) {
      clearTimeout(autoSolveTimerRef.current);
    }
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setAutoNextCountdown(null);
    setTraceFeedback(null);
    setQuizFeedback(null);
    if (strokes.length > 0) {
      setUndoHistory((prev) => [...prev.slice(-15), strokes]);
    }
    setStrokes([]);
    setCurrentStroke([]);
    setSelectionBox(null);
    selectionBoxRef.current = null;
    setAutoAnswer(null);
    setActiveResult(null);
    setSolveResult(null);
    setShowExplanation(false);
    setErrorMessage(null);
  };

  const handleUndo = () => {
    if (autoSolveTimerRef.current) {
      clearTimeout(autoSolveTimerRef.current);
    }
    if (undoHistory.length > 0) {
      const prevStrokes = undoHistory[undoHistory.length - 1];
      setUndoHistory((prev) => prev.slice(0, -1));
      setStrokes(prevStrokes);
      if (prevStrokes.length === 0) {
        setAutoAnswer(null);
        setActiveResult(null);
        setSolveResult(null);
        setShowExplanation(false);
      } else {
        autoSolveTimerRef.current = setTimeout(() => {
          executeHandwritingSolve({ isAuto: true, strokeList: prevStrokes });
        }, 350);
      }
    } else {
      setStrokes((prev) => {
        const next = prev.slice(0, -1);
        if (next.length === 0) {
          setAutoAnswer(null);
          setActiveResult(null);
          setSolveResult(null);
          setShowExplanation(false);
        }
        return next;
      });
    }
  };

  // Trigger AI handwriting recognition & solver
  const executeHandwritingSolve = async (options?: {
    isAuto?: boolean;
    showExpOnComplete?: boolean;
    strokeList?: { x: number; y: number; color: string; size: number }[][];
    activeEqualBox?: EqualSignBox;
  }) => {
    // Clear pending auto timers to prevent race conditions
    if (autoSolveTimerRef.current) {
      clearTimeout(autoSolveTimerRef.current);
      autoSolveTimerRef.current = null;
    }

    const currentRequestId = ++activeSolveRequestIdRef.current;

    const canvas = canvasRef.current;
    const currentStrokes = options?.strokeList || strokes;
    if (!canvas || currentStrokes.length === 0) {
      if (!options?.isAuto) {
        setErrorMessage("Please write a number or equation on the canvas first!");
      }
      return;
    }

    if (options?.isAuto) {
      lastAutoSolveTimestampRef.current = Date.now();
      setAutoCalculating(true);
    } else {
      setIsAnalyzing(true);
    }
    setErrorMessage(null);

    // Abort previous in-flight request to save quota and network bandwidth
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }
    const controller = new AbortController();
    activeAbortControllerRef.current = controller;

    // In Kids Number Writing mode: check for stroke diversion before server call
    if (subMode === "number_trace") {
      const deviation = evaluateNumberStrokeDeviation(
        currentStrokes,
        targetNumber,
        canvas.width,
        canvas.height
      );

      if (deviation.isDivertedTooMuch) {
        setIsAnalyzing(false);
        setAutoCalculating(false);
        setConsecutiveSolves(0);
        setTraceFeedback({
          status: "incorrect",
          message:
            deviation.reason ||
            `Line diverted too far from number ${targetNumber}! Keep strokes closer to the guideline.`,
          writtenNumber: "Diverted line",
          divergenceReason:
            deviation.reason || "Line strayed too far from the number guideline",
        });
        return;
      }
    }

    const targetStrokes = currentStrokes;
    const equalBox = options?.activeEqualBox || findLatestEqualSignPosition(targetStrokes);
    let minX = 0;
    let maxX = canvas.width;
    let minY = 0;
    let maxY = canvas.height;
    let localResult: ReturnType<typeof recognizeStrokesLocally> = null;

    try {
      // Retain ALL user strokes and pass through area-based cropping filter
      const cropped = generateAreaCroppedHandwritingImage(targetStrokes);
      minX = cropped.minX;
      maxX = cropped.maxX;
      minY = cropped.minY;
      maxY = cropped.maxY;

      // Instant client-side stroke recognition: provides instant feedback and ensures the calculated result
      // appears immediately even if network or cloud models are overloaded or experiencing rate limits!
      localResult = recognizeStrokesLocally(targetStrokes);
      let optimisticCandidateExpr = "";

      if (localResult && localResult.expression) {
        optimisticCandidateExpr = localResult.expression;
        const isComplete = isCompleteMathExpression(localResult.expression);
        const shouldShowCanvasBadge = equalBox.found || localResult.hasEqual || !options?.isAuto;
        if (isValidMathAnswer(localResult.answer) && isComplete) {
          setActiveResult({
            text: localResult.answer,
            fullEquation: localResult.fullEquation,
            expression: localResult.expression,
          });

          if (shouldShowCanvasBadge) {
            setAutoAnswer({
              text: localResult.answer,
              fullEquation: localResult.fullEquation,
              hasEqual: localResult.hasEqual || equalBox.found,
              x: Math.min(canvas.width - 90, maxX + 24),
              y: (minY + maxY) / 2,
            });
          }
        }
      }

      const currentQuestion = subMode === "quiz" ? quizQuestions[currentQuizIndex]?.question : undefined;

      const strokesBeforeEqual =
        equalBox.found && equalBox.strokeIndices.length > 0
          ? targetStrokes.filter((_, idx) => !equalBox.strokeIndices.includes(idx))
          : targetStrokes;
      const charCountBeforeEqual = equalBox.found
        ? (countHorizontalCharacters(strokesBeforeEqual) || cropped.charCount)
        : cropped.charCount;

      const response = await fetch("/api/ai/handwriting-solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          imageBase64: cropped.dataUrl,
          gradeLevel,
          mode: subMode === "number_trace" ? "number_writing" : subMode === "quiz" ? "quiz" : "math",
          charCountBeforeEqual,
          hasEqual: equalBox.found,
          candidateExpression: optimisticCandidateExpr || activeResult?.expression || "",
          targetPrompt:
            subMode === "number_trace"
              ? `Write the number ${targetNumber}`
              : subMode === "quiz"
              ? quizQuestions[currentQuizIndex]?.question || ""
              : currentQuestion || "",
          expectedAnswer:
            subMode === "quiz" ? quizQuestions[currentQuizIndex]?.targetAnswer || "" : "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.details || errorData?.error || "Handwriting recognition service is temporarily busy. Please try again.");
      }

      const data: HandwrittenSolveResponse = await response.json();

      // If the user has started drawing new strokes since this request began, ignore this stale response!
      if (activeSolveRequestIdRef.current !== currentRequestId) {
        return;
      }

      let rightMidY = (minY + maxY) / 2;
      const hasEqual = equalBox.found || (data.recognizedExpression && data.recognizedExpression.includes("="));

      // Normalize superscripts & variable zero combinations in client data
      if (data.recognizedExpression) {
        data.recognizedExpression = data.recognizedExpression
          .replace(/⁰/g, "^0")
          .replace(/¹/g, "^1")
          .replace(/²/g, "^2")
          .replace(/³/g, "^3")
          .replace(/([a-zA-Z0-9)])\s*°/g, "$1^0")
          .replace(/\b([a-zA-Z])\s*0(?=\s*([=+\-*/×÷()^]|$|\?))/g, "$1^0")
          .replace(/\b([a-zA-Z])\s*0\b/g, "$1^0");
      }
      if (data.englishTransliteration) {
        data.englishTransliteration = data.englishTransliteration
          .replace(/⁰/g, "^0")
          .replace(/¹/g, "^1")
          .replace(/²/g, "^2")
          .replace(/³/g, "^3")
          .replace(/([a-zA-Z0-9)])\s*°/g, "$1^0")
          .replace(/\b([a-zA-Z])\s*0(?=\s*([=+\-*/×÷()^]|$|\?))/g, "$1^0")
          .replace(/\b([a-zA-Z])\s*0\b/g, "$1^0");
      }

      // 1. Check exact mathematical evaluation first (test full equation first, e.g. 2x + 4 = 10, then LHS)
      const rawExpr = (data.recognizedExpression || data.englishTransliteration || "").trim();
      let exprBase = rawExpr;
      if (exprBase.includes("=") && !/[a-zA-Z]/.test(exprBase)) {
        exprBase = exprBase.split("=")[0].trim();
      }
      const quick = evaluateBasicMath(rawExpr) || evaluateBasicMath(exprBase);
      let resolvedAnswer = data.answer || "";

      if (quick && isValidMathAnswer(quick.answer)) {
        // Enforce 100% mathematically verified correct result for standard order of operations
        resolvedAnswer = quick.answer;
        data.answer = quick.answer;
        data.fullEquation = quick.fullEquation;
        data.recognizedExpression = quick.expression || rawExpr;
        data.englishTransliteration = quick.englishTransliteration || rawExpr;
        if (quick.appliedRule) data.appliedRule = quick.appliedRule;
        if (quick.shortExplanation) data.shortExplanation = quick.shortExplanation;
        if (quick.steps && quick.steps.length > 0) data.steps = quick.steps;
      }

      data.detectedLanguage = "English";
      if (!data.englishTransliteration) {
        data.englishTransliteration = data.recognizedExpression || "";
      }

      if (!data.detectedLanguage && quick?.detectedLanguage) {
        data.detectedLanguage = quick.detectedLanguage;
      }
      if (quick?.englishTransliteration) {
        data.englishTransliteration = quick.englishTransliteration;
      }

      if (quick && (!data.appliedRule || data.appliedRule === "Arithmetic Operation")) {
        data.appliedRule = quick.appliedRule;
      }
      if (quick && (!data.steps || data.steps.length === 0)) {
        data.steps = quick.steps;
      }

      // Clean resolvedAnswer:
      let cleanResolved = resolvedAnswer.replace(/^[=\s:]+/, "").replace(/[=\s:]+$/, "").trim();
      if (cleanResolved.includes("=") && !/^[a-zA-Z]\s*=/.test(cleanResolved)) {
        const parts = cleanResolved.split("=");
        cleanResolved = parts[parts.length - 1].trim();
      }

      // Answer placement strictly to the right of handwritten equation
      const rightmostX = Math.max(maxX, equalBox.found ? equalBox.maxX : maxX);
      let finalX = rightmostX + 24;
      let finalY = equalBox.found ? equalBox.midY : rightMidY;

      // Wrap below if overflowing off canvas right side
      if (finalX + 60 > canvas.width) {
        finalX = Math.max(24, minX);
        finalY = Math.min(canvas.height - 30, maxY + 36);
      }

      if (isValidMathAnswer(cleanResolved)) {
        setErrorMessage(null);
        data.answer = cleanResolved;

        let fullEq = (data.fullEquation || "").trim();
        const cleanExpr = exprBase || (data.recognizedExpression || data.englishTransliteration || "").trim().replace(/[=\s]+$/, "");

        // Guarantee that fullEquation always contains the user's expression on the left
        // e.g. "x^0 = 1", "e^0 = 1", "3 + 3 = 6", never just bare "1" or "1 = 1"
        if (
          !fullEq ||
          !fullEq.includes("=") ||
          fullEq.toLowerCase().includes("equality") ||
          fullEq === cleanResolved ||
          (cleanExpr && !fullEq.includes(cleanExpr))
        ) {
          fullEq = cleanExpr ? `${cleanExpr} = ${cleanResolved}` : cleanResolved;
        }
        data.fullEquation = fullEq;

        const shouldShowCanvasBadge = !!hasEqual || equalBox.found || !options?.isAuto;

        if (shouldShowCanvasBadge) {
          setAutoAnswer({
            text: cleanResolved,
            fullEquation: fullEq,
            hasEqual: !!hasEqual,
            x: finalX,
            y: finalY,
          });
        }

        // Set single focused active result for current canvas calculation
        setActiveResult({
          text: cleanResolved,
          fullEquation: fullEq,
          expression: cleanExpr || data.recognizedExpression || "",
        });

        setSolveResult({ ...data });
      } else if (localResult && isValidMathAnswer(localResult.answer)) {
        // AI response was unpopulated or rate-limited, but client stroke engine recognized the math!
        setErrorMessage(null);
        const fallbackAns = localResult.answer;
        const fallbackFull = localResult.fullEquation;
        const shouldShowCanvasBadge = !!hasEqual || equalBox.found || !options?.isAuto;
        if (shouldShowCanvasBadge) {
          setAutoAnswer({
            text: fallbackAns,
            fullEquation: fallbackFull,
            hasEqual: localResult.hasEqual || equalBox.found,
            x: finalX,
            y: finalY,
          });
        }
        setActiveResult({
          text: fallbackAns,
          fullEquation: fallbackFull,
          expression: localResult.expression,
        });
        setSolveResult({
          recognizedExpression: localResult.expression,
          answer: fallbackAns,
          fullEquation: fallbackFull,
          appliedRule: "Basic Arithmetic & Numeral Evaluation",
          steps: [`Recognized handwritten strokes: ${localResult.expression}`, `Calculated value: ${fallbackAns}`],
          isCorrect: true,
          shortExplanation: `Evaluated ${fallbackFull}.`,
          encouragement: "Great job! Keep practicing!",
        });
      } else if (data.recognizedExpression && data.recognizedExpression !== "Handwritten input") {
        // Detected characters, variables, or expressions
        setErrorMessage(null);
        const exprAns = data.answer || data.recognizedExpression;
        const shouldShowCanvasBadge = !!hasEqual || equalBox.found || !options?.isAuto;
        if (shouldShowCanvasBadge) {
          setAutoAnswer({
            text: exprAns,
            fullEquation: data.fullEquation || data.recognizedExpression,
            hasEqual: !!hasEqual,
            x: finalX,
            y: finalY,
          });
        }
        setActiveResult({
          text: exprAns,
          fullEquation: data.fullEquation || data.recognizedExpression,
          expression: data.recognizedExpression,
        });
        setSolveResult({
          ...data,
          answer: exprAns,
          fullEquation: data.fullEquation || data.recognizedExpression,
        });
      } else if (localResult && (isValidMathAnswer(localResult.answer) || localResult.expression)) {
        // Local recognition already provided expression and answer; preserve it
        setErrorMessage(null);
      } else if (activeResult && (isValidMathAnswer(activeResult.text) || activeResult.expression)) {
        // Active result is already visible on canvas; preserve it
        setErrorMessage(null);
      } else {
        setSolveResult({ ...data });
        setAutoAnswer(null);
        setActiveResult(null);
        if (!isValidMathAnswer(data.answer)) {
          data.answer = "";
        }
        if (!options?.isAuto) {
          setErrorMessage(
            data.recognizedExpression && data.recognizedExpression !== "Handwritten input"
              ? `Recognized: "${data.recognizedExpression}". Write an equation or expression to calculate.`
              : "Could not calculate a result for this input. Please make sure digits, letters, or symbols are clearly drawn."
          );
          if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
          errorTimeoutRef.current = setTimeout(() => setErrorMessage(null), 4500);
        }
      }

      if (options?.showExpOnComplete) {
        setShowExplanation(true);
      }

      // Increment practice count smoothly without disruptive modal popups
      onIncrementPractice();

      if (subMode === "number_trace") {
        const targetStr = targetNumber.toString();
        const detectedStr =
          data.detectedNumber !== undefined && data.detectedNumber !== null
            ? data.detectedNumber.toString()
            : (data.answer ? data.answer.trim() : "");
        const cleanExpr = (data.recognizedExpression || "").replace(/[^\d]/g, "");

        // Only exact match or recognized target number is accepted
        const isMatched =
          (data.isCorrect === true && (detectedStr === targetStr || cleanExpr === targetStr)) ||
          detectedStr === targetStr ||
          cleanExpr === targetStr;

        if (isMatched) {
          const kidsNumberMotivations = [
            "Superstar!",
            "Great Job!",
            "Well Done!",
            "Champion!",
            "Awesome!",
            "Brilliant!",
            "High Five!",
          ];
          const motivation = kidsNumberMotivations[Math.floor(Math.random() * kidsNumberMotivations.length)];

          setConsecutiveSolves((prev) => prev + 1);
          triggerCelebrationShower({ intensity: "normal" });
          setTraceFeedback({
            status: "correct",
            message: `Correct! Well done!`,
            writtenNumber: targetNumber,
            motivation,
          });

          // Start 4-second automatic countdown for next number so child can enjoy the praise
          if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

          let currentSeconds = 4;
          setAutoNextCountdown(currentSeconds);

          countdownIntervalRef.current = setInterval(() => {
            currentSeconds -= 1;
            if (currentSeconds <= 0) {
              if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
              setAutoNextCountdown(null);
              // Auto advance
              setTraceFeedback(null);
              handleClearCanvas();
              setTargetNumber((prev) => getNextTargetNumber(prev, traceProgression));
            } else {
              setAutoNextCountdown(currentSeconds);
            }
          }, 1000);
        } else {
          setConsecutiveSolves(0);
          setTraceFeedback({
            status: "incorrect",
            message: detectedStr
              ? `Recognized: "${detectedStr}" (Target: ${targetNumber}). Try tracing along the dotted lines!`
              : `Could not recognize number ${targetNumber}. Line may be unclear or diverted. Try again!`,
            writtenNumber: detectedStr || "Not recognized",
          });
        }
      }

      if (subMode === "quiz") {
        const currentQ = quizQuestions[currentQuizIndex];
        if (currentQ) {
          const clientMatched = checkQuizAnswerMatch(
            data.recognizedExpression || data.englishTransliteration || "",
            data.answer || (data.detectedNumber !== undefined && data.detectedNumber !== null ? String(data.detectedNumber) : ""),
            currentQ.targetAnswer,
            data.fullEquation,
            data.detectedNumber
          );

          const isMatched = data.isCorrect === true || clientMatched;

          if (isMatched) {
            setConsecutiveSolves((prev) => prev + 1);
            setQuizScore((prev) => ({ correct: prev.correct + 1, totalAnswered: prev.totalAnswered + 1 }));
            setQuizResults((prev) => ({ ...prev, [currentQuizIndex]: "correct" }));
            triggerCelebrationShower({ intensity: "normal" });
            playCelebrationChime();
            setQuizFeedback({
              status: "correct",
              userAnswer: data.answer || (data.detectedNumber !== undefined && data.detectedNumber !== null ? String(data.detectedNumber) : data.recognizedExpression) || currentQ.targetAnswer,
              targetAnswer: currentQ.targetAnswer,
              message: "Correct! Well done!",
              explanation: currentQ.explanation,
            });
          } else {
            setConsecutiveSolves(0);
            setQuizScore((prev) => ({ ...prev, totalAnswered: prev.totalAnswered + 1 }));
            setQuizResults((prev) => ({ ...prev, [currentQuizIndex]: "incorrect" }));
            playWrongSound();
            const recognized = (data.answer || (data.detectedNumber !== undefined && data.detectedNumber !== null ? String(data.detectedNumber) : data.recognizedExpression) || "").trim() || "Unclear strokes";
            setQuizFeedback({
              status: "incorrect",
              userAnswer: recognized,
              targetAnswer: currentQ.targetAnswer,
              message: `Incorrect! You wrote: "${recognized}". Try again!`,
              explanation: currentQ.explanation,
            });
          }
        }
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return;
      }
      if (activeSolveRequestIdRef.current !== currentRequestId) {
        return;
      }
      // If client-side recognition already detected and calculated the math, preserve it and skip error!
      if (localResult && isValidMathAnswer(localResult.answer)) {
        setErrorMessage(null);
        setActiveResult({
          text: localResult.answer,
          fullEquation: localResult.fullEquation,
          expression: localResult.expression,
        });
        setAutoAnswer({
          text: localResult.answer,
          fullEquation: localResult.fullEquation,
          hasEqual: localResult.hasEqual || equalBox.found,
          x: Math.min(canvas.width - 90, maxX + 24),
          y: (minY + maxY) / 2,
        });
        setSolveResult({
          recognizedExpression: localResult.expression,
          answer: localResult.answer,
          fullEquation: localResult.fullEquation,
          appliedRule: "Basic Arithmetic & Numeral Evaluation",
          steps: [`Recognized handwritten input: ${localResult.expression}`, `Calculated value: ${localResult.answer}`],
          isCorrect: true,
          shortExplanation: `Evaluated ${localResult.fullEquation}.`,
          encouragement: "Great job! Keep practicing!",
        });
        return;
      }
      if (!options?.isAuto) {
        const rawMsg = err?.message || "";
        const isDemand =
          rawMsg.includes("503") ||
          rawMsg.includes("429") ||
          rawMsg.includes("quota") ||
          rawMsg.includes("high demand") ||
          rawMsg.includes("UNAVAILABLE");
        setErrorMessage(
          isDemand
            ? "Handwriting service is momentarily busy. Your strokes have been recorded; please tap Check Answer again."
            : (rawMsg || "Failed to analyze handwriting. Please try again.")
        );
        if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = setTimeout(() => setErrorMessage(null), 4500);
      }
    } finally {
      if (activeSolveRequestIdRef.current === currentRequestId) {
        setIsAnalyzing(false);
        setAutoCalculating(false);
      }
    }
  };

  const handleExplanationClick = async () => {
    if (showExplanation) {
      setShowExplanation(false);
      return;
    }

    if (solveResult) {
      setShowExplanation(true);
      return;
    }

    await executeHandwritingSolve({ isAuto: false, showExpOnComplete: true });
  };

  const handleAdoptAIStrokes = () => {
    if (!autoAnswer || !isValidMathAnswer(autoAnswer.text)) return;
    const raw = autoAnswer.text.trim();
    let textToWrite = raw;
    if (autoAnswer.hasEqual) {
      textToWrite = raw.replace(/^=\s*/, "").trim();
    } else {
      textToWrite = raw.startsWith("=") ? raw : `= ${raw}`;
    }

    const newStrokes = convertTextToHandwritingStrokes(
      textToWrite,
      autoAnswer.x,
      autoAnswer.y,
      penColor,
      penSize,
      0.65
    );
    if (newStrokes.length > 0) {
      setUndoHistory((prev) => [...prev.slice(-15), strokes]);
      setStrokes((prev) => [...prev, ...newStrokes]);
      setAutoAnswer(null);
    }
  };

  const handleNextQuizQuestion = () => {
    handleClearCanvas();
    setShowHint(false);
    setQuizFeedback(null);
    if (currentQuizIndex < quizQuestions.length - 1) {
      setCurrentQuizIndex((prev) => prev + 1);
    } else {
      setCurrentQuizIndex(0);
    }
  };

  const handleSelectQuizQuestion = (index: number) => {
    handleClearCanvas();
    setShowHint(false);
    setQuizFeedback(null);
    setCurrentQuizIndex(index);
  };

  const handleRestartQuiz = () => {
    handleClearCanvas();
    setShowHint(false);
    setQuizFeedback(null);
    setQuizResults({});
    setQuizScore({ correct: 0, totalAnswered: 0 });
    setCurrentQuizIndex(0);
  };

  const handleRetryQuizQuestion = () => {
    handleClearCanvas();
    setQuizFeedback(null);
  };

  const handleNextNumber = () => {
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setAutoNextCountdown(null);
    setTraceFeedback(null);
    handleClearCanvas();
    setTargetNumber((prev) => getNextTargetNumber(prev, traceProgression));
  };

  const handleRetryCurrentNumber = () => {
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setAutoNextCountdown(null);
    setTraceFeedback(null);
    handleClearCanvas();
  };

  const activeQuestion = quizQuestions[currentQuizIndex];

  return (
    <div className="max-w-5xl mx-auto space-y-2">
      {/* Top Controls Bar: Grade Selector, Practice Mode Dropdown, AI Learn & Order of Operations */}
      <div className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 flex-wrap">
          {/* Left Group: Grade Level & Practice Mode Dropdown */}
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            {/* Grade Level Selector */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide shrink-0">
                Grade:
              </span>
              <div className="relative inline-block">
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value as GradeLevel)}
                  className="appearance-none text-xs sm:text-sm font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-2.5 pr-7 py-1.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Kindergarten">Kindergarten (Ages 4-6)</option>
                  <option value="Elementary (1st - 3rd)">Elementary (1st - 3rd)</option>
                  <option value="Middle School (4th - 8th)">Middle School (4th - 8th)</option>
                  <option value="High School (9th - 12th)">High School (9th - 12th)</option>
                  <option value="College / Graduate">College & Graduate (STEM)</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
              </div>
            </div>

            {/* Practice Mode Dropdown (consolidating similar sub-mode categories) */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide shrink-0">
                Mode:
              </span>
              <div className="relative inline-block">
                <select
                  value={subMode}
                  onChange={(e) => {
                    setSubMode(e.target.value as PracticeSubMode);
                    setSolveResult(null);
                  }}
                  className="appearance-none text-xs sm:text-sm font-bold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-700/80 rounded-xl pl-2.5 pr-7 py-1.5 text-indigo-700 dark:text-indigo-300 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
                >
                  <option value="scratchpad">📐 Free Math Solver</option>
                  <option value="number_trace">✍️ Write Numbers Practice</option>
                  <option value="drag_arrange">🎮 Arrange Numbers Game</option>
                  <option value="quiz">❓ Quiz & Step Practice</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>

          {/* Right Group: AI Learn Mode & Order Convention */}
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            {/* Learn with AI vs Manual Mode Dropdown */}
            <div className="relative inline-block">
              <select
                value={solvingMode}
                onChange={(e) => {
                  const mode = e.target.value as "learn_ai" | "manual";
                  setSolvingMode(mode);
                  if (mode === "manual") {
                    setAutoAnswer(null);
                  }
                }}
                className={`appearance-none pl-2.5 pr-7 py-1.5 rounded-xl text-xs sm:text-sm font-bold border-2 transition-all cursor-pointer focus:outline-hidden ${
                  solvingMode === "learn_ai"
                    ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500/50 text-indigo-700 dark:text-indigo-300 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                <option value="learn_ai">⚡ Auto-Calculate (Draw = to solve)</option>
                <option value="manual">✍️ Manual (Click Calculate)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-600 dark:text-indigo-400" />
            </div>

            {/* Default BODMAS Convention Badge */}
            <div
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300"
              title="Standard calculation rule: B (Brackets) → O (Orders) → D (Division) → M (Multiplication) → A (Addition) → S (Subtraction)"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
              <span>BODMAS (Default)</span>
            </div>
          </div>
        </div>

        {/* Prompt Header based on mode */}
        {subMode === "number_trace" && (
          <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-emerald-500/10 border border-amber-500/25 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-xl flex items-center justify-center shadow-sm">
                {targetNumber}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-amber-950 dark:text-amber-200">
                    Write Number: <span className="underline decoration-amber-500">{targetNumber}</span>
                  </h4>
                  {consecutiveSolves > 0 && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span>{consecutiveSolves} Streak</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/90 font-medium">
                  Write number {targetNumber} on the canvas. It will be checked automatically!
                </p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              {/* Target Number Category Dropdown (consolidates 0-9 and 2-Digit Challenges) */}
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase shrink-0">
                  Number:
                </span>
                <div className="relative inline-block">
                  <select
                    value={targetNumber}
                    onChange={(e) => {
                      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
                      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                      setAutoNextCountdown(null);
                      setTraceFeedback(null);
                      setTargetNumber(Number(e.target.value));
                      handleClearCanvas();
                    }}
                    className="appearance-none text-xs font-bold bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700/60 rounded-lg pl-2.5 pr-7 py-1 text-slate-800 dark:text-slate-200 shadow-2xs cursor-pointer"
                  >
                    <optgroup label="Single Digits (0 - 9)">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <option key={num} value={num}>
                          Digit {num}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="2-Digit Challenges">
                      {[10, 12, 15, 20, 25, 50, 99].map((num) => (
                        <option key={num} value={num}>
                          Challenge {num}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                </div>
              </div>

              {/* Progression Mode Selector */}
              <div className="relative inline-block">
                <select
                  value={traceProgression}
                  onChange={(e) => {
                    const newProg = e.target.value as TraceProgressionMode;
                    setTraceProgression(newProg);
                    if (newProg === "random") {
                      setTargetNumber((prev) => getNextTargetNumber(prev, "random"));
                      setTraceFeedback(null);
                      handleClearCanvas();
                    }
                  }}
                  className="appearance-none text-xs font-bold bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700/60 rounded-lg pl-2.5 pr-7 py-1 text-slate-800 dark:text-slate-200 shadow-2xs cursor-pointer"
                  title="Writing sequence"
                >
                  <option value="progressive">🌟 Progressive</option>
                  <option value="single_only">🔢 0 - 9 Only</option>
                  <option value="two_digit_only">🚀 10 - 99 Only</option>
                  <option value="random">🎲 Random Mix</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
              </div>

              <button
                type="button"
                onClick={handleNextNumber}
                className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {subMode === "quiz" && activeQuestion && (
          <div
            className={`p-3 sm:p-4 rounded-2xl border transition-all duration-300 flex flex-col gap-3 shadow-xs ${
              quizFeedback?.status === "correct"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700"
                : quizFeedback?.status === "incorrect"
                ? "bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700"
                : "bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/50"
            }`}
          >
            {/* Top Row: Score Counters + Question Navigator */}
            <div className="flex items-center justify-between flex-wrap gap-2.5 border-b border-indigo-100 dark:border-indigo-900/50 pb-2.5">
              {/* Score Badges: Correct, Not Correct, Remaining */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mr-1">
                  Quiz Score:
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-xs font-bold border border-emerald-300/60 dark:border-emerald-700">
                  <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600 dark:text-emerald-400" />
                  <span>Correct: {correctCount}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 text-xs font-bold border border-rose-300/60 dark:border-rose-700">
                  <X className="w-3.5 h-3.5 stroke-[3] text-rose-600 dark:text-rose-400" />
                  <span>Not Correct: {incorrectCount}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-xs font-bold border border-amber-300/60 dark:border-amber-700">
                  <Clock className="w-3.5 h-3.5 stroke-[2.5] text-amber-600 dark:text-amber-400" />
                  <span>Remaining: {remainingCount}</span>
                </span>
              </div>

              {/* Question Stepper Buttons (Q1, Q2, Q3, etc.) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1 hidden sm:inline">
                  Questions:
                </span>
                {quizQuestions.map((q, idx) => {
                  const result = quizResults[idx];
                  const isCurrent = idx === currentQuizIndex;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => handleSelectQuizQuestion(idx)}
                      className={`relative px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        isCurrent
                          ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400 dark:ring-indigo-300"
                          : result === "correct"
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : result === "incorrect"
                          ? "bg-rose-600 text-white hover:bg-rose-700"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                      title={`Go to Question ${idx + 1}`}
                    >
                      <span>Q{idx + 1}</span>
                      {result === "correct" && <Check className="w-3 h-3 stroke-[3]" />}
                      {result === "incorrect" && <X className="w-3 h-3 stroke-[3]" />}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={handleRestartQuiz}
                  className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 ml-1 cursor-pointer flex items-center gap-1"
                  title="Restart Quiz"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              </div>
            </div>

            {/* Bottom Row: Question Prompt & Action Buttons */}
            <div className="flex items-center justify-between flex-wrap gap-2.5">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 flex-wrap gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500 text-white uppercase tracking-wide">
                    Question {currentQuizIndex + 1} of {quizQuestions.length}
                  </span>

                  {/* Real-time Status Badge */}
                  {quizFeedback?.status === "correct" && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-xs shadow-xs animate-in zoom-in-75">
                      <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                      <span>Correct! (✓)</span>
                    </span>
                  )}
                  {quizFeedback?.status === "incorrect" && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-extrabold text-xs shadow-xs animate-in zoom-in-75">
                      <X className="w-3.5 h-3.5 stroke-[3.5]" />
                      <span>Incorrect! (✗)</span>
                    </span>
                  )}
                  {quizFeedback?.status === "checking" && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-bold text-xs shadow-xs animate-in zoom-in-75">
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Checking Answer...</span>
                    </span>
                  )}

                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    {activeQuestion.question}
                  </h4>
                </div>

                {quizFeedback?.status === "correct" && (
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Your Answer: <strong className="underline">{quizFeedback.userAnswer}</strong> — Correct! Great job!</span>
                  </p>
                )}
                {quizFeedback?.status === "incorrect" && (
                  <p className="text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                    <X className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Your Answer: <strong className="line-through">{quizFeedback.userAnswer}</strong> (Incorrect) — Write the answer on the pad or try again!</span>
                  </p>
                )}
                {showHint && (
                  <p className="text-xs text-amber-700 dark:text-amber-300 italic pt-0.5 flex items-center gap-1">
                    <span>💡 Hint: {activeQuestion.hint}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {/* Instant Check Answer Button */}
                <button
                  type="button"
                  onClick={() => executeHandwritingSolve({ isAuto: false, showExpOnComplete: false })}
                  disabled={isAnalyzing || strokes.length === 0}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                  title="Check handwritten answer immediately"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Check Answer</span>
                </button>

                {quizFeedback?.status === "incorrect" && (
                  <button
                    type="button"
                    onClick={handleRetryQuizQuestion}
                    className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowHint(!showHint)}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span>{showHint ? "Hide Hint" : "Hint"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextQuizQuestion}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all ${
                    quizFeedback?.status === "correct"
                      ? "bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300 dark:ring-emerald-700"
                      : "bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600"
                  }`}
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {subMode === "drag_arrange" ? (
        <NumberArrangeGame
          darkMode={darkMode}
          onIncrementPractice={onIncrementPractice}
          playChime={playCelebrationChime}
        />
      ) : (
        /* Canvas Container */
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden relative">
        {/* Canvas Toolbar */}
        <div className="px-2.5 py-1.5 sm:px-3 sm:py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 bg-slate-50/70 dark:bg-slate-950/40">
          {/* Drawing tools */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
            {/* Pen Tool button */}
            <button
              type="button"
              onClick={() => setTool("pen")}
              title="Pen tool (write equations & numbers)"
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                tool === "pen"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Pen</span>
            </button>

            {/* Eraser Selector: Erase Quick & Brush */}
            <div className="inline-flex p-0.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 items-center">
              <button
                type="button"
                onClick={() => {
                  setTool("eraser");
                  setEraserMode("box");
                }}
                title="Erase Quick - Drag to quickly select and erase all writing inside (Fastest!)"
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  tool === "eraser" && eraserMode === "box"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Erase Quick</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTool("eraser");
                  setEraserMode("brush");
                }}
                title="Brush Eraser - Rub to erase individual strokes"
                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  tool === "eraser" && eraserMode === "brush"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                <Eraser className="w-3.5 h-3.5" />
                <span className="text-[11px]">Brush</span>
              </button>
            </div>

            {/* Erase Quick Helper Badge */}
            {tool === "eraser" && eraserMode === "box" && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                Drag to select & erase quickly
              </span>
            )}

            {/* Ink Color Palette */}
            {tool === "pen" && (
              <div className="flex items-center space-x-1 pl-1">
                {[
                  { color: darkMode ? "#f8fafc" : "#0f172a", label: "Dark" },
                  { color: "#2563eb", label: "Royal Blue" },
                  { color: "#7c3aed", label: "Purple" },
                  { color: "#059669", label: "Emerald" },
                  { color: "#dc2626", label: "Red" },
                ].map((c) => (
                  <button
                    key={c.color}
                    onClick={() => setPenColor(c.color)}
                    style={{ backgroundColor: c.color }}
                    className={`w-5 h-5 rounded-full border-2 transition-transform ${
                      penColor === c.color
                        ? "scale-125 border-sky-400 shadow-xs"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Stroke Width */}
            {tool === "pen" && (
              <div className="hidden sm:flex items-center space-x-1 pl-2 border-l border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-400">Size:</span>
                {[3, 5, 8].map((s) => (
                  <button
                    key={s}
                    onClick={() => setPenSize(s)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      penSize === s
                        ? "bg-indigo-500 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {s}px
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Canvas Actions & Grid Selector */}
          <div className="flex items-center space-x-1.5 flex-wrap gap-1">
            {/* Grid Style Dropdown (consolidates graph, ruled, dotted, blank) */}
            <div className="relative inline-block">
              <select
                value={gridType}
                onChange={(e) => setGridType(e.target.value as CanvasGridType)}
                className="appearance-none text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-2 pr-6 py-1 text-slate-700 dark:text-slate-300 shadow-2xs cursor-pointer focus:outline-hidden"
                title="Canvas background grid style"
              >
                <option value="graph">⊞ Graph Grid</option>
                <option value="ruled">☰ Ruled Lines</option>
                <option value="dotted">⠶ Dotted Grid</option>
                <option value="blank">▢ Blank Paper</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
            </div>

            <button
              onClick={() => {
                if (subMode === "quiz") {
                  setQuizFeedback({ status: "checking", message: "Checking your answer..." });
                }
                executeHandwritingSolve({ isAuto: false, showExpOnComplete: false });
              }}
              disabled={strokes.length === 0 || isAnalyzing}
              title={subMode === "quiz" ? "Check your handwritten answer" : "Calculate equation or solve expression"}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {subMode === "quiz"
                  ? (isAnalyzing ? "Checking..." : "Check Answer (✓)")
                  : (isAnalyzing ? "Calculating..." : "Calculate (=)")}
              </span>
            </button>

            <button
              onClick={handleUndo}
              disabled={strokes.length === 0}
              title="Undo last stroke"
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={handleClearCanvas}
              title="Clear canvas"
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Pre-Reserved Top Calculated Result Ribbon - Fixed height ALWAYS present so canvas NEVER bounces or shifts */}
        <div className="h-9 sm:h-10 px-3 bg-slate-50/80 dark:bg-slate-900/75 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs select-none transition-colors">
          <div className="flex items-center space-x-2 overflow-hidden flex-1 min-w-0 mr-2">
            <span className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 shrink-0">
              <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing || autoCalculating ? "text-amber-500 animate-spin" : "text-indigo-600 dark:text-indigo-400"}`} />
              <span>Calculated Result:</span>
            </span>

            {isAnalyzing || autoCalculating ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                <div className="w-2.5 h-2.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Detecting & Calculating...</span>
              </span>
            ) : activeResult ? (
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 rounded-lg font-bold text-xs sm:text-sm bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 shadow-xs shrink-0 max-w-full overflow-hidden">
                <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                  Detected:
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono text-xs sm:text-sm">
                  {activeResult.expression || activeResult.fullEquation?.split("=")[0]?.trim() || activeResult.text}
                </span>
                <span className="text-indigo-400 dark:text-indigo-500 font-bold">➔</span>
                <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold text-indigo-600 dark:text-indigo-400">
                  Result:
                </span>
                <span className="font-black text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-xs sm:text-sm">
                  {activeResult.fullEquation || (activeResult.text.startsWith("=") ? activeResult.text : `= ${activeResult.text}`)}
                </span>
                {autoAnswer && (
                  <button
                    type="button"
                    onClick={handleAdoptAIStrokes}
                    className="ml-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1 shrink-0"
                    title="Write calculated result onto the canvas as ink"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Write on Canvas</span>
                  </button>
                )}
              </div>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 italic text-[11px] sm:text-xs truncate">
                Write any number or equation (e.g. 5, 12, 5 + 3 =)...
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {activeResult && (
              <>
                <button
                  type="button"
                  onClick={handleExplanationClick}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {showExplanation ? "Hide Steps" : "View Steps"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveResult(null);
                    setAutoAnswer(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* HTML5 Canvas with Touch / Stylus support - completely stationary with zero bounce */}
        <div className="relative cursor-crosshair touch-none select-none">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="w-full block"
            style={{ touchAction: "none" }}
          />

          {/* Detection / Solve Error Toast Overlay - strictly hidden while calculating */}
          {!isAnalyzing && !autoCalculating && errorMessage && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto animate-in fade-in duration-150 max-w-md w-[92%]">
              <div className="bg-rose-900/90 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-lg backdrop-blur-xs border border-rose-400/30 flex items-center justify-between gap-2">
                <span className="truncate">{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="p-0.5 hover:bg-white/20 rounded cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {strokes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 dark:text-slate-500 text-xs sm:text-sm font-medium text-center px-4">
              {subMode === "number_trace"
                ? `✍️ Write number ${targetNumber} on the pad with finger or stylus...`
                : subMode === "quiz"
                ? `✍️ Write your answer to "${activeQuestion?.question || "the question"}" on the pad...`
                : tool === "eraser" && eraserMode === "box"
                ? "Erase Quick Active: Drag around any strokes to quickly erase them..."
                : solvingMode === "learn_ai"
                ? "✍️ Learn with AI: Write an equation (e.g. 3+3=) to see the calculated answer & math explanation..."
                : "✍️ Manual Mode: Solve and handwrite your mathematical problem freely..."}
            </div>
          )}

          {/* Kids Number Tracing Live Feedback Banner & Next Prompt */}
          {subMode === "number_trace" && traceFeedback && (
            <>
              {traceFeedback.status === "checking" && (
                <div className="absolute top-3 right-3 z-20 pointer-events-none animate-in fade-in duration-150">
                  <div className="bg-slate-900/85 dark:bg-slate-800/90 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg backdrop-blur-xs border border-white/10">
                    <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Checking {targetNumber}...</span>
                  </div>
                </div>
              )}

              {traceFeedback.status === "correct" && (
                <div className="absolute inset-x-3 sm:inset-x-6 bottom-3 sm:bottom-5 z-20 flex flex-col items-center justify-center pointer-events-auto animate-in fade-in zoom-in duration-200">
                  <div className="bg-emerald-600/95 dark:bg-emerald-700/95 text-white backdrop-blur-md px-4 sm:px-6 py-3.5 rounded-2xl shadow-xl border border-emerald-400/40 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-xl w-full">
                    <div className="flex items-center space-x-3 text-center sm:text-left">
                      <div className="w-11 h-11 rounded-full bg-white text-emerald-600 flex items-center justify-center shrink-0 shadow-md">
                        <Check className="w-7 h-7 stroke-[3.5]" />
                      </div>
                      <div>
                        <div className="flex items-center justify-center sm:justify-start gap-1.5">
                          <PartyPopper className="w-4 h-4 text-amber-300" />
                          <span className="font-black text-sm sm:text-base tracking-wide">
                            Correct! Well Done!
                          </span>
                        </div>
                        {traceFeedback.motivation && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                              Message:
                            </span>
                            <span className="text-xs text-white font-extrabold">
                              {traceFeedback.motivation}
                            </span>
                          </div>
                        )}
                        <p className="text-[11px] text-emerald-100 font-medium mt-0.5">
                          {autoNextCountdown !== null
                            ? `Next number loading in ${autoNextCountdown}s...`
                            : `Number ${targetNumber} successfully completed!`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleRetryCurrentNumber}
                        className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1"
                        title="Practice this number again"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleNextNumber}
                        className="px-4 py-1.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <span>Next Number</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {traceFeedback.status === "incorrect" && (
                <div className="absolute inset-x-3 sm:inset-x-6 bottom-3 sm:bottom-5 z-20 flex flex-col items-center justify-center pointer-events-auto animate-in fade-in duration-150">
                  <div className="bg-rose-600/95 dark:bg-rose-700/95 text-white backdrop-blur-md px-4 sm:px-5 py-3 rounded-2xl shadow-xl border border-rose-400/40 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-xl w-full">
                    <div className="flex items-center space-x-3 text-center sm:text-left">
                      <div className="w-10 h-10 rounded-full bg-white text-rose-600 flex items-center justify-center shrink-0 shadow-md">
                        <XCircle className="w-6 h-6 stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="flex items-center justify-center sm:justify-start gap-1.5">
                          <span className="font-black text-sm sm:text-base tracking-wide text-white">
                            Wrong! Try Again
                          </span>
                        </div>
                        <p className="text-xs text-rose-100 font-semibold mt-0.5">
                          {traceFeedback.divergenceReason ||
                            (traceFeedback.writtenNumber
                              ? `Recognized: "${traceFeedback.writtenNumber}" (Target: ${targetNumber})`
                              : traceFeedback.message ||
                                `Follow the outline and write number ${targetNumber} carefully!`)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleRetryCurrentNumber}
                        className="px-3.5 py-1.5 rounded-xl bg-white text-rose-800 hover:bg-rose-50 font-black text-xs shadow-sm cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Clear & Retry</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleNextNumber}
                        className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs cursor-pointer flex items-center gap-1"
                      >
                        <span>Skip</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Quiz Live Feedback Banner (Tick for Correct, Cross for Wrong) */}
          {subMode === "quiz" && quizFeedback && (
            <>
              {quizFeedback.status === "checking" && (
                <div className="absolute top-3 right-3 z-20 pointer-events-none animate-in fade-in duration-150">
                  <div className="bg-slate-900/85 dark:bg-slate-800/90 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg backdrop-blur-xs border border-white/10">
                    <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Checking your answer...</span>
                  </div>
                </div>
              )}

              {quizFeedback.status === "correct" && (
                <div className="absolute inset-x-3 sm:inset-x-6 bottom-3 sm:bottom-5 z-20 flex flex-col items-center justify-center pointer-events-auto animate-in fade-in zoom-in duration-200">
                  <div className="bg-emerald-600/95 dark:bg-emerald-700/95 text-white backdrop-blur-md px-4 sm:px-6 py-3.5 rounded-2xl shadow-xl border-2 border-emerald-400/50 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-xl w-full">
                    <div className="flex items-center space-x-3 text-center sm:text-left">
                      <div className="w-12 h-12 rounded-full bg-white text-emerald-600 flex items-center justify-center shrink-0 shadow-md ring-4 ring-emerald-300/40">
                        <Check className="w-8 h-8 stroke-[4]" />
                      </div>
                      <div>
                        <div className="flex items-center justify-center sm:justify-start gap-1.5">
                          <PartyPopper className="w-4 h-4 text-amber-300" />
                          <span className="font-black text-sm sm:text-base tracking-wide">
                            Correct Answer! (✓)
                          </span>
                        </div>
                        <p className="text-xs text-emerald-100 font-medium mt-0.5">
                          {activeQuestion?.question} = <strong className="text-white text-sm underline">{quizFeedback.userAnswer}</strong>
                        </p>
                        {quizFeedback.explanation && (
                          <p className="text-[11px] text-emerald-200/90 italic mt-0.5">
                            {quizFeedback.explanation}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleNextQuizQuestion}
                        className="px-4 py-2 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <span>Next Question</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {quizFeedback.status === "incorrect" && (
                <div className="absolute inset-x-3 sm:inset-x-6 bottom-3 sm:bottom-5 z-20 flex flex-col items-center justify-center pointer-events-auto animate-in fade-in duration-150">
                  <div className="bg-rose-600/95 dark:bg-rose-700/95 text-white backdrop-blur-md px-4 sm:px-5 py-3 rounded-2xl shadow-xl border-2 border-rose-400/50 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-xl w-full">
                    <div className="flex items-center space-x-3 text-center sm:text-left">
                      <div className="w-12 h-12 rounded-full bg-white text-rose-600 flex items-center justify-center shrink-0 shadow-md ring-4 ring-rose-300/40">
                        <X className="w-8 h-8 stroke-[4]" />
                      </div>
                      <div>
                        <div className="flex items-center justify-center sm:justify-start gap-1.5">
                          <span className="font-black text-sm sm:text-base tracking-wide text-white">
                            Incorrect Answer! (✗)
                          </span>
                        </div>
                        <p className="text-xs text-rose-100 font-semibold mt-0.5">
                          You wrote: <strong className="text-white bg-rose-800/80 px-1.5 py-0.5 rounded">"{quizFeedback.userAnswer}"</strong>. Write the correct answer on the pad!
                        </p>
                        {showHint && activeQuestion && (
                          <p className="text-[11px] text-amber-200 font-medium mt-0.5">
                            💡 Hint: {activeQuestion.hint}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleRetryQuizQuestion}
                        className="px-3.5 py-1.5 rounded-xl bg-white text-rose-800 hover:bg-rose-50 font-black text-xs shadow-sm cursor-pointer flex items-center gap-1 active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Clear & Retry</span>
                      </button>
                      {!showHint && (
                        <button
                          type="button"
                          onClick={() => setShowHint(true)}
                          className="px-3 py-1.5 rounded-xl bg-rose-800/80 hover:bg-rose-800 text-white font-bold text-xs cursor-pointer flex items-center gap-1 active:scale-95"
                        >
                          <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
                          <span>Hint</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Canvas Bottom Action Bar */}
        <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/60 flex items-center justify-between flex-wrap gap-2 min-h-[46px]">
          {subMode === "number_trace" ? (
            <>
              <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span className="font-bold text-amber-700 dark:text-amber-400">
                  Write Number: Target {targetNumber}
                </span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  Streak: {consecutiveSolves}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => executeHandwritingSolve({ isAuto: false, showExpOnComplete: false })}
                  disabled={isAnalyzing || strokes.length === 0}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isAnalyzing ? "Checking..." : "Verify Number"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextNumber}
                  className="flex items-center space-x-1 px-3.5 py-1.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <span>Next Number</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : subMode === "quiz" ? (
            <>
              <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    quizFeedback?.status === "correct"
                      ? "bg-emerald-500"
                      : quizFeedback?.status === "incorrect"
                      ? "bg-rose-500"
                      : "bg-indigo-500 animate-pulse"
                  }`}
                ></span>
                <span className="font-bold text-indigo-700 dark:text-indigo-400 truncate max-w-[180px] sm:max-w-[240px]">
                  Q{currentQuizIndex + 1}: {activeQuestion?.question}
                </span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-xs">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Correct: {correctCount}</span>
                </span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 text-xs">
                  <X className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Not Correct: {incorrectCount}</span>
                </span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 text-xs">
                  <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Remaining: {remainingCount}</span>
                </span>
                {consecutiveSolves > 1 && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                      <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      Streak: {consecutiveSolves}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleClearCanvas}
                  disabled={strokes.length === 0}
                  className="px-3 py-1.5 rounded-xl font-semibold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer transition-all"
                >
                  Clear Pad
                </button>

                <button
                  type="button"
                  onClick={() => executeHandwritingSolve({ isAuto: false, showExpOnComplete: false })}
                  disabled={isAnalyzing || strokes.length === 0}
                  className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50 ${
                    quizFeedback?.status === "correct"
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                      : quizFeedback?.status === "incorrect"
                      ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
                      : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
                  }`}
                >
                  {quizFeedback?.status === "correct" ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : quizFeedback?.status === "incorrect" ? (
                    <RotateCcw className="w-3.5 h-3.5" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>{isAnalyzing ? "Checking..." : quizFeedback?.status === "incorrect" ? "Re-check Answer" : "✓ Check Answer"}</span>
                </button>

                {quizFeedback?.status === "correct" && (
                  <button
                    type="button"
                    onClick={handleNextQuizQuestion}
                    className="flex items-center space-x-1 px-3.5 py-1.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-95 transition-all cursor-pointer animate-in zoom-in-75"
                  >
                    <span>Next Question</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {solvingMode === "learn_ai" ? "✨ Learn with AI Active" : "✍️ Manual Mode"}
                </span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  Milestone: {rewards.practiceCount % 10} / 10
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => executeHandwritingSolve({ isAuto: false, showExpOnComplete: false })}
                  disabled={isAnalyzing || strokes.length === 0}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isAnalyzing ? "Calculating..." : "Calculate (=)"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExplanationClick}
                  disabled={isAnalyzing || strokes.length === 0}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer ${
                    showExplanation
                      ? "bg-indigo-700 hover:bg-indigo-800 text-white shadow-indigo-500/30 ring-2 ring-indigo-300 dark:ring-indigo-700"
                      : "bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:from-sky-600 hover:to-purple-700 text-white shadow-indigo-500/20"
                  } disabled:opacity-50`}
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-4 h-4 text-amber-300" />
                      <span>{showExplanation ? "Hide Steps" : "Steps"}</span>
                      {solveResult && !showExplanation && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-900 font-extrabold uppercase">
                          Rule & Steps
                        </span>
                      )}
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      )}

      {/* AI Handwriting Recognition Result Card - Revealed only when user clicks Explanation */}
      {showExplanation && solveResult && (
        <div
          id="handwriting-solve-result"
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-500/40 dark:border-indigo-500/50 shadow-xl space-y-4 transition-all animate-in fade-in slide-in-from-top-3 duration-300"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <span>Learn with AI</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    Rule & Steps
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Mathematical breakdown, applicable rules, and step-by-step resolution
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {solveResult.isCorrect !== undefined && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                    solveResult.isCorrect
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {solveResult.isCorrect ? "✓ Verified" : "Practice in progress"}
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowExplanation(false)}
                className="text-xs font-bold px-2.5 py-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          {/* Calculated Answer Notice if in Learn with AI mode */}
          {solvingMode === "learn_ai" && autoAnswer && isValidMathAnswer(autoAnswer.text) && (
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-between flex-wrap gap-2 text-xs text-indigo-900 dark:text-indigo-200">
              <div className="flex items-center space-x-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>
                  <strong>Calculated Result:</strong> Solution <strong>"{autoAnswer.fullEquation || autoAnswer.text.replace(/^=\s*/, "")}"</strong> is ready.
                </span>
              </div>
              <button
                type="button"
                onClick={handleAdoptAIStrokes}
                className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer shadow-xs"
              >
                Adopt as Ink
              </button>
            </div>
          )}

          {/* Prominent Rule Applied Section */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-sky-500/10 border-2 border-indigo-500/30 dark:border-indigo-500/40">
            <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs uppercase tracking-wider">
              <BookmarkCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Rule Applied:</span>
            </div>
            <div className="mt-1.5 text-base sm:text-lg font-black text-indigo-950 dark:text-indigo-100 flex items-center flex-wrap gap-2">
              <span>
                {solveResult.appliedRule?.toLowerCase().includes("order") ||
                solveResult.appliedRule?.toLowerCase().includes("bodmas") ||
                solveResult.appliedRule?.toLowerCase().includes("pemdas")
                  ? "BODMAS Rule (Default)"
                  : solveResult.appliedRule || "Basic Arithmetic Operation"}
              </span>
            </div>
            {solveResult.shortExplanation && (
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {cleanStepText(solveResult.shortExplanation)}
              </p>
            )}

            {/* Precedence breakdown when multiple operations, parentheses, or BODMAS/PEMDAS exist */}
            {Boolean(
              solveResult.recognizedExpression &&
              (((solveResult.recognizedExpression.match(/[\+\-\*\/\^÷×]/g) || []).length > 1) ||
                solveResult.recognizedExpression.includes("(") ||
                solveResult.recognizedExpression.includes(")") ||
                (solveResult.appliedRule || "").toLowerCase().includes("order") ||
                (solveResult.appliedRule || "").toLowerCase().includes("bodmas") ||
                (solveResult.appliedRule || "").toLowerCase().includes("pemdas"))
            ) && (
              <div className="mt-3 pt-3 border-t border-indigo-200/50 dark:border-indigo-800/40 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <span>BODMAS Order of Operations Priority:</span>
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                    Standard Left-to-Right Evaluation
                  </span>
                </div>

                {/* 6-Step Priority Sequence strictly adhering to standard calculation order */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 text-center">
                  {[
                    {
                      step: "1",
                      name: "B - Brackets",
                      symbols: "( ) [ ]",
                      desc: "Innermost first",
                      active:
                        (solveResult.recognizedExpression || "").includes("(") ||
                        (solveResult.recognizedExpression || "").includes(")"),
                    },
                    {
                      step: "2",
                      name: "O - Orders",
                      symbols: "xʸ √",
                      desc: "Powers & roots",
                      active:
                        (solveResult.recognizedExpression || "").includes("^") ||
                        (solveResult.recognizedExpression || "").includes("²") ||
                        (solveResult.recognizedExpression || "").includes("³") ||
                        (solveResult.recognizedExpression || "").includes("√"),
                    },
                    {
                      step: "3",
                      name: "D - Division",
                      symbols: "÷ /",
                      desc: "Division",
                      active:
                        (solveResult.recognizedExpression || "").includes("/") ||
                        (solveResult.recognizedExpression || "").includes("÷"),
                    },
                    {
                      step: "4",
                      name: "M - Multiplication",
                      symbols: "× *",
                      desc: "Multiplication",
                      active:
                        (solveResult.recognizedExpression || "").includes("*") ||
                        (solveResult.recognizedExpression || "").includes("×"),
                    },
                    {
                      step: "5",
                      name: "A - Addition",
                      symbols: "+",
                      desc: "Addition",
                      active: (solveResult.recognizedExpression || "").includes("+"),
                    },
                    {
                      step: "6",
                      name: "S - Subtraction",
                      symbols: "− -",
                      desc: "Subtraction",
                      active:
                        (solveResult.recognizedExpression || "").includes("-") ||
                        (solveResult.recognizedExpression || "").includes("−"),
                    },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                        item.active
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-xs ring-2 ring-indigo-400/50"
                          : "bg-white/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                            item.active
                              ? "bg-white/20 text-white"
                              : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                          }`}
                        >
                          Step {item.step}
                        </span>
                        <span className="text-[11px] font-mono font-bold opacity-80">{item.symbols}</span>
                      </div>
                      <span className="text-xs block font-bold leading-tight">{item.name}</span>
                      <span
                        className={`text-[9px] block leading-tight mt-0.5 ${
                          item.active ? "text-indigo-100" : "text-slate-400"
                        }`}
                      >
                        {item.desc}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-[11px] text-indigo-950 dark:text-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-indigo-800 dark:text-indigo-300">Priority Order:</span>
                    <span>Brackets → Orders (Powers/Roots) → Division → Multiplication → Addition → Subtraction</span>
                  </div>
                  <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-400">
                    (Division & Multiplication left-to-right; Addition & Subtraction left-to-right)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Recognized Expression & Computed Result */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Recognized Expression */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Recognized Handwritten Expression:
              </span>
              <div className="font-mono text-base font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {solveResult.recognizedExpression}
              </div>
              {solveResult.englishTransliteration && solveResult.englishTransliteration !== solveResult.recognizedExpression && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  English: {solveResult.englishTransliteration}
                </div>
              )}
            </div>

            {/* Evaluated Result in English */}
            {isValidMathAnswer(solveResult.answer) ? (
              <div className="p-3 rounded-xl border bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800/60">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-indigo-700 dark:text-indigo-400">
                    Calculated Result:
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200">
                    {solveResult.appliedRule?.toLowerCase().includes("order") ||
                    solveResult.appliedRule?.toLowerCase().includes("bodmas") ||
                    solveResult.appliedRule?.toLowerCase().includes("pemdas")
                      ? "BODMAS Rule"
                      : solveResult.appliedRule || "Calculated Solution"}
                  </span>
                </div>
                <div className="font-mono text-base sm:text-xl font-black mt-1 text-indigo-700 dark:text-indigo-300">
                  {solveResult.answer.startsWith("=") || /[a-zA-Z]\s*=/.test(solveResult.answer)
                    ? solveResult.answer
                    : `= ${solveResult.answer.replace(/^=\s*/, "")}`}
                </div>
              </div>
            ) : solveResult.recognizedExpression ? (
              <div className="p-3 rounded-xl border bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800/60">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-indigo-700 dark:text-indigo-400">
                    Detected Content:
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200">
                    {solveResult.appliedRule || "Identified"}
                  </span>
                </div>
                <div className="font-mono text-base sm:text-lg font-black mt-1 text-indigo-700 dark:text-indigo-300">
                  {solveResult.recognizedExpression}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Status:
                </span>
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">
                  Ready: draw numbers, letters (x, y), or symbols (+, -, *, /) on canvas
                </div>
              </div>
            )}
          </div>

          {/* Short Explanation */}
          {solveResult.shortExplanation && (
            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <strong className="text-slate-900 dark:text-slate-100 block mb-1">Explanation:</strong>
              {cleanStepText(solveResult.shortExplanation)}
            </div>
          )}

          {/* Step-by-step Steps */}
          {solveResult.steps && solveResult.steps.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Step-by-Step Solving Path:
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                  BODMAS Rule
                </span>
              </div>
              <div className="space-y-1.5">
                {solveResult.steps.map((rawStep, idx) => {
                  const step = cleanStepText(rawStep);
                  return (
                    <div
                      key={idx}
                      className="flex items-start space-x-2.5 p-2.5 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-200"
                    >
                      <span className="w-5 h-5 rounded-full text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5 bg-indigo-600 shadow-xs">
                        {idx + 1}
                      </span>
                      <div className="flex-1 leading-relaxed">
                        {step}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Encouragement & Stroke Quality */}
          {solveResult.encouragement && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 text-xs text-amber-800 dark:text-amber-300 flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{solveResult.encouragement}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
