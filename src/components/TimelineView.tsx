/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  Star,
  MapPin,
  User,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { TimelineItem, TimelineCategory } from '../types/event.ts';
import {
  calculateEndTime,
  detectTimelineConflicts,
  sortTimeline,
} from '../utils/timeline.ts';

interface TimelineViewProps {
  schedule: TimelineItem[];
  startTime?: string;
  onUpdateSchedule: (newSchedule: TimelineItem[]) => void;
}

const CATEGORY_LABELS: Record<TimelineCategory, string> = {
  ceremony: 'Ceremony & Vows',
  reception: 'Reception & Hospitality',
  logistics: 'Logistics & Load-in',
  entertainment: 'Music & Entertainment',
  food_beverage: 'Dining & Catering',
  speech: 'Toasts & Speeches',
  photo: 'Photo & Video',
};

export const TimelineView: React.FC<TimelineViewProps> = ({
  schedule,
  startTime,
  onUpdateSchedule,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state for adding milestone
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState(startTime || '16:00');
  const [newDuration, setNewDuration] = useState(30);
  const [newCategory, setNewCategory] = useState<TimelineCategory>('reception');
  const [newRole, setNewRole] = useState('Coordinator');
  const [newZone, setNewZone] = useState('Main Area');
  const [newBuffer, setNewBuffer] = useState(10);
  const [newDescription, setNewDescription] = useState('');
  const [newIsKey, setNewIsKey] = useState(false);

  // Memoized sorting and conflict detection
  const sortedSchedule = useMemo(
    () => sortTimeline(schedule, startTime),
    [schedule, startTime]
  );

  const conflicts = useMemo(
    () => detectTimelineConflicts(sortedSchedule, startTime),
    [sortedSchedule, startTime]
  );

  const filteredSchedule = useMemo(() => {
    return sortedSchedule.filter((item) => {
      if (filterCategory === 'all') return true;
      if (filterCategory === 'milestones') return item.isKeyMilestone;
      return item.category === filterCategory;
    });
  }, [sortedSchedule, filterCategory]);

  const handleToggleKeyMilestone = useCallback(
    (id: string) => {
      const updated = schedule.map((item) =>
        item.id === id ? { ...item, isKeyMilestone: !item.isKeyMilestone } : item
      );
      onUpdateSchedule(updated);
    },
    [schedule, onUpdateSchedule]
  );

  const handleDeleteItem = useCallback(
    (id: string) => {
      const updated = schedule.filter((item) => item.id !== id);
      onUpdateSchedule(updated);
    },
    [schedule, onUpdateSchedule]
  );

  const handleAddItem = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTitle.trim()) return;

      const newItem: TimelineItem = {
        id: `custom-timeline-${Date.now()}`,
        title: newTitle.trim(),
        time: newTime,
        durationMinutes: Number(newDuration) || 15,
        category: newCategory,
        assignedRole: newRole.trim() || 'Team Lead',
        locationZone: newZone.trim() || 'Main Zone',
        bufferMinutes: Number(newBuffer) || 5,
        description: newDescription.trim() || 'Coordinated milestone activity.',
        isKeyMilestone: newIsKey,
      };

      onUpdateSchedule([...schedule, newItem]);
      setNewTitle('');
      setNewDescription('');
      setShowAddForm(false);
    },
    [schedule, newTitle, newTime, newDuration, newCategory, newRole, newZone, newBuffer, newDescription, newIsKey, onUpdateSchedule]
  );

  return (
    <div className="space-y-6">
      {/* Run of Show Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Run of Show & Minute-by-Minute Timeline
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Chronological master schedule with vendor handoffs, staging zones, and transition buffers.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>{showAddForm ? 'Cancel Form' : 'Add Milestone'}</span>
        </button>
      </div>

      {/* Conflict / Overlap Alert Banner */}
      {conflicts.length > 0 && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-900"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <span className="font-semibold text-sm">
                Schedule Warnings ({conflicts.length} attention points)
              </span>
              <ul className="text-xs space-y-1 list-disc pl-4 text-amber-800">
                {conflicts.map((c, idx) => (
                  <li key={idx}>{c.description}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs (Interactive Segmented Control) */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            filterCategory === 'all'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Activities ({schedule.length})
        </button>
        <button
          onClick={() => setFilterCategory('milestones')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            filterCategory === 'milestones'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Key Milestones Only
        </button>
        <button
          onClick={() => setFilterCategory('ceremony')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            filterCategory === 'ceremony'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Ceremony
        </button>
        <button
          onClick={() => setFilterCategory('reception')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            filterCategory === 'reception'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Reception
        </button>
        <button
          onClick={() => setFilterCategory('food_beverage')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            filterCategory === 'food_beverage'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Catering & Dining
        </button>
        <button
          onClick={() => setFilterCategory('entertainment')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            filterCategory === 'entertainment'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Entertainment
        </button>
        <button
          onClick={() => setFilterCategory('logistics')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            filterCategory === 'logistics'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Logistics
        </button>
      </div>

      {/* Add Milestone Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddItem}
          className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Add New Run-of-Show Milestone</h3>
            <span className="text-xs text-slate-500">Timeline will re-sort chronologically</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="new-milestone-title" className="block text-xs font-semibold text-slate-700 mb-1">
                Milestone Title *
              </label>
              <input
                id="new-milestone-title"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Wedding Party Grand Entrance"
                required
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
              />
            </div>

            <div>
              <label htmlFor="new-milestone-time" className="block text-xs font-semibold text-slate-700 mb-1">
                Start Time (24h) *
              </label>
              <input
                id="new-milestone-time"
                type="text"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                placeholder="16:00"
                pattern="^\d{1,2}:\d{2}$"
                required
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg font-mono-numbers focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
              />
            </div>

            <div>
              <label htmlFor="new-milestone-duration" className="block text-xs font-semibold text-slate-700 mb-1">
                Duration (minutes) *
              </label>
              <input
                id="new-milestone-duration"
                type="number"
                min="5"
                max="360"
                value={newDuration}
                onChange={(e) => setNewDuration(parseInt(e.target.value, 10) || 15)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg font-mono-numbers focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label htmlFor="new-milestone-category" className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                id="new-milestone-category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as TimelineCategory)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none bg-white"
              >
                <option value="ceremony">Ceremony</option>
                <option value="reception">Reception</option>
                <option value="food_beverage">Dining & Bar</option>
                <option value="entertainment">Entertainment</option>
                <option value="speech">Speech / Toast</option>
                <option value="photo">Photo / Video</option>
                <option value="logistics">Logistics</option>
              </select>
            </div>

            <div>
              <label htmlFor="new-milestone-role" className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Role / Vendor
              </label>
              <input
                id="new-milestone-role"
                type="text"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="e.g. Lead Planner / DJ"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
              />
            </div>

            <div>
              <label htmlFor="new-milestone-zone" className="block text-xs font-semibold text-slate-700 mb-1">
                Location Zone
              </label>
              <input
                id="new-milestone-zone"
                type="text"
                value={newZone}
                onChange={(e) => setNewZone(e.target.value)}
                placeholder="e.g. Lawn Pavilion"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
              />
            </div>

            <div>
              <label htmlFor="new-milestone-buffer" className="block text-xs font-semibold text-slate-700 mb-1">
                Buffer (mins)
              </label>
              <input
                id="new-milestone-buffer"
                type="number"
                min="0"
                max="60"
                value={newBuffer}
                onChange={(e) => setNewBuffer(parseInt(e.target.value, 10) || 0)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg font-mono-numbers focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="new-milestone-desc" className="block text-xs font-semibold text-slate-700 mb-1">
              Instructions & Operational Details
            </label>
            <input
              id="new-milestone-desc"
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Cue music, ensure champagne glasses filled, dim side lights..."
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={newIsKey}
                onChange={(e) => setNewIsKey(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500"
              />
              <span>Mark as Primary Key Milestone</span>
            </label>

            <div className="flex items-center gap-2">
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
                Save Milestone
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Timeline Items List */}
      {filteredSchedule.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-8">
          <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-slate-900 mb-1">No activities in this category</h3>
          <p className="text-xs text-slate-500 mb-4">Try selecting another filter or add a custom milestone.</p>
          <button
            onClick={() => setFilterCategory('all')}
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            Show All Activities
          </button>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-6">
          {filteredSchedule.map((item) => {
            const endTime = calculateEndTime(item.time, item.durationMinutes);
            return (
              <div
                key={item.id}
                className="relative bg-white border border-slate-200/90 rounded-xl p-5 hover:border-slate-300 transition-colors shadow-xs"
              >
                {/* Timeline node marker on the left line */}
                <div
                  className={`absolute -left-[31px] top-6 w-3 h-3 rounded-full border-2 border-white ${
                    item.isKeyMilestone ? 'bg-amber-500 ring-2 ring-amber-200' : 'bg-slate-400'
                  }`}
                  aria-hidden="true"
                />

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                  <div className="space-y-1">
                    {/* Unboxed Metadata Line with separators */}
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                      <span className="font-mono-numbers text-slate-900 font-bold">
                        {item.time} – {endTime}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-numbers">{item.durationMinutes} mins</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-700">{CATEGORY_LABELS[item.category] || item.category}</span>
                      {item.bufferMinutes > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-400">+{item.bufferMinutes}m buffer</span>
                        </>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      {item.title}
                      {item.isKeyMilestone && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-sm">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" aria-hidden="true" />
                          Key Moment
                        </span>
                      )}
                    </h3>
                  </div>

                  {/* Actions: Toggle Milestone & Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleKeyMilestone(item.id)}
                      className={`p-1.5 rounded-md hover:bg-slate-100 transition-colors text-xs flex items-center gap-1 cursor-pointer ${
                        item.isKeyMilestone ? 'text-amber-600 font-medium' : 'text-slate-400 hover:text-slate-600'
                      }`}
                      title={item.isKeyMilestone ? 'Remove key milestone' : 'Mark as key milestone'}
                    >
                      <Star
                        className={`w-4 h-4 ${item.isKeyMilestone ? 'fill-amber-500 text-amber-500' : ''}`}
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove activity"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {item.description}
                </p>

                {/* Footer Zone & Role specs */}
                <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    <span className="font-medium text-slate-700">{item.assignedRole}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    <span>{item.locationZone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Handoff Ready</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
