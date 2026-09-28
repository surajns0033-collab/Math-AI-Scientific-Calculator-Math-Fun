# 🧮 OmniMath AI (ओम्नीमैथ एआई)
### *Next-Generation Scientific Calculator, Multimodal Handwritten Math Canvas & Pedagogical STEM Solver*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19.0.1-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript 5+](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini AI](https://img.shields.io/badge/Google_Gemini-3.8_Flash-8E75C4?logo=google-gemini&logoColor=white)](https://ai.google.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

---

## 📌 Executive Overview

**OmniMath AI** is an enterprise-grade mathematical platform combining three foundational paradigms into a seamless, high-performance workspace:
1. **Interactive Handwritten Digital Ink Canvas** powered by a hybrid architecture: an instant, zero-latency deterministic stroke recognition engine running locally, augmented by Google Gemini Multimodal Vision AI for complex expressions and step explanations.
2. **Professional-Grade Scientific Calculator** with extensive support for trigonometric, hyperbolic, logarithmic, combinatoric, and algebraic computations.
3. **Pedagogical AI Solver & Gamified Learning Suite** providing step-by-step educational breakdowns, voice-driven math input, kids number writing practice with path deviation tracking, interactive number arrangement puzzles, unit conversions, and daily STEM trivia.

Whether for elementary learners mastering numeral formation, high school students practicing algebraic problem-solving, or university researchers evaluating physics equations, OmniMath AI provides instant feedback, 100% calculation reliability, and zero distractions.

---

## ✨ Core Pillars & Features

### 1. ✍️ Intelligent Handwritten Math Canvas (`HandwritingPad.tsx`)
- **Zero-Latency Local Geometric Recognizer (`strokeRecognizer.ts`)**:
  - Classifies natural handwriting strokes into digits (`0–9`), variables (`x`, `y`, `z`, `a`, `b`, `c`), math operators (`+`, `-`, `*`, `/`, `^`, `√`, `!`), grouping symbols (`(`, `)`), and relation symbols (`=`) in under 15ms.
  - Custom horizontal clustering algorithms group adjacent multi-digit numbers (e.g., `113`, `100`, `25`, `42`) with natural spacing.
  - Contextual glyphic disambiguation dynamically separates variable `x` from multiplication `*`, slanted division slashes `/` from vertical numeral `1`, and curved numerals `3`/`7` from parentheses `)` based on stroke trajectory and algebraic context.
- **Universal Equal Sign (`=`) Trigger**:
  - When the user draws an equals sign (e.g., `15 + 25 =` or `12 * 6 =`), the system detects stroke completion, waits 400ms for pen lift, and computes the verified result.
- **Anti-Interference Writing Flow**:
  - In-progress strokes never trigger premature popups, unexpected numbers, or screen flickering while the user is actively writing.
  - Incomplete inputs (e.g., `1 +`, `12 -`, `5 *`) intentionally withhold answer calculation until the user completes the expression.
  - Smart Auto-Calculate mode incorporates a 2.2-second idle debounce that only evaluates complete mathematical expressions.
- **Floating Canvas Answer Badge & Ink Injection (`aiHandwritingShapes.ts`)**:
  - Displays computed solutions cleanly beside the handwritten equation.
  - Tap **"Write on Canvas"** to inject the AI-computed answer directly onto the canvas as organic digital ink.
- **Area-Based Crop Filter**:
  - Vectorizes and bounds active user strokes with optical padding, producing clean, compact images for Multimodal AI analysis.

### 2. 🧮 Professional Scientific Calculator (`Calculator.tsx`)
- **Advanced Mathematical Capabilities**:
  - **Trigonometric & Hyperbolic**: $\sin, \cos, \tan, \arcsin, \arccos, \arctan, \sinh, \cosh, \tanh$.
  - **Exponentials & Radicals**: $e^x, 10^x, x^y, x^2, x^3, \sqrt{x}, \sqrt[3]{x}$.
  - **Logarithms**: Natural logarithm ($\ln$), common logarithm ($\log_{10}$), binary logarithm ($\log_2$).
  - **Combinatorics & Number Theory**: Factorial ($n!$), Permutations ($nPr$), Combinations ($nCr$), Modulo ($\%$), Absolute Value ($|x|$).
  - **Fundamental Constants**: Archimedes' constant ($\pi \approx 3.141592$), Euler's number ($e \approx 2.718281$), Golden ratio ($\phi \approx 1.618033$).
