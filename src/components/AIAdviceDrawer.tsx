/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Sparkles, Send, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { EventPlan } from '../types/event.ts';
import { refineEventPlanApi, ApiError } from '../services/api.ts';
import { useFocusTrap } from '../hooks/useFocusTrap.ts';

interface AIAdviceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: EventPlan;
  onPlanRefined: (updatedPlan: EventPlan) => void;
}

const QUICK_PROMPTS = [
  'Rain contingency: move ceremony indoors and adjust room flip timing',
  'Optimize budget: trim $1,500 from catering and reallocate to live music',
  'Add 15-minute buffer between speeches and dinner service',
  'Include 3 multicultural vegan/gluten-free catering tasks in checklist',
  'Add sensory-friendly quiet zone protocol in logistics',
];

export const AIAdviceDrawer: React.FC<AIAdviceDrawerProps> = ({
  isOpen,
  onClose,
  currentPlan,
  onPlanRefined,
}) => {
  const [instruction, setInstruction] = useState('');
  const [aspect, setAspect] = useState<'all' | 'schedule' | 'budget' | 'checklist' | 'speeches'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRetryable, setIsRetryable] = useState(false);
  const [lastPrompt, setLastPrompt] = useState('');

  const containerRef = useFocusTrap<HTMLDivElement>({
    isOpen,
    onClose,
    disableEscape: isLoading,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    if (isLoading) return; // Prevent duplicate concurrent submissions

    const promptToSend = (customPrompt || instruction).trim();
    if (!promptToSend) return;

    setLastPrompt(promptToSend);
    setIsLoading(true);
    setError(null);
    setIsRetryable(false);
    setFeedback(null);

    try {
      const res = await refineEventPlanApi({
        currentPlan,
        instruction: promptToSend,
        aspect,
      });

      onPlanRefined(res.plan);
      setFeedback(res.feedback);
      setInstruction('');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        setIsRetryable(err.retryable);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to refine plan with AI');
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
      aria-labelledby="copilot-drawer-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs transition-opacity"
    >
      <div
        ref={containerRef}
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200"
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id="copilot-drawer-title" className="text-base font-bold text-slate-900">
                AI Event Copilot & Refinement
              </h2>
              <p className="text-xs text-slate-500">
                Tweak schedules, rebalance budgets, or adjust logistics in real time.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
            aria-label="Close copilot"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
          {/* Active Context Banner */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <span className="font-semibold text-slate-700 block">Current Active Blueprint:</span>
            <div className="text-slate-900 font-bold">{currentPlan.title}</div>
            <div className="text-slate-500">
              {currentPlan.guestCount} guests · ${currentPlan.totalBudget.toLocaleString()} target budget · {currentPlan.location.city}
            </div>
          </div>

          {/* Feedback Display */}
          {feedback && (
            <div
              role="status"
              aria-live="polite"
              className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1"
            >
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                <span>Adjustment Applied</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">{feedback}</p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600" aria-hidden="true" />
                  <span>Refinement Notice</span>
                </div>
                {isRetryable && (
                  <button
                    type="button"
                    onClick={() => handleSubmit(undefined, lastPrompt || instruction)}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer disabled:bg-rose-400"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
                    <span>{isLoading ? 'Retrying...' : 'Retry'}</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">{error}</p>
            </div>
          )}

          {/* Aspect Filter Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Target Component to Refine
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['all', 'schedule', 'budget', 'checklist', 'speeches'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAspect(opt)}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-md transition-colors capitalize text-center cursor-pointer ${
                    aspect === opt
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Preset Prompts */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Instant Action Ideas
            </label>
            <div className="space-y-2">
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSubmit(undefined, qp)}
                  className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-900 transition-all text-xs cursor-pointer flex items-center justify-between group"
                >
                  <span>{qp}</span>
                  <Sparkles className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0 ml-2" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Drawer Footer Input */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70">
          <form onSubmit={(e) => handleSubmit(e)} className="space-y-2">
            <label htmlFor="copilot-input" className="block text-xs font-semibold text-slate-700">
              Describe your adjustment
            </label>
            <div className="relative">
              <textarea
                id="copilot-input"
                rows={3}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="e.g. 'Push the first dance 30 minutes later and adjust the cocktail hour buffer to 20 minutes'..."
                className="w-full text-xs p-3 pr-10 border border-slate-200 rounded-xl bg-white focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none resize-none"
              />
              <button
                type="submit"
                disabled={isLoading || !instruction.trim()}
                className="absolute right-2.5 bottom-3 p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white transition-colors cursor-pointer"
                title="Send refinement command"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Powered by server-side Gemini</span>
              <span>All changes instantly persist to local storage</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
