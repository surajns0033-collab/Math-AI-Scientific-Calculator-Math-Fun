import React, { useState, useMemo } from "react";
import {
  Lightbulb,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Tag,
  X,
  Maximize2,
} from "lucide-react";

export interface MathTriviaItem {
  id: string;
  title: string;
  fact: string;
  category: "Numbers" | "Geometry" | "History" | "Nature" | "Paradox" | "Curiosity";
  takeaway?: string;
}

export const MATH_TRIVIA_LIST: MathTriviaItem[] = [
  {
    id: "trivia-1",
    title: "The Pizza Volume Formula",
    fact: "A pizza of radius 'z' and depth 'a' has a volume of: Pi · z · z · a = Pizza!",
    category: "Geometry",
    takeaway: "Cylinder volume is π × r² × h. When r = z and h = a, it spells pizza.",
  },
  {
    id: "trivia-2",
    title: "Alphabetical Forty",
    fact: "'Forty' (40) is the only number in English whose letters are in alphabetical order (F-O-R-T-Y).",
    category: "Curiosity",
    takeaway: "'One' (1) is the only number whose letters appear in reverse alphabetical order.",
  },
  {
    id: "trivia-3",
    title: "The 2520 Marvel",
    fact: "2,520 is the smallest number divisible evenly by all numbers from 1 to 10.",
    category: "Numbers",
    takeaway: "It is the least common multiple (LCM) of numbers 1 through 10.",
  },
  {
    id: "trivia-4",
    title: "The Birthday Paradox",
    fact: "With just 23 people in a room, there is a >50% chance two share the same birthday.",
    category: "Paradox",
    takeaway: "With 75 people, the probability exceeds 99.9% due to 253 pairwise comparisons.",
  },
  {
    id: "trivia-5",
    title: "Kaprekar's Constant 6174",
    fact: "Sort any 4-digit number's digits descending then ascending and subtract: you reach 6174 in ≤7 steps.",
    category: "Numbers",
    takeaway: "Discovered by Indian mathematician D.R. Kaprekar in 1949.",
  },
  {
    id: "trivia-6",
    title: "Prime Cicadas",
    fact: "Periodical cicadas emerge every 13 or 17 years—prime cycles that prevent predators from syncing.",
    category: "Nature",
    takeaway: "Evolutionary biology uses number theory to minimize predator synchronization.",
  },
  {
    id: "trivia-7",
    title: "Shuffling 52 Cards",
    fact: "A well-shuffled 52-card deck produces an order that has virtually never existed in history.",
    category: "Numbers",
    takeaway: "52! ≈ 8.0658 × 10⁶⁷, which is vastly larger than the age of Earth in seconds.",
  },
  {
    id: "trivia-8",
    title: "Euler's Identity",
    fact: "e^(iπ) + 1 = 0 combines the 5 fundamental math constants (e, i, π, 1, 0) into one equation.",
    category: "History",
    takeaway: "Richard Feynman called it 'the most remarkable formula in mathematics.'",
  },
  {
    id: "trivia-9",
    title: "Hexagonal Honeycombs",
    fact: "Bees build hexagons because hexagons maximize storage volume with minimal wax perimeter.",
    category: "Geometry",
    takeaway: "Mathematically proven in 1999 by Thomas Hales as the Honeycomb Conjecture.",
  },
  {
    id: "trivia-10",
    title: "The Origin of 'Googol'",
    fact: "The word 'googol' (10¹⁰⁰) was coined in 1920 by 9-year-old Milton Sirotta.",
    category: "History",
    takeaway: "A googolplex is 10^(10¹⁰⁰)—larger than all atoms in the observable universe.",
  },
  {
    id: "trivia-11",
    title: "Taxicab 1729",
    fact: "1729 is the smallest number expressible as the sum of two cubes in two different ways (1³+12³ = 9³+10³).",
    category: "History",
    takeaway: "Identified immediately by Srinivasa Ramanujan to G.H. Hardy.",
  },
  {
    id: "trivia-12",
    title: "Fibonacci in Sunflowers",
    fact: "Sunflower seed spirals are consecutive Fibonacci numbers (34 & 55 or 55 & 89).",
    category: "Nature",
    takeaway: "Packs seeds at the Golden Angle (~137.5°), maximizing space without gaps.",
  },
  {
    id: "trivia-13",
    title: "Zero as a Formal Number",
    fact: "Formal arithmetic rules for zero were formulated in 628 AD by Brahmagupta in India.",
    category: "History",
    takeaway: "Before Brahmagupta, zero was merely an empty placeholder gap.",
  },
  {
    id: "trivia-14",
    title: "Gabriel's Horn Paradox",
    fact: "Rotating y = 1/x for x ≥ 1 around the x-axis yields infinite surface area but finite volume (π).",
    category: "Paradox",
    takeaway: "It could hold a finite can of paint, yet no paint could coat its interior surface.",
  },
  {
    id: "trivia-15",
    title: "Origami Space Telescopes",
    fact: "NASA uses mathematical origami principles (Miura fold) to pack giant solar arrays into compact rockets.",
    category: "Geometry",
    takeaway: "Rigid origami structures unfold seamlessly in zero-g with minimal motors.",
  },
];

