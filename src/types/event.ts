/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EventType = 'wedding' | 'birthday' | 'community';

export type EventSetting = 'indoor' | 'outdoor' | 'hybrid';

export type TimelineCategory =
  | 'ceremony'
  | 'reception'
  | 'logistics'
  | 'entertainment'
  | 'food_beverage'
  | 'speech'
  | 'photo';

export interface TimelineItem {
  id: string;
  time: string; // e.g. "16:00"
  durationMinutes: number;
  title: string;
  description: string;
  category: TimelineCategory;
  assignedRole: string;
  locationZone: string;
  bufferMinutes: number;
  isKeyMilestone: boolean;
}

export type BudgetCategory =
  | 'Venue'
  | 'Catering & Bar'
  | 'Photography & Video'
  | 'Entertainment & Sound'
  | 'Decor & Floral'
  | 'Logistics & Rentals'
  | 'Permits & Insurance'
  | 'Contingency';

export interface BudgetItem {
  id: string;
  category: BudgetCategory;
  name: string;
  estimatedCost: number;
  actualCost: number;
  paidCost: number;
  notes: string;
  costSavingTip?: string;
}

export type ChecklistPhase =
  | '12_months'
  | '6_months'
  | '3_months'
  | '1_month'
  | '1_week'
  | 'day_of'
  | 'post_event';

export type TaskPriority = 'high' | 'medium' | 'low';

export interface ChecklistItem {
  id: string;
  phase: ChecklistPhase;
  title: string;
  details: string;
  category: string;
  priority: TaskPriority;
  completed: boolean;
  dueDate?: string;
  assignee?: string;
}

export type DietaryPreference =
  | 'none'
  | 'vegetarian'
  | 'vegan'
  | 'gluten_free'
  | 'halal'
  | 'kosher'
  | 'allergy';

export interface GuestItem {
  id: string;
  name: string;
  group: string;
  rsvpStatus: 'attending' | 'declined' | 'pending';
  plusOnes: number;
  dietary: DietaryPreference;
  dietaryDetails?: string;
  tableNumber?: number;
}

export type SpeechType =
  | 'vow'
  | 'welcome_toast'
  | 'keynote'
  | 'closing_thanks'
  | 'invitation_card';

export interface SpeechItem {
  id: string;
  type: SpeechType;
  title: string;
  speaker: string;
  tone: 'heartfelt' | 'joyful_witty' | 'inspirational' | 'formal_dignified';
  content: string;
  keyPoints: string[];
}

export interface EventOverview {
  summary: string;
  keyHighlights: string[];
  vibeKeywords: string[];
  weatherContingencyPlan: string;
  accessibilityNotes: string;
}

export interface EventPlan {
  id: string;
  title: string;
  type: EventType;
  theme: string;
  targetDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  location: {
    name: string;
    city: string;
    setting: EventSetting;
  };
  guestCount: number;
  totalBudget: number;
  currency: string;
  dietaryNotes: string;
  accessibilityNeeds: string[];
  specialRequests: string;
  overview: EventOverview;
  schedule: TimelineItem[];
  budget: BudgetItem[];
  checklist: ChecklistItem[];
  guests: GuestItem[];
  speeches: SpeechItem[];
  isTemplate?: boolean;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: { field: string; message: string }[];
}

export interface EventGenerationRequest {
  type: EventType;
  title: string;
  theme: string;
  targetDate: string;
  startTime: string;
  endTime: string;
  locationName: string;
  locationCity: string;
  setting: EventSetting;
  guestCount: number;
  totalBudget: number;
  dietaryNotes?: string;
  accessibilityNeeds?: string[];
  specialRequests?: string;
}

export interface EventRefineRequest {
  currentPlan: EventPlan;
  instruction: string;
  aspect: 'all' | 'schedule' | 'budget' | 'checklist' | 'speeches';
}

export interface SpeechGenerationRequest {
  type: SpeechType;
  title?: string;
  eventTitle: string;
  eventType: EventType;
  speaker: string;
  tone: 'heartfelt' | 'joyful_witty' | 'inspirational' | 'formal_dignified';
  audienceDetails?: string;
  memoriesOrThemes?: string;
}
