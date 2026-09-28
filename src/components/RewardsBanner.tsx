import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { Star, Trophy, Sparkles, Award, CheckCircle, X } from "lucide-react";
import { KidsRewardState } from "../types";

interface RewardsBannerProps {
  isOpen: boolean;
  onClose: () => void;
  rewards: KidsRewardState;
  showCelebrationAlert?: boolean;
  onCloseCelebration?: () => void;
  onOpenFullRewards?: () => void;
}

export const RewardsBanner: React.FC<RewardsBannerProps> = ({
  isOpen,
  onClose,
  rewards,
  showCelebrationAlert = false,
  onCloseCelebration,
  onOpenFullRewards,
}) => {
  // Auto-dismiss the 10-practice reward banner after 5 seconds
  useEffect(() => {
    if (showCelebrationAlert) {
      try {
        confetti({
          particleCount: 35,
          spread: 50,
          origin: { x: 0.9, y: 0.12 },
          colors: ["#fbbf24", "#818cf8", "#34d399", "#f43f5e"],
          disableForReducedMotion: true,
        });
      } catch (_e) {
        // Ignore fallback
      }

      const timer = setTimeout(() => {
        if (onCloseCelebration) {
          onCloseCelebration();
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [showCelebrationAlert, onCloseCelebration]);

  const BADGE_DEFINITIONS = [
    { name: "Number Explorer", desc: "Practiced writing numbers 10 times", icon: "🌟", req: 1 },
    { name: "Math Star", desc: "Level 2: Master of basic arithmetic", icon: "⭐", req: 2 },
    { name: "Equation Wizard", desc: "Level 3: Calculus & Physics solver", icon: "🔮", req: 3 },
    { name: "Grand Scholar", desc: "Level 4: Advanced graduate problem solver", icon: "👑", req: 4 },
  ];

  const milestoneProgress = rewards.practiceCount % 10 === 0 && rewards.practiceCount > 0 ? 10 : rewards.practiceCount % 10;

  return (
    <>
      {/* 10-Practice Floating Reward Banner (Compact, Non-Intrusive, Zero Layout Shift) */}
      {showCelebrationAlert && (
        <aside
          aria-label="Practice milestone notification"
          className="fixed top-16 sm:top-20 right-3 sm:right-6 z-50 pointer-events-none"
        >
          <div
            id="ten-practice-reward-banner"
            role="alert"
            aria-live="polite"
            className="pointer-events-auto flex items-center gap-2.5 sm:gap-3 px-3.5 py-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-amber-300/80 dark:border-amber-700/60 shadow-xl shadow-amber-500/10 text-slate-800 dark:text-slate-100 max-w-xs sm:max-w-sm transition-all animate-in fade-in slide-in-from-top-2 duration-300"
          >
            {/* Medallion Icon */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300/80 dark:border-amber-700/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Trophy className="w-4 h-4 text-amber-500" />
            </div>

            {/* Concise Message */}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black text-slate-900 dark:text-white truncate leading-tight">
                10 Practices Completed! 🎉
              </div>
              <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-0.5 truncate leading-tight">
                +5 Stars ⭐ • Level {rewards.level}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {onOpenFullRewards && (
                <button
                  type="button"
                  onClick={onOpenFullRewards}
                  className="px-2 py-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="View Badges"
                >
                  Badges
                </button>
              )}
              <button
                type="button"
                onClick={onCloseCelebration || onClose}
                aria-label="Dismiss banner"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Full Rewards & Badges Showcase Modal (Opened explicitly from Header or Banner) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs"
          onClick={onClose}
        >
          <div
            id="rewards-showcase-modal"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-900/40 overflow-hidden relative"
          >
            {/* Header */}
            <div className="bg-gradient-to-tr from-amber-400 via-amber-500 to-indigo-600 px-4 py-3 text-white text-center relative">
              <button
                onClick={onClose}
                aria-label="Close Rewards"
                className="absolute top-2.5 right-2.5 p-1 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="w-8 h-8 mx-auto rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-1 shadow-inner">
                <Trophy className="w-4 h-4 text-amber-200" />
              </div>

              <h3 className="text-sm font-black tracking-tight leading-tight">
                Math Practice Rewards
              </h3>
              <p className="text-[11px] text-amber-100 mt-0.5 leading-snug">
                Earn stars, level up, and collect badges by practicing!
              </p>
            </div>

            {/* Rewards Stats Bar */}
            <div className="p-3.5 space-y-3">
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
                  <Star className="w-3.5 h-3.5 mx-auto text-amber-500 fill-amber-500 mb-0.5" />
                  <div className="text-sm font-black text-slate-800 dark:text-slate-100">
                    {rewards.totalStars}
                  </div>
                  <div className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                    Stars
                  </div>
                </div>

                <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/30">
                  <Sparkles className="w-3.5 h-3.5 mx-auto text-indigo-500 mb-0.5" />
                  <div className="text-sm font-black text-slate-800 dark:text-slate-100">
                    Lvl {rewards.level}
                  </div>
                  <div className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                    Level
                  </div>
                </div>

                <div className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30">
                  <Award className="w-3.5 h-3.5 mx-auto text-emerald-500 mb-0.5" />
                  <div className="text-sm font-black text-slate-800 dark:text-slate-100">
                    {milestoneProgress} / 10
                  </div>
                  <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                    Milestone
                  </div>
                </div>
              </div>

              {/* Progress to next 10 reward */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  <span>Next 10-Practice Reward:</span>
                  <span className="font-mono font-bold text-amber-500">
                    {milestoneProgress * 10}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-indigo-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, milestoneProgress * 10)}%` }}
                  ></div>
                </div>
              </div>

              {/* Badges Collection */}
              <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Badges:
                </h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {BADGE_DEFINITIONS.map((b) => {
                    const isUnlocked = rewards.level >= b.req;
                    return (
                      <div
                        key={b.name}
                        className={`p-1.5 rounded-lg border flex items-center space-x-1.5 transition-colors ${
                          isUnlocked
                            ? "bg-amber-50/50 dark:bg-slate-800 border-amber-200 dark:border-slate-700"
                            : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-50"
                        }`}
                      >
                        <span className="text-base shrink-0">{b.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1">
                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                              {b.name}
                            </span>
                            {isUnlocked && (
                              <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                Continue Practicing
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