- **Memory Operations**: Memory Clear (`MC`), Memory Recall (`MR`), Memory Add (`M+`), Memory Subtract (`M-`), Memory Store (`MS`).
- **Angle Modes**: Real-time switching between Degree (`DEG`) and Radian (`RAD`) modes.
- **Calculation History**: Automatic timestamped recording of past calculations with categorized physics/kinematics tags, custom notes, and one-click re-insertion.

### 3. 🤖 AI Step-by-Step Educational Solver (`StepSolutionModal.tsx`)
- Powered by Google Gemini 3.8 Flash, decomposing complex math problems into pedagogical building blocks:
  - **Formula Reference**: Applicable theorems and standard formulas.
  - **Step Decomposition**: Each transformation explicitly annotated with the mathematical rule applied (BODMAS / PEMDAS, Zero Exponent Law, Variable Isolation, Principal Square Root).
  - **Verification & Alternate Forms**: Fractions, decimal approximations, and scientific notations.
  - **Multilingual Normalization**: Transparently handles Devanagari numerals (`०-९`), Eastern Arabic numerals (`٠-٩`), and multilingual math prompt phrasing.

### 4. 🎙️ Natural Voice Input (`speechRecognition.ts`)
- Leverages the browser Web Speech API for seamless voice-to-math translation.
- Understands spoken natural language phrases (e.g., *"what is forty-eight divided by six"*, *"square root of one hundred forty-four"*, *"twenty-five plus thirty-five"*).
- Normalizes verbal math idioms into standard operator syntax for instant calculation.

### 5. 📐 Engineering Unit & Physical Converter (`UnitConverter.tsx`)
- Bidirectional live conversions across 10 distinct physical dimensions:
  - **Length**: Meters, Kilometers, Centimeters, Millimeters, Miles, Yards, Feet, Inches, Nautical Miles.
  - **Mass**: Kilograms, Grams, Milligrams, Metric Tons, Pounds, Ounces, Stones.
  - **Temperature**: Celsius ($^\circ\text{C}$), Fahrenheit ($^\circ\text{F}$), Kelvin ($\text{K}$).
  - **Speed**: m/s, km/h, mph, knots.
  - **Area**: Square meters, Square kilometers, Square feet, Acres, Hectares.
  - **Volume**: Liters, Milliliters, Gallons, Quarts, Pints, Cups, Cubic meters.
  - **Time**: Seconds, Minutes, Hours, Days, Weeks, Years.
  - **Digital Storage**: Bits, Bytes, KB, MB, GB, TB, PB.
  - **Pressure**: Pascal, Bar, PSI, Atmosphere, Torr.
  - **Energy**: Joules, Kilojoules, Calories, Kilocalories, Watt-hours, Electronvolts.

### 6. 🎮 Interactive Learning & Cognitive Games
- **Kids Number Writing & Trace Practice**:
  - Interactive dotted guidelines for numbers `0–20+`.
  - Geometric path deviation algorithm (`evaluateNumberStrokeDeviation`) tracks whether strokes stray too far from guidelines.
  - Progressive stroke feedback, motivational milestones, and streak counters.
- **Number Arrangement Game (`NumberArrangeGame.tsx`)**:
  - Drag-and-drop ordering game testing number sense and rapid sequencing (Ascending vs. Descending).
  - Variable difficulty tiers with timer scoring.
- **Daily Math Trivia & Quizzes (`DailyMathTrivia.tsx`)**:
  - Daily math challenges, historical math facts, and interactive quizzes with confetti celebrations (`celebrationShower.ts`).

---

## 🏗️ Architecture & Technology Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                        OmniMath AI Architecture                        │
└────────────────────────────────────────────────────────────────────────┘
                                    │
       ┌────────────────────────────┴───────────────────────────┐
       ▼                                                        ▼
