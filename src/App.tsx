/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { EventPlan, EventType } from './types/event.ts';
import { loadCurrentPlan, saveCurrentPlan, STARTER_TEMPLATES, duplicateTemplateAsUserPlan } from './utils/storage.ts';
import { Navigation } from './components/Navigation.tsx';
import { EventHero } from './components/EventHero.tsx';
import { TimelineView } from './components/TimelineView.tsx';
import { BudgetTracker } from './components/BudgetTracker.tsx';
import { ChecklistView } from './components/ChecklistView.tsx';
import { GuestManager } from './components/GuestManager.tsx';
import { SpeechInvitationGen } from './components/SpeechInvitationGen.tsx';
import { EventWizardModal } from './components/EventWizardModal.tsx';
import { AIAdviceDrawer } from './components/AIAdviceDrawer.tsx';
import { ExportSummaryModal } from './components/ExportSummaryModal.tsx';
import { checkServerHealth } from './services/api.ts';
import { Sparkles, CheckCircle2, ShieldCheck, HeartHandshake } from 'lucide-react';

export default function App() {
  const [currentPlan, setCurrentPlan] = useState<EventPlan>(loadCurrentPlan);
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'budget' | 'checklist' | 'guests' | 'speeches'>('overview');

  // Modals state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Server health state
  const [serverStatus, setServerStatus] = useState<{ status: string; geminiConfigured: boolean }>({
    status: 'checking',
    geminiConfigured: true,
  });

  useEffect(() => {
    checkServerHealth().then((res) => {
      setServerStatus(res);
    });
  }, []);

  // Save changes automatically. If user edits a template, safely fork it into a custom user plan.
  const updatePlan = useCallback((updated: EventPlan) => {
    const toSave = updated.isTemplate ? duplicateTemplateAsUserPlan(updated) : updated;
    setCurrentPlan(toSave);
    saveCurrentPlan(toSave);
  }, []);

  const handleSelectTemplate = useCallback((type: EventType) => {
    const template = STARTER_TEMPLATES[type] || STARTER_TEMPLATES.wedding;
    setCurrentPlan(template);
    saveCurrentPlan(template, true);
  }, []);

  const handleDuplicateTemplate = useCallback((template: EventPlan) => {
    const cloned = duplicateTemplateAsUserPlan(template);
    setCurrentPlan(cloned);
    saveCurrentPlan(cloned, true);
  }, []);

  const openWizard = useCallback(() => setIsWizardOpen(true), []);
  const closeWizard = useCallback(() => setIsWizardOpen(false), []);
  const openAssistant = useCallback(() => setIsAssistantOpen(true), []);
  const closeAssistant = useCallback(() => setIsAssistantOpen(false), []);
  const openExport = useCallback(() => setIsExportOpen(true), []);
  const closeExport = useCallback(() => setIsExportOpen(false), []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      {/* WCAG AAA: Accessible Skip to Content Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 px-4 py-2 bg-emerald-700 text-white rounded-lg shadow-xl font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Screen Reader Live Region for Dynamic State Announcements */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        Active workspace view: {activeTab}. Event plan: {currentPlan.title}.
      </div>

      {/* Primary Top Bar Contract */}
      <Navigation
        currentPlan={currentPlan}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenWizard={openWizard}
        onOpenExport={openExport}
        onOpenAssistant={openAssistant}
      />

      {/* Hero Showcase & Blueprint Switcher */}
      <EventHero
        currentPlan={currentPlan}
        onSelectTemplate={handleSelectTemplate}
        onDuplicateTemplate={handleDuplicateTemplate}
        onOpenWizard={openWizard}
        onOpenAssistant={openAssistant}
      />

      {/* Main Workspace Area with Accessible Landmark */}
      <main id="main-content" tabIndex={-1} className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 outline-none" role="main">
        {/* Navigation Tabs Bar for Mobile/Tablet */}
        <div
          role="tablist"
          aria-label="Event sections"
          className="flex md:hidden overflow-x-auto gap-2 pb-4 mb-6 border-b border-slate-200"
        >
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'schedule', label: 'Run of Show' },
              { id: 'budget', label: 'Budget' },
              { id: 'checklist', label: 'Checklist' },
              { id: 'guests', label: 'Guests' },
              { id: 'speeches', label: 'Speeches' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={activeTab === t.id}
              aria-controls={`panel-${t.id}`}
              id={`tab-${t.id}`}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                activeTab === t.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Strategic Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Key Highlights Grid */}
            <section className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  Event Highlights & Experience Milestones
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentPlan.overview.keyHighlights.map((highlight, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-4 bg-slate-50/80 rounded-xl border border-slate-200/60"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-xs text-slate-800 font-medium leading-relaxed">
                        {highlight}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Quick 2-Column Peek: Run of Show preview + Budget Snapshot */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Upcoming Milestones preview */}
              <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">Run of Show Snapshot</h3>
                  <button
                    onClick={() => setActiveTab('schedule')}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    View All {currentPlan.schedule.length} Milestones →
                  </button>
                </div>
                <div className="space-y-3">
                  {currentPlan.schedule.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-0.5">
                          <span className="font-mono-numbers text-slate-900">{item.time}</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.locationZone}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500 shrink-0">
                        {item.assignedRole}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Checklist & Readiness Snapshot */}
              <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">Priority Action Items</h3>
                  <button
                    onClick={() => setActiveTab('checklist')}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    View Full Checklist →
                  </button>
                </div>
                <div className="space-y-3">
                  {currentPlan.checklist.slice(0, 4).map((task) => (
                    <div
                      key={task.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="font-medium text-slate-700">{task.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-rose-700 font-semibold uppercase">{task.priority}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900">{task.title}</h4>
                      </div>
                      <div className="shrink-0 text-xs">
                        {task.completed ? (
                          <span className="text-emerald-700 font-semibold">Done</span>
                        ) : (
                          <span className="text-amber-700 font-medium">Pending</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Speeches & Vows teaser */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Prepared Speeches & Ceremony Scripts
                  </h3>
                  <p className="text-xs text-slate-500">
                    Custom speech drafts tailored to the tone and attendees of this event.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('speeches')}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                >
                  Open Speech Studio →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentPlan.speeches.map((sp) => (
                  <div key={sp.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span className="text-slate-900 font-bold">{sp.title}</span>
                      <span className="capitalize">{sp.tone.replace('_', ' ')}</span>
                    </div>
                    <p className="text-xs text-slate-700 line-clamp-3 leading-relaxed italic">
                      "{sp.content}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Run of Show Timeline */}
        {activeTab === 'schedule' && (
          <TimelineView
            schedule={currentPlan.schedule}
            startTime={currentPlan.startTime}
            onUpdateSchedule={(newSchedule) => updatePlan({ ...currentPlan, schedule: newSchedule })}
          />
        )}

        {/* Tab 3: Budget & Spend */}
        {activeTab === 'budget' && (
          <BudgetTracker
            budgetItems={currentPlan.budget}
            targetBudget={currentPlan.totalBudget}
            currency={currentPlan.currency}
            onUpdateBudget={(newBudget) => updatePlan({ ...currentPlan, budget: newBudget })}
            onUpdateTargetBudget={(newTarget) => updatePlan({ ...currentPlan, totalBudget: newTarget })}
          />
        )}

        {/* Tab 4: Checklist */}
        {activeTab === 'checklist' && (
          <ChecklistView
            checklist={currentPlan.checklist}
            onUpdateChecklist={(newChecklist) => updatePlan({ ...currentPlan, checklist: newChecklist })}
          />
        )}

        {/* Tab 5: Guest List & Dietary */}
        {activeTab === 'guests' && (
          <GuestManager
            guests={currentPlan.guests}
            maxCapacity={currentPlan.guestCount}
            onUpdateGuests={(newGuests) => updatePlan({ ...currentPlan, guests: newGuests })}
          />
        )}

        {/* Tab 6: Speeches Studio */}
        {activeTab === 'speeches' && (
          <SpeechInvitationGen
            speeches={currentPlan.speeches}
            eventTitle={currentPlan.title}
            eventType={currentPlan.type}
            onUpdateSpeeches={(newSpeeches) => updatePlan({ ...currentPlan, speeches: newSpeeches })}
          />
        )}
      </main>

      {/* Global Modals & Drawers */}
      <EventWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onPlanCreated={(newPlan) => {
          updatePlan(newPlan);
          setActiveTab('overview');
        }}
      />

      <AIAdviceDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        currentPlan={currentPlan}
        onPlanRefined={(refined) => updatePlan(refined)}
      />

      <ExportSummaryModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        currentPlan={currentPlan}
      />

      {/* Quiet Accessible Footer */}
      <footer className="mt-16 bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">GatherWise AI</span>
            <span aria-hidden="true">·</span>
            <span>Production Event Planning Engine</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>Server-Side Gemini Secure</span>
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>WCAG AA Accessible</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
