import React, { useState } from "react";
import { Sparkles, X, Check, BookmarkPlus, Tag, BookOpen, AlertCircle, Copy } from "lucide-react";
import { AISolutionResponse } from "../types";

interface StepSolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  solution: AISolutionResponse | null;
  isLoading: boolean;
  onSaveToHistory: (symbolName: string, tags: string[], notes: string) => void;
}

export const StepSolutionModal: React.FC<StepSolutionModalProps> = ({
  isOpen,
  onClose,
  solution,
  isLoading,
  onSaveToHistory,
}) => {
  const [symbolName, setSymbolName] = useState("");
  const [customTagInput, setCustomTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync tags when solution loads
  React.useEffect(() => {
    if (solution) {
      setTags(solution.tags || [solution.category]);
      setSymbolName("");
      setNotes("");
      setSaved(false);
    }
  }, [solution]);

  if (!isOpen) return null;

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    if (customTagInput.trim() && !tags.includes(customTagInput.trim())) {
      setTags([...tags, customTagInput.trim()]);
      setCustomTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleCopySolution = () => {
    if (!solution) return;
    const text = `Problem: ${solution.problem}\nAnswer: ${solution.finalAnswer}\nCategory: ${solution.category}\n\nSummary:\n${solution.summary}\n\nSteps:\n${solution.steps
      .map((s) => `${s.stepNumber}. ${s.title}: ${s.explanation} [${s.mathFormula}] (Rule: ${s.rule || "N/A"})`)
      .join("\n")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSaveToHistory(symbolName.trim(), tags, notes.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        id="ai-step-solution-modal"
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-sky-500/5 to-indigo-500/5">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                  AI Step-by-Step Explanation
                </h3>
                {solution?.category && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 uppercase">
                    {solution.category}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Detailed pedagogical breakdown, formulas & rules applied
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-3 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                AI is analyzing your math problem...
              </p>
              <p className="text-xs text-slate-400 text-center max-w-sm">
                Deriving algebraic steps, applying mathematical theorems, and formulating clear explanations.
              </p>
            </div>
          ) : solution ? (
            <>
              {/* Problem & Answer Banner */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Problem Input
                  </span>
                  <button
                    onClick={handleCopySolution}
                    className="flex items-center space-x-1 text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied!" : "Copy Steps"}</span>
                  </button>
                </div>
                <div className="font-mono text-base font-bold text-slate-800 dark:text-slate-100 break-words">
                  {solution.problem}
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Calculated Result:
                  </span>
                  <span className="font-mono text-base font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                    {solution.finalAnswer}
                  </span>
                </div>
              </div>

              {/* Summary */}
              {solution.summary && (
                <div className="text-xs text-slate-600 dark:text-slate-300 bg-sky-50/50 dark:bg-slate-800/40 p-3 rounded-xl border border-sky-100 dark:border-slate-700/60 leading-relaxed">
                  <span className="font-bold text-sky-700 dark:text-sky-300 mr-1">Methodology:</span>
                  {solution.summary}
                </div>
              )}

              {/* Step list */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Sequential Solution Steps:
                </h4>
                {solution.steps?.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-2 relative"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {step.stepNumber}
                        </span>
                        <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                          {step.title}
                        </h5>
                      </div>
                      {step.rule && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
                          {step.rule}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 pl-8 leading-relaxed">
                      {step.explanation}
                    </p>

                    {step.mathFormula && (
                      <div className="pl-8 pt-1">
                        <div className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 inline-block">
                          {step.mathFormula}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Reference Formula if provided */}
              {solution.formulaReference && (
                <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong className="mr-1">Key Formula:</strong> {solution.formulaReference}
                  </span>
                </div>
              )}

              {/* Tagging & Note Organizer Section */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  <Tag className="w-3.5 h-3.5 text-sky-500" />
                  <span>Categorize & Name Symbol for Notes:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Symbol / Variable Name (e.g. v_final, θ_refract)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. F_net, v_0, theta"
                      value={symbolName}
                      onChange={(e) => setSymbolName(e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Add Custom Tags
                    </label>
                    <div className="flex space-x-1.5 mt-1">
                      <input
                        type="text"
                        placeholder="Add tag and press enter"
                        value={customTagInput}
                        onChange={(e) => setCustomTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-300"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Active tags */}
                {tags.length > 0 && (
                  <div className="flex items-center flex-wrap gap-1.5 pt-1">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-medium border border-sky-500/20"
                      >
                        <span>{t}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="hover:text-red-500 ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Quick Note or Study Remark:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Chapter 4 problem 12 homework review"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm">No solution generated yet.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
          {solution && (
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Saved to History!</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-4 h-4" />
                  <span>Save to History & Notes</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