┌───────────────────────────────┐              ┌───────────────────────────────┐
│     Client SPA (Vite/React)   │              │   Full-Stack Server (Express) │
├───────────────────────────────┤              ├───────────────────────────────┤
│ • React 19 + TypeScript       │              │ • Express 4.x on Node.js      │
│ • Tailwind CSS v4             │   HTTP POST  │ • Vite Dev Server Middleware  │
│ • Canvas 2D Ink Vectorizer    │ ───────────► │ • @google/genai SDK (v2.4.0)  │
│ • strokeRecognizer (Offline)  │              │ • Primary: Gemini 3.8 Flash   │
│ • mathEvaluator (BODMAS Core) │ ◄─────────── │ • Graceful Fallback Engine    │
│ • Web Speech API Recognition  │   JSON Res   │ • Production Bundle (esbuild) │
└───────────────────────────────┘              └───────────────────────────────┘
```

### Technology Highlights
| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19, TypeScript, Vite 8 | Ultra-fast SPA with zero virtual DOM overhead |
| **Styling & Icons** | Tailwind CSS v4, Lucide React | Clean, responsive design with dark/light themes |
| **Canvas & Graphics** | HTML5 Canvas 2D API, Bezier Splines | Low-latency digital handwriting rendering |
| **Math Engine** | Custom Shunting-Yard Parser (`mathEvaluator.ts`) | 100% deterministic BODMAS/PEMDAS order of ops |
| **Speech Engine** | Web Speech Recognition API | Client-side, privacy-respecting voice commands |
| **Backend Runtime** | Express.js, `tsx`, Node.js | API proxy routes, SSR-ready bundling, AI endpoints |
| **AI Integration** | `@google/genai` TypeScript SDK | Multimodal vision handwriting analysis & step solving |
| **Feedback FX** | `canvas-confetti` | High-performance particle celebration shower |

---

## 📁 Repository Directory Structure

```
├── .env.example                     # Environment template (GEMINI_API_KEY)
├── index.html                       # HTML5 entry point & viewport meta
├── metadata.json                    # AI Studio applet capabilities & permissions
├── package.json                     # Scripts & production dependencies
├── server.ts                        # Express backend, Vite proxy & Gemini API routes
├── tsconfig.json                    # Strict TypeScript compilation rules
├── vite.config.ts                   # Vite bundler & Tailwind v4 plugin config
├── public/                          # Static assets and icons
└── src/
    ├── App.tsx                      # Root component, global state & tab navigation
    ├── main.tsx                     # React 19 DOM bootstrap
    ├── index.css                    # Tailwind CSS v4 global styling
    ├── types.ts                     # TypeScript interfaces, schemas & enums
    ├── components/
    │   ├── Calculator.tsx           # Scientific calculator UI & state machine
    │   ├── DailyMathTrivia.tsx      # Daily STEM challenges & trivia flashcards
    │   ├── FormulaSheet.tsx         # Quick formula & constant lookup sheet
    │   ├── HandwritingPad.tsx       # Canvas handwriting pad, toolbar & overlay
    │   ├── Header.tsx               # App bar, tabs, dark mode toggle & audio status
    │   ├── HistoryDrawer.tsx        # Calculation archive, export & tagging drawer
    │   ├── LiveHints.tsx            # Contextual learning recommendations
    │   ├── NumberArrangeGame.tsx    # Drag-and-drop sequencing game
    │   ├── RewardsBanner.tsx        # Gamification badges, levels & streak counter
    │   ├── StepSolutionModal.tsx    # Step-by-step problem solver dialogue
    │   └── UnitConverter.tsx        # 10-dimensional physical unit converter
    └── utils/
        ├── aiHandwritingShapes.ts   # Synthetic stroke synthesis & ink injection
        ├── celebrationShower.ts     # Confetti particle engine
        ├── constants.ts             # Math constants, unit conversion factors & trivia
        ├── exportUtils.ts           # History export to CSV, JSON & TXT
        ├── mathEngine.ts            # High-precision calculator evaluation routines
        ├── mathEvaluator.ts         # Deterministic BODMAS tokenizer & rule engine
        ├── speechRecognition.ts     # Voice input pipeline & phoneme normalizer
        └── strokeRecognizer.ts      # Fast geometric handwriting stroke classifier
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: Version `20.x` or higher
- **npm** or **bun**: Package manager

### 1. Installation
Clone the repository and install project dependencies:
```bash
git clone https://github.com/your-username/omnimath-ai.git
cd omnimath-ai
npm install
```

### 2. Environment Configuration
Copy the example environment file and add your Google Gemini API key:
```bash
cp .env.example .env
```
Open `.env` in your editor:
```env
# Google Gemini API Key from Google AI Studio (https://aistudio.google.com/)
GEMINI_API_KEY="your_gemini_api_key_here"
```
> **Note**: If `GEMINI_API_KEY` is not provided, the platform automatically runs on its built-in offline deterministic mathematical engine (`strokeRecognizer.ts` and `mathEvaluator.ts`), ensuring 100% core functionality without external dependencies.

### 3. Running Development Server
Start the development server with hot-reload and Express backend:
```bash
npm run dev
```
The app will be available at:
```
http://localhost:3000
```

