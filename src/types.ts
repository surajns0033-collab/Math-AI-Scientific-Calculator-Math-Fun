export type GradeLevel =
  | "Kindergarten"
  | "Elementary (1st - 3rd)"
  | "Middle School (4th - 8th)"
  | "High School (9th - 12th)"
  | "College / Graduate";

export type AngleUnit = "DEG" | "RAD";

export interface CalculationHistoryItem {
  id: string;
  timestamp: number;
  expression: string;
  result: string;
  symbolName?: string; // e.g. "v_f", "Area", "θ"
  tags: string[]; // e.g. ["Physics", "Trigonometry", "Kinematics"]
  notes?: string;
  angleMode: AngleUnit;
  hasAISolution?: boolean;
  aiSteps?: AIStep[];
}

export interface AIStep {
  stepNumber: number;
  title: string;
  explanation: string;
  mathFormula: string;
  rule?: string;
}

export interface AISolutionResponse {
  problem: string;
  finalAnswer: string;
  category: string;
  tags: string[];
  summary: string;
  steps: AIStep[];
  formulaReference?: string;
}

export interface HandwrittenSolveResponse {
  recognizedExpression: string;
  answer: string;
  fullEquation?: string;
  isCorrect?: boolean;
  detectedNumber?: number;
  strokeQuality?: string;
  appliedRule?: string;
  shortExplanation: string;
  steps?: string[];
  encouragement: string;
  detectedLanguage?: string;
  englishTransliteration?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  targetAnswer: string;
  hint: string;
  explanation: string;
  type: "math" | "number_trace" | "physics";
}

export interface KidsRewardState {
  practiceCount: number; // counts up to 10 for rewards
  totalStars: number;
  level: number;
  unlockedBadges: string[];
  recentAchievement?: string;
}

export interface PhysicsFormula {
  id: string;
  category: "Kinematics" | "Dynamics & Energy" | "Waves & Optics" | "Electromagnetism" | "Trigonometry" | "Calculus";
  name: string;
  formula: string;
  templateExpression: string;
  description: string;
  variables: { name: string; symbol: string; unit: string }[];
}

export interface UnitDefinition {
  id: string;
  name: string;
  symbol: string;
  toBase: (val: number) => number;
  fromBase: (val: number) => number;
}

export interface UnitCategory {
  id: string;
  name: string;
  baseUnit: string;
  units: UnitDefinition[];
}
