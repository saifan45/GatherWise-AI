/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { Sparkles, Copy, Check, Plus, Trash2, Mic, Heart, Award, Mail, RefreshCw } from 'lucide-react';
import { SpeechItem, SpeechType, EventType } from '../types/event.ts';
import { generateSpeechApi, ApiError } from '../services/api.ts';

interface SpeechInvitationGenProps {
  speeches: SpeechItem[];
  eventTitle: string;
  eventType: EventType;
  onUpdateSpeeches: (newSpeeches: SpeechItem[]) => void;
}

const SPEECH_ICONS: Record<SpeechType, React.ReactNode> = {
  vow: <Heart className="w-4 h-4 text-rose-500" aria-hidden="true" />,
  welcome_toast: <Mic className="w-4 h-4 text-emerald-600" aria-hidden="true" />,
  keynote: <Award className="w-4 h-4 text-amber-600" aria-hidden="true" />,
  closing_thanks: <Mic className="w-4 h-4 text-slate-600" aria-hidden="true" />,
  invitation_card: <Mail className="w-4 h-4 text-indigo-600" aria-hidden="true" />,
};

export const SpeechInvitationGen: React.FC<SpeechInvitationGenProps> = ({
  speeches,
  eventTitle,
  eventType,
  onUpdateSpeeches,
}) => {
  const [showGenForm, setShowGenForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [isRetryable, setIsRetryable] = useState(false);

  // Form states
  const [speechType, setSpeechType] = useState<SpeechType>(
    eventType === 'wedding' ? 'vow' : eventType === 'birthday' ? 'welcome_toast' : 'keynote'
  );
  const [speaker, setSpeaker] = useState('');
  const [speechTitle, setSpeechTitle] = useState('');
  const [tone, setTone] = useState<'heartfelt' | 'joyful_witty' | 'inspirational' | 'formal_dignified'>('heartfelt');
  const [audienceDetails, setAudienceDetails] = useState('');
  const [memoriesOrThemes, setMemoriesOrThemes] = useState('');

  const handleCopy = useCallback(async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
    }
  }, []);

  const handleDelete = useCallback((id: string) => {
    onUpdateSpeeches(speeches.filter((s) => s.id !== id));
  }, [speeches, onUpdateSpeeches]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating) return; // Prevent duplicate concurrent submissions
    if (!speaker.trim() || !speechTitle.trim()) return;

    setIsGenerating(true);
    setGenError(null);
    setIsRetryable(false);

    try {
      const generated = await generateSpeechApi({
        type: speechType,
        eventTitle,
        eventType,
        speaker: speaker.trim(),
        tone,
        audienceDetails: audienceDetails.trim(),
        memoriesOrThemes: memoriesOrThemes.trim(),
      });

      onUpdateSpeeches([generated, ...speeches]);
      setShowGenForm(false);
      setSpeaker('');
      setSpeechTitle('');
      setMemoriesOrThemes('');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setGenError(err.message);
        setIsRetryable(err.retryable);
      } else {
        setGenError(err instanceof Error ? err.message : 'Failed to generate speech with AI');
        setIsRetryable(true);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Speeches, Vows & Invitation Studio
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Personalized, beautifully phrased ceremony vows, toasts, keynote remarks, and invitation copy powered by Gemini.
          </p>
        </div>

        <button
          onClick={() => setShowGenForm(!showGenForm)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <Sparkles className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          <span>{showGenForm ? 'Close Generator' : 'Generate New Speech or Vow'}</span>
        </button>
      </div>

      {/* AI Speech Generator Form */}
      {showGenForm && (
        <form
          onSubmit={handleGenerate}
          className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4"
        >
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Sparkles className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            <h3 className="text-sm font-bold text-slate-900">
              Generate Custom Script or Invitation Copy
            </h3>
          </div>

          {genError && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-3 text-xs rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-3"
            >
              <span>{genError}</span>
              {isRetryable && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 font-semibold rounded-md bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer disabled:bg-rose-400"
                >
                  <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} aria-hidden="true" />
                  <span>{isGenerating ? 'Retrying...' : 'Retry'}</span>
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="speech-type-select" className="block text-xs font-semibold text-slate-700 mb-1">
                Type of Script *
              </label>
              <select
                id="speech-type-select"
                value={speechType}
                onChange={(e) => setSpeechType(e.target.value as SpeechType)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none bg-white"
              >
                <option value="vow">Personal Ceremony Vows</option>
                <option value="welcome_toast">Welcome Toast / Host Speech</option>
                <option value="keynote">Keynote / Community Address</option>
                <option value="closing_thanks">Closing Gratitude & Farewell</option>
                <option value="invitation_card">Formal Invitation Card Copy</option>
              </select>
            </div>

            <div>
              <label htmlFor="speech-speaker-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Speaker / Role *
              </label>
              <input
                id="speech-speaker-input"
                type="text"
                value={speaker}
                onChange={(e) => setSpeaker(e.target.value)}
                placeholder="e.g. Maid of Honor / Father of Groom / Council Chair"
                required
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
              />
            </div>

            <div>
              <label htmlFor="speech-title-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Speech / Script Title *
              </label>
              <input
                id="speech-title-input"
                type="text"
                value={speechTitle}
                onChange={(e) => setSpeechTitle(e.target.value)}
                placeholder="e.g. Sister of the Bride Toast"
                required
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="speech-tone-select" className="block text-xs font-semibold text-slate-700 mb-1">
                Voice & Delivery Tone
              </label>
              <select
                id="speech-tone-select"
                value={tone}
                onChange={(e) => setTone(e.target.value as SpeechItem['tone'])}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none bg-white"
              >
                <option value="heartfelt">Heartfelt, Emotional & Sincere</option>
                <option value="joyful_witty">Joyful, Lighthearted & Witty</option>
                <option value="inspirational">Inspirational & Visionary</option>
                <option value="formal_dignified">Formal, Gracious & Dignified</option>
              </select>
            </div>

            <div>
              <label htmlFor="speech-audience-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Audience / Room Atmosphere
              </label>
              <input
                id="speech-audience-input"
                type="text"
                value={audienceDetails}
                onChange={(e) => setAudienceDetails(e.target.value)}
                placeholder="e.g. Close family and college friends at candlelit dinner"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="speech-memories-input" className="block text-xs font-semibold text-slate-700 mb-1">
              Personal Memories, Anecdotes, or Specific Themes to Include
            </label>
            <textarea
              id="speech-memories-input"
              rows={3}
              value={memoriesOrThemes}
              onChange={(e) => setMemoriesOrThemes(e.target.value)}
              placeholder="e.g. Mention when they first met during road trip, how she supported his master's thesis, their shared love for cooking..."
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowGenForm(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 rounded-lg transition-colors cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Drafting with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Generate Script</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Speeches Cards */}
      <div className="space-y-4">
        {speeches.map((s) => (
          <article
            key={s.id}
            className="p-5 bg-white border border-slate-200/90 rounded-xl shadow-xs hover:border-slate-300 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                  <span className="flex items-center gap-1.5 text-slate-900 font-bold">
                    {SPEECH_ICONS[s.type]}
                    <span>{s.title}</span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-600">{s.speaker}</span>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize">{s.tone.replace('_', ' & ')} Tone</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(s.id, s.content)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                >
                  {copiedId === s.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                      <span className="text-emerald-700 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                      <span>Copy Script</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(s.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Delete speech"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Content text */}
            <blockquote className="text-xs text-slate-800 leading-relaxed font-sans bg-slate-50/80 p-4 rounded-lg border border-slate-200/60 whitespace-pre-line mb-3">
              "{s.content}"
            </blockquote>

            {/* Speaking Points */}
            {s.keyPoints && s.keyPoints.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <span className="font-semibold text-slate-700">Speaking Cues:</span>
                {s.keyPoints.map((pt, idx) => (
                  <React.Fragment key={idx}>
                    <span>{pt}</span>
                    {idx < s.keyPoints.length - 1 && (
                      <span aria-hidden="true" className="text-slate-300">·</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
};
