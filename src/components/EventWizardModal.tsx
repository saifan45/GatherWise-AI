/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { EventGenerationRequest, EventPlan, EventType, EventSetting } from '../types/event.ts';
import { generateEventPlanApi, ApiError } from '../services/api.ts';
import { validateEventRequest, getLocalTodayDateString } from '../utils/validation.ts';
import { useFocusTrap } from '../hooks/useFocusTrap.ts';

interface EventWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanCreated: (plan: EventPlan) => void;
}

export const EventWizardModal: React.FC<EventWizardModalProps> = ({
  isOpen,
  onClose,
  onPlanCreated,
}) => {
  // Dynamically default target date to 60 days in the future
  const getDefaultTargetDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return getLocalTodayDateString(d);
  };

  const [type, setType] = useState<EventType>('wedding');
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('');
  const [targetDate, setTargetDate] = useState(getDefaultTargetDate);
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('23:00');
  const [locationName, setLocationName] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [setting, setSetting] = useState<EventSetting>('hybrid');
  const [guestCount, setGuestCount] = useState<number>(100);
  const [totalBudget, setTotalBudget] = useState<number>(25000);
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [accessibilityInput, setAccessibilityInput] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetryable, setIsRetryable] = useState(false);

  const containerRef = useFocusTrap<HTMLDivElement>({
    isOpen,
    onClose,
    disableEscape: isLoading,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent duplicate concurrent submissions

    const requestData: EventGenerationRequest = {
      type,
      title: title.trim(),
      theme: theme.trim() || 'Modern, welcoming, and memorable',
      targetDate,
      startTime,
      endTime,
      locationName: locationName.trim() || 'Signature Venue',
      locationCity: locationCity.trim() || 'San Francisco, CA',
      setting,
      guestCount: Number(guestCount) || 50,
      totalBudget: Number(totalBudget) || 10000,
      dietaryNotes: dietaryNotes.trim() || undefined,
      accessibilityNeeds: accessibilityInput
        ? accessibilityInput.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
      specialRequests: specialRequests.trim() || undefined,
    };

    const validationErrors = validateEventRequest(requestData);
    if (validationErrors.length > 0) {
      setError(validationErrors[0].message);
      setIsRetryable(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsRetryable(false);

    try {
      const generatedPlan = await generateEventPlanApi(requestData);
      onPlanCreated(generatedPlan);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        setIsRetryable(err.retryable);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to generate event blueprint');
        setIsRetryable(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs overflow-y-auto"
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id="wizard-modal-title" className="text-base font-bold text-slate-900">
                Generate Custom AI Event Blueprint
              </h2>
              <p className="text-xs text-slate-500">
                Gemini will architect complete run-of-show schedules, budgets, checklists, and speeches.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="leading-relaxed">{error}</span>
              </div>
              {isRetryable && (
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e)}
                  disabled={isLoading}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer disabled:bg-rose-400 self-end sm:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
                  <span>{isLoading ? 'Retrying...' : 'Retry Generation'}</span>
                </button>
              )}
            </div>
          )}

          {/* Event Type Tabs */}
          <div>
            <label id="wizard-category-label" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Event Category *
            </label>
            <div role="radiogroup" aria-labelledby="wizard-category-label" className="grid grid-cols-3 gap-2">
              <button
                type="button"
                role="radio"
                aria-checked={type === 'wedding'}
                onClick={() => setType('wedding')}
                className={`py-2 px-3 rounded-lg border font-semibold text-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none ${
                  type === 'wedding'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Wedding
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={type === 'birthday'}
                onClick={() => setType('birthday')}
                className={`py-2 px-3 rounded-lg border font-semibold text-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none ${
                  type === 'birthday'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Milestone Birthday
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={type === 'community'}
                onClick={() => setType('community')}
                className={`py-2 px-3 rounded-lg border font-semibold text-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none ${
                  type === 'community'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Community Gathering
              </button>
            </div>
          </div>

          {/* Title & Theme */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="wizard-title" className="block text-xs font-semibold text-slate-700 mb-1">
                Event Title *
              </label>
              <input
                id="wizard-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  type === 'wedding'
                    ? 'e.g. Maya & Leo’s Vineyard Wedding'
                    : type === 'birthday'
                    ? 'e.g. Jason’s 40th Sunset Soirée'
                    : 'e.g. Downtown Autumn Maker Fair'
                }
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none text-xs"
              />
            </div>

            <div>
              <label htmlFor="wizard-theme" className="block text-xs font-semibold text-slate-700 mb-1">
                Aesthetic Vibe & Theme
              </label>
              <input
                id="wizard-theme"
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g. Mid-century modern with warm brass & botanical accents"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none text-xs"
              />
            </div>
          </div>

          {/* Date & Time Window */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="wizard-date" className="block text-xs font-semibold text-slate-700 mb-1">
                Target Date *
              </label>
              <input
                id="wizard-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none text-xs font-mono-numbers"
              />
            </div>

            <div>
              <label htmlFor="wizard-start-time" className="block text-xs font-semibold text-slate-700 mb-1">
                Start Time (24h) *
              </label>
              <input
                id="wizard-start-time"
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="16:00"
                pattern="^\d{1,2}:\d{2}$"
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none text-xs font-mono-numbers"
              />
            </div>

            <div>
              <label htmlFor="wizard-end-time" className="block text-xs font-semibold text-slate-700 mb-1">
                End Time (24h) *
              </label>
              <input
                id="wizard-end-time"
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="23:00"
                pattern="^\d{1,2}:\d{2}$"
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none text-xs font-mono-numbers"
              />
            </div>
          </div>

          {/* Location & Setting */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="wizard-venue-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Venue Name
              </label>
              <input
                id="wizard-venue-name"
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. The Glass Pavilion"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none text-xs"
              />
            </div>

            <div>
              <label htmlFor="wizard-venue-city" className="block text-xs font-semibold text-slate-700 mb-1">
                City / Region *
              </label>
              <input
                id="wizard-venue-city"
                type="text"
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                placeholder="e.g. Austin, TX"
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none text-xs"
              />
            </div>

            <div>
              <label htmlFor="wizard-venue-setting" className="block text-xs font-semibold text-slate-700 mb-1">
                Setting Type
              </label>
              <select
                id="wizard-venue-setting"
                value={setting}
                onChange={(e) => setSetting(e.target.value as EventSetting)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none text-xs bg-white"
              >
                <option value="indoor">Indoor (Climate Controlled)</option>
                <option value="outdoor">Outdoor (Lawn/Pavilion)</option>
                <option value="hybrid">Hybrid (Indoor / Outdoor)</option>
              </select>
            </div>
          </div>

          {/* Guests & Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="wizard-guest-count" className="block text-xs font-semibold text-slate-700 mb-1">
                Expected Guest Count *
              </label>
              <input
                id="wizard-guest-count"
                type="number"
                min="5"
                max="10000"
                value={guestCount}
                onChange={(e) => setGuestCount(parseInt(e.target.value, 10) || 50)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none text-xs font-mono-numbers"
              />
            </div>

            <div>
              <label htmlFor="wizard-budget" className="block text-xs font-semibold text-slate-700 mb-1">
                Total Budget Ceiling ($) *
              </label>
              <input
                id="wizard-budget"
                type="number"
                min="500"
                max="2000000"
                step="500"
                value={totalBudget}
                onChange={(e) => setTotalBudget(parseInt(e.target.value, 10) || 10000)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none text-xs font-mono-numbers"
              />
            </div>
          </div>

          {/* Dietary, Accessibility & Special Requests */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="wizard-dietary" className="block text-xs font-semibold text-slate-700 mb-1">
                Dietary Considerations
              </label>
              <input
                id="wizard-dietary"
                type="text"
                value={dietaryNotes}
                onChange={(e) => setDietaryNotes(e.target.value)}
                placeholder="e.g. 10 Vegetarians, 4 Celiac, nut-free dessert table"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none text-xs"
              />
            </div>

            <div>
              <label htmlFor="wizard-accessibility" className="block text-xs font-semibold text-slate-700 mb-1">
                Accessibility Requirements (comma separated)
              </label>
              <input
                id="wizard-accessibility"
                type="text"
                value={accessibilityInput}
                onChange={(e) => setAccessibilityInput(e.target.value)}
                placeholder="e.g. Ramp entry, sensory quiet lounge, ASL interpreter"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none text-xs"
              />
            </div>
          </div>

          <div>
            <label htmlFor="wizard-special" className="block text-xs font-semibold text-slate-700 mb-1">
              Special Requests or Traditions
            </label>
            <input
              id="wizard-special"
              type="text"
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="e.g. Sunset first dance, surprise mariachi band at 10 PM, sparkler exit..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none text-xs"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Synthesizing Blueprint with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  <span>Generate Complete Plan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
