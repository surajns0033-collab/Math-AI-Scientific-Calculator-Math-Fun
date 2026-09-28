import React, { useState } from "react";
import { BookOpen, X, ChevronRight, Check, Search } from "lucide-react";
import { PRESET_FORMULAS } from "../utils/constants";
import { PhysicsFormula } from "../types";

interface FormulaSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFormula: (formulaExpression: string, formulaName: string, category: string) => void;
}

export const FormulaSheet: React.FC<FormulaSheetProps> = ({
  isOpen,
  onClose,
  onSelectFormula,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeFormula, setActiveFormula] = useState<PhysicsFormula | null>(null);
  const [varInputs, setVarInputs] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const categories = ["All", "Kinematics", "Dynamics & Energy", "Waves & Optics", "Trigonometry", "Calculus"];

  const filteredFormulas = PRESET_FORMULAS.filter((f) => {
    const matchesCat = selectedCategory === "All" || f.category === selectedCategory;
    const matchesQuery =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.formula.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleOpenFormulaDetail = (formula: PhysicsFormula) => {
    setActiveFormula(formula);
    const initialVars: Record<string, string> = {};
    formula.variables.forEach((v) => {
      initialVars[v.symbol] = "";
    });
    setVarInputs(initialVars);
  };

  const handleApplyWithValues = () => {
    if (!activeFormula) return;
    let expr = activeFormula.templateExpression;
    Object.keys(varInputs).forEach((sym) => {
      const val = varInputs[sym]?.trim() || sym;
      // Replace isolated symbol
      const regex = new RegExp(`\\b${sym}\\b`, "g");
      expr = expr.replace(regex, `(${val})`);
    });
    onSelectFormula(expr, activeFormula.name, activeFormula.category);
    onClose();
  };

  const handleApplyTemplateDirectly = (formula: PhysicsFormula) => {
    onSelectFormula(formula.templateExpression, formula.name, formula.category);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        id="formula-sheet-modal"
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                Physics & Trigonometry Equations
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Quickly insert standard scientific formulas and evaluate with variables
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

        {/* Filter Bar */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search equations (e.g. velocity, Snell, kinetic, cosine)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-sky-500 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Formulas List & Detail */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {activeFormula ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3.5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                    {activeFormula.category}
                  </span>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {activeFormula.name}
                  </h4>
                  <div className="font-mono text-sm font-semibold text-sky-600 dark:text-sky-400 mt-0.5">
                    {activeFormula.formula}
                  </div>
                </div>
                <button
                  onClick={() => setActiveFormula(null)}
                  className="text-xs text-sky-600 dark:text-sky-400 underline font-medium hover:text-sky-700"
                >
                  Back to list
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300">
                {activeFormula.description}
              </p>

              {/* Variable inputs */}
              <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  Substitute Parameters:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeFormula.variables.map((v) => (
                    <div key={v.symbol} className="space-y-1">
                      <label className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
                        <span>
                          {v.name} (<span className="font-mono font-bold text-sky-500">{v.symbol}</span>)
                        </span>
                        <span className="text-[10px] text-slate-400">{v.unit}</span>
                      </label>
                      <input
                        type="text"
                        placeholder={`Value for ${v.symbol}`}
                        value={varInputs[v.symbol] || ""}
                        onChange={(e) =>
                          setVarInputs({ ...varInputs, [v.symbol]: e.target.value })
                        }
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleApplyTemplateDirectly(activeFormula)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Insert Expression Template
                </button>
                <button
                  type="button"
                  onClick={handleApplyWithValues}
                  className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-sm transition-colors flex items-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Insert Substituted Formula</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredFormulas.map((formula) => (
                <div
                  key={formula.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-500 hover:bg-sky-50/30 dark:hover:bg-slate-800/40 transition-all text-left flex flex-col justify-between group cursor-pointer"
                  onClick={() => handleOpenFormulaDetail(formula)}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                        {formula.category}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500 transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {formula.name}
                    </h5>
                    <div className="font-mono text-xs font-semibold text-sky-600 dark:text-sky-400 mt-1">
                      {formula.formula}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                    {formula.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
