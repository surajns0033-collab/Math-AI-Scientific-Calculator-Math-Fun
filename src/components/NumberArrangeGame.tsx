import React, { useState, useEffect, useRef } from "react";
import {
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Sparkles,
  RefreshCw,
  Trophy,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  MoveLeft,
  MoveRight,
  Flame,
  Plus,
  Minus,
  Zap,
  Star,
  Award,
  PartyPopper,
} from "lucide-react";
import { triggerCelebrationShower } from "../utils/celebrationShower";

export type OrderDirection = "ascending" | "descending";

interface NumberArrangeGameProps {
  darkMode: boolean;
  onIncrementPractice: () => void;
  playChime?: () => void;
}

interface NumberCard {
  id: string;
  value: number;
}

// 1 to 2 word praise messages for kids
export const LEVEL_PRAISE_MESSAGES: Record<number, string[]> = {
  1: [
    "Superstar!",
    "Great Job!",
    "Awesome!",
    "Well Done!",
  ],
  2: [
    "Brilliant!",
    "High Five!",
    "Champion!",
    "Keep Shining!",
  ],
  3: [
    "Super Fast!",
    "Fantastic!",
    "Pure Magic!",
    "Math Wizard!",
  ],
  4: [
    "You Rock!",
    "Bravo!",
    "Unstoppable!",
    "Top Tier!",
  ],
  5: [
    "True Genius!",
    "Mind Blowing!",
    "Legendary!",
    "Super Power!",
  ],
  6: [
    "Math Champion!",
    "Number Master!",
    "Incredible!",
    "Hero!",
  ],
};

export const DEFAULT_HIGH_LEVEL_MESSAGES = [
  "Math Wizard!",
  "Legendary!",
  "Superstar!",
  "Champion!",
];

export const getPraiseForLevel = (lvl: number): string => {
  const list = LEVEL_PRAISE_MESSAGES[lvl] || DEFAULT_HIGH_LEVEL_MESSAGES;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
};

