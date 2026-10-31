/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Download, Printer, Copy, Check } from 'lucide-react';
import { EventPlan } from '../types/event.ts';
import { formatCurrency, calculateBudgetSummary } from '../utils/budget.ts';
import { calculateEndTime, sortTimeline, generateRunSheetText } from '../utils/timeline.ts';
import { useFocusTrap } from '../hooks/useFocusTrap.ts';

interface ExportSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: EventPlan;
}

export const ExportSummaryModal: React.FC<ExportSummaryModalProps> = ({
  isOpen,
  onClose,
  currentPlan,
}) => {
  const [copied, setCopied] = useState(false);

  const containerRef = useFocusTrap<HTMLDivElement>({
    isOpen,
    onClose,
  });

  if (!isOpen) return null;

  const sortedTimeline = sortTimeline(currentPlan.schedule);
  const budgetSummary = calculateBudgetSummary(currentPlan.budget, currentPlan.totalBudget);

  const handleCopyText = async () => {
    try {
      const text = generateRunSheetText({
        ...currentPlan,
        budgetActualTotal: budgetSummary.totalActual,
      });
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
    }
  };

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentPlan, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${currentPlan.title.toLowerCase().replace(/\s+/g, '_')}_plan.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs overflow-y-auto"
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 id="export-modal-title" className="text-base font-bold text-slate-900">
              Export Vendor Run Sheet & Complete Blueprint
            </h2>
            <p className="text-xs text-slate-500">
              Generate formatted run-of-show documents for on-site staff or download raw plan data.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 cursor-pointer"
            aria-label="Close export dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content Preview */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs font-sans">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="font-semibold text-slate-700">Quick Actions:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyText}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                    <span className="text-emerald-700 font-semibold">Copied Run Sheet!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                    <span>Copy Text Run Sheet</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadJSON}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>Download JSON</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Print Run Sheet</span>
              </button>
            </div>
          </div>

          {/* Formatted printable sheet preview */}
          <div className="border border-slate-200 rounded-xl p-6 bg-white space-y-5 print:border-none print:p-0">
            <div className="border-b border-slate-200 pb-4">
              <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                Official Event Run Sheet
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900">{currentPlan.title}</h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                <span>{currentPlan.targetDate}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-numbers">{currentPlan.startTime} to {currentPlan.endTime}</span>
                <span aria-hidden="true">·</span>
                <span>{currentPlan.location.name}, {currentPlan.location.city}</span>
                <span aria-hidden="true">·</span>
                <span>{currentPlan.guestCount} Guests</span>
              </div>
            </div>

            {/* Run of Show Table */}
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Run of Show Schedule
              </h2>
              <table className="w-full text-left border-collapse border border-slate-200 text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                    <th className="p-2 border-r border-slate-200 w-28">Time Window</th>
                    <th className="p-2 border-r border-slate-200">Activity & Zone</th>
                    <th className="p-2 border-r border-slate-200 w-36">Lead Role</th>
                    <th className="p-2">Key Operational Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedTimeline.map((item) => {
                    const end = calculateEndTime(item.time, item.durationMinutes);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-2 border-r border-slate-200 font-mono-numbers font-semibold text-slate-900">
                          {item.time} – {end}
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <span className="font-bold text-slate-900 block">{item.title}</span>
                          <span className="text-[11px] text-slate-500">{item.locationZone}</span>
                        </td>
                        <td className="p-2 border-r border-slate-200 text-slate-700 font-medium">
                          {item.assignedRole}
                        </td>
                        <td className="p-2 text-slate-600 leading-snug">
                          {item.description}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Budget & Emergency Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">Financial Summary</span>
                <div className="text-slate-600 font-mono-numbers">
                  Target Budget: {formatCurrency(currentPlan.totalBudget, currentPlan.currency)}
                </div>
                <div className="text-slate-600 font-mono-numbers">
                  Contracted Actual: {formatCurrency(budgetSummary.totalActual, currentPlan.currency)}
                </div>
                <div className="text-slate-600 font-mono-numbers">
                  Paid to Date: {formatCurrency(budgetSummary.totalPaid, currentPlan.currency)}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">Contingency Protocols</span>
                <p className="text-slate-600 leading-snug">
                  {currentPlan.overview.weatherContingencyPlan}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
