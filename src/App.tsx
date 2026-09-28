import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Calculator } from "./components/Calculator";
import { HandwritingPad } from "./components/HandwritingPad";
import { UnitConverter } from "./components/UnitConverter";
import { HistoryDrawer } from "./components/HistoryDrawer";
import { StepSolutionModal } from "./components/StepSolutionModal";
import { RewardsBanner } from "./components/RewardsBanner";
import { DailyMathTrivia } from "./components/DailyMathTrivia";
import {
  AISolutionResponse,
  CalculationHistoryItem,
  GradeLevel,
  KidsRewardState,
} from "./types";

const LOCAL_STORAGE_HISTORY_KEY = "omnimath_calc_history_v1";
const LOCAL_STORAGE_REWARDS_KEY = "omnimath_kids_rewards_v1";
const LOCAL_STORAGE_THEME_KEY = "omnimath_dark_mode_v1";

export default function App() {
  const [activeTab, setActiveTab] = useState<
    "handwriting" | "calculator" | "converter" | "history"
  >("handwriting");

  // Dark mode state: default to dark for comfortable late-night study sessions or persisted pref
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
    return saved !== null ? saved === "true" : true;
  });

  // History items state
  const [history, setHistory] = useState<CalculationHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // Fallback
    }
    // Seed initial pedagogical examples so user immediately sees tags, symbols & organization
    return [
      {
        id: "seed-1",
        timestamp: Date.now() - 1000 * 60 * 25,
        expression: "9.8 * 4.5^2 / 2",
        result: "99.225",
        symbolName: "Δy",
        tags: ["Physics", "Kinematics", "FreeFall"],
        notes: "Free fall distance under gravity for t=4.5s",
        angleMode: "DEG",
      },
      {
        id: "seed-2",
        timestamp: Date.now() - 1000 * 60 * 12,
        expression: "sin(45) * 1.33 / sin(30)",
        result: "1.8809",
        symbolName: "n_medium",
        tags: ["Physics", "Optics", "SnellsLaw"],
        notes: "Refraction index calculation Snell's Law",
        angleMode: "DEG",
      },
    ];
  });

  // Kids & Student Rewards State
  const [rewards, setRewards] = useState<KidsRewardState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_REWARDS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // Fallback
    }
    return {
      practiceCount: 0,
      totalStars: 15,
      level: 1,
      unlockedBadges: ["Number Explorer"],
    };
  });

  // Modals & AI State
  const [isRewardsModalOpen, setIsRewardsModalOpen] = useState<boolean>(false);
  const [showCelebrationAlert, setShowCelebrationAlert] = useState<boolean>(false);

  const [isAISolutionModalOpen, setIsAISolutionModalOpen] = useState<boolean>(false);
  const [currentAISolution, setCurrentAISolution] = useState<AISolutionResponse | null>(null);
  const [isAILoading, setIsAILoading] = useState<boolean>(false);

  // Grade level selector for handwriting math lab
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>("Elementary (1st - 3rd)");

  // Value passed into calculator when restored from history or converter
  const [calculatorInput, setCalculatorInput] = useState<string>("");

  // Sync Dark Mode to DOM
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_THEME_KEY, String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Persist history & rewards
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      // Ignore
    }
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_REWARDS_KEY, JSON.stringify(rewards));
    } catch (e) {
      // Ignore
    }
  }, [rewards]);

  // History handlers
  const handleAddHistoryItem = (item: CalculationHistoryItem) => {
    setHistory((prev) => [item, ...prev]);
  };

  const handleUpdateHistoryItem = (updated: CalculationHistoryItem) => {
    setHistory((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  // Practice & Rewards increment logic
  const handleIncrementPractice = () => {
    setRewards((prev) => {
      const nextPractice = prev.practiceCount + 1;
      const earnedStars = prev.totalStars + 1;

      // Every 10 practices triggers level up + 5 bonus stars!
      if (nextPractice % 10 === 0) {
        const nextLevel = prev.level + 1;
        const newBadges = [...(prev.unlockedBadges || [])];
        if (nextLevel === 2 && !newBadges.includes("Math Star")) newBadges.push("Math Star");
        if (nextLevel === 3 && !newBadges.includes("Equation Wizard")) newBadges.push("Equation Wizard");
        if (nextLevel >= 4 && !newBadges.includes("Grand Scholar")) newBadges.push("Grand Scholar");

        // Display the small, non-intrusive floating milestone banner without layout shift
        setTimeout(() => {
          setShowCelebrationAlert(true);
        }, 60);

        return {
          ...prev,
          practiceCount: nextPractice,
          totalStars: earnedStars + 5, // bonus 5 stars
          level: nextLevel,
          unlockedBadges: newBadges,
        };
      }

      return {
        ...prev,
        practiceCount: nextPractice,
        totalStars: earnedStars,
      };
    });
  };

  const handleRewardTrigger = () => {
    setShowCelebrationAlert(true);
  };

  // AI Step-by-Step Problem Solver Handler
  const handleRequestAISteps = async (expression: string, categoryHint?: string) => {
    if (!expression.trim()) return;

    setIsAISolutionModalOpen(true);
    setIsAILoading(true);
    setCurrentAISolution(null);

    try {
      const res = await fetch("/api/ai/solve-steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: expression,
          category: categoryHint || "General",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get AI step explanation");
      }

      const data: AISolutionResponse = await res.json();
      setCurrentAISolution(data);
    } catch (err: any) {
      setCurrentAISolution({
        problem: expression,
        finalAnswer: "Error generating steps",
        category: "General",
        summary: "Could not connect to AI solver. Please check your network.",
        steps: [
          {
            stepNumber: 1,
            title: "Direct Evaluation",
            explanation: "Review expression syntax and try again.",
            mathFormula: expression,
          },
        ],
        tags: ["Error"],
      });
    } finally {
      setIsAILoading(false);
    }
  };

  // Save AI Solution directly to history with user-defined symbol, tags & notes
  const handleSaveAISolutionToHistory = (
    symbolName: string,
    tags: string[],
    notes: string
  ) => {
    if (!currentAISolution) return;

    const newItem: CalculationHistoryItem = {
      id: `ai-sol-${Date.now()}`,
      timestamp: Date.now(),
      expression: currentAISolution.problem,
      result: currentAISolution.finalAnswer,
      symbolName: symbolName || undefined,
      tags: tags.length > 0 ? tags : [currentAISolution.category],
      notes: notes || currentAISolution.summary,
      angleMode: "DEG",
      aiSteps: currentAISolution.steps,
    };

    handleAddHistoryItem(newItem);
  };

  // Handle restoring item to Calculator
  const handleSelectHistoryItem = (item: CalculationHistoryItem) => {
    setCalculatorInput(item.expression);
    setActiveTab("calculator");
  };

  const handleInsertUnitToCalculator = (val: string) => {
    setCalculatorInput(val);
    setActiveTab("calculator");
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
    }`}>
      {/* Global Navigation Header with Rewards Bar & Dark Mode */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        historyCount={history.length}
        rewards={rewards}
        onOpenRewards={() => {
          setShowCelebrationAlert(false);
          setIsRewardsModalOpen(true);
        }}
      />

      {/* Main App Content Body */}
      <main className={`flex-1 max-w-7xl w-full mx-auto ${
        activeTab === "handwriting" ? "p-2 sm:px-4 sm:py-2.5" : "p-3 sm:p-6"
      }`}>
        {/* Daily Math Trivia Widget */}
        <div className="mb-3">
          <DailyMathTrivia darkMode={darkMode} />
        </div>

        {activeTab === "calculator" && (
          <div className="space-y-4">
            <Calculator
              onAddHistoryItem={handleAddHistoryItem}
              onRequestAISteps={handleRequestAISteps}
              initialExpression={calculatorInput}
              onClearInitialExpression={() => setCalculatorInput("")}
            />
          </div>
        )}

        {activeTab === "handwriting" && (
          <div className="space-y-2">
            <HandwritingPad
              gradeLevel={gradeLevel}
              setGradeLevel={setGradeLevel}
              rewards={rewards}
              onIncrementPractice={handleIncrementPractice}
              onRewardTrigger={handleRewardTrigger}
              darkMode={darkMode}
            />
          </div>
        )}

        {activeTab === "converter" && (
          <div className="space-y-4">
            <UnitConverter onInsertToCalculator={handleInsertUnitToCalculator} />
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-4">
            <HistoryDrawer
              history={history}
              onSelectHistoryItem={handleSelectHistoryItem}
              onUpdateHistoryItem={handleUpdateHistoryItem}
              onDeleteHistoryItem={handleDeleteHistoryItem}
              onClearHistory={handleClearHistory}
            />
          </div>
        )}
      </main>

      {/* AI Step-by-Step Solution Explainer Modal */}
      <StepSolutionModal
        isOpen={isAISolutionModalOpen}
        onClose={() => setIsAISolutionModalOpen(false)}
        solution={currentAISolution}
        isLoading={isAILoading}
        onSaveToHistory={handleSaveAISolutionToHistory}
      />

      {/* Celebratory Rewards & Badges Modal */}
      <RewardsBanner
        isOpen={isRewardsModalOpen}
        onClose={() => setIsRewardsModalOpen(false)}
        rewards={rewards}
        showCelebrationAlert={showCelebrationAlert}
        onCloseCelebration={() => setShowCelebrationAlert(false)}
        onOpenFullRewards={() => {
          setShowCelebrationAlert(false);
          setIsRewardsModalOpen(true);
        }}
      />
    </div>
  );
}
