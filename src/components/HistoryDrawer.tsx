import React, { useState } from "react";
import {
  History,
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  Trash2,
  Tag,
  Bookmark,
  Calendar,
  RotateCcw,
  Check,
  Edit2,
  ExternalLink,
} from "lucide-react";
import { CalculationHistoryItem } from "../types";
import { exportHistoryToCSV, exportHistoryToJSON, exportHistoryToPrintablePDF } from "../utils/exportUtils";

interface HistoryDrawerProps {
  history: CalculationHistoryItem[];
  onSelectHistoryItem: (item: CalculationHistoryItem) => void;
  onUpdateHistoryItem: (updated: CalculationHistoryItem) => void;
  onDeleteHistoryItem: (id: string) => void;
  onClearHistory: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  history,
  onSelectHistoryItem,
  onUpdateHistoryItem,
  onDeleteHistoryItem,
  onClearHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("All");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editSymbol, setEditSymbol] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Gather unique tags
  const allTags = Array.from(
    new Set(history.flatMap((item) => item.tags || []).filter(Boolean))
  );

  const filteredHistory = history.filter((item) => {
    const matchesTag =
      selectedTag === "All" || (item.tags && item.tags.includes(selectedTag));
    const query = searchQuery.toLowerCase();
    const matchesQuery =
      item.expression.toLowerCase().includes(query) ||
      item.result.toLowerCase().includes(query) ||
      (item.symbolName && item.symbolName.toLowerCase().includes(query)) ||
      (item.notes && item.notes.toLowerCase().includes(query)) ||
      (item.tags && item.tags.some((t) => t.toLowerCase().includes(query)));
    return matchesTag && matchesQuery;
  });

  const handleStartEdit = (item: CalculationHistoryItem) => {
    setEditingItemId(item.id);
    setEditSymbol(item.symbolName || "");
    setEditTags((item.tags || []).join(", "));
    setEditNotes(item.notes || "");
  };

  const handleSaveEdit = (item: CalculationHistoryItem) => {
    const parsedTags = editTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    onUpdateHistoryItem({
      ...item,
      symbolName: editSymbol.trim() || undefined,
      tags: parsedTags,
      notes: editNotes.trim() || undefined,
    });
    setEditingItemId(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
              Calculation History & Notes Log
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Review, label symbols, categorize with tags, and export study reports
            </p>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center space-x-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => exportHistoryToPrintablePDF(filteredHistory)}
            disabled={filteredHistory.length === 0}
            title="Export formatted printable study report (PDF)"
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-slate-700 text-xs font-semibold transition-colors disabled:opacity-40"
          >
            <FileText className="w-3.5 h-3.5 text-sky-500" />
            <span>Export PDF</span>
          </button>

          <button
            type="button"
            onClick={() => exportHistoryToCSV(filteredHistory)}
            disabled={filteredHistory.length === 0}
            title="Export as CSV spreadsheet"
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-slate-700 text-xs font-semibold transition-colors disabled:opacity-40"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => exportHistoryToJSON(filteredHistory)}
            disabled={filteredHistory.length === 0}
            title="Export JSON"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">JSON</span>
          </button>

          {history.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Are you sure you want to clear all calculation history?")) {
                  onClearHistory();
                }
              }}
              title="Clear all history"
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search & Tag Filter Bar */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search calculations by math expression, result, variable symbol, tag, or note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Tag Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedTag("All")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedTag === "All"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            All ({history.length})
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedTag === tag
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* History Items List */}
      <div className="space-y-3">
        {filteredHistory.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <History className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm">No calculations match your search.</p>
            <p className="text-xs">Perform a calculation or clear filters to view history.</p>
          </div>
        ) : (
          filteredHistory.map((item) => {
            const isEditing = editingItemId === item.id;

            return (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50 shadow-2xs space-y-2.5 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  {/* Symbol / Expression */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap">
                      {item.symbolName && (
                        <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                          {item.symbolName}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </span>
                      <span className="text-[10px] px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {item.angleMode}
                      </span>
                    </div>

                    <div className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200 break-all">
                      {item.expression}
                    </div>
                  </div>

                  {/* Result & Actions */}
                  <div className="text-right shrink-0 space-y-1">
                    <div className="font-mono text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                      = {item.result}
                    </div>
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        type="button"
                        onClick={() => onSelectHistoryItem(item)}
                        title="Load into calculator"
                        className="p-1 rounded-md text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => (isEditing ? handleSaveEdit(item) : handleStartEdit(item))}
                        title={isEditing ? "Save details" : "Edit tags & notes"}
                        className="p-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        {isEditing ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Edit2 className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteHistoryItem(item.id)}
                        title="Delete entry"
                        className="p-1 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Edit Form */}
                {isEditing ? (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">
                        Symbol Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. v_0 or Area"
                        value={editSymbol}
                        onChange={(e) => setEditSymbol(e.target.value)}
                        className="w-full mt-0.5 px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">
                        Tags (comma separated)
                      </label>
                      <input
                        type="text"
                        placeholder="Physics, Trig, HW"
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        className="w-full mt-0.5 px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">
                        Study Notes
                      </label>
                      <input
                        type="text"
                        placeholder="Notes or formula reminder"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full mt-0.5 px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                      />
                    </div>
                    <div className="sm:col-span-3 flex justify-end space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingItemId(null)}
                        className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(item)}
                        className="px-3 py-1 bg-sky-500 text-white text-xs font-bold rounded shadow-xs"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Tags & Notes display */}
                    {((item.tags && item.tags.length > 0) || item.notes) && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div className="flex items-center space-x-1 flex-wrap">
                          {item.tags?.map((t) => (
                            <span
                              key={t}
                              className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-medium"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>

                        {item.notes && (
                          <span className="text-slate-500 dark:text-slate-400 italic text-[11px] max-w-md truncate">
                            📝 {item.notes}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