const CATEGORY_STYLES: Record<MathTriviaItem["category"], { badge: string; dot: string }> = {
  Numbers: {
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 dark:border dark:border-sky-800/80",
    dot: "bg-sky-500",
  },
  Geometry: {
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border dark:border-emerald-800/80",
    dot: "bg-emerald-500",
  },
  History: {
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 dark:border dark:border-amber-800/80",
    dot: "bg-amber-500",
  },
  Nature: {
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 dark:border dark:border-rose-800/80",
    dot: "bg-rose-500",
  },
  Paradox: {
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 dark:border dark:border-purple-800/80",
    dot: "bg-purple-500",
  },
  Curiosity: {
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 dark:border dark:border-blue-800/80",
    dot: "bg-blue-500",
  },
};

interface DailyMathTriviaProps {
  darkMode?: boolean;
}

export const DailyMathTrivia: React.FC<DailyMathTriviaProps> = ({ darkMode = false }) => {
  // Calendar-day index for consistent daily fact
  const dailyIndex = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return Math.abs(dayOfYear) % MATH_TRIVIA_LIST.length;
  }, []);

  const [currentIndex, setCurrentIndex] = useState<number>(dailyIndex);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [showTakeaway, setShowTakeaway] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isRotating, setIsRotating] = useState<boolean>(false);

  const currentTrivia = MATH_TRIVIA_LIST[currentIndex] || MATH_TRIVIA_LIST[0];
  const styleConfig = CATEGORY_STYLES[currentTrivia.category] || CATEGORY_STYLES.Numbers;

  const handleNextTrivia = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRotating(true);
    setCurrentIndex((prev) => {
      let next = Math.floor(Math.random() * MATH_TRIVIA_LIST.length);
      if (next === prev) {
        next = (prev + 1) % MATH_TRIVIA_LIST.length;
      }
      return next;
    });
    setTimeout(() => setIsRotating(false), 300);
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = `💡 Math Trivia: ${currentTrivia.title}\n${currentTrivia.fact}\n${currentTrivia.takeaway ? `✨ ${currentTrivia.takeaway}` : ""}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // If minimized to icon-only pill to save maximum screen space
  if (isMinimized) {
    return (
      <div className="flex items-center justify-start py-0.5">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          title="Click to view Daily Math Trivia"
          className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/30 transition-all cursor-pointer shadow-xs active:scale-95 group"
        >
          <Lightbulb className="w-3.5 h-3.5 fill-amber-500 text-amber-500 group-hover:scale-110 transition-transform" />
          <span>Daily Math Trivia</span>
          <span className="text-[10px] px-1 py-0.2 rounded bg-amber-500 text-white font-mono">
            #{currentIndex + 1}
          </span>
          <Maximize2 className="w-3 h-3 text-amber-500 opacity-70" />
        </button>
      </div>
    );
  }

  return (
    <div
      id="daily-math-trivia-widget"
      className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-xs transition-all overflow-hidden"
    >
      {/* Ultra-compact single-line strip: height ~36px, zero wasted space */}
      <div className="px-2.5 sm:px-3 py-1.5 flex items-center justify-between gap-2">
        {/* Left: Icon Badge denoting Daily Trivia + Fact text */}
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {/* Glowing Icon Pill */}
          <button
            type="button"
            onClick={handleNextTrivia}
            title="Click for another fact"
            className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-300 font-extrabold text-[11px] shrink-0 hover:bg-amber-500/25 transition-all cursor-pointer"
          >
            <Lightbulb className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
            <span className="hidden sm:inline">Trivia:</span>
          </button>

          {/* Category Tag */}
          <span
            className={`hidden md:inline-flex px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${styleConfig.badge}`}
          >
            {currentTrivia.category}
          </span>

          {/* High-Contrast Crystal-Clear Text for Dark & Light Themes */}
          <div
            onClick={() => setShowTakeaway(!showTakeaway)}
            className="flex items-center space-x-1.5 min-w-0 flex-1 cursor-pointer select-none group"
            title="Click to toggle explanation takeaway"
          >
            <span className="font-bold text-xs text-slate-900 dark:text-white shrink-0">
              {currentTrivia.title}:
            </span>
            <span className="text-xs text-slate-700 dark:text-slate-100 font-medium truncate group-hover:text-indigo-600 dark:group-hover:text-amber-200 transition-colors">
              {currentTrivia.fact}
            </span>
            {currentTrivia.takeaway && (
              <span className="text-[10px] text-indigo-600 dark:text-amber-300 shrink-0 font-semibold underline decoration-dotted hidden lg:inline">
                {showTakeaway ? "Hide Takeaway" : "Takeaway"}
              </span>
            )}
          </div>
        </div>

        {/* Right: Quick Compact Action Icons */}
        <div className="flex items-center space-x-1 shrink-0">
          {/* Shuffle Next Fact */}
          <button
            type="button"
            onClick={handleNextTrivia}
            title="Shuffle another math fact"
            className="p-1 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 transition-transform duration-300 ${
                isRotating ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Copy Fact */}
          <button
            type="button"
            onClick={handleCopy}
            title="Copy fact"
            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Toggle Takeaway Details */}
          {currentTrivia.takeaway && (
            <button
              type="button"
              onClick={() => setShowTakeaway(!showTakeaway)}
              title={showTakeaway ? "Collapse explanation" : "Expand explanation"}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              {showTakeaway ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Minimize to Icon Button to consume 0 space */}
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            title="Minimize to icon (saves space)"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer ml-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expandable Takeaway (only if toggled, crisp dark mode text) */}
      {showTakeaway && currentTrivia.takeaway && (
        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700/60 flex items-start gap-1.5 text-xs text-slate-800 dark:text-slate-100">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <span className="italic leading-relaxed font-normal">
            {currentTrivia.takeaway}
          </span>
        </div>
      )}
    </div>
  );
};
