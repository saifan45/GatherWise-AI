/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar, Plus, Download, Sparkles } from 'lucide-react';
import { EventPlan } from '../types/event.ts';

interface NavigationProps {
  currentPlan: EventPlan;
  activeTab: 'overview' | 'schedule' | 'budget' | 'checklist' | 'guests' | 'speeches';
  onSelectTab: (tab: 'overview' | 'schedule' | 'budget' | 'checklist' | 'guests' | 'speeches') => void;
  onOpenWizard: () => void;
  onOpenExport: () => void;
  onOpenAssistant: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  onOpenWizard,
  onOpenExport,
  onOpenAssistant,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text brand wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Calendar className="w-5 h-5" aria-hidden="true" />
            </div>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onSelectTab('overview');
              }}
              className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-sm"
            >
              GatherWise AI
            </a>
          </div>

          {/* Zone 2: 4-6 clean single-line nav links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-700"
          >
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'schedule', label: 'Run of Show' },
              { id: 'budget', label: 'Budget & Spend' },
              { id: 'checklist', label: 'Checklist' },
              { id: 'guests', label: 'Guests & RSVP' },
              { id: 'speeches', label: 'Speeches & Vows' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-current={activeTab === tab.id ? 'page' : undefined}
                onClick={() => onSelectTab(tab.id as typeof activeTab)}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-xs ${
                  activeTab === tab.id
                    ? 'border-emerald-600 text-emerald-800 font-bold'
                    : 'border-transparent text-slate-700 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Primary action button + Quick Tools */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenAssistant}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer"
              title="Open AI Event Copilot"
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>AI Copilot</span>
            </button>
            <button
              type="button"
              onClick={onOpenExport}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 cursor-pointer"
              title="Export Run Sheet or JSON"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Export</span>
            </button>
            <button
              type="button"
              onClick={onOpenWizard}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs focus-visible:ring-2 focus-visible:ring-slate-900 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Create Event</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