export const NumberArrangeGame: React.FC<NumberArrangeGameProps> = ({
  darkMode: _darkMode,
  onIncrementPractice,
  playChime,
}) => {
  const ROUNDS_PER_LEVEL = 5;

  const [direction, setDirection] = useState<OrderDirection>("ascending");
  const [level, setLevel] = useState<number>(1);
  const [roundInLevel, setRoundInLevel] = useState<number>(1);
  const [completedRoundsInLevel, setCompletedRoundsInLevel] = useState<number>(0);
  const [isLevelCompleted, setIsLevelCompleted] = useState<boolean>(false);
  const [cards, setCards] = useState<NumberCard[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [totalSolved, setTotalSolved] = useState<number>(0);
  const [feedbackMsg, setFeedbackMsg] = useState<string>("");
  const [motivationMsg, setMotivationMsg] = useState<string>("");

  // Dynamic range calculation for any level - scales up indefinitely!
  const getRangeForLevel = (lvl: number) => {
    if (lvl <= 1) {
      return { min: 0, max: 9, count: 4, label: "1-Digit (0 - 9)" };
    }
    if (lvl === 2) {
      return { min: 10, max: 99, count: 4, label: "2-Digit (10 - 99)" };
    }
    if (lvl === 3) {
      return { min: 100, max: 999, count: 5, label: "3-Digit (100 - 999)" };
    }
    if (lvl === 4) {
      return { min: 1000, max: 9999, count: 5, label: "4-Digit (1,000 - 9,999)" };
    }
    if (lvl === 5) {
      return { min: 10000, max: 99999, count: 5, label: "5-Digit (10,000 - 99,999)" };
    }
    if (lvl === 6) {
      return { min: 100000, max: 999999, count: 5, label: "6-Digit (100,000 - 999,999)" };
    }
    // Level 7+: any digit number (7, 8, etc.)
    const digits = Math.min(8, lvl);
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return {
      min,
      max,
      count: 5,
      label: `${digits}-Digit (${min.toLocaleString()} - ${max.toLocaleString()})`,
    };
  };

  // Generate random distinct numbers based on current level
  const generateNewPuzzle = (dir = direction, lvl = level) => {
    setIsCorrect(null);
    setFeedbackMsg("");
    setSelectedCardId(null);
    setDraggedIndex(null);

    const config = getRangeForLevel(lvl);
    const count = config.count;
    const min = config.min;
    const max = config.max;

    const uniqueSet = new Set<number>();
    while (uniqueSet.size < count) {
      const num = Math.floor(Math.random() * (max - min + 1)) + min;
      uniqueSet.add(num);
    }

    const numList = Array.from(uniqueSet);

    // Ensure the initial shuffle is not already correctly ordered
    const sorted = [...numList].sort((a, b) => (dir === "ascending" ? a - b : b - a));
    let shuffled = [...numList].sort(() => Math.random() - 0.5);

    if (shuffled.every((v, i) => v === sorted[i])) {
      const temp = shuffled[0];
      shuffled[0] = shuffled[1];
      shuffled[1] = temp;
    }

    setCards(shuffled.map((val, idx) => ({ id: `card-${idx}-${val}-${Date.now()}`, value: val })));
  };

  // On mount and when level/direction change, generate puzzle
  useEffect(() => {
    generateNewPuzzle(direction, level);
  }, [direction, level]);

  // Action: Move to Next Puzzle within the same level (puzzles 1 to 5)
  const handleNextPuzzle = () => {
    const nextRound = Math.min(ROUNDS_PER_LEVEL, roundInLevel + 1);
    setRoundInLevel(nextRound);
    setIsCorrect(null);
    setFeedbackMsg("");
    generateNewPuzzle(direction, level);
  };

  // Action: Move to Next Level after completing 5 puzzles
  const handleNextLevel = () => {
    const nextLvl = level + 1;
    setLevel(nextLvl);
    setRoundInLevel(1);
    setCompletedRoundsInLevel(0);
    setIsLevelCompleted(false);
    setIsCorrect(null);
    setFeedbackMsg("");
    generateNewPuzzle(direction, nextLvl);
  };

  // Action: Replay the current level with 5 new random puzzles
  const handleReplayLevel = () => {
    setRoundInLevel(1);
    setCompletedRoundsInLevel(0);
    setIsLevelCompleted(false);
    setIsCorrect(null);
    setFeedbackMsg("");
    generateNewPuzzle(direction, level);
  };

  // Action: Manually change level
  const handleSelectLevel = (newLvl: number) => {
    const validLvl = Math.max(1, newLvl);
    setLevel(validLvl);
    setRoundInLevel(1);
    setCompletedRoundsInLevel(0);
    setIsLevelCompleted(false);
    setIsCorrect(null);
    setFeedbackMsg("");
    generateNewPuzzle(direction, validLvl);
  };

  // Check if current cards arrangement satisfies the order
  const checkArrangement = (customCards?: NumberCard[]) => {
    const list = customCards || cards;
    if (list.length === 0) return;

    let correct = true;
    for (let i = 0; i < list.length - 1; i++) {
      if (direction === "ascending") {
        if (list[i].value > list[i + 1].value) {
          correct = false;
          break;
        }
      } else {
        if (list[i].value < list[i + 1].value) {
          correct = false;
          break;
        }
      }
    }

    if (correct) {
      setIsCorrect(true);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setTotalSolved((t) => t + 1);

      const nextCompleted = completedRoundsInLevel + 1;
      setCompletedRoundsInLevel(nextCompleted);

      const isCompleted = nextCompleted >= ROUNDS_PER_LEVEL;
      setIsLevelCompleted(isCompleted);

      const motivation = getPraiseForLevel(level);
      setMotivationMsg(motivation);

      if (isCompleted) {
        triggerCelebrationShower({ intensity: "grand" });
        setFeedbackMsg(`Champion! All 5 puzzles of Level ${level} completed!`);
      } else {
        triggerCelebrationShower({ intensity: "normal" });
        setFeedbackMsg(`Excellent! Numbers arranged correctly!`);
      }

      onIncrementPractice();
      if (playChime) playChime();
    } else {
      setIsCorrect(false);
      setFeedbackMsg(
        direction === "ascending"
          ? "Check carefully: Place the smallest number first, followed by larger numbers!"
          : "Check carefully: Place the largest number first, followed by smaller numbers!"
      );
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, _index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newCards = [...cards];
    const [movedItem] = newCards.splice(draggedIndex, 1);
    newCards.splice(targetIndex, 0, movedItem);

    setCards(newCards);
    setDraggedIndex(null);
    setIsCorrect(null);
    setFeedbackMsg("");

    checkArrangement(newCards);
  };

  // Tap-to-Swap / Tap-to-Move for touch devices
  const handleCardClick = (id: string, index: number) => {
    if (isCorrect) return;

    if (!selectedCardId) {
      setSelectedCardId(id);
    } else if (selectedCardId === id) {
      setSelectedCardId(null);
    } else {
      const selectedIndex = cards.findIndex((c) => c.id === selectedCardId);
      if (selectedIndex !== -1 && selectedIndex !== index) {
        const newCards = [...cards];
        const temp = newCards[selectedIndex];
        newCards[selectedIndex] = newCards[index];
        newCards[index] = temp;

        setCards(newCards);
        setSelectedCardId(null);
        setIsCorrect(null);
        setFeedbackMsg("");
        checkArrangement(newCards);
      } else {
        setSelectedCardId(null);
      }
    }
  };

  // Move single step left or right
  const moveCard = (index: number, directionOffset: -1 | 1) => {
    const targetIndex = index + directionOffset;
    if (targetIndex < 0 || targetIndex >= cards.length) return;

    const newCards = [...cards];
    const temp = newCards[index];
    newCards[index] = newCards[targetIndex];
    newCards[targetIndex] = temp;

    setCards(newCards);
    setSelectedCardId(null);
    setIsCorrect(null);
    setFeedbackMsg("");
    checkArrangement(newCards);
  };

  const currentLevelConfig = getRangeForLevel(level);

  return (
    <div className="w-full flex flex-col items-center p-3 sm:p-5">
      {/* Game Header Controls */}
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <ArrowUpDown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                  Number Arrange Game
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40">
                  Drag & Order
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Drag or tap cards to arrange numbers in the correct order!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {streak > 0 && (
              <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-black">
                <Flame className="w-3.5 h-3.5 fill-amber-500" />
                <span>{streak} Streak</span>
              </div>
            )}
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-black">
              <Trophy className="w-3.5 h-3.5 text-emerald-500" />
              <span>{totalSolved} Solved</span>
            </div>
          </div>
        </div>

        {/* Mode & Level Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
          {/* Order Direction Toggle */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
              Arrangement Rule
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setDirection("ascending");
                  generateNewPuzzle("ascending", level);
                }}
                className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  direction === "ascending"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span>Smallest to Largest ↗</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDirection("descending");
                  generateNewPuzzle("descending", level);
                }}
                className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  direction === "descending"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
                <span>Largest to Smallest ↘</span>
              </button>
            </div>
          </div>

          {/* Dynamic Level Stepper & 5 Puzzles Progress */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Level & Digits
              </label>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700">
                <span className="text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300">
                  Puzzle {roundInLevel} of {ROUNDS_PER_LEVEL}
                </span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: ROUNDS_PER_LEVEL }).map((_, rIdx) => {
                    const isDone = rIdx < completedRoundsInLevel;
                    const isCurrent = rIdx === roundInLevel - 1;
                    return (
                      <span
                        key={rIdx}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          isDone
                            ? "bg-emerald-500 scale-110"
                            : isCurrent
                            ? "bg-amber-400 ring-2 ring-amber-300 scale-125"
                            : "bg-slate-300 dark:bg-slate-700"
                        }`}
                        title={`Puzzle ${rIdx + 1} of ${ROUNDS_PER_LEVEL}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                disabled={level <= 1}
                onClick={() => handleSelectLevel(Math.max(1, level - 1))}
                className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 flex items-center justify-center cursor-pointer shadow-xs transition-all shrink-0"
                title="Previous Level"
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="flex-1 text-center px-1">
                <div className="text-xs font-black text-indigo-700 dark:text-indigo-300">
                  Level {level}: {currentLevelConfig.label}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Range: {currentLevelConfig.min.toLocaleString()} to {currentLevelConfig.max.toLocaleString()}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSelectLevel(level + 1)}
                className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center cursor-pointer shadow-xs transition-all shrink-0"
                title="Next Level"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Level Presets for Easy Tap */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mr-1">
            Jump to:
          </span>
          {[1, 2, 3, 4, 5, 6].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                setLevel(lvl);
                generateNewPuzzle(direction, lvl);
              }}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                level === lvl
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Lvl {lvl} ({lvl === 6 ? "6+ Digits" : `${lvl} Digits`})
            </button>
          ))}
        </div>
      </div>

      {/* Target Instruction Banner - High Contrast in both Light & Dark Mode */}
      <div className="w-full max-w-2xl mb-4 px-4 py-3.5 rounded-2xl bg-indigo-50/90 dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-500/60 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
              direction === "ascending" ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
            }`}
          >
            {direction === "ascending" ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight">
                {direction === "ascending"
                  ? "Arrange numbers from SMALLEST to LARGEST"
                  : "Arrange numbers from LARGEST to SMALLEST"}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                  direction === "ascending"
                    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                    : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                }`}
              >
                {direction === "ascending" ? "Ascending ↗" : "Descending ↘"}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
              💡 Tip: Drag cards horizontally or tap two cards to swap their positions
            </p>
          </div>
        </div>
      </div>

      {/* Drag Cards Play Area */}
      <div className="w-full max-w-2xl bg-slate-50 dark:bg-slate-900/60 border-2 border-dashed border-indigo-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 mb-4 min-h-[200px] flex flex-col justify-center items-center">
        <div className="w-full flex items-center justify-center flex-wrap gap-2.5 sm:gap-3.5">
          {cards.map((card, idx) => {
            const isSelected = selectedCardId === card.id;
            const isBeingDragged = draggedIndex === idx;
            const valStr = card.value.toLocaleString();
            const digitLen = card.value.toString().length;

            // Adaptive card sizing for multi-digit numbers
            const cardWidthClass =
              digitLen <= 2
                ? "w-20 sm:w-24"
                : digitLen <= 4
                ? "w-24 sm:w-28"
                : "w-28 sm:w-36";

            const fontSizeClass =
              digitLen <= 2
                ? "text-3xl sm:text-4xl"
                : digitLen <= 4
                ? "text-2xl sm:text-3xl"
                : "text-lg sm:text-2xl";

            return (
              <div
                key={card.id}
                draggable={!isCorrect}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onClick={() => handleCardClick(card.id, idx)}
                className={`relative group flex flex-col items-center justify-between rounded-2xl transition-all select-none cursor-grab active:cursor-grabbing ${
                  isBeingDragged
                    ? "opacity-30 scale-95 ring-4 ring-indigo-400"
                    : isSelected
                    ? "ring-4 ring-amber-400 scale-105 shadow-xl"
                    : "hover:scale-105 hover:shadow-lg"
                } ${
                  isCorrect
                    ? "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-emerald-500/30"
                    : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-md border-2 border-slate-200 dark:border-slate-700"
                } ${cardWidthClass} h-32 sm:h-36 p-2`}
              >
                {/* Slot Position Tag */}
                <div className="w-full flex items-center justify-between px-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    #{idx + 1}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    {digitLen}d
                  </span>
                </div>

                {/* Big Number */}
                <div
                  className={`${fontSizeClass} font-black tracking-tight my-auto text-center break-all px-1`}
                >
                  {valStr}
                </div>

                {/* Single Digit Visual Dots for Kids (only for <= 9) */}
                {card.value <= 9 && (
                  <div className="flex items-center justify-center gap-0.5 flex-wrap px-1 max-w-[60px] pb-1">
                    {Array.from({ length: Math.min(card.value, 9) }).map((_, dotIdx) => (
                      <span
                        key={dotIdx}
                        className={`w-1.5 h-1.5 rounded-full ${
                          isCorrect ? "bg-white/80" : "bg-indigo-400 dark:bg-indigo-500"
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Quick Step Buttons for mobile & accessible users */}
                {!isCorrect && (
                  <div className="w-full flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveCard(idx, -1);
                      }}
                      className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-20 cursor-pointer"
                      title="Move left"
                    >
                      <MoveLeft className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    </button>
                    <span className="text-[9px] font-bold text-slate-400">
                      {isSelected ? "Selected" : "Tap"}
                    </span>
                    <button
                      type="button"
                      disabled={idx === cards.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveCard(idx, 1);
                      }}
                      className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-20 cursor-pointer"
                      title="Move right"
                    >
                      <MoveRight className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Verification Feedback Banner with Kid Motivational Praise & Next Controls */}
      {isCorrect === true && (
        <div
          className={`w-full max-w-2xl mb-4 p-4 sm:p-5 rounded-2xl text-white shadow-xl flex flex-col gap-3.5 animate-in zoom-in-95 duration-200 ${
            isLevelCompleted
              ? "bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 shadow-indigo-500/25 border border-indigo-300/30"
              : "bg-gradient-to-br from-emerald-600 to-teal-700 shadow-emerald-500/25 border border-emerald-400/30"
          }`}
        >
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-3 text-center sm:text-left">
              <div className="w-11 h-11 rounded-2xl bg-white text-emerald-600 flex items-center justify-center shrink-0 shadow-md">
                {isLevelCompleted ? (
                  <Trophy className="w-6 h-6 text-amber-500 stroke-[2.5]" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 stroke-[2.5]" />
                )}
              </div>
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <span className="font-black text-base sm:text-lg tracking-tight">
                    {isLevelCompleted
                      ? `🏆 Level ${level} Completed! (All 5 Puzzles Solved!)`
                      : `🎉 Puzzle ${roundInLevel} of ${ROUNDS_PER_LEVEL} Solved!`}
                  </span>
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-white/20 text-white flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-300 fill-amber-300" />
                    <span>Streak: {streak}</span>
                  </span>
                </div>
                <p className="text-xs text-white/90 font-semibold mt-0.5">
                  {feedbackMsg || "All cards are placed in the correct order!"}
                </p>
              </div>
            </div>

            {/* Explicit Next Button Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {isLevelCompleted ? (
                <>
                  <button
                    type="button"
                    onClick={handleReplayLevel}
                    className="px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                    title="Play 5 new puzzles for this level"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Replay Level</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextLevel}
                    className="px-4 py-2 rounded-xl bg-white text-purple-900 hover:bg-slate-50 font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <span>Next Level (Level {level + 1})</span>
                    <ArrowRight className="w-4 h-4 text-purple-600" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleNextPuzzle}
                  className="px-4 py-2 rounded-xl bg-white text-emerald-900 hover:bg-slate-50 font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <span>Next Puzzle ({roundInLevel + 1} of {ROUNDS_PER_LEVEL})</span>
                  <ArrowRight className="w-4 h-4 text-emerald-600" />
                </button>
              )}
            </div>
          </div>

          {/* Kids Message Card */}
          {motivationMsg && (
            <div className="w-full bg-white/20 dark:bg-black/20 backdrop-blur-md rounded-xl p-3 border border-white/30 flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-400 text-amber-950 flex items-center justify-center shrink-0 shadow-xs">
                  <Star className="w-4 h-4 fill-amber-950 stroke-[2]" />
                </div>
                <div className="text-left flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-200">
                    Message:
                  </span>
                  <span className="text-sm sm:text-base font-black text-white">
                    {motivationMsg}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {isCorrect === false && (
        <div className="w-full max-w-2xl mb-4 p-3.5 rounded-2xl bg-amber-500 text-white shadow-md flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center space-x-2.5">
            <HelpCircle className="w-5 h-5 shrink-0 text-amber-200" />
            <p className="text-xs sm:text-sm font-bold">
              {feedbackMsg || "Not quite right yet. Please rearrange the cards and try again!"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => checkArrangement()}
            className="px-3 py-1.5 rounded-xl bg-white text-amber-900 font-black text-xs shrink-0 cursor-pointer shadow-xs active:scale-95 transition-all"
          >
            Check Again
          </button>
        </div>
      )}

      {/* Bottom Action Controls */}
      <div className="w-full max-w-2xl flex items-center justify-between flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={() => generateNewPuzzle(direction, level)}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>New Random Puzzle</span>
        </button>

        <div className="flex items-center space-x-2">
          {isCorrect === true ? (
            isLevelCompleted ? (
              <button
                type="button"
                onClick={handleNextLevel}
                className="flex items-center space-x-1.5 px-5 py-2 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md shadow-purple-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <span>Next Level (Level {level + 1})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNextPuzzle}
                className="flex items-center space-x-1.5 px-5 py-2 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <span>Next Puzzle ({roundInLevel + 1} of {ROUNDS_PER_LEVEL})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={() => checkArrangement()}
              className="flex items-center space-x-1.5 px-5 py-2 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Check Order ✓</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
