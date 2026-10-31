/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import { CheckSquare, Square, Plus, Trash2, Calendar, User } from 'lucide-react';
import { ChecklistItem, ChecklistPhase, TaskPriority } from '../types/event.ts';

interface ChecklistViewProps {
  checklist: ChecklistItem[];
  onUpdateChecklist: (newChecklist: ChecklistItem[]) => void;
}

const PHASE_LABELS: Record<ChecklistPhase, string> = {
  '12_months': '12 Months Prior',
  '6_months': '6 Months Prior',
  '3_months': '3 Months Prior',
  '1_month': '1 Month Prior',
  '1_week': '1 Week Prior',
  day_of: 'Day-of Execution',
  post_event: 'Post-Event Wrap & Reviews',
};

const PRIORITY_STYLES: Record<TaskPriority, { text: string; bg: string }> = {
  high: { text: 'text-rose-700 font-semibold', bg: 'bg-rose-50' },
  medium: { text: 'text-amber-700 font-semibold', bg: 'bg-amber-50' },
  low: { text: 'text-slate-600 font-medium', bg: 'bg-slate-100' },
};

export const ChecklistView: React.FC<ChecklistViewProps> = ({
  checklist,
  onUpdateChecklist,
}) => {
  const [filterPhase, setFilterPhase] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newPhase, setNewPhase] = useState<ChecklistPhase>('1_month');
  const [newCategory, setNewCategory] = useState('Logistics');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newDetails, setNewDetails] = useState('');
  const [newAssignee, setNewAssignee] = useState('Coordinator');
  const [newDueDate, setNewDueDate] = useState('');

  // Performance memoization
  const completedCount = useMemo(
    () => checklist.filter((t) => t.completed).length,
    [checklist]
  );

  const filteredTasks = useMemo(() => {
    return checklist.filter((item) => {
      if (filterPhase === 'all') return true;
      if (filterPhase === 'pending') return !item.completed;
      if (filterPhase === 'completed') return item.completed;
      return item.phase === filterPhase;
    });
  }, [checklist, filterPhase]);

  const handleToggleTask = useCallback(
    (id: string) => {
      const updated = checklist.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      );
      onUpdateChecklist(updated);
    },
    [checklist, onUpdateChecklist]
  );

  const handleDeleteTask = useCallback(
    (id: string) => {
      onUpdateChecklist(checklist.filter((t) => t.id !== id));
    },
    [checklist, onUpdateChecklist]
  );

  const handleAddTask = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTitle.trim()) return;

      const newTask: ChecklistItem = {
        id: `task-${Date.now()}`,
        title: newTitle.trim(),
        phase: newPhase,
        category: newCategory.trim() || 'General',
        priority: newPriority,
        completed: false,
        details: newDetails.trim() || 'Standard operational task.',
        assignee: newAssignee.trim() || undefined,
        dueDate: newDueDate.trim() || undefined,
      };

      onUpdateChecklist([...checklist, newTask]);
      setNewTitle('');
      setNewDetails('');
      setShowAddForm(false);
    },
    [checklist, newTitle, newPhase, newCategory, newPriority, newDetails, newAssignee, newDueDate, onUpdateChecklist]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Actionable Vendor & Milestones Checklist
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Phase-by-phase task manager to ensure no contractual, legal, or logistical detail slips through.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg font-mono-numbers">
            {completedCount} of {checklist.length} Completed ({Math.round((completedCount / (checklist.length || 1)) * 100)}%)
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>{showAddForm ? 'Cancel' : 'Add Task'}</span>
          </button>
        </div>
      </div>

      {/* Phase Filters */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
        <button
          onClick={() => setFilterPhase('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            filterPhase === 'all'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Tasks ({checklist.length})
        </button>
        <button
          onClick={() => setFilterPhase('pending')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            filterPhase === 'pending'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Pending ({checklist.length - completedCount})
        </button>
        <button
          onClick={() => setFilterPhase('completed')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            filterPhase === 'completed'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Completed ({completedCount})
        </button>
        <button
          onClick={() => setFilterPhase('1_month')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            filterPhase === '1_month'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          1 Month Prior
        </button>
        <button
          onClick={() => setFilterPhase('1_week')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            filterPhase === '1_week'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          1 Week Prior
        </button>
        <button
          onClick={() => setFilterPhase('day_of')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            filterPhase === 'day_of'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Day Of
        </button>
      </div>

      {/* Add Task Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddTask}
          className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4"
        >
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Create Checklist Item
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="task-title-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Task Title *
              </label>
              <input
                id="task-title-input"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Confirm final floorplan with venue fire marshal"
                required
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
              />
            </div>

            <div>
              <label htmlFor="task-phase-select" className="block text-xs font-semibold text-slate-700 mb-1">
                Planning Phase
              </label>
              <select
                id="task-phase-select"
                value={newPhase}
                onChange={(e) => setNewPhase(e.target.value as ChecklistPhase)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none bg-white"
              >
                {Object.entries(PHASE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="task-cat-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <input
                id="task-cat-input"
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. Catering, Audio, Venue"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
              />
            </div>

            <div>
              <label htmlFor="task-priority-select" className="block text-xs font-semibold text-slate-700 mb-1">
                Priority
              </label>
              <select
                id="task-priority-select"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none bg-white"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>

            <div>
              <label htmlFor="task-assignee-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Assignee
              </label>
              <input
                id="task-assignee-input"
                type="text"
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
                placeholder="e.g. Couple / Lead Coordinator"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="task-details-input" className="block text-xs font-semibold text-slate-700 mb-1">
              Instructions & Context
            </label>
            <input
              id="task-details-input"
              type="text"
              value={newDetails}
              onChange={(e) => setNewDetails(e.target.value)}
              placeholder="Key contact numbers, contract reference clauses, or prerequisites..."
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
              Save Task
            </button>
          </div>
        </form>
      )}

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-xl border transition-colors flex items-start justify-between gap-4 bg-white ${
              item.completed
                ? 'border-slate-200/60 bg-slate-50/50 opacity-75'
                : 'border-slate-200/90 hover:border-slate-300 shadow-xs'
            }`}
          >
            <div className="flex items-start gap-3.5 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => handleToggleTask(item.id)}
                className="mt-0.5 text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-sm"
                aria-label={item.completed ? `Mark "${item.title}" as incomplete` : `Mark "${item.title}" as complete`}
              >
                {item.completed ? (
                  <CheckSquare className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                ) : (
                  <Square className="w-5 h-5 text-slate-400" aria-hidden="true" />
                )}
              </button>

              <div className="space-y-1 min-w-0">
                {/* Unboxed Metadata Line with separators */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{PHASE_LABELS[item.phase]}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className={PRIORITY_STYLES[item.priority].text}>
                    {item.priority.toUpperCase()} Priority
                  </span>
                </div>

                <h3
                  className={`text-sm font-bold tracking-tight text-slate-900 ${
                    item.completed ? 'line-through text-slate-500' : ''
                  }`}
                >
                  {item.title}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed">{item.details}</p>

                {/* Assignee / Due Date */}
                <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-500">
                  {item.assignee && (
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      <span>{item.assignee}</span>
                    </div>
                  )}
                  {item.dueDate && (
                    <div className="flex items-center gap-1 font-mono-numbers">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      <span>Target: {item.dueDate}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleDeleteTask(item.id)}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
