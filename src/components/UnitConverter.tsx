import React, { useState } from "react";
import { ArrowLeftRight, Copy, Check, Calculator } from "lucide-react";
import { UNIT_CATEGORIES } from "../utils/constants";
import { UnitCategory } from "../types";

interface UnitConverterProps {
  onInsertToCalculator: (value: string) => void;
}

export const UnitConverter: React.FC<UnitConverterProps> = ({ onInsertToCalculator }) => {
  const [selectedCatId, setSelectedCatId] = useState<string>("length");
  const [fromUnitId, setFromUnitId] = useState<string>("m");
  const [toUnitId, setToUnitId] = useState<string>("ft");
  const [fromValue, setFromValue] = useState<string>("1");
  const [copied, setCopied] = useState<boolean>(false);

  const activeCategory: UnitCategory =
    UNIT_CATEGORIES.find((c) => c.id === selectedCatId) || UNIT_CATEGORIES[0];

  const handleCategoryChange = (catId: string) => {
    setSelectedCatId(catId);
    const cat = UNIT_CATEGORIES.find((c) => c.id === catId);
    if (cat && cat.units.length >= 2) {
      setFromUnitId(cat.units[0].id);
      setToUnitId(cat.units[1].id);
    }
  };

  const handleSwapUnits = () => {
    const temp = fromUnitId;
    setFromUnitId(toUnitId);
    setToUnitId(temp);
  };

  // Conversion logic
  const fromUnit = activeCategory.units.find((u) => u.id === fromUnitId) || activeCategory.units[0];
  const toUnit = activeCategory.units.find((u) => u.id === toUnitId) || activeCategory.units[1];

  let convertedValue = "";
  const numVal = parseFloat(fromValue);
  if (!isNaN(numVal)) {
    const inBase = fromUnit.toBase(numVal);
    const result = toUnit.fromBase(inBase);
    convertedValue = Math.abs(result) < 1e-6 || Math.abs(result) >= 1e9
      ? result.toExponential(6)
      : parseFloat(result.toFixed(6)).toString();
  }

  const handleCopy = () => {
    if (!convertedValue) return;
    navigator.clipboard.writeText(convertedValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <ArrowLeftRight className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
            Scientific Unit Converter
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Convert standard physical measurements with high precision
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 scrollbar-none">
        {UNIT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCatId === cat.id
                ? "bg-emerald-500 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Converter Dual Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
        {/* From Box */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              From
            </span>
            <select
              value={fromUnitId}
              onChange={(e) => setFromUnitId(e.target.value)}
              className="text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
            >
              {activeCategory.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.symbol})
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <input
              type="number"
              value={fromValue}
              onChange={(e) => setFromValue(e.target.value)}
              className="w-full text-xl sm:text-2xl font-mono font-bold px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              placeholder="0"
            />
            <span className="absolute right-3 top-3 text-xs font-mono font-bold text-slate-400">
              {fromUnit.symbol}
            </span>
          </div>
        </div>

        {/* Swap Button (floating in middle on sm screens) */}
        <div className="sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 flex justify-center z-10">
          <button
            type="button"
            onClick={handleSwapUnits}
            title="Swap Units"
            className="p-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:rotate-180 transition-all cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>

        {/* To Box */}
        <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
              To
            </span>
            <select
              value={toUnitId}
              onChange={(e) => setToUnitId(e.target.value)}
              className="text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
            >
              {activeCategory.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.symbol})
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <input
              type="text"
              readOnly
              value={convertedValue}
              className="w-full text-xl sm:text-2xl font-mono font-bold px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-600 dark:text-emerald-400 select-all"
              placeholder="0"
            />
            <span className="absolute right-3 top-3 text-xs font-mono font-bold text-emerald-500/70">
              {toUnit.symbol}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          1 {fromUnit.name} ={" "}
          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
            {toUnit.fromBase(fromUnit.toBase(1)).toFixed(6)}
          </span>{" "}
          {toUnit.symbol}
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!convertedValue}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>

          <button
            type="button"
            onClick={() => onInsertToCalculator(convertedValue)}
            disabled={!convertedValue}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Send to Calculator</span>
          </button>
        </div>
      </div>
    </div>
  );
};