### 4. Code Quality & Verification
Run the TypeScript linter and type-checker:
```bash
npm run lint
```

### 5. Production Build & Deployment
Build the client and bundle the Express server for production:
```bash
npm run build
npm start
```

---

## 📡 API Reference

### 1. `POST /api/ai/handwriting-solve`
Analyzes handwritten canvas image data and returns recognized expression, evaluated answer, applied rule, and steps.
- **Request Body**:
  ```json
  {
    "imageBase64": "data:image/png;base64,...",
    "gradeLevel": "High School",
    "mode": "math",
    "hasEqual": true,
    "candidateExpression": "15 + 25 ="
  }
  ```
- **Response**:
  ```json
  {
    "recognizedExpression": "15 + 25 =",
    "answer": "40",
    "fullEquation": "15 + 25 = 40",
    "appliedRule": "BODMAS Rule (Addition)",
    "isCorrect": true,
    "shortExplanation": "Combined 15 and 25 to yield 40.",
    "steps": [
      "Input expression: 15 + 25",
      "Calculate 15 + 25 = 40",
      "Final Answer: 40"
    ],
    "encouragement": "Great job! Keep practicing!"
  }
  ```

### 2. `POST /api/ai/solve-steps`
Generates comprehensive step-by-step solutions for arbitrary mathematical expressions or word problems.
- **Request Body**:
  ```json
  {
    "problem": "2x + 4 = 10",
    "category": "Algebra",
    "gradeLevel": "Middle School"
  }
  ```
- **Response**:
  ```json
  {
    "problem": "2x + 4 = 10",
    "finalAnswer": "x = 3",
    "category": "Algebra",
    "summary": "Solved linear equation for variable x.",
    "steps": [
      {
        "stepNumber": 1,
        "title": "Isolate Variable Term",
        "description": "Subtract 4 from both sides: 2x = 10 - 4 = 6",
        "mathFormula": "2x = 6",
        "rule": "Subtraction Property of Equality"
      },
      {
        "stepNumber": 2,
        "title": "Solve for x",
        "description": "Divide both sides by 2: x = 6 / 2 = 3",
        "mathFormula": "x = 3",
        "rule": "Division Property of Equality"
      }
    ]
  }
  ```

### 3. `POST /api/ai/daily-trivia`
Fetches curated daily math trivia and interactive quiz challenges categorized by grade level.

---

## ⚙️ Mathematical Engine & Precedence Rules

OmniMath AI enforces mathematical standards based on standard **BODMAS / PEMDAS**:
1. **B / P — Brackets / Parentheses**: Sub-expressions enclosed in `(` `)` evaluated recursively from deepest nesting outwards.
2. **O / E — Orders / Exponents**: Exponentiation (`^`, `**`), radicals (`√`), and Zero Exponent Law ($a^0 = 1$ for any $a \neq 0$).
3. **D & M — Division & Multiplication**: Equal precedence, strictly evaluated left-to-right.
4. **A & S — Addition & Subtraction**: Equal precedence, strictly evaluated left-to-right.

### Floating-Point Precision Handling
To eliminate standard IEEE 754 floating-point artifacts (such as `0.1 + 0.2 = 0.30000000000000004`), calculations pass through an epsilon comparison threshold:
```typescript
const rounded = Math.abs(val - Math.round(val)) < 1e-8 
  ? Math.round(val) 
  : parseFloat(val.toFixed(4));
```

---

## 🛡️ Offline-First & Resilient Design

OmniMath AI is built with an **Offline-First Resilience Principle**:
- **No API Key Required for Local Math**: All core arithmetic, linear equations, polynomial powers, order of operations, and basic handwriting stroke classification run 100% on the client browser without external network calls.
- **Quota & Network Fault Tolerance**: If Google Gemini API quotas are exhausted or the network disconnects, the server gracefully falls back to the deterministic math engine without throwing unhandled exceptions or breaking the UI.

---

## 🤝 Contributing

Contributions to OmniMath AI are welcome! Please follow these steps:
1. **Fork the Repository**
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit Your Changes**:
   ```bash
   git commit -m 'feat: Add amazing math capability'
   ```
4. **Verify Linter & Tests**:
   ```bash
   npm run lint
   npm run build
   ```
5. **Push to Branch & Open a Pull Request**

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <b>OmniMath AI</b> • Engineered with precision for mathematicians, students, and engineers worldwide.
</p>
