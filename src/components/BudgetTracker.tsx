/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  DollarSign,
  Plus,
  Trash2,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { BudgetItem, BudgetCategory } from '../types/event.ts';
import {
  calculateBudgetSummary,
  formatCurrency,
  ALL_BUDGET_CATEGORIES,
} from '../utils/budget.ts';

interface BudgetTrackerProps {
  budgetItems: BudgetItem[];
  targetBudget: number;
  currency: string;
  onUpdateBudget: (newItems: BudgetItem[]) => void;
  onUpdateTargetBudget: (newTarget: number) => void;
}

export const BudgetTracker: React.FC<BudgetTrackerProps> = ({
  budgetItems,
  targetBudget,
  currency,
  onUpdateBudget,
  onUpdateTargetBudget,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Form states
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<BudgetCategory>('Venue');
  const [newEstimated, setNewEstimated] = useState(1000);
  const [newActual, setNewActual] = useState(1000);
  const [newPaid, setNewPaid] = useState(0);
  const [newNotes, setNewNotes] = useState('');
  const [newTip, setNewTip] = useState('');

  // Performance memoization
  const summary = useMemo(
    () => calculateBudgetSummary(budgetItems, targetBudget),
    [budgetItems, targetBudget]
  );

  const filteredItems = useMemo(() => {
    if (filterCategory === 'all') return budgetItems;
    return budgetItems.filter((item) => item.category === filterCategory);
  }, [budgetItems, filterCategory]);

  const handleUpdateItemValue = useCallback(
    (id: string, field: 'actualCost' | 'paidCost' | 'estimatedCost', val: number) => {
      const updated = budgetItems.map((item) =>
        item.id === id ? { ...item, [field]: val } : item
      );
      onUpdateBudget(updated);
    },
    [budgetItems, onUpdateBudget]
  );

  const handleDeleteItem = useCallback(
    (id: string) => {
      onUpdateBudget(budgetItems.filter((item) => item.id !== id));
    },
    [budgetItems, onUpdateBudget]
  );

  const handleAddItem = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!newName.trim()) return;

      const newItem: BudgetItem = {
        id: `budget-${Date.now()}`,
        category: newCategory,
        name: newName.trim(),
        estimatedCost: Number(newEstimated) || 0,
        actualCost: Number(newActual) || 0,
        paidCost: Number(newPaid) || 0,
        notes: newNotes.trim() || 'Vendor quote confirmed.',
        costSavingTip: newTip.trim() || undefined,
      };

      onUpdateBudget([...budgetItems, newItem]);
      setNewName('');
      setNewNotes('');
      setNewTip('');
      setShowAddForm(false);
    },
    [budgetItems, newName, newCategory, newEstimated, newActual, newPaid, newNotes, newTip, onUpdateBudget]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Smart Budget Estimator & Expense Tracker
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Track vendor payments, compare estimates vs contracts, and discover AI-generated savings opportunities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
            <span>Target:</span>
            <input
              type="number"
              aria-label="Target budget ceiling amount in dollars"
              value={targetBudget}
              onChange={(e) => onUpdateTargetBudget(Number(e.target.value) || 0)}
              className="w-24 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-900 font-bold font-mono-numbers text-xs outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>{showAddForm ? 'Cancel' : 'Add Expense'}</span>
          </button>
        </div>
      </div>

      {/* 4 Financial Stat Boxes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Target Budget</span>
          <div className="text-2xl font-bold text-slate-900 font-mono-numbers">
            {formatCurrency(targetBudget, currency)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Allocated event ceiling</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Total Estimated</span>
          <div className="text-2xl font-bold text-slate-700 font-mono-numbers">
            {formatCurrency(summary.totalEstimated, currency)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Sum of planned allocations</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Actual Contracted</span>
          <div className="text-2xl font-bold text-slate-900 font-mono-numbers">
            {formatCurrency(summary.totalActual, currency)}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium mt-0.5 font-mono-numbers">
            <span>{Math.round(summary.percentSpent)}% of target</span>
          </div>
        </div>

        <div
          className={`p-4 rounded-xl border shadow-xs ${
            summary.overBudgetAmount > 0
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <span className="text-xs font-semibold block mb-1">
            {summary.overBudgetAmount > 0 ? 'Over Target Budget' : 'Remaining Cushion'}
          </span>
          <div className="text-2xl font-bold font-mono-numbers">
            {summary.overBudgetAmount > 0
              ? formatCurrency(summary.overBudgetAmount, currency)
              : formatCurrency(summary.remainingActual, currency)}
          </div>
          <span className="text-[11px] block mt-0.5">
            {summary.overBudgetAmount > 0 ? 'Review cost saving tips below' : 'Safe operating margin'}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
          <span>Overall Budget Utilization</span>
          <span className="font-mono-numbers">
            {formatCurrency(summary.totalActual, currency)} / {formatCurrency(targetBudget, currency)}
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              summary.percentSpent > 100
                ? 'bg-rose-600'
                : summary.percentSpent > 85
                ? 'bg-amber-500'
                : 'bg-emerald-600'
            }`}
            style={{ width: `${Math.min(100, summary.percentSpent)}%` }}
            role="progressbar"
            aria-valuenow={summary.percentSpent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Category Segmented Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            filterCategory === 'all'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Categories ({budgetItems.length})
        </button>
        {ALL_BUDGET_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              filterCategory === cat
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Add Expense Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddItem}
          className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4"
        >
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Add New Budget Allocation or Expense
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="budget-name-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Line Item Name *
              </label>
              <input
                id="budget-name-input"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Acoustic Ceremony Sound & Mics"
                required
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
              />
            </div>

            <div>
              <label htmlFor="budget-cat-select" className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                id="budget-cat-select"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as BudgetCategory)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none bg-white"
              >
                {ALL_BUDGET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="budget-est-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Estimated Cost ($)
              </label>
              <input
                id="budget-est-input"
                type="number"
                min="0"
                value={newEstimated}
                onChange={(e) => setNewEstimated(Number(e.target.value) || 0)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg font-mono-numbers focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="budget-act-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Actual / Contracted Cost ($)
              </label>
              <input
                id="budget-act-input"
                type="number"
                min="0"
                value={newActual}
                onChange={(e) => setNewActual(Number(e.target.value) || 0)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg font-mono-numbers focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
              />
            </div>

            <div>
              <label htmlFor="budget-paid-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Deposit / Amount Paid ($)
              </label>
              <input
                id="budget-paid-input"
                type="number"
                min="0"
                value={newPaid}
                onChange={(e) => setNewPaid(Number(e.target.value) || 0)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg font-mono-numbers focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
              />
            </div>

            <div>
              <label htmlFor="budget-tip-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Cost-Saving Idea (Optional)
              </label>
              <input
                id="budget-tip-input"
                type="text"
                value={newTip}
                onChange={(e) => setNewTip(e.target.value)}
                placeholder="e.g. Bring own table linens"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="budget-notes-input" className="block text-xs font-semibold text-slate-700 mb-1">
              Contract Terms & Vendor Notes
            </label>
            <input
              id="budget-notes-input"
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="50% deposit paid upon signing, balance due 14 days prior..."
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
            >
              Save Line Item
            </button>
          </div>
        </form>
      )}

      {/* Itemized Budget Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th scope="col" className="py-3 px-4">Item & Category</th>
                <th scope="col" className="py-3 px-4 text-right">Estimated</th>
                <th scope="col" className="py-3 px-4 text-right">Actual Cost</th>
                <th scope="col" className="py-3 px-4 text-right">Paid</th>
                <th scope="col" className="py-3 px-4 text-right">Remaining Balance</th>
                <th scope="col" className="py-3 px-4">Notes & Optimization</th>
                <th scope="col" className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredItems.map((item) => {
                const balanceDue = Math.max(0, (Number(item.actualCost) || 0) - (Number(item.paidCost) || 0));
                const variance = (Number(item.actualCost) || 0) - (Number(item.estimatedCost) || 0);

                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      <div className="text-[11px] text-slate-500">{item.category}</div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono-numbers text-slate-600">
                      {formatCurrency(item.estimatedCost, currency)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono-numbers font-semibold text-slate-900">
                      <div className="flex items-center justify-end gap-1">
                        <span>{currency}</span>
                        <input
                          type="number"
                          value={item.actualCost}
                          onChange={(e) =>
                            handleUpdateItemValue(item.id, 'actualCost', Number(e.target.value) || 0)
                          }
                          className="w-20 px-1.5 py-0.5 border border-slate-200 rounded text-right text-xs font-mono-numbers outline-none focus:border-emerald-600"
                        />
                      </div>
                      {variance !== 0 && (
                        <div
                          className={`text-[10px] mt-0.5 ${
                            variance > 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {variance > 0 ? `+${formatCurrency(variance, currency)}` : formatCurrency(variance, currency)}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-mono-numbers text-slate-700">
                      <div className="flex items-center justify-end gap-1">
                        <span>{currency}</span>
                        <input
                          type="number"
                          value={item.paidCost}
                          onChange={(e) =>
                            handleUpdateItemValue(item.id, 'paidCost', Number(e.target.value) || 0)
                          }
                          className="w-20 px-1.5 py-0.5 border border-slate-200 rounded text-right text-xs font-mono-numbers outline-none focus:border-emerald-600"
                        />
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono-numbers">
                      {balanceDue === 0 ? (
                        <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Paid
                        </span>
                      ) : (
                        <span className="text-slate-900 font-semibold">
                          {formatCurrency(balanceDue, currency)}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="text-slate-600 leading-snug">{item.notes}</div>
                      {item.costSavingTip && (
                        <div className="flex items-start gap-1 text-[11px] text-emerald-800 bg-emerald-50/70 p-1.5 rounded-sm mt-1">
                          <Lightbulb className="w-3.5 h-3.5 shrink-0 text-emerald-600 mt-0.5" aria-hidden="true" />
                          <span>{item.costSavingTip}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete expense"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
