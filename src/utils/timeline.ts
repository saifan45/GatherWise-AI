/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TimelineItem } from '../types/event.ts';

/**
 * Converts a 24-hour time string (HH:MM) to total minutes from 00:00.
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

/**
 * Converts minute offset back to HH:MM (24-hour format), handling 24h wrapping.
 */
export function minutesToTime(minutes: number): string {
  if (isNaN(minutes)) return '00:00';
  const norm = ((Math.floor(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Calculates end time based on start time and duration in minutes, with midnight rollover support.
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const startMin = timeToMinutes(startTime);
  const safeDuration = Math.max(0, Number(durationMinutes) || 0);
  return minutesToTime(startMin + safeDuration);
}

/**
 * Calculates normalized continuous minutes relative to the event's start window.
 * Resolves midnight rollover for evening events (e.g. an item at 00:30 in an event starting at 16:00 is Day 2: 1470m).
 */
export function getNormalizedMinutes(timeStr: string, referenceStartTime?: string): number {
  const itemMins = timeToMinutes(timeStr);
  if (!referenceStartTime) return itemMins;

  const refMins = timeToMinutes(referenceStartTime);

  // If the event starts in the afternoon/evening (>= 12:00 / 720 mins)
  // and the item is in early morning (< 08:00 / 480 mins), it rolls over past midnight.
  if (refMins >= 720 && itemMins < 480) {
    return itemMins + 1440;
  }

  return itemMins;
}

/**
 * Chronologically sorts timeline items, respecting midnight rollover if an event start time is known.
 * Never mutates original items.
 */
export function sortTimeline(items: TimelineItem[], referenceStartTime?: string): TimelineItem[] {
  return [...items].sort((a, b) => {
    const aMins = getNormalizedMinutes(a.time, referenceStartTime);
    const bMins = getNormalizedMinutes(b.time, referenceStartTime);
    return aMins - bMins;
  });
}

export interface TimelineConflict {
  itemAId: string;
  itemBId: string;
  conflictType: 'overlap' | 'tight_buffer';
  description: string;
}

/**
 * Detects schedule overlaps and buffer violations between consecutive milestones.
 * Never modifies or shifts user data; reports exact conflicts for coordinator awareness.
 */
export function detectTimelineConflicts(
  items: TimelineItem[],
  referenceStartTime?: string
): TimelineConflict[] {
  if (items.length < 2) return [];

  const sorted = sortTimeline(items, referenceStartTime);
  const conflicts: TimelineConflict[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    const currentStart = getNormalizedMinutes(current.time, referenceStartTime);
    const currentDuration = Math.max(1, Number(current.durationMinutes) || 1);
    const currentEnd = currentStart + currentDuration;
    const nextStart = getNormalizedMinutes(next.time, referenceStartTime);
    const buffer = Math.max(0, Number(current.bufferMinutes) || 0);

    if (currentEnd > nextStart) {
      conflicts.push({
        itemAId: current.id,
        itemBId: next.id,
        conflictType: 'overlap',
        description: `"${current.title}" ends at ${minutesToTime(currentEnd)}, directly overlapping with "${next.title}" which starts at ${next.time}.`,
      });
    } else if (nextStart - currentEnd < buffer) {
      const actualGap = nextStart - currentEnd;
      conflicts.push({
        itemAId: current.id,
        itemBId: next.id,
        conflictType: 'tight_buffer',
        description: `Only ${actualGap}m transition between "${current.title}" and "${next.title}". Desired buffer is ${buffer}m.`,
      });
    }
  }

  return conflicts;
}

/**
 * Formats a complete, printable vendor run sheet text document from an event plan.
 */
export function generateRunSheetText(plan: {
  title: string;
  type: string;
  targetDate: string;
  startTime: string;
  endTime: string;
  location: { name: string; city: string; setting: string };
  guestCount: number;
  totalBudget: number;
  overview: { weatherContingencyPlan: string; accessibilityNotes: string };
  schedule: TimelineItem[];
  budgetActualTotal?: number;
}): string {
  const sorted = sortTimeline(plan.schedule, plan.startTime);
  let out = `GATHERWISE AI EVENT RUN SHEET\n`;
  out += `=====================================\n`;
  out += `EVENT: ${plan.title}\n`;
  out += `TYPE: ${plan.type.toUpperCase()}\n`;
  out += `DATE: ${plan.targetDate} (${plan.startTime} - ${plan.endTime})\n`;
  out += `LOCATION: ${plan.location.name}, ${plan.location.city} (${plan.location.setting})\n`;
  out += `GUEST CAPACITY: ${plan.guestCount}\n`;
  out += `TOTAL BUDGET: $${plan.totalBudget.toLocaleString()}${
    plan.budgetActualTotal !== undefined ? ` (Actual: $${plan.budgetActualTotal.toLocaleString()})` : ''
  }\n\n`;

  out += `RUN OF SHOW TIMELINE:\n`;
  out += `-------------------------------------\n`;
  sorted.forEach((item) => {
    const end = calculateEndTime(item.time, item.durationMinutes);
    out += `[${item.time} - ${end}] ${item.title} (${item.durationMinutes}m)\n`;
    out += `  Role: ${item.assignedRole} | Zone: ${item.locationZone}\n`;
    out += `  Details: ${item.description}\n\n`;
  });

  out += `EMERGENCY & WEATHER CONTINGENCY:\n`;
  out += `-------------------------------------\n`;
  out += `${plan.overview.weatherContingencyPlan}\n\n`;

  out += `ACCESSIBILITY PROTOCOLS:\n`;
  out += `-------------------------------------\n`;
  out += `${plan.overview.accessibilityNotes}\n`;

  return out;
}
