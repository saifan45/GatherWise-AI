/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { BudgetItem, BudgetCategory } from '../types/event.ts';

export interface BudgetSummary {
  totalEstimated: number;
  totalActual: number;
  totalPaid: number;
  remainingAllocated: number; // targetBudget - totalEstimated
  remainingActual: number; // targetBudget - totalActual
  overBudgetAmount: number; // >0 if actual > target
  percentSpent: number; // (actual / target) * 100, rounded to 1 decimal
  categoryTotals: Record<BudgetCategory, { estimated: number; actual: number; count: number }>;
}

export const ALL_BUDGET_CATEGORIES: BudgetCategory[] = [
  'Venue',
  'Catering & Bar',
  'Photography & Video',
  'Entertainment & Sound',
  'Decor & Floral',
  'Logistics & Rentals',
  'Permits & Insurance',
  'Contingency',
];

/**
 * Rounds a monetary figure to 2 decimal places to eliminate IEEE-754 floating point imprecision.
 */
export function roundCurrency(val: number): number {
  if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function calculateBudgetSummary(items: BudgetItem[], targetBudget: number): BudgetSummary {
  const safeTarget = roundCurrency(Math.max(0, targetBudget));

  const categoryTotals = ALL_BUDGET_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = { estimated: 0, actual: 0, count: 0 };
    return acc;
  }, {} as Record<BudgetCategory, { estimated: number; actual: number; count: number }>);

  let rawTotalEstimated = 0;
  let rawTotalActual = 0;
  let rawTotalPaid = 0;

  for (const item of items) {
    // Only accept finite numbers; do not silently fabricate numbers
    const est = typeof item.estimatedCost === 'number' && isFinite(item.estimatedCost) ? item.estimatedCost : 0;
    const act = typeof item.actualCost === 'number' && isFinite(item.actualCost) ? item.actualCost : 0;
    const pd = typeof item.paidCost === 'number' && isFinite(item.paidCost) ? item.paidCost : 0;

    rawTotalEstimated += est;
    rawTotalActual += act;
    rawTotalPaid += pd;

    if (categoryTotals[item.category]) {
      categoryTotals[item.category].estimated = roundCurrency(categoryTotals[item.category].estimated + est);
      categoryTotals[item.category].actual = roundCurrency(categoryTotals[item.category].actual + act);
      categoryTotals[item.category].count += 1;
    }
  }

  const totalEstimated = roundCurrency(rawTotalEstimated);
  const totalActual = roundCurrency(rawTotalActual);
  const totalPaid = roundCurrency(rawTotalPaid);

  const remainingAllocated = roundCurrency(safeTarget - totalEstimated);
  const remainingActual = roundCurrency(safeTarget - totalActual);
  const overBudgetAmount = totalActual > safeTarget ? roundCurrency(totalActual - safeTarget) : 0;

  const rawPercent = safeTarget > 0 ? (totalActual / safeTarget) * 100 : (totalActual > 0 ? 100 : 0);
  const percentSpent = Math.round(rawPercent * 10) / 10;

  return {
    totalEstimated,
    totalActual,
    totalPaid,
    remainingAllocated,
    remainingActual,
    overBudgetAmount,
    percentSpent,
    categoryTotals,
  };
}

/**
 * Formats a numeric currency amount with strict bounds, handling negative values,
 * zero, and fractional cents without displaying NaN or undefined.
 */
export function formatCurrency(amount: number, currency = '$'): string {
  if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
    return `${currency}0`;
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  // If there are fractional cents, show 2 decimal places, otherwise format as whole integer
  const hasCents = Math.abs(Math.round(absAmount) - absAmount) > 0.001;

  const formattedNumber = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  });

  return `${isNegative ? '-' : ''}${currency}${formattedNumber}`;
}
