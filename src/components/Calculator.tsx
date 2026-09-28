import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Sparkles,
  Delete,
  RotateCcw,
  BookOpen,
  HelpCircle,
  Bookmark,
  Check,
  Zap,
} from "lucide-react";
import { AngleUnit, CalculationHistoryItem } from "../types";
import { evaluateExpression, getLiveHint, LiveHintInfo } from "../utils/mathEngine";
import { LiveHints } from "./LiveHints";
import { FormulaSheet } from "./FormulaSheet";
import { PHYSICAL_CONSTANTS } from "../utils/constants";
import { MathVoiceRecognizer } from "../utils/speechRecognition";

interface CalculatorProps {
  onAddHistoryItem: (item: CalculationHistoryItem) => void;
  onRequestAISteps: (expression: string, category?: string) => void;
  initialExpression?: string;
  onClearInitialExpression?: () => void;
}

export const Calculator: React.FC<CalculatorProps> = ({
  onAddHistoryItem,
  onRequestAISteps,
  initialExpression,
  onClearInitialExpression,
}) => {
  const [expression, setExpression] = useState<string>("");
  const [displayResult, setDisplayResult] = useState<string>("");
  const [angleMode, setAngleMode] = useState<AngleUnit>("DEG");
  const [isInverseTrig, setIsInverseTrig] = useState<boolean>(false);
  const [isHyperbolic, setIsHyperbolic] = useState<boolean>(false);
  const [isFormulaSheetOpen, setIsFormulaSheetOpen] = useState<boolean>(false);
  const [symbolName, setSymbolName] = useState<string>("");
  const [tagsInput, setTagsInput] = useState<string>("Scientific");

  // Voice Recognition State
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const voiceRecognizerRef = useRef<MathVoiceRecognizer | null>(null);

  // Focus input ref
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync initial expression when loaded from history or formulas
  useEffect(() => {
    if (initialExpression) {
      setExpression(initialExpression);
      if (onClearInitialExpression) onClearInitialExpression();
    }
  }, [initialExpression, onClearInitialExpression]);

  // Compute live hints
  const hintInfo: LiveHintInfo = getLiveHint(expression, angleMode);

  // Initialize voice recognizer
  useEffect(() => {
    voiceRecognizerRef.current = new MathVoiceRecognizer();
  }, []);

  const handleToggleVoice = () => {
    const recognizer = voiceRecognizerRef.current;
    if (!recognizer) return;

    if (isVoiceListening) {
      recognizer.stop();
      setIsVoiceListening(false);
      setVoiceTranscript("");
    } else {
      setVoiceError(null);
      setVoiceTranscript("Listening for math speech (e.g. 'sine of 30 plus square root of 16')...");
      setIsVoiceListening(true);

      recognizer.start(
        (parsedMath, raw, isFinal) => {
          setVoiceTranscript(raw);
          setExpression(parsedMath);
          if (isFinal) {
            setIsVoiceListening(false);
          }
        },
        (err) => {
          setVoiceError(`Voice dictation: ${err}`);
          setIsVoiceListening(false);
        },
        () => {
          setIsVoiceListening(false);
        }
      );
    }
  };

  const handleAppendToken = (token: string) => {
    setExpression((prev) => prev + token);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleClear = () => {
    setExpression("");
    setDisplayResult("");
    setSymbolName("");
  };

  const handleBackspace = () => {
    setExpression((prev) => prev.slice(0, -1));
  };

  const handleEvaluate = () => {
    if (!expression.trim()) return;

    const evalResult = evaluateExpression(expression, angleMode);
    if (evalResult.success && evalResult.displayValue !== undefined) {
      setDisplayResult(evalResult.displayValue);

      // Auto categorize based on tokens
      const tags: string[] = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      if (/sin|cos|tan/i.test(expression) && !tags.includes("Trigonometry")) {
        tags.push("Trigonometry");
      }
      if (/v0|m\*a|lambda|kinematic/i.test(expression) && !tags.includes("Physics")) {
        tags.push("Physics");
      }
      if (/\^|log|ln|sqrt/i.test(expression) && !tags.includes("Scientific")) {
        tags.push("Scientific");
      }

      // Add to calculation history
      const historyItem: CalculationHistoryItem = {
        id: `calc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        expression,
        result: evalResult.displayValue,
        symbolName: symbolName.trim() || undefined,
        tags: tags.length > 0 ? tags : ["General"],
        angleMode,
      };
      onAddHistoryItem(historyItem);
    } else {
      setDisplayResult(evalResult.error || "Error");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEvaluate();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Formula Sheet Modal */}
      <FormulaSheet
        isOpen={isFormulaSheetOpen}
        onClose={() => setIsFormulaSheetOpen(false)}
        onSelectFormula={(formulaExpr, formulaName, category) => {
          setExpression(formulaExpr);
          setSymbolName(formulaName.split("(")[0].trim());
          setTagsInput(`${category}, Physics`);
        }}
      />

      {/* Main Calculator Body */}
      <div
        id="scientific-calculator-container"
        className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
      >
        {/* Top Mini Controls: Angle Unit & Quick Presets */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center space-x-1.5">
            {/* Angle Unit Switcher */}
            <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-bold">
              <button
                type="button"
                onClick={() => setAngleMode("DEG")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  angleMode === "DEG"
                    ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                DEG
              </button>
              <button
                type="button"
                onClick={() => setAngleMode("RAD")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  angleMode === "RAD"
                    ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                RAD
              </button>
            </div>

            {/* Inverse & Hyperbolic Toggles */}
            <button
              type="button"
              onClick={() => setIsInverseTrig(!isInverseTrig)}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                isInverseTrig
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              INV
            </button>
            <button
              type="button"
              onClick={() => setIsHyperbolic(!isHyperbolic)}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                isHyperbolic
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              HYP
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Physics & Trig Equations Browser */}
            <button
              type="button"
              onClick={() => setIsFormulaSheetOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-500" />
              <span>Physics & Trig Formulas</span>
            </button>
          </div>
        </div>

        {/* Display Screen */}
        <div className="p-4 sm:p-6 space-y-3 bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-950/60 dark:to-slate-900">
          {/* Symbol / Tag metadata bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs min-h-[32px] shrink-0">
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                Symbol:
              </span>
              <input
                type="text"
                placeholder="e.g. v_0, theta"
                value={symbolName}
                onChange={(e) => setSymbolName(e.target.value)}
                className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs w-24 sm:w-28 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <span className="text-[11px] font-bold text-slate-400 uppercase ml-2">
                Tag:
              </span>
              <input
                type="text"
                placeholder="Physics, HW"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs w-24 sm:w-28 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {/* Voice Dictation Button & Status Inline */}
            <div className="flex items-center space-x-2 shrink-0">
              {isVoiceListening && (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-red-500 font-semibold truncate max-w-[120px] sm:max-w-[180px]">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0"></span>
                  <span className="truncate">{voiceTranscript || "Listening..."}</span>
                </span>
              )}
              {voiceError && !isVoiceListening && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium truncate max-w-[140px]">
                  {voiceError}
                </span>
              )}
              <button
                type="button"
                onClick={handleToggleVoice}
                title={isVoiceListening ? "Stop voice listening" : "Speak math problem with voice-to-text"}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isVoiceListening
                    ? "bg-red-500 text-white animate-pulse shadow-md shadow-red-500/20"
                    : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
                }`}
              >
                {isVoiceListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-sky-500" />}
                <span>{isVoiceListening ? "Listening..." : "Voice Input"}</span>
              </button>
            </div>
          </div>

          {/* Main Math Expression Input */}
          <div className="relative shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. 5*sin(45) + sqrt(16) or G * m1 * m2 / r^2"
              className="w-full text-xl sm:text-2xl font-mono font-bold tracking-wide px-4 py-3 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-inner"
            />
            {expression && (
              <button
                type="button"
                onClick={handleBackspace}
                className="absolute right-3 top-3.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <Delete className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Blank-space Live Hints directly below input */}
          <LiveHints
            hintInfo={hintInfo}
            onApplyCompletion={(token) => handleAppendToken(token)}
            onCloseParen={() => handleAppendToken(")".repeat(hintInfo.unclosedParens))}
          />

          {/* Pre-Reserved Result Output Slot - Always present to prevent vertical layout shifting during calculations */}
          <div
            id="calculator-result-slot"
            className="h-12 sm:h-14 px-4 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 transition-colors shrink-0 select-none overflow-hidden"
          >
            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-[11px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                {displayResult ? "Evaluated Result" : "Result"}
              </span>
              {displayResult && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Calculated
                </span>
              )}
            </div>

            <div className="font-mono text-right select-all overflow-x-auto scrollbar-none flex items-center justify-end">
              {displayResult ? (
                <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate">
                  = {displayResult}
                </span>
              ) : hintInfo.status === "valid" && hintInfo.previewValue ? (
                <span className="text-lg sm:text-xl font-bold text-slate-400 dark:text-slate-500 opacity-60 truncate">
                  = {hintInfo.previewValue}
                </span>
              ) : (
                <span className="text-xs sm:text-sm font-semibold text-slate-300 dark:text-slate-600 italic select-none">
                  = 0
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Physics Constants Quick-Bar */}
        <div className="px-4 sm:px-6 py-2 bg-slate-100/80 dark:bg-slate-950/60 border-t border-b border-slate-200 dark:border-slate-800 flex items-center space-x-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center space-x-1">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>Constants:</span>
          </span>
          {PHYSICAL_CONSTANTS.slice(0, 7).map((c) => (
            <button
              key={c.symbol}
              type="button"
              onClick={() => handleAppendToken(c.symbol)}
              title={`${c.name} = ${c.value} ${c.unit}`}
              className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-slate-700 font-mono text-xs font-semibold whitespace-nowrap shadow-2xs"
            >
              {c.symbol}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleAppendToken("π")}
            title="Pi = 3.14159..."
            className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold shadow-2xs"
          >
            π
          </button>
          <button
            type="button"
            onClick={() => handleAppendToken("e")}
            title="Euler's e = 2.71828..."
            className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold shadow-2xs"
          >
            e
          </button>
        </div>

        {/* Scientific Keypad Grid */}
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900/90 grid grid-cols-5 sm:grid-cols-6 gap-2">
          {/* Row 1: Scientific functions */}
          <button
            type="button"
            onClick={() =>
              handleAppendToken(
                isInverseTrig ? "asin(" : isHyperbolic ? "sinh(" : "sin("
              )
            }
            className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 font-mono text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            {isInverseTrig ? "asin" : isHyperbolic ? "sinh" : "sin"}
          </button>

          <button
            type="button"
            onClick={() =>
              handleAppendToken(
                isInverseTrig ? "acos(" : isHyperbolic ? "cosh(" : "cos("
              )
            }
            className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 font-mono text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            {isInverseTrig ? "acos" : isHyperbolic ? "cosh" : "cos"}
          </button>

          <button
            type="button"
            onClick={() =>
              handleAppendToken(
                isInverseTrig ? "atan(" : isHyperbolic ? "tanh(" : "tan("
              )
            }
            className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 font-mono text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            {isInverseTrig ? "atan" : isHyperbolic ? "tanh" : "tan"}
          </button>

          <button
            type="button"
            onClick={() => handleAppendToken("^")}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 font-mono text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            x^y
          </button>

          <button
            type="button"
            onClick={() => handleAppendToken("sqrt(")}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 font-mono text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            √
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-400 font-mono text-xs sm:text-sm font-bold border border-red-200 dark:border-red-900/50 shadow-2xs active:scale-95 transition-all"
          >
            AC
          </button>

          {/* Row 2 */}
          <button
            type="button"
            onClick={() => handleAppendToken("ln(")}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 font-mono text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            ln
          </button>

          <button
            type="button"
            onClick={() => handleAppendToken("log(")}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 font-mono text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            log
          </button>

          <button
            type="button"
            onClick={() => handleAppendToken("(")}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            (
          </button>

          <button
            type="button"
            onClick={() => handleAppendToken(")")}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            )
          </button>

          <button
            type="button"
            onClick={() => handleAppendToken("%")}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            %
          </button>

          <button
            type="button"
            onClick={() => handleAppendToken(" / ")}
            className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-mono text-sm sm:text-base font-bold border border-indigo-200 dark:border-indigo-900/50 shadow-2xs active:scale-95 transition-all"
          >
            ÷
          </button>

          {/* Row 3: Numbers & Operators */}
          <button
            type="button"
            onClick={() => handleAppendToken("!")}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 font-mono text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            n!
          </button>

          <button
            type="button"
            onClick={() => handleAppendToken("7")}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono text-sm sm:text-base font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            7
          </button>

          <button
            type="button"
            onClick={() => handleAppendToken("8")}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono text-sm sm:text-base font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            8
          </button>

          <button
            type="button"
            onClick={() => handleAppendToken("9")}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono text-sm sm:text-base font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            9
          </button>

          <button
            type="button"
            onClick={() => handleAppendToken(" * ")}
            className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-mono text-sm sm:text-base font-bold border border-indigo-200 dark:border-indigo-900/50 shadow-2xs active:scale-95 transition-all"
          >
            ×
          </button>

          <button
            type="button"
            onClick={() => handleAppendToken("exp(")}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 font-mono text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            e^x
          </button>

          {/* Row 4 */}
          <button
            type="button"
            onClick={() => handleAppendToken("abs(")}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 font-mono text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            |x|
          </button>

          <button
            type="button"
            onClick={() => handleAppendToken("4")}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono text-sm sm:text-base font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            4
          </button>

          <button
            type="button"
            onClick={() => handleAppendToken("5")}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono text-sm sm:text-base font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            5
          </button>

          <button
            type="button"
            onClick={() => handleAppendToken("6")}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono text-sm sm:text-base font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            6
          </button>

          <button
            type="button"
            onClick={() => handleAppendToken(" - ")}
            className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-mono text-sm sm:text-base font-bold border border-indigo-200 dark:border-indigo-900/50 shadow-2xs active:scale-95 transition-all"
          >
            −
          </button>

          <button
            type="button"
            onClick={() => handleAppendToken("cbrt(")}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 font-mono text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            ∛
          </button>

          {/* Row 5 */}
          <button
            type="button"
            onClick={() => handleAppendToken("1/(")}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 font-mono text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            1/x
          </button>

          <button
            type="button"
            onClick={() => handleAppendToken("1")}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono text-sm sm:text-base font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            1
          </button>

          <button
            type="button"
            onClick={() => handleAppendToken("2")}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono text-sm sm:text-base font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            2
          </button>

          <button
            type="button"
            onClick={() => handleAppendToken("3")}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono text-sm sm:text-base font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            3
          </button>

          <button
            type="button"
            onClick={() => handleAppendToken(" + ")}
            className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-mono text-sm sm:text-base font-bold border border-indigo-200 dark:border-indigo-900/50 shadow-2xs active:scale-95 transition-all"
          >
            +
          </button>

          <button
            type="button"
            onClick={() => handleAppendToken("^2")}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 font-mono text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            x²
          </button>

          {/* Row 6: Zero, Decimal, Equals, AI Explainer */}
          <button
            type="button"
            onClick={() => handleAppendToken("0")}
            className="p-3 col-span-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono text-sm sm:text-base font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            0
          </button>

          <button
            type="button"
            onClick={() => handleAppendToken(".")}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono text-sm sm:text-base font-bold border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all"
          >
            .
          </button>

          <button
            type="button"
            onClick={handleEvaluate}
            id="btn-evaluate"
            className="p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-mono text-lg font-black shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
          >
            =
          </button>

          {/* AI Step-by-Step Solver Button */}
          <button
            type="button"
            id="btn-ai-step-solution"
            onClick={() => onRequestAISteps(expression, tagsInput)}
            disabled={!expression.trim()}
            title="Explain step-by-step with Gemini AI"
            className="p-3 col-span-2 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:from-sky-600 hover:to-purple-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-500/20 flex items-center justify-center space-x-1.5 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>AI Step Solution</span>
          </button>
        </div>
      </div>
    </div>
  );
};
