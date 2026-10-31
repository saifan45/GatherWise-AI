/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Calendar, Users, DollarSign, Clock, MapPin, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';
import { EventPlan, EventType } from '../types/event.ts';
import { formatCurrency } from '../utils/budget.ts';
import { STARTER_TEMPLATES } from '../utils/storage.ts';

import weddingHeroImg from '../assets/images/wedding_event_hero_1793246116016.jpg';
import birthdayHeroImg from '../assets/images/birthday_celebration_showcase_1793246115944.jpg';
import communityHeroImg from '../assets/images/community_festival_showcase_1793246116346.jpg';

// Verified generated image assets (bundled via Vite ESM for production/Vercel compatibility)
const HERO_IMAGES: Record<EventType, string> = {
  wedding: weddingHeroImg,
  birthday: birthdayHeroImg,
  community: communityHeroImg,
};

interface EventHeroProps {
  currentPlan: EventPlan;
  onSelectTemplate: (type: EventType) => void;
  onDuplicateTemplate: (template: EventPlan) => void;
  onOpenWizard: () => void;
  onOpenAssistant: () => void;
}

export const EventHero: React.FC<EventHeroProps> = ({
  currentPlan,
  onSelectTemplate,
  onDuplicateTemplate,
  onOpenWizard,
  onOpenAssistant,
}) => {
  const [imgError, setImgError] = useState(false);

  const heroImageSrc = HERO_IMAGES[currentPlan.type] || HERO_IMAGES.wedding;

  const totalActualSpend = currentPlan.budget.reduce((sum, item) => sum + (Number(item.actualCost) || 0), 0);
  const completedTasks = currentPlan.checklist.filter((t) => t.completed).length;
  const attendingGuests = currentPlan.guests.filter((g) => g.rsvpStatus === 'attending').reduce((sum, g) => sum + 1 + g.plusOnes, 0);

  return (
    <section className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Template Quick Switcher Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
            <span className="text-xs font-semibold text-slate-500 px-2.5">Switch Blueprint:</span>
            <button
              onClick={() => {
                setImgError(false);
                onSelectTemplate('wedding');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                currentPlan.type === 'wedding'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Wedding Showcase
            </button>
            <button
              onClick={() => {
                setImgError(false);
                onSelectTemplate('birthday');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                currentPlan.type === 'birthday'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Milestone Birthday
            </button>
            <button
              onClick={() => {
                setImgError(false);
                onSelectTemplate('community');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                currentPlan.type === 'community'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Community Festival
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenWizard}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-md transition-colors cursor-pointer"
            >
              + Create Custom Blueprint
            </button>
          </div>
        </div>

        {/* 2-Column Split: Event Brief & Visual Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Event Core Specs */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              {/* Unboxed Metadata Header */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 mb-2">
                {currentPlan.isTemplate ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-amber-50 text-amber-900 border border-amber-200/80 font-bold uppercase tracking-wider text-[11px]">
                    Showcase Template (Read-Only)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-emerald-50 text-emerald-900 border border-emerald-200/80 font-bold uppercase tracking-wider text-[11px]">
                    Your Custom Plan · Active
                  </span>
                )}
                <span aria-hidden="true">·</span>
                <span className="uppercase tracking-wider font-semibold text-slate-700">
                  {currentPlan.type}
                </span>
                <span aria-hidden="true">·</span>
                <span>{currentPlan.location.city}</span>
                <span aria-hidden="true">·</span>
                <span className="capitalize">{currentPlan.location.setting}</span>
                <span aria-hidden="true">·</span>
                <span>{currentPlan.targetDate}</span>
              </div>

              {/* Title & Template Clone Notice */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 text-balance">
                  {currentPlan.title}
                </h1>
                {currentPlan.isTemplate && (
                  <button
                    onClick={() => onDuplicateTemplate(currentPlan)}
                    className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors shadow-xs cursor-pointer shrink-0"
                    title="Clone this template to edit vendors, budgets, and milestones"
                  >
                    <span>Clone & Customize as My Plan</span>
                  </button>
                )}
              </div>

              {/* Aesthetic Theme */}
              <p className="text-base text-slate-600 leading-relaxed mb-6">
                {currentPlan.theme}
              </p>

              {/* Overview Summary */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                      Event Vision & Strategic Overview
                    </h2>
                    <p className="text-sm text-slate-700 leading-normal">
                      {currentPlan.overview.summary}
                    </p>
                  </div>
                </div>

                {/* Vibe Keywords */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-200/60 text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">Atmosphere:</span>
                  {currentPlan.overview.vibeKeywords.map((kw, i) => (
                    <React.Fragment key={kw}>
                      <span>{kw}</span>
                      {i < currentPlan.overview.vibeKeywords.length - 1 && (
                        <span aria-hidden="true" className="text-slate-300">·</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Weather Contingency & Accessibility Callout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 mb-4">
                <div className="flex items-start gap-2 bg-amber-50/70 border border-amber-200/80 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <span className="font-semibold text-amber-900 block mb-0.5">Weather Contingency</span>
                    <span className="text-amber-800 leading-snug">{currentPlan.overview.weatherContingencyPlan}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <span className="font-semibold text-slate-900 block mb-0.5">Accessibility Protocols</span>
                    <span className="text-slate-600 leading-snug">{currentPlan.overview.accessibilityNotes}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Assistant Quick Trigger */}
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={onOpenAssistant}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                <span>Ask AI to Refine Schedule or Budget</span>
              </button>
              <span className="text-xs text-slate-500">
                Adjust timelines, weather plans, or menus instantly with Gemini.
              </span>
            </div>
          </div>

          {/* Right Column: Visual Photo Card with Resilient Fallback */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="relative rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm bg-slate-900 h-full min-h-[320px]">
              {!imgError ? (
                <img
                  src={heroImageSrc}
                  alt={`${currentPlan.title} event setting`}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white text-center">
                  <Calendar className="w-12 h-12 text-emerald-400 mb-3" aria-hidden="true" />
                  <h3 className="text-lg font-bold mb-1">{currentPlan.title}</h3>
                  <p className="text-xs text-slate-300 max-w-xs">{currentPlan.theme}</p>
                </div>
              )}

              {/* Scrim Overlay with Venue Details */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent p-5 text-white">
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-300 mb-1">
                  <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{currentPlan.location.name}</span>
                </div>
                <div className="text-sm font-semibold tracking-tight text-white/95">
                  {currentPlan.location.city} · {currentPlan.startTime} to {currentPlan.endTime}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Column Metric Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-200">
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <Calendar className="w-4 h-4 text-slate-400" aria-hidden="true" />
              <span>Event Date & Window</span>
            </div>
            <div className="text-lg font-bold text-slate-900 font-mono-numbers">
              {currentPlan.targetDate}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {currentPlan.startTime} – {currentPlan.endTime} ({currentPlan.schedule.length} milestones)
            </div>
          </div>

          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <Users className="w-4 h-4 text-slate-400" aria-hidden="true" />
              <span>Guest Capacity</span>
            </div>
            <div className="text-lg font-bold text-slate-900 font-mono-numbers">
              {currentPlan.guestCount} Guests
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {attendingGuests > 0 ? `${attendingGuests} confirmed RSVP` : 'RSVP tracking active'}
            </div>
          </div>

          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <DollarSign className="w-4 h-4 text-slate-400" aria-hidden="true" />
              <span>Target Budget</span>
            </div>
            <div className="text-lg font-bold text-slate-900 font-mono-numbers">
              {formatCurrency(currentPlan.totalBudget, currentPlan.currency)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-mono-numbers">
              Actual: {formatCurrency(totalActualSpend, currentPlan.currency)}
            </div>
          </div>

          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <Clock className="w-4 h-4 text-slate-400" aria-hidden="true" />
              <span>Checklist Progress</span>
            </div>
            <div className="text-lg font-bold text-slate-900 font-mono-numbers">
              {completedTasks} / {currentPlan.checklist.length} Completed
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {Math.round((completedTasks / (currentPlan.checklist.length || 1)) * 100)}% ready
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
