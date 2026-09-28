import { AngleUnit } from "../types";
import { PHYSICAL_CONSTANTS } from "./constants";

export interface EvaluationResult {
  success: boolean;
  value?: number;
  displayValue?: string;
  error?: string;
}

export interface LiveHintInfo {
  status: "idle" | "valid" | "typing" | "error";
  previewValue: string | null;
  hintMessage: string;
  unclosedParens: number;
  detectedFormula?: string;
  suggestedCompletions: string[];
}

// Factorial helper
function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n > 170) return Infinity; // Overflow
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

// Convert expression to standard JS Math format with respect to AngleUnit
export function prepareExpression(expr: string, angleMode: AngleUnit): string {
  let processed = expr.trim();
  if (!processed) return "";

  // Replace multiplication and division symbols
  processed = processed.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");

  // Replace physics constants
  PHYSICAL_CONSTANTS.forEach((c) => {
    // Match exact symbol or escaped symbol
    const regex = new RegExp(`\\b${c.symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    processed = processed.replace(regex, `(${c.value})`);
  });

  // Replace π and e
  processed = processed.replace(/π/g, "(Math.PI)");
  processed = processed.replace(/\bpi\b/gi, "(Math.PI)");
  // Only replace 'e' when it stands alone as Euler's number (not in exp, scientific notation like 1e-10)
  processed = processed.replace(/(^|[^a-zA-Z0-9_.])e([^a-zA-Z0-9_.]|$)/g, "$1(Math.E)$2");

  // Handle implicit multiplication like 2(3) -> 2*(3), (2)(3) -> (2)*(3), 2Math.PI -> 2*Math.PI, 2sin -> 2*sin
  processed = processed.replace(/(\d)\s*(\()/g, "$1*$2");
  processed = processed.replace(/(\))\s*(\d)/g, "$1*$2");
  processed = processed.replace(/(\))\s*(\()/g, "$1*$2");
  processed = processed.replace(/(\d)\s*(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|sqrt|cbrt|log|ln|abs|exp)\b/gi, "$1*$2");
  processed = processed.replace(/(\d)\s*\(Math\./g, "$1*(Math.");

  // Handle factorial: replace 'x!' or '(expr)!' with 'fact(x)'
  // Simple regex for number followed by !
  processed = processed.replace(/(\d+(\.\d+)?)\s*!/g, "fact($1)");
  processed = processed.replace(/\)\s*!/g, ")!_TEMP");
  // Expand parenthesized factorial if present
  while (processed.includes(")!_TEMP")) {
    processed = processed.replace(/\(([^()]+)\)!_TEMP/g, "fact($1)");
  }

  // Handle powers: x^y -> Math.pow(x, y)
  // Standardize ^ to Math.pow using token replacement or regex
  // Replace simple base^exponent
  processed = processed.replace(/(\b\w+|\([^()]+\))\s*\^\s*(\b\w+|\([^()]+\))/g, "Math.pow($1,$2)");

  // Handle square root and cube root
  processed = processed.replace(/\bsqrt\s*\(/gi, "Math.sqrt(");
  processed = processed.replace(/\bcbrt\s*\(/gi, "Math.cbrt(");
  processed = processed.replace(/\babs\s*\(/gi, "Math.abs(");

  // Handle Logarithms: log(x) -> Math.log10(x), ln(x) -> Math.log(x)
  processed = processed.replace(/\blog10\s*\(/gi, "Math.log10(");
  processed = processed.replace(/\blog\s*\(/gi, "Math.log10(");
  processed = processed.replace(/\bln\s*\(/gi, "Math.log(");
  processed = processed.replace(/\bexp\s*\(/gi, "Math.exp(");

  // Handle Hyperbolic
  processed = processed.replace(/\bsinh\s*\(/gi, "Math.sinh(");
  processed = processed.replace(/\bcosh\s*\(/gi, "Math.cosh(");
  processed = processed.replace(/\btanh\s*\(/gi, "Math.tanh(");

  // Handle Inverse Trig
  if (angleMode === "DEG") {
    processed = processed.replace(/\basin\s*\(/gi, "((180/Math.PI)*Math.asin(");
    processed = processed.replace(/\bacos\s*\(/gi, "((180/Math.PI)*Math.acos(");
    processed = processed.replace(/\batan\s*\(/gi, "((180/Math.PI)*Math.atan(");
    // Forward Trig with degree conversion
    processed = processed.replace(/\bsin\s*\(/gi, "Math.sin((Math.PI/180)*");
    processed = processed.replace(/\bcos\s*\(/gi, "Math.cos((Math.PI/180)*");
    processed = processed.replace(/\btan\s*\(/gi, "Math.tan((Math.PI/180)*");
  } else {
    processed = processed.replace(/\basin\s*\(/gi, "Math.asin(");
    processed = processed.replace(/\bacos\s*\(/gi, "Math.acos(");
    processed = processed.replace(/\batan\s*\(/gi, "Math.atan(");
    processed = processed.replace(/\bsin\s*\(/gi, "Math.sin(");
    processed = processed.replace(/\bcos\s*\(/gi, "Math.cos(");
    processed = processed.replace(/\btan\s*\(/gi, "Math.tan(");
  }

  return processed;
}

// Evaluate expression safely
export function evaluateExpression(expr: string, angleMode: AngleUnit = "DEG"): EvaluationResult {
  if (!expr || !expr.trim()) {
    return { success: false, error: "Empty expression" };
  }

  // Pre-check for parenthesis balance
  const openParens = (expr.match(/\(/g) || []).length;
  const closeParens = (expr.match(/\)/g) || []).length;
  let balancedExpr = expr;
  if (openParens > closeParens) {
    balancedExpr += ")".repeat(openParens - closeParens);
  }

  try {
    const jsExpr = prepareExpression(balancedExpr, angleMode);

    // Sanitize to allow only safe tokens
    const safeCheck = jsExpr.replace(/Math\.[a-zA-Z0-9_]+/g, "").replace(/fact/g, "");
    if (/[^0-9+\-*/().,%^ \t\n]/i.test(safeCheck)) {
      return { success: false, error: "Invalid math character or syntax" };
    }

    // Execute with localized factorial scope
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function("fact", `"use strict"; return (${jsExpr});`);
    const val = fn(factorial);

    if (val === undefined || val === null || Number.isNaN(val)) {
      return { success: false, error: "Undefined or Math Error" };
    }

    if (!Number.isFinite(val)) {
      return { success: true, value: val, displayValue: val > 0 ? "Infinity" : "-Infinity" };
    }

    // Clean display format
    // Clean precision artifacts like 0.00000000000000006 for sin(180 deg)
    const rounded = Math.abs(val) < 1e-12 ? 0 : val;
    let display = rounded.toString();

    // If long decimal, round nicely
    if (display.includes(".") && display.split(".")[1].length > 8) {
      display = parseFloat(rounded.toFixed(8)).toString();
    }

    // Check if scientific notation is needed
    if (Math.abs(rounded) >= 1e12 || (Math.abs(rounded) > 0 && Math.abs(rounded) <= 1e-7)) {
      display = rounded.toExponential(6);
    }

    return {
      success: true,
      value: rounded,
      displayValue: display,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Syntax Error" };
  }
}

// Compute live hints for blank space as user interacts
export function getLiveHint(rawInput: string, angleMode: AngleUnit): LiveHintInfo {
  if (!rawInput.trim()) {
    return {
      status: "idle",
      previewValue: null,
      hintMessage: "Enter an expression, physics formula, or press mic to speak",
      unclosedParens: 0,
      suggestedCompletions: ["sin(", "cos(", "sqrt(", "π", "v = v₀ + at", "F = ma"],
    };
  }

  const openParens = (rawInput.match(/\(/g) || []).length;
  const closeParens = (rawInput.match(/\)/g) || []).length;
  const unclosed = Math.max(0, openParens - closeParens);

  // Try preview evaluation
  const previewEval = evaluateExpression(rawInput, angleMode);

  // Detect common physics / trig keywords
  let detectedFormula: string | undefined;
  if (/v\s*=\s*v0/i.test(rawInput) || /kinematic/i.test(rawInput)) {
    detectedFormula = "Kinematics: v = v₀ + at";
  } else if (/f\s*=\s*m/i.test(rawInput) || /force/i.test(rawInput)) {
    detectedFormula = "Newton's 2nd Law: F = ma";
  } else if (/sin|cos|tan/i.test(rawInput)) {
    detectedFormula = `Trigonometry (${angleMode} mode)`;
  } else if (/\^|pow/i.test(rawInput)) {
    detectedFormula = "Exponential / Power calculation";
  }

  // Determine hint message
  let hintMessage = "";
  if (unclosed > 0) {
    hintMessage = `Auto-closing ${unclosed} parenthesis: '${")".repeat(unclosed)}'`;
  } else if (previewEval.success) {
    hintMessage = `Live preview: = ${previewEval.displayValue}`;
  } else {
    // If ending with operator
    if (/[+\-*/^%]$/.test(rawInput.trim())) {
      hintMessage = "Awaiting next term...";
    } else {
      hintMessage = "Keep typing or tap a function key";
    }
  }

  // Dynamic autocompletions based on what user is typing
  const lastToken = rawInput.split(/[\s+\-*/()]/).pop() || "";
  const suggestedCompletions: string[] = [];
  if (lastToken.length > 0) {
    const candidates = ["sin(", "cos(", "tan(", "sqrt(", "log(", "ln(", "asin(", "acos(", "atan(", "sinh(", "cosh(", "tanh(", "pi", "abs("];
    candidates.forEach((c) => {
      if (c.toLowerCase().startsWith(lastToken.toLowerCase()) && c !== lastToken) {
        suggestedCompletions.push(c);
      }
    });
  }

  return {
    status: previewEval.success ? "valid" : "typing",
    previewValue: previewEval.success ? previewEval.displayValue! : null,
    hintMessage,
    unclosedParens: unclosed,
    detectedFormula,
    suggestedCompletions,
  };
}
