import React from "react";
import { Calculator, Edit3, ArrowLeftRight, History, Moon, Sun, Star, Trophy, Sparkles } from "lucide-react";
import { KidsRewardState } from "../types";

interface HeaderProps {
  activeTab: "calculator" | "handwriting" | "converter" | "history";
  setActiveTab: (tab: "calculator" | "handwriting" | "converter" | "history") => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  historyCount: number;
  rewards: KidsRewardState;
  onOpenRewards: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  historyCount,
  rewards,
  onOpenRewards,
}) => {
  return (
    <header className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors ${
      darkMode ? "bg-slate-900/90 border-slate-800 text-slate-100" : "bg-white/95 border-slate-200 text-slate-900"
    }`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Logo */}
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/20 text-white font-black text-lg">
            Ω
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold tracking-tight text-base sm:text-lg">OmniMath</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                AI & Canvas
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Scientific • Physics • Handwritten Lab • Kids Rewards
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 overflow-x-auto">
          <button
            id="nav-tab-handwriting"
            onClick={() => setActiveTab("handwriting")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all relative whitespace-nowrap ${
              activeTab === "handwriting"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Handwriting Practice</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
          </button>

          <button
            id="nav-tab-calculator"
            onClick={() => setActiveTab("calculator")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "calculator"
                ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Calculator</span>
          </button>

          <button
            id="nav-tab-converter"
            onClick={() => setActiveTab("converter")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "converter"
                ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Units</span>
          </button>

          <button
            id="nav-tab-history"
            onClick={() => setActiveTab("history")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "history"
                ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
            {historyCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-600 font-bold">
                {historyCount}
              </span>
            )}
          </button>
        </nav>

        {/* Top Right: Kids Practice Rewards Bar + Dark Mode Toggle */}
        <div className="flex items-center space-x-2">
          {/* Rewards Widget */}
          <button
            id="btn-rewards-widget"
            onClick={onOpenRewards}
            title="Kids & Student Practice Rewards"
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 transition-all cursor-pointer group"
          >
            <div className="flex items-center space-x-1 text-xs font-bold">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
              <span>{rewards.totalStars}</span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <div className="flex items-center space-x-1 text-xs font-bold">
              <Trophy className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Lvl {rewards.level}</span>
            </div>
            {/* 10x progress counter badge */}
            <div className="px-1.5 py-0.5 rounded-md bg-amber-500 text-white font-black text-[10px]">
              {rewards.practiceCount % 10 === 0 && rewards.practiceCount > 0 ? 10 : rewards.practiceCount % 10}/10
            </div>
          </button>

          {/* Theme Toggle */}
          <button
            id="btn-theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Study Mode"}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </div>
    </header>
  );
};
