import React from "react";
import { Sparkles, CheckCircle2, AlertCircle, Compass, HelpCircle } from "lucide-react";
import { LiveHintInfo } from "../utils/mathEngine";

interface LiveHintsProps {
  hintInfo: LiveHintInfo;
  onApplyCompletion: (token: string) => void;
  onCloseParen: () => void;
}

export const LiveHints: React.FC<LiveHintsProps> = ({
  hintInfo,
  onApplyCompletion,
  onCloseParen,
}) => {
  return (
    <div
      id="live-hint-blank-space"
      className="h-10 sm:h-11 px-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/90 text-xs flex items-center justify-between gap-2 overflow-hidden shrink-0 select-none"
    >
      {/* Live Status and Hint Message */}
      <div className="flex items-center space-x-1.5 font-medium truncate min-w-0 flex-1">
        {hintInfo.status === "valid" && hintInfo.previewValue ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400 shrink-0">Live:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm truncate">
              = {hintInfo.previewValue}
            </span>
          </>
        ) : hintInfo.unclosedParens > 0 ? (
          <>
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-amber-600 dark:text-amber-400 truncate">
              {hintInfo.hintMessage}
            </span>
            <button
              type="button"
              onClick={onCloseParen}
              className="px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-[10px] sm:text-[11px] underline shrink-0 cursor-pointer"
            >
              Insert '{")".repeat(hintInfo.unclosedParens)}'
            </button>
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5 text-sky-500 shrink-0 animate-pulse" />
            <span className="text-slate-600 dark:text-slate-400 truncate">
              {hintInfo.hintMessage}
            </span>
          </>
        )}

        {/* Physics/Trig Detected Badge */}
        {hintInfo.detectedFormula && (
          <div className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-semibold text-[10px] shrink-0">
            <Compass className="w-3 h-3" />
            <span className="truncate max-w-[120px]">{hintInfo.detectedFormula}</span>
          </div>
        )}
      </div>

      {/* Suggested quick completions */}
      {hintInfo.suggestedCompletions.length > 0 && (
        <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none shrink-0 max-w-[45%]">
          {hintInfo.suggestedCompletions.slice(0, 3).map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onApplyCompletion(item)}
              className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-sky-600 dark:text-sky-300 border border-slate-200 dark:border-slate-700 font-mono text-[10px] sm:text-[11px] font-medium transition-colors shadow-2xs whitespace-nowrap cursor-pointer shrink-0"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
