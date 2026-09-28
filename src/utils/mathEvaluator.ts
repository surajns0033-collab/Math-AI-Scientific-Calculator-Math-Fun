// Client-side math & rule evaluation engine with Universal Multilingual & Multi-Script Auto-Detection
// Automatically detects handwritten math in ANY language/script (Devanagari, Arabic, Bengali, Chinese, Roman, words)
// and computes the result in English.

export interface QuickEvalResult {
  expression: string;
  answer: string;
  fullEquation: string;
  appliedRule: string;
  ruleBreakdown?: string;
  shortExplanation: string;
  steps: string[];
  detectedLanguage?: string;
  englishTransliteration?: string;
}

export function isValidMathAnswer(ans: string | undefined | null): boolean {
  if (!ans || typeof ans !== "string") return false;
  const clean = ans.trim().toLowerCase();
  if (
    clean === "" ||
    clean === "null" ||
    clean === "undefined" ||
    clean === "none" ||
    clean === "recognized" ||
    clean === "correct" ||
    clean === "verified" ||
    clean === "?" ||
    clean === "=" ||
    clean === "==" ||
    clean === "equality" ||
    clean.startsWith("equality") ||
    clean.includes("equality") ||
    clean === "equation" ||
    clean === "identity" ||
    clean === "relation" ||
    clean === "statement" ||
    clean === "rule" ||
    clean.includes("incomplete") ||
    clean.includes("unknown") ||
    clean.includes("pending") ||
    clean.includes("waiting") ||
    clean.includes("evaluat") ||
    clean.includes("ready")
  ) {
    return false;
  }

  // Pure mathematical operators or punctuation alone are never valid answers
  if (/^[+\-*/×÷^=!%?:#~@$&]+$/.test(clean)) {
    return false;
  }

  // Dangling trailing operators (e.g. "12 +", "5 -", "3 *") are unfinished expressions, never valid answers
  if (/[+\-*/×÷^=]\s*$/.test(clean)) {
    return false;
  }

  // Operator names alone are not answers
  if (/^(plus|minus|times|multiplied|divided|division|addition|subtraction|operator|symbol)$/i.test(clean)) {
    return false;
  }

  // Must contain at least one digit or valid algebraic letter (like "x = 3", "3", "3.14", "x + y")
  if (!/[0-9a-zA-Z]/.test(clean)) {
    return false;
  }

  return true;
}

// Check if a mathematical expression string is syntactically complete and ready for calculation
export function isCompleteMathExpression(expr: string): boolean {
  if (!expr || typeof expr !== "string") return false;
  const clean = expr.trim();
  if (clean.length === 0) return false;

  // If ends with an operator, opening bracket, or dangling decimal, it is in-progress
  if (/[+\-*/×÷^√(=.]$/.test(clean)) return false;

  // Check balanced parentheses
  let open = 0;
  for (const ch of clean) {
    if (ch === "(") open++;
    else if (ch === ")") {
      open--;
      if (open < 0) return false;
    }
  }
  if (open !== 0) return false;

  // Must contain at least one digit or variable
  if (!/[0-9a-zA-Z]/.test(clean)) return false;

  return true;
}

// Check if an expression represents a math problem to solve (has operators or equation '=')
// rather than an isolated standalone digit while the user is still writing
export function hasOperandsToCalculate(expr: string): boolean {
  if (!expr || typeof expr !== "string") return false;
  const clean = expr.trim();
  // Has operators like +, -, *, /, ^, √, %, or equation '=' with math to solve
  if (/[+\-×*÷/^√%]/.test(clean)) return true;
  // Has '=' (e.g. "x + 2 = 5" or "3 + 3 =")
  if (clean.includes("=")) return true;
  return false;
}

// Multilingual Numeral & Script Mapping
const NUMERAL_SCRIPTS: { name: string; map: Record<string, string> }[] = [
  {
    name: "Devanagari (Hindi/Marathi)",
    map: { "०": "0", "१": "1", "२": "2", "३": "3", "४": "4", "५": "5", "६": "6", "७": "7", "८": "8", "९": "9" },
  },
  {
    name: "Eastern Arabic",
    map: { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" },
  },
  {
    name: "Persian / Urdu",
    map: { "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9" },
  },
  {
    name: "Bengali",
    map: { "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9" },
  },
  {
    name: "Gujarati",
    map: { "૦": "0", "૧": "1", "૨": "2", "૩": "3", "૪": "4", "૫": "5", "૬": "6", "૭": "7", "૮": "8", "૯": "9" },
  },
  {
    name: "Gurmukhi (Punjabi)",
    map: { "੦": "0", "੧": "1", "੨": "2", "੩": "3", "੪": "4", "੫": "5", "੬": "6", "੭": "7", "੮": "8", "੯": "9" },
  },
  {
    name: "Tamil",
    map: { "௧": "1", "௨": "2", "௩": "3", "௪": "4", "௫": "5", "௬": "6", "௭": "7", "௮": "8", "௯": "9", "௰": "10" },
  },
  {
    name: "Telugu",
    map: { "౦": "0", "౧": "1", "౨": "2", "౩": "3", "౪": "4", "౫": "5", "౬": "6", "౭": "7", "౮": "8", "౯": "9" },
  },
  {
    name: "Kannada",
    map: { "೦": "0", "೧": "1", "೨": "2", "೩": "3", "೪": "4", "೫": "5", "೬": "6", "೭": "7", "೮": "8", "೯": "9" },
  },
  {
    name: "Malayalam",
    map: { "൦": "0", "൧": "1", "൨": "2", "൩": "3", "൪": "4", "൫": "5", "൬": "6", "൭": "7", "൮": "8", "൯": "9" },
  },
  {
    name: "Thai",
    map: { "๐": "0", "๑": "1", "๒": "2", "๓": "3", "๔": "4", "๕": "5", "๖": "6", "๗": "7", "๘": "8", "๙": "9" },
  },
  {
    name: "Chinese / Japanese (Kanji)",
    map: { "〇": "0", "一": "1", "二": "2", "三": "3", "四": "4", "五": "5", "六": "6", "七": "7", "八": "8", "九": "9", "十": "10" },
  },
];

// Multilingual word tokens
const WORD_TRANSLATIONS: { pattern: RegExp; replacement: string; language: string }[] = [
  // Hindi
  { pattern: /\b(शून्य|सिफर)\b/gi, replacement: "0", language: "Hindi" },
  { pattern: /\b(एक)\b/gi, replacement: "1", language: "Hindi" },
  { pattern: /\b(दो)\b/gi, replacement: "2", language: "Hindi" },
  { pattern: /\b(तीन)\b/gi, replacement: "3", language: "Hindi" },
  { pattern: /\b(चार)\b/gi, replacement: "4", language: "Hindi" },
  { pattern: /\b(पांच|पाँच)\b/gi, replacement: "5", language: "Hindi" },
  { pattern: /\b(छह|छः|छ)\b/gi, replacement: "6", language: "Hindi" },
  { pattern: /\b(सात)\b/gi, replacement: "7", language: "Hindi" },
  { pattern: /\b(आठ)\b/gi, replacement: "8", language: "Hindi" },
  { pattern: /\b(नौ)\b/gi, replacement: "9", language: "Hindi" },
  { pattern: /\b(दस)\b/gi, replacement: "10", language: "Hindi" },
  { pattern: /(जोड़|जमा|प्लस|धन)/gi, replacement: "+", language: "Hindi" },
  { pattern: /(घटाव|घटाना|ऋण|माइनस)/gi, replacement: "-", language: "Hindi" },
  { pattern: /(गुणा|गुना|बार)/gi, replacement: "*", language: "Hindi" },
  { pattern: /(भाग|भागे)/gi, replacement: "/", language: "Hindi" },
  { pattern: /(बराबर)/gi, replacement: "=", language: "Hindi" },

  // Hinglish (Hindi words written in Latin script)
  { pattern: /\b(ek)\b/gi, replacement: "1", language: "Hinglish" },
  { pattern: /\b(do)\b/gi, replacement: "2", language: "Hinglish" },
  { pattern: /\b(teen|tin)\b/gi, replacement: "3", language: "Hinglish" },
  { pattern: /\b(char|chaar)\b/gi, replacement: "4", language: "Hinglish" },
  { pattern: /\b(paanch|panch)\b/gi, replacement: "5", language: "Hinglish" },
  { pattern: /\b(chhah|chhe|che)\b/gi, replacement: "6", language: "Hinglish" },
  { pattern: /\b(saat|sat)\b/gi, replacement: "7", language: "Hinglish" },
  { pattern: /\b(aath|ath)\b/gi, replacement: "8", language: "Hinglish" },
  { pattern: /\b(nau)\b/gi, replacement: "9", language: "Hinglish" },
  { pattern: /\b(das|dus)\b/gi, replacement: "10", language: "Hinglish" },
  { pattern: /\b(jod|jama)\b/gi, replacement: "+", language: "Hinglish" },
  { pattern: /\b(ghatao|ghatana)\b/gi, replacement: "-", language: "Hinglish" },
  { pattern: /\b(guna)\b/gi, replacement: "*", language: "Hinglish" },
  { pattern: /\b(bhaag)\b/gi, replacement: "/", language: "Hinglish" },
  { pattern: /\b(barabar)\b/gi, replacement: "=", language: "Hinglish" },

  // English words for operators
  { pattern: /\b(plus)\b/gi, replacement: "+", language: "English" },
  { pattern: /\b(minus)\b/gi, replacement: "-", language: "English" },
  { pattern: /\b(times|into|multiplied by)\b/gi, replacement: "*", language: "English" },
  { pattern: /\b(divided by|divide|over)\b/gi, replacement: "/", language: "English" },
  { pattern: /\b(equals|equal|is)\b/gi, replacement: "=", language: "English" },

  // Spanish
  { pattern: /\b(cero)\b/gi, replacement: "0", language: "Spanish" },
  { pattern: /\b(uno)\b/gi, replacement: "1", language: "Spanish" },
  { pattern: /\b(dos)\b/gi, replacement: "2", language: "Spanish" },
  { pattern: /\b(tres)\b/gi, replacement: "3", language: "Spanish" },
  { pattern: /\b(cuatro)\b/gi, replacement: "4", language: "Spanish" },
  { pattern: /\b(cinco)\b/gi, replacement: "5", language: "Spanish" },
  { pattern: /\b(seis)\b/gi, replacement: "6", language: "Spanish" },
  { pattern: /\b(siete)\b/gi, replacement: "7", language: "Spanish" },
  { pattern: /\b(ocho)\b/gi, replacement: "8", language: "Spanish" },
  { pattern: /\b(nueve)\b/gi, replacement: "9", language: "Spanish" },
  { pattern: /\b(diez)\b/gi, replacement: "10", language: "Spanish" },
  { pattern: /\b(más)\b/gi, replacement: "+", language: "Spanish" },
  { pattern: /\b(menos)\b/gi, replacement: "-", language: "Spanish" },
  { pattern: /\b(por)\b/gi, replacement: "*", language: "Spanish" },
  { pattern: /\b(entre|dividido)\b/gi, replacement: "/", language: "Spanish" },
  { pattern: /\b(igual)\b/gi, replacement: "=", language: "Spanish" },

  // French
  { pattern: /\b(zéro)\b/gi, replacement: "0", language: "French" },
  { pattern: /\b(un)\b/gi, replacement: "1", language: "French" },
  { pattern: /\b(deux)\b/gi, replacement: "2", language: "French" },
  { pattern: /\b(trois)\b/gi, replacement: "3", language: "French" },
  { pattern: /\b(quatre)\b/gi, replacement: "4", language: "French" },
  { pattern: /\b(cinq)\b/gi, replacement: "5", language: "French" },
  { pattern: /\b(six)\b/gi, replacement: "6", language: "French" },
  { pattern: /\b(sept)\b/gi, replacement: "7", language: "French" },
  { pattern: /\b(huit)\b/gi, replacement: "8", language: "French" },
  { pattern: /\b(neuf)\b/gi, replacement: "9", language: "French" },
  { pattern: /\b(dix)\b/gi, replacement: "10", language: "French" },
  { pattern: /\b(plus)\b/gi, replacement: "+", language: "French" },
  { pattern: /\b(moins)\b/gi, replacement: "-", language: "French" },
  { pattern: /\b(fois)\b/gi, replacement: "*", language: "French" },
  { pattern: /\b(divisé)\b/gi, replacement: "/", language: "French" },
  { pattern: /\b(égal)\b/gi, replacement: "=", language: "French" },

  // German
  { pattern: /\b(null)\b/gi, replacement: "0", language: "German" },
  { pattern: /\b(eins)\b/gi, replacement: "1", language: "German" },
  { pattern: /\b(zwei)\b/gi, replacement: "2", language: "German" },
  { pattern: /\b(drei)\b/gi, replacement: "3", language: "German" },
  { pattern: /\b(vier)\b/gi, replacement: "4", language: "German" },
  { pattern: /\b(fünf)\b/gi, replacement: "5", language: "German" },
  { pattern: /\b(sechs)\b/gi, replacement: "6", language: "German" },
  { pattern: /\b(sieben)\b/gi, replacement: "7", language: "German" },
  { pattern: /\b(acht)\b/gi, replacement: "8", language: "German" },
  { pattern: /\b(neun)\b/gi, replacement: "9", language: "German" },
  { pattern: /\b(zehn)\b/gi, replacement: "10", language: "German" },
  { pattern: /\b(mal)\b/gi, replacement: "*", language: "German" },
  { pattern: /\b(geteilt)\b/gi, replacement: "/", language: "German" },
  { pattern: /\b(gleich)\b/gi, replacement: "=", language: "German" },
];

// Roman Numerals conversion
function convertRomanNumerals(str: string): { converted: string; found: boolean } {
  const romanMap: Record<string, number> = {
    M: 1000, CM: 900, D: 500, CD: 400,
    C: 100, XC: 90, L: 50, XL: 40,
    X: 10, IX: 9, V: 5, IV: 4, I: 1,
  };
  // Only match Roman numerals of 2+ characters or unambiguous Roman numerals (not single variable x/X or i/I)
  const romanRegex = /\b(?!x\b|X\b|i\b|I\b)[IVXLCDM]+\b/gi;
  let found = false;
  const converted = str.replace(romanRegex, (match) => {
    // Exclude single letters 'x' and 'i' which are common algebraic variables
    if (match.toLowerCase() === "x" || match.toLowerCase() === "i") return match;
    const s = match.toUpperCase();
    let num = 0;
    let i = 0;
    while (i < s.length) {
      const two = s.substring(i, i + 2);
      if (romanMap[two]) {
        num += romanMap[two];
        i += 2;
      } else if (romanMap[s[i]]) {
        num += romanMap[s[i]];
        i += 1;
      } else {
        return match; // not valid roman
      }
    }
    if (num > 0) {
      found = true;
      return num.toString();
    }
    return match;
  });
  return { converted, found };
}

/**
 * Universal normalizer: converts any script, numeral system, or math words into English digits & operators
 */
export function normalizeMultilingualMath(raw: string): {
  normalized: string;
  detectedLanguage?: string;
  original: string;
} {
  if (!raw || typeof raw !== "string") {
    return { normalized: "", original: "" };
  }

  let text = raw.trim();
  const detectedSources: string[] = [];
  const hasEnglishDigits = /[0-9]/.test(raw);

  // 1. Check & convert numeral scripts
  for (const script of NUMERAL_SCRIPTS) {
    let scriptMatched = false;
    for (const [nativeDigit, engDigit] of Object.entries(script.map)) {
      if (text.includes(nativeDigit)) {
        text = text.split(nativeDigit).join(engDigit);
        scriptMatched = true;
      }
    }
    if (scriptMatched && !detectedSources.includes(script.name)) {
      detectedSources.push(script.name);
    }
  }

  // 2. Check Roman numerals
  const romanResult = convertRomanNumerals(text);
  if (romanResult.found) {
    text = romanResult.converted;
    if (!detectedSources.includes("Roman Numerals")) {
      detectedSources.push("Roman Numerals");
    }
  }

  // 3. Check language words
  for (const item of WORD_TRANSLATIONS) {
    if (item.pattern.test(text)) {
      text = text.replace(item.pattern, item.replacement);
      if (!detectedSources.includes(item.language)) {
        detectedSources.push(item.language);
      }
    }
  }

  // Determine detectedLanguage, highlighting mixed language if multiple scripts/sources are present
  let detected: string | undefined = undefined;
  if (detectedSources.length === 0) {
    if (hasEnglishDigits) {
      detected = "English";
    }
  } else if (detectedSources.length === 1) {
    const singleSource = detectedSources[0];
    if (hasEnglishDigits && singleSource !== "English" && singleSource !== "Hinglish") {
      // e.g. User wrote Devanagari digit and English digit: "३ + 5 ="
      const shortName = singleSource.includes("Devanagari") ? "Devanagari" : singleSource.split(" ")[0];
      detected = `Mixed (${shortName} & English)`;
    } else if (singleSource === "Hinglish" && hasEnglishDigits) {
      detected = "Mixed (Hinglish & English)";
    } else {
      detected = singleSource;
    }
  } else {
    // Multiple languages/scripts mixed (e.g. Devanagari + Hinglish, or Devanagari + English)
    const displayNames = detectedSources.map((s) => (s.includes("Devanagari") ? "Devanagari" : s));
    if (hasEnglishDigits && !displayNames.includes("English")) {
      displayNames.push("English");
    }
    detected = `Mixed (${displayNames.join(" & ")})`;
  }

  // Replace common mathematical symbols & superscripts
  text = text
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/⁰/g, "^0")
    .replace(/¹/g, "^1")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/⁴/g, "^4")
    .replace(/⁵/g, "^5")
    .replace(/⁶/g, "^6")
    .replace(/⁷/g, "^7")
    .replace(/⁸/g, "^8")
    .replace(/⁹/g, "^9")
    // Degree sign often transcribed when user writes superscript circle zero e.g. x°, e°
    .replace(/([a-zA-Z0-9)])\s*°/g, "$1^0")
    // Handwriting OCR flattening single variable directly followed by 0 (e.g. x0, e0, e 0 -> x^0, e^0)
    .replace(/\b([a-zA-Z])\s*0(?=\s*([=+\-*/×÷()^]|$|\?))/g, "$1^0")
    .replace(/\b([a-zA-Z])\s*0\b/g, "$1^0")
    .replace(/(\d)\s*[xX]\s*(\d)/g, "$1 * $2");

  // Handle square root symbols: e.g. √16, \sqrt{16}, sqrt(16)
  text = text
    .replace(/\\sqrt\{([^}]+)\}/g, "sqrt($1)")
    .replace(/√\s*(\d+(?:\.\d+)?)/g, "sqrt($1)")
    .replace(/√\s*\(([^)]+)\)/g, "sqrt($1)");

  // Pre-evaluate simple sqrt expressions so standard evaluator can process: sqrt(16) -> 4
  text = text.replace(/sqrt\((\d+(?:\.\d+)?)\)/gi, (_m, numStr) => {
    const val = parseFloat(numStr);
    if (!isNaN(val) && val >= 0) {
      const sq = Math.sqrt(val);
      return String(Math.abs(sq - Math.round(sq)) < 1e-8 ? Math.round(sq) : parseFloat(sq.toFixed(4)));
    }
    return _m;
  });

  return {
    normalized: text,
    detectedLanguage: detected,
    original: raw,
  };
}

/**
 * Evaluates an arithmetic expression with standard mathematical order of operations:
 * 1. Operations inside Parentheses / Brackets first
 * 2. Exponents / Powers next
 * 3. Multiplication and Division have equal precedence, evaluated strictly left to right
 * 4. Addition and Subtraction have equal precedence, evaluated strictly left to right
 */
export function evaluateConventionArithmetic(
  rawExpr: string,
  _convention?: "bodmas" | "pemdas" | string
): {
  answer: string;
  steps: string[];
  appliedRule: string;
  shortExplanation: string;
  ruleBreakdown: string;
  hasDiscrepancy: boolean;
  bodmasAnswer: string;
  pemdasAnswer: string;
} | null {
  function parseAndSolve(exprStr: string) {
    let s = exprStr.replace(/\s+/g, "").replace(/\^/g, "**");
    s = s.replace(/×/g, "*").replace(/÷/g, "/").replace(/:/g, "/");
    // Normalize implicit multiplication: e.g. 2(3) -> 2*(3), (2)(3) -> (2)*(3)
    s = s.replace(/(\d)(\()/g, "$1*(");
    s = s.replace(/(\))(\d)/g, ")*$1");
    s = s.replace(/(\))(\()/g, ")*(");

    const tokens: (number | string)[] = [];
    let i = 0;
    while (i < s.length) {
      if (s[i] === "*" && s[i + 1] === "*") {
        tokens.push("^");
        i += 2;
      } else if (/[0-9.]/.test(s[i])) {
        let numStr = "";
        while (i < s.length && /[0-9.]/.test(s[i])) {
          numStr += s[i++];
        }
        const val = parseFloat(numStr);
        if (isNaN(val)) return null;
        tokens.push(val);
      } else if (s[i] === "-" && (i === 0 || ["(", "+", "-", "*", "/", "^", "%"].includes(tokens[tokens.length - 1] as string))) {
        i++;
        let numStr = "-";
        while (i < s.length && /[0-9.]/.test(s[i])) {
          numStr += s[i++];
        }
        if (numStr === "-") {
          tokens.push(0);
          tokens.push("-");
        } else {
          const val = parseFloat(numStr);
          if (isNaN(val)) return null;
          tokens.push(val);
        }
      } else if (["+", "-", "*", "/", "(", ")", "^", "%"].includes(s[i])) {
        tokens.push(s[i++]);
      } else {
        return null;
      }
    }

    if (tokens.length === 0) return null;

    // Standard operator precedence:
    // ^ (Exponents): 5
    // * and / (Multiplication & Division): 4 (equal precedence, evaluated left to right)
    // + and - (Addition & Subtraction): 2 (equal precedence, evaluated left to right)
    const prec: Record<string, number> = { "^": 5, "*": 4, "/": 4, "%": 4, "+": 2, "-": 2 };

    const output: (number | string)[] = [];
    const ops: string[] = [];

    for (const t of tokens) {
      if (typeof t === "number") {
        output.push(t);
      } else if (t === "(") {
        ops.push(t);
      } else if (t === ")") {
        while (ops.length > 0 && ops[ops.length - 1] !== "(") {
          output.push(ops.pop()!);
        }
        if (ops.length === 0) return null; // Mismatched parentheses
        ops.pop();
      } else if (prec[t]) {
        while (
          ops.length > 0 &&
          ops[ops.length - 1] !== "(" &&
          (t !== "^" ? prec[ops[ops.length - 1]] >= prec[t] : prec[ops[ops.length - 1]] > prec[t])
        ) {
          output.push(ops.pop()!);
        }
        ops.push(t);
      }
    }
    while (ops.length > 0) {
      const top = ops.pop()!;
      if (top === "(") return null;
      output.push(top);
    }

    const stack: number[] = [];
    const stepLines: string[] = [];

    for (const item of output) {
      if (typeof item === "number") {
        stack.push(item);
      } else {
        if (stack.length < 2) return null;
        const b = stack.pop()!;
        const a = stack.pop()!;
        let res = 0;
        if (item === "+") res = a + b;
        else if (item === "-") res = a - b;
        else if (item === "*") res = a * b;
        else if (item === "/") res = b === 0 ? 0 : a / b;
        else if (item === "%") res = a % b;
        else if (item === "^") res = Math.pow(a, b);

        const rounded = Math.abs(res - Math.round(res)) < 1e-8 ? Math.round(res) : parseFloat(res.toFixed(4));
        const opName =
          item === "^"
            ? "Orders (Power)"
            : item === "/"
            ? "Division"
            : item === "*"
            ? "Multiplication"
            : item === "+"
            ? "Addition"
            : item === "-"
            ? "Subtraction"
            : "Operation";

        const symbolDisp = item === "*" ? "×" : item === "/" ? "÷" : item;
        stepLines.push(`Step [${opName}]: Calculate ${a} ${symbolDisp} ${b} = ${rounded}`);
        stack.push(rounded);
      }
    }

    if (stack.length !== 1) return null;
    return { answer: `${stack[0]}`, steps: stepLines };
  }

  try {
    const solved = parseAndSolve(rawExpr);
    if (!solved) return null;

    const appliedRule = "BODMAS Rule (Default)";
    const ruleBreakdown = "B (Brackets) → O (Orders / Powers) → D (Division) → M (Multiplication) → A (Addition) → S (Subtraction)";
    const shortExplanation = `Evaluated according to standard BODMAS rule: Brackets (B) → Orders (O) → Division (D) → Multiplication (M) → Addition (A) → Subtraction (S). Result = ${solved.answer}.`;

    const steps = [
      `Input expression: ${rawExpr}`,
      ...solved.steps,
      `Calculated Answer: ${solved.answer}`,
    ];

    return {
      answer: solved.answer,
      steps,
      appliedRule,
      shortExplanation,
      ruleBreakdown,
      hasDiscrepancy: false,
      bodmasAnswer: solved.answer,
      pemdasAnswer: solved.answer,
    };
  } catch {
    return null;
  }
}

export function evaluateBasicMath(input: string, _convention?: string): QuickEvalResult | null {
  if (!input || typeof input !== "string") return null;

  // Perform multilingual normalization
  const { normalized, detectedLanguage, original } = normalizeMultilingualMath(input);
  if (!normalized) return null;

  // Clean expression: remove trailing '=', '?', spaces
  let expr = normalized.trim();
  expr = expr.replace(/[=?\s]+$/, "").trim();
  if (!expr) return null;

  const sanitized = expr;

  // Core expression for evaluation (extract left side if equal sign is present)
  let coreExpr = sanitized;
  if (normalized.includes("=")) {
    const p = normalized.split("=");
    coreExpr = p[0].trim().replace(/[?\s]+$/, "");
  }

  // 1. Zero Exponent Rule: Any non-zero variable, letter, constant, or number raised to power 0 equals 1
  // Handles x^0, e^0, a^0, y^0, z^0, b^0, 10^0, 2^0, (x)^0, (2x)^0
  const zeroExpMatch = coreExpr.match(/^([a-zA-Z]+|\d+(?:\.\d+)?|\([^)]+\))\s*(?:\^|\*\*)\s*0$/);
  if (zeroExpMatch) {
    const base = zeroExpMatch[1].trim();
    const cleanBase = base.replace(/^\((.+)\)$/, "$1");
    return {
      expression: original,
      answer: "1",
      fullEquation: `${base}^0 = 1`,
      appliedRule: `Zero Exponent Rule (${cleanBase}⁰ = 1)`,
      shortExplanation: `Zero Exponent Rule: Any non-zero base raised to the power of 0 equals 1 (a⁰ = 1). Therefore, ${base}⁰ = 1.`,
      steps: [
        `Input expression: ${original}`,
        `Base: ${cleanBase}, Exponent: 0`,
        `Zero Exponent Law: For any non-zero value a, a⁰ = 1`,
        `Calculated result: (${cleanBase})⁰ = 1`,
      ],
      detectedLanguage: "English",
      englishTransliteration: `${base}^0 = 1`,
    };
  }

  // 2. Constant 'e' (Euler's number) powers: e^1, e
  if (/^e\s*(?:\^|\*\*)\s*1$/i.test(coreExpr) || /^e$/i.test(coreExpr)) {
    const eVal = "2.7183";
    return {
      expression: original,
      answer: eVal,
      fullEquation: `e = ${eVal}`,
      appliedRule: "Euler's Number Constant (e)",
      shortExplanation: `Euler's number 'e' is a fundamental mathematical constant approximately equal to 2.71828.`,
      steps: [
        `Input expression: ${original}`,
        `Euler's number e is the base of natural logarithms`,
        `Approximate value: e ≈ 2.71828...`,
      ],
      detectedLanguage: "English",
      englishTransliteration: `e = ${eVal}`,
    };
  }

  // 3. Variable identity power of 1: x^1 = x, a^1 = a
  const oneExpMatch = coreExpr.match(/^([a-zA-Z])\s*(?:\^|\*\*)\s*1$/);
  if (oneExpMatch) {
    const v = oneExpMatch[1];
    return {
      expression: original,
      answer: v,
      fullEquation: `${v}^1 = ${v}`,
      appliedRule: `Identity Exponent Rule (${v}¹ = ${v})`,
      shortExplanation: `Any quantity raised to the power of 1 equals itself: ${v}¹ = ${v}.`,
      steps: [
        `Input expression: ${original}`,
        `Identity Exponent Law: a¹ = a`,
        `Result: ${v}¹ = ${v}`,
      ],
      detectedLanguage: "English",
      englishTransliteration: `${v}^1 = ${v}`,
    };
  }

  // 4. Standalone numeric exponent: e.g. 2^3 = 8, 5^2 = 25, 10^2 = 100
  const numPowerMatch = coreExpr.match(/^([+-]?\d+(?:\.\d+)?)\s*(?:\^|\*\*)\s*([+-]?\d+(?:\.\d+)?)$/);
  if (numPowerMatch) {
    const b = parseFloat(numPowerMatch[1]);
    const p = parseFloat(numPowerMatch[2]);
    const val = Math.pow(b, p);
    if (!isNaN(val) && isFinite(val)) {
      const rounded = Math.abs(val - Math.round(val)) < 1e-8 ? Math.round(val) : parseFloat(val.toFixed(4));
      return {
        expression: original,
        answer: `${rounded}`,
        fullEquation: `${b}^${p} = ${rounded}`,
        appliedRule: p === 0 ? "Zero Exponent Rule (a⁰ = 1)" : "Exponentiation (Power Rule)",
        shortExplanation: `Raised base ${b} to power ${p}: ${b}^${p} = ${rounded}.`,
        steps: [
          `Input expression: ${original}`,
          `Base: ${b}, Exponent: ${p}`,
          `Calculation: ${b}^${p} = ${rounded}`,
        ],
        detectedLanguage: "English",
        englishTransliteration: `${b}^${p} = ${rounded}`,
      };
    }
  }

  // 5. Compound expressions containing Exponents / Zero Powers / Constants (e.g. e^0 + 6, 6 + e^0, x^0 + 5, 2^3 + 4, e^0 * 3)
  const hasExponentInCompound = /(?:[a-zA-Z]+|\d+(?:\.\d+)?|\([^)]+\))\s*(?:\^|\*\*)\s*\d+/.test(coreExpr) &&
    /[+\-*/×÷:%]/.test(coreExpr);

  if (hasExponentInCompound) {
    let simplified = coreExpr;
    const powerSubstitutions: string[] = [];

    // Replace zero exponent terms: (base)^0 -> 1 by Zero Exponent Rule
    simplified = simplified.replace(/([a-zA-Z]+|\d+(?:\.\d+)?|\([^)]+\))\s*(?:\^|\*\*)\s*0/g, (_m, base) => {
      const cleanBase = base.replace(/^\((.+)\)$/, "$1");
      powerSubstitutions.push(`Zero Exponent Rule: ${cleanBase}⁰ = 1`);
      return "1";
    });

    // Replace numerical powers: base^exp -> evaluated number
    simplified = simplified.replace(/(\d+(?:\.\d+)?)\s*(?:\^|\*\*)\s*(\d+(?:\.\d+)?)/g, (_m, bStr, pStr) => {
      const b = parseFloat(bStr);
      const p = parseFloat(pStr);
      const val = Math.pow(b, p);
      if (!isNaN(val) && isFinite(val)) {
        const rounded = Math.abs(val - Math.round(val)) < 1e-8 ? Math.round(val) : parseFloat(val.toFixed(4));
        powerSubstitutions.push(`Evaluate Power: ${bStr}^${pStr} = ${rounded}`);
        return `${rounded}`;
      }
      return _m;
    });

    // Clean operators for arithmetic evaluation
    const cleanForEval = simplified.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");

    if (/^[0-9+\-*/().\s^%]+$/.test(cleanForEval)) {
      const convRes = evaluateConventionArithmetic(cleanForEval);
      let calculatedAnswer = convRes ? convRes.answer : null;
      if (!calculatedAnswer) {
        try {
          const evalFn = new Function(`return (${cleanForEval.replace(/\^/g, "**")});`);
          const evalVal = evalFn();
          if (typeof evalVal === "number" && !isNaN(evalVal) && isFinite(evalVal)) {
            calculatedAnswer = `${Math.abs(evalVal - Math.round(evalVal)) < 1e-8 ? Math.round(evalVal) : parseFloat(evalVal.toFixed(4))}`;
          }
        } catch {}
      }

      if (calculatedAnswer !== null) {
        const hasZeroExp = /([a-zA-Z]+|\d+(?:\.\d+)?|\([^)]+\))\s*(?:\^|\*\*)\s*0/.test(coreExpr);
        const appliedRule = hasZeroExp
          ? "Zero Exponent Rule & Order of Operations"
          : "Order of Operations";

        return {
          expression: original,
          answer: calculatedAnswer,
          fullEquation: `${coreExpr} = ${calculatedAnswer}`,
          appliedRule,
          shortExplanation: `Evaluated ${coreExpr}: ${powerSubstitutions.join(", ")}, yielding ${calculatedAnswer}.`,
          steps: [
            `Input expression: ${original}`,
            ...powerSubstitutions,
            `Substitute into expression: ${simplified}`,
            ...(convRes ? convRes.steps.slice(1) : [`Calculated result: ${calculatedAnswer}`]),
            `Final Answer: ${calculatedAnswer}`,
          ],
          detectedLanguage: "English",
          englishTransliteration: `${coreExpr} = ${calculatedAnswer}`,
        };
      }
    }
  }

  // Check if expression contains '='
  if (normalized.includes("=")) {
    const parts = normalized.split("=");
    const leftPart = parts[0].trim();
    const rightPart = parts.slice(1).join("=").trim().replace(/\?+$/, "").trim();

    // 1. Check variable assignment: e.g. "a = 6", "x = 25", "b = a"
    const singleVarMatch = leftPart.match(/^([a-zA-Z])$/);
    if (singleVarMatch) {
      const varName = singleVarMatch[1];
      // If right side is an arithmetic expression e.g. "2 + 4"
      if (/^[0-9+\-*/().\s^%]+$/.test(rightPart) && rightPart.length > 0) {
        try {
          const evalFn = new Function(`return (${rightPart.replace(/\^/g, "**")});`);
          const evalRes = evalFn();
          if (typeof evalRes === "number" && !isNaN(evalRes) && isFinite(evalRes)) {
            const roundedVal = Math.abs(evalRes - Math.round(evalRes)) < 1e-8 ? Math.round(evalRes) : parseFloat(evalRes.toFixed(4));
            return {
              expression: original,
              answer: `${roundedVal}`,
              fullEquation: `${varName} = ${roundedVal}`,
              appliedRule: "Variable Value Assignment",
              shortExplanation: `Evaluated ${varName} = ${roundedVal}.`,
              steps: [`Assigned variable: ${varName}`, `Evaluated right side expression: ${rightPart} = ${roundedVal}`],
              detectedLanguage: "English",
              englishTransliteration: `${varName} = ${roundedVal}`,
            };
          }
        } catch {}
      }
      if (rightPart.length > 0) {
        return {
          expression: original,
          answer: rightPart,
          fullEquation: `${varName} = ${rightPart}`,
          appliedRule: "Variable Value Assignment",
          shortExplanation: `Assigned variable ${varName} to ${rightPart}.`,
          steps: [`Identified variable: ${varName}`, `Assigned value: ${rightPart}`],
          detectedLanguage: "English",
          englishTransliteration: `${varName} = ${rightPart}`,
        };
      }
    }

    // 2. Check linear equation in one variable: e.g. "x + 2 = 5", "x - 4 = 10", "2x = 10", "2x + 4 = 10", "3x - 5 = 10"
    const linFullMatch = leftPart.match(/^([+-]?\d+(?:\.\d+)?)\s*\*?\s*([a-zA-Z])\s*([+\-])\s*(\d+(?:\.\d+)?)$/);
    if (linFullMatch && /^[+-]?\d+(?:\.\d+)?$/.test(rightPart)) {
      const coeff = parseFloat(linFullMatch[1]);
      const v = linFullMatch[2];
      const sign = linFullMatch[3];
      const b = parseFloat(linFullMatch[4]);
      const c = parseFloat(rightPart);
      if (coeff !== 0) {
        const rhs = sign === "+" ? c - b : c + b;
        const sol = rhs / coeff;
        const roundedSol = Math.abs(sol - Math.round(sol)) < 1e-8 ? Math.round(sol) : parseFloat(sol.toFixed(4));
        return {
          expression: original,
          answer: `${roundedSol}`,
          fullEquation: `${v} = ${roundedSol}`,
          appliedRule: "Linear Equation Solving",
          shortExplanation: `Solved ${leftPart} = ${rightPart} for ${v}: ${v} = ${roundedSol}.`,
          steps: [
            `Given equation: ${leftPart} = ${rightPart}`,
            `Isolate variable term: ${coeff}${v} = ${rightPart} ${sign === "+" ? "-" : "+"} ${b} = ${rhs}`,
            `Divide by coefficient: ${v} = ${rhs} / ${coeff} = ${roundedSol}`,
          ],
          detectedLanguage: "English",
          englishTransliteration: `${v} = ${roundedSol}`,
        };
      }
    }

    const linAddSubMatch = leftPart.match(/^([a-zA-Z])\s*([+\-])\s*(\d+(?:\.\d+)?)$/);
    if (linAddSubMatch && /^\d+(?:\.\d+)?$/.test(rightPart)) {
      const v = linAddSubMatch[1];
      const sign = linAddSubMatch[2];
      const n1 = parseFloat(linAddSubMatch[3]);
      const n2 = parseFloat(rightPart);
      const sol = sign === "+" ? n2 - n1 : n2 + n1;
      const roundedSol = Math.abs(sol - Math.round(sol)) < 1e-8 ? Math.round(sol) : parseFloat(sol.toFixed(4));
      return {
        expression: original,
        answer: `${roundedSol}`,
        fullEquation: `${v} = ${roundedSol}`,
        appliedRule: "Linear Equation Solving",
        shortExplanation: `Solved for ${v}: ${v} = ${roundedSol}.`,
        steps: [`Given: ${leftPart} = ${rightPart}`, `Isolate ${v}: ${v} = ${rightPart} ${sign === "+" ? "-" : "+"} ${n1}`, `Calculated result: ${roundedSol}`],
        detectedLanguage: "English",
        englishTransliteration: `${v} = ${roundedSol}`,
      };
    }

    const linMulMatch = leftPart.match(/^(\d+(?:\.\d+)?)\s*\*?\s*([a-zA-Z])$/);
    if (linMulMatch && /^\d+(?:\.\d+)?$/.test(rightPart)) {
      const coeff = parseFloat(linMulMatch[1]);
      const v = linMulMatch[2];
      const n2 = parseFloat(rightPart);
      if (coeff !== 0) {
        const sol = n2 / coeff;
        const roundedSol = Math.abs(sol - Math.round(sol)) < 1e-8 ? Math.round(sol) : parseFloat(sol.toFixed(4));
        return {
          expression: original,
          answer: `${roundedSol}`,
          fullEquation: `${v} = ${roundedSol}`,
          appliedRule: "Linear Equation Solving",
          shortExplanation: `Divided both sides by ${coeff} to find ${v} = ${roundedSol}.`,
          steps: [`Given: ${coeff}${v} = ${rightPart}`, `Divide by coefficient: ${v} = ${rightPart} / ${coeff}`, `Calculated result: ${roundedSol}`],
          detectedLanguage: "English",
          englishTransliteration: `${v} = ${roundedSol}`,
        };
      }
    }

    // 3. Check arithmetic on left side: e.g. "1 + 7 =" or "6 / 2 * 3 =" or "10 - 4 ="
    if (/^[0-9+\-*/().\s^%×÷:]+$/.test(leftPart)) {
      const convRes = evaluateConventionArithmetic(leftPart);
      if (convRes) {
        return {
          expression: original,
          answer: convRes.answer,
          fullEquation: `${leftPart} = ${convRes.answer}`,
          appliedRule: convRes.appliedRule,
          shortExplanation: convRes.shortExplanation,
          ruleBreakdown: convRes.ruleBreakdown,
          steps: convRes.steps,
          detectedLanguage: "English",
          englishTransliteration: `${leftPart} = ${convRes.answer}`,
        };
      }
      try {
        const jsExpr = leftPart.replace(/\^/g, "**").replace(/×/g, "*").replace(/÷/g, "/");
        const evalFn = new Function(`return (${jsExpr});`);
        const evalRes = evalFn();
        if (typeof evalRes === "number" && !isNaN(evalRes) && isFinite(evalRes)) {
          const roundedVal = Math.abs(evalRes - Math.round(evalRes)) < 1e-8 ? Math.round(evalRes) : parseFloat(evalRes.toFixed(4));
          return {
            expression: original,
            answer: `${roundedVal}`,
            fullEquation: `${leftPart} = ${roundedVal}`,
            appliedRule: "Order of Operations",
            shortExplanation: `Evaluated ${leftPart} = ${roundedVal}.`,
            steps: [`Formula: ${leftPart}`, `Calculated result: ${roundedVal}`],
            detectedLanguage: "English",
            englishTransliteration: `${leftPart} = ${roundedVal}`,
          };
        }
      } catch {}
    }
  }

  // Check if it's a single number (positive or negative, integer or decimal)
  if (/^[+-]?\d+(\.\d+)?$/.test(sanitized)) {
    const num = sanitized;
    return {
      expression: original,
      answer: num,
      fullEquation: `${num} = ${num}`,
      appliedRule: "Numeral Identity Rule",
      shortExplanation: `Identified number ${num}.`,
      steps: [`Input value: ${original}`, `Evaluated result: ${num}`],
      detectedLanguage: "English",
      englishTransliteration: num,
    };
  }

  // Check single variable: e.g. "b", "x", "y", "a"
  if (/^[a-zA-Z]$/.test(sanitized)) {
    const v = sanitized;
    return {
      expression: original,
      answer: v,
      fullEquation: `${v} = ${v}`,
      appliedRule: "Algebraic Variable Identity Rule",
      shortExplanation: `Identified algebraic variable '${v}'.`,
      steps: [`Input variable: ${original}`, `Evaluated identity: ${v} = ${v}`],
      detectedLanguage: "English",
      englishTransliteration: v,
    };
  }

  // Check single math symbol: e.g. "+", "-", "*", "×", "/", "÷", "=", "^", "√", "%", "!"
  const MATH_SYMBOLS: Record<string, { name: string; desc: string }> = {
    "+": { name: "Addition Operator", desc: "Identified addition symbol (+)." },
    "-": { name: "Subtraction Operator", desc: "Identified subtraction symbol (-)." },
    "*": { name: "Multiplication Operator", desc: "Identified multiplication symbol (*)." },
    "×": { name: "Multiplication Operator", desc: "Identified multiplication symbol (×)." },
    "/": { name: "Division Operator", desc: "Identified division operator (/)." },
    "÷": { name: "Division Operator", desc: "Identified division operator (÷)." },
    "=": { name: "Equality Relation", desc: "Identified equality relation symbol (=)." },
    "^": { name: "Exponentiation Operator", desc: "Identified power / exponentiation symbol (^)." },
    "√": { name: "Radical / Square Root", desc: "Identified radical / square root symbol (√)." },
    "%": { name: "Modulo / Percentage", desc: "Identified percentage / modulo operator (%)." },
    "!": { name: "Factorial Operator", desc: "Identified factorial operator (!)." },
  };

  if (MATH_SYMBOLS[sanitized]) {
    const sym = MATH_SYMBOLS[sanitized];
    return {
      expression: original,
      answer: sanitized,
      fullEquation: `${sanitized} (${sym.name})`,
      appliedRule: sym.name,
      shortExplanation: sym.desc,
      steps: [`Identified handwritten symbol: ${original}`, `Mathematical role: ${sym.name}`],
      detectedLanguage: "English",
      englishTransliteration: sanitized,
    };
  }

  // Check square root: e.g. "√16", "√9", "sqrt(25)"
  const sqrtMatch = sanitized.match(/^(?:√|sqrt\(?)\s*(\d+(?:\.\d+)?)\)?$/);
  if (sqrtMatch) {
    const num = parseFloat(sqrtMatch[1]);
    const res = Math.sqrt(num);
    const roundedRes = Math.abs(res - Math.round(res)) < 1e-8 ? Math.round(res) : parseFloat(res.toFixed(4));
    return {
      expression: original,
      answer: `${roundedRes}`,
      fullEquation: `√${num} = ${roundedRes}`,
      appliedRule: "Square Root Evaluation",
      shortExplanation: `Evaluated square root of ${num}: √${num} = ${roundedRes}.`,
      steps: [`Input radical: √${num}`, `Calculated principal square root: ${roundedRes}`],
      detectedLanguage: "English",
      englishTransliteration: `√${num} = ${roundedRes}`,
    };
  }

  // Check general algebraic expression with variables: e.g. "x + y", "2a + 3b", "x + 5"
  if (/^[a-zA-Z0-9+\-*/^().\s]+$/.test(sanitized) && /[a-zA-Z]/.test(sanitized) && !sanitized.includes("=")) {
    return {
      expression: original,
      answer: sanitized,
      fullEquation: sanitized,
      appliedRule: "Algebraic Expression",
      shortExplanation: `Identified algebraic expression: ${sanitized}.`,
      steps: [`Identified handwritten expression: ${sanitized}`, `Standard algebraic representation: ${sanitized}`],
      detectedLanguage: "English",
      englishTransliteration: sanitized,
    };
  }

  // Check simple binary operation: a op b (e.g. 3 + 3, 10 - 4, 6 * 7, 24 / 4)
  const binaryMatch = sanitized.match(/^([+-]?\d+(?:\.\d+)?)\s*([+\-*/^%])\s*([+-]?\d+(?:\.\d+)?)$/);
  if (binaryMatch) {
    const a = parseFloat(binaryMatch[1]);
    const op = binaryMatch[2];
    const b = parseFloat(binaryMatch[3]);

    let res = 0;
    let ruleName = "Arithmetic Operation";
    let ruleNote = "";

    if (op === "+") {
      res = a + b;
      ruleName = "Addition (Sum of Numbers)";
      ruleNote = `Combined ${a} and ${b} to find the sum.`;
    } else if (op === "-") {
      res = a - b;
      ruleName = "Subtraction (Difference)";
      ruleNote = `Subtracted ${b} from ${a} to find the difference.`;
    } else if (op === "*") {
      res = a * b;
      ruleName = "Multiplication (Product)";
      ruleNote = `Multiplied ${a} by ${b} to find the product.`;
    } else if (op === "/") {
      if (b === 0) return null;
      res = a / b;
      ruleName = "Division (Quotient)";
      ruleNote = `Divided ${a} by ${b} to find the quotient.`;
    } else if (op === "^") {
      res = Math.pow(a, b);
      ruleName = "Exponentiation (Power Rule)";
      ruleNote = `Raised base ${a} to power ${b}.`;
    } else if (op === "%") {
      res = a % b;
      ruleName = "Modulo (Remainder)";
      ruleNote = `Divided ${a} by ${b} to find the remainder.`;
    }

    const roundedRes = Math.abs(res - Math.round(res)) < 1e-8 ? Math.round(res) : parseFloat(res.toFixed(4));
    const langInfo = detectedLanguage ? ` (Detected: ${detectedLanguage})` : "";

    return {
      expression: original,
      answer: `${roundedRes}`,
      fullEquation: `${a} ${op} ${b} = ${roundedRes}`,
      appliedRule: ruleName,
      ruleBreakdown: ruleNote,
      shortExplanation: `${a} ${op} ${b} = ${roundedRes}.${langInfo} ${ruleNote}`,
      steps: [
        `Detected input: ${original}${langInfo}`,
        `Standard English formula: ${a} ${op} ${b}`,
        `Evaluated result: ${roundedRes}`,
      ],
      detectedLanguage,
      englishTransliteration: `${a} ${op} ${b}`,
    };
  }

  // Check multi-operator arithmetic (e.g. 6 / 2 * 3, 3 + 3 * 2, (4 + 6) / 2) safely
  if (/^[0-9+\-*/().\s^%×÷:]+$/.test(sanitized)) {
    const convRes = evaluateConventionArithmetic(sanitized);
    if (convRes) {
      return {
        expression: original,
        answer: convRes.answer,
        fullEquation: `${sanitized} = ${convRes.answer}`,
        appliedRule: convRes.appliedRule,
        shortExplanation: convRes.shortExplanation,
        ruleBreakdown: convRes.ruleBreakdown,
        steps: convRes.steps,
        detectedLanguage,
        englishTransliteration: sanitized,
      };
    }

    try {
      const jsExpr = sanitized.replace(/\^/g, "**").replace(/×/g, "*").replace(/÷/g, "/");
      if (!/^[\d\s+\-*/().*]+$/.test(jsExpr)) return null;

      const evalFn = new Function(`return (${jsExpr});`);
      const rawRes = evalFn();
      if (typeof rawRes === "number" && !isNaN(rawRes) && isFinite(rawRes)) {
        const roundedRes = Math.abs(rawRes - Math.round(rawRes)) < 1e-8 ? Math.round(rawRes) : parseFloat(rawRes.toFixed(4));
        const precedenceRule = "Order of Operations";

        return {
          expression: original,
          answer: `${roundedRes}`,
          fullEquation: `${sanitized} = ${roundedRes}`,
          appliedRule: precedenceRule,
          shortExplanation: `Evaluated ${sanitized} = ${roundedRes} following order of operations.`,
          steps: [`Input: ${sanitized}`, `Calculated result: ${roundedRes}`],
          detectedLanguage,
          englishTransliteration: sanitized,
        };
      }
    } catch {
      // Ignore evaluation errors
    }
  }

  return null;
}

export interface OrderOfOpsComparison {
  bodmas: {
    rule: string;
    acronym: string;
    steps: string[];
    prioritySummary: string;
    answer: string;
  };
  pemdas: {
    rule: string;
    acronym: string;
    steps: string[];
    prioritySummary: string;
    answer: string;
  };
  hasDiscrepancy: boolean;
  sameAnswerExplanation: string;
  answer: string;
}

/**
 * Returns null to prevent dual convention / comparison display
 */
export function getOrderOfOperationsComparison(_expr: string): OrderOfOpsComparison | null {
  return null;
}

