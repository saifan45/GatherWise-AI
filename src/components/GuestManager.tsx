/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Users, Plus, Trash2, Utensils, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { GuestItem, DietaryPreference } from '../types/event.ts';

interface GuestManagerProps {
  guests: GuestItem[];
  maxCapacity: number;
  onUpdateGuests: (newGuests: GuestItem[]) => void;
}

const DIETARY_LABELS: Record<DietaryPreference, string> = {
  none: 'Standard / No Restrictions',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  gluten_free: 'Gluten-Free (Celiac)',
  halal: 'Halal Certified',
  kosher: 'Kosher',
  allergy: 'Allergy / Custom',
};

export const GuestManager: React.FC<GuestManagerProps> = ({
  guests,
  maxCapacity,
  onUpdateGuests,
}) => {
  const [filterRsvp, setFilterRsvp] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('Friends & Family');
  const [newRsvp, setNewRsvp] = useState<'attending' | 'declined' | 'pending'>('attending');
  const [newPlusOnes, setNewPlusOnes] = useState(0);
  const [newDietary, setNewDietary] = useState<DietaryPreference>('none');
  const [newDietaryDetails, setNewDietaryDetails] = useState('');
  const [newTable, setNewTable] = useState<number>(1);

  // Memoized derived calculations for rendering efficiency
  const attendingCount = useMemo(
    () =>
      guests
        .filter((g) => g.rsvpStatus === 'attending')
        .reduce((sum, g) => sum + 1 + g.plusOnes, 0),
    [guests]
  );

  const pendingCount = useMemo(
    () => guests.filter((g) => g.rsvpStatus === 'pending').length,
    [guests]
  );

  const declinedCount = useMemo(
    () => guests.filter((g) => g.rsvpStatus === 'declined').length,
    [guests]
  );

  // Dietary counts for caterers
  const dietaryBreakdown = useMemo(
    () =>
      guests.reduce((acc, g) => {
        if (g.rsvpStatus === 'attending' && g.dietary !== 'none') {
          acc[g.dietary] = (acc[g.dietary] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>),
    [guests]
  );

  const filteredGuests = useMemo(() => {
    if (filterRsvp === 'all') return guests;
    return guests.filter((g) => g.rsvpStatus === filterRsvp);
  }, [guests, filterRsvp]);

  const handleDeleteGuest = useCallback(
    (id: string) => {
      onUpdateGuests(guests.filter((g) => g.id !== id));
    },
    [guests, onUpdateGuests]
  );

  const handleUpdateRsvp = useCallback(
    (id: string, status: 'attending' | 'declined' | 'pending') => {
      onUpdateGuests(
        guests.map((g) => (g.id === id ? { ...g, rsvpStatus: status } : g))
      );
    },
    [guests, onUpdateGuests]
  );

  const handleAddGuest = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!newName.trim()) return;

      const newGuest: GuestItem = {
        id: `guest-${Date.now()}`,
        name: newName.trim(),
        group: newGroup.trim() || 'General Guest',
        rsvpStatus: newRsvp,
        plusOnes: Number(newPlusOnes) || 0,
        dietary: newDietary,
        dietaryDetails: newDietaryDetails.trim() || undefined,
        tableNumber: Number(newTable) || undefined,
      };

      onUpdateGuests([...guests, newGuest]);
      setNewName('');
      setNewDietaryDetails('');
      setShowAddForm(false);
    },
    [guests, newName, newGroup, newRsvp, newPlusOnes, newDietary, newDietaryDetails, newTable, onUpdateGuests]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Guest List, RSVP & Dietary Accommodation Manager
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Maintain confirmed headcounts, table assignments, and dietary instructions for catering staff.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>{showAddForm ? 'Cancel' : 'Add Guest'}</span>
        </button>
      </div>

      {/* Headcount Stat Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Target Capacity</span>
          <div className="text-2xl font-bold text-slate-900 font-mono-numbers">
            {maxCapacity} Max
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Venue planned capacity</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-semibold text-emerald-700 block mb-1">Confirmed Attending</span>
          <div className="text-2xl font-bold text-slate-900 font-mono-numbers">
            {attendingCount} Persons
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Including plus-ones</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-semibold text-amber-700 block mb-1">Pending Responses</span>
          <div className="text-2xl font-bold text-slate-900 font-mono-numbers">
            {pendingCount} Parties
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Awaiting confirmation</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Declined</span>
          <div className="text-2xl font-bold text-slate-700 font-mono-numbers">
            {declinedCount} Parties
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Not attending</span>
        </div>
      </div>

      {/* Catering Dietary Breakdown Strip */}
      {Object.keys(dietaryBreakdown).length > 0 && (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-2">
            <Utensils className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            <span>Catering Kitchen Special Dietary Counts</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            {Object.entries(dietaryBreakdown).map(([diet, count]) => (
              <div key={diet} className="flex items-center gap-1.5 font-medium">
                <span className="text-slate-900 font-bold font-mono-numbers">{count}×</span>
                <span>{DIETARY_LABELS[diet as DietaryPreference] || diet}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RSVP Segmented Filters */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
        <button
          onClick={() => setFilterRsvp('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            filterRsvp === 'all'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Guests ({guests.length})
        </button>
        <button
          onClick={() => setFilterRsvp('attending')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            filterRsvp === 'attending'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Attending ({guests.filter((g) => g.rsvpStatus === 'attending').length})
        </button>
        <button
          onClick={() => setFilterRsvp('pending')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            filterRsvp === 'pending'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Pending RSVP ({pendingCount})
        </button>
        <button
          onClick={() => setFilterRsvp('declined')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            filterRsvp === 'declined'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Declined ({declinedCount})
        </button>
      </div>

      {/* Add Guest Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddGuest}
          className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4"
        >
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Register Guest or VIP Group
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="guest-name-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Guest Name / Primary Party *
              </label>
              <input
                id="guest-name-input"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Dr. Maya Patel & Guest"
                required
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
              />
            </div>

            <div>
              <label htmlFor="guest-group-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Affiliation / Circle
              </label>
              <input
                id="guest-group-input"
                type="text"
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                placeholder="e.g. Family, Volunteer, Sponsor"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
              />
            </div>

            <div>
              <label htmlFor="guest-rsvp-select" className="block text-xs font-semibold text-slate-700 mb-1">
                RSVP Status
              </label>
              <select
                id="guest-rsvp-select"
                value={newRsvp}
                onChange={(e) => setNewRsvp(e.target.value as 'attending' | 'declined' | 'pending')}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none bg-white"
              >
                <option value="attending">Confirmed Attending</option>
                <option value="pending">Pending RSVP</option>
                <option value="declined">Declined</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="guest-plus-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Additional Plus-Ones
              </label>
              <input
                id="guest-plus-input"
                type="number"
                min="0"
                max="10"
                value={newPlusOnes}
                onChange={(e) => setNewPlusOnes(parseInt(e.target.value, 10) || 0)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg font-mono-numbers focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
              />
            </div>

            <div>
              <label htmlFor="guest-dietary-select" className="block text-xs font-semibold text-slate-700 mb-1">
                Dietary Need
              </label>
              <select
                id="guest-dietary-select"
                value={newDietary}
                onChange={(e) => setNewDietary(e.target.value as DietaryPreference)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none bg-white"
              >
                {Object.entries(DIETARY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="guest-table-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Table Number (Optional)
              </label>
              <input
                id="guest-table-input"
                type="number"
                min="1"
                max="100"
                value={newTable}
                onChange={(e) => setNewTable(parseInt(e.target.value, 10) || 1)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg font-mono-numbers focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="guest-notes-input" className="block text-xs font-semibold text-slate-700 mb-1">
              Dietary Details / Special Accommodations
            </label>
            <input
              id="guest-notes-input"
              type="text"
              value={newDietaryDetails}
              onChange={(e) => setNewDietaryDetails(e.target.value)}
              placeholder="e.g. Severe peanut allergy (epipen carried), wheelchair user"
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
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
              Save Guest
            </button>
          </div>
        </form>
      )}

      {/* Guest Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th scope="col" className="py-3 px-4">Guest & Affiliation</th>
                <th scope="col" className="py-3 px-4 text-center">RSVP Status</th>
                <th scope="col" className="py-3 px-4 text-center">Party Size</th>
                <th scope="col" className="py-3 px-4">Dietary Preference</th>
                <th scope="col" className="py-3 px-4 text-center">Table #</th>
                <th scope="col" className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredGuests.map((guest) => (
                <tr key={guest.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{guest.name}</div>
                    <div className="text-[11px] text-slate-500">{guest.group}</div>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <select
                      value={guest.rsvpStatus}
                      onChange={(e) =>
                        handleUpdateRsvp(
                          guest.id,
                          e.target.value as 'attending' | 'declined' | 'pending'
                        )
                      }
                      className={`text-xs font-semibold px-2 py-1 rounded border outline-none cursor-pointer ${
                        guest.rsvpStatus === 'attending'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : guest.rsvpStatus === 'pending'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      <option value="attending">Attending</option>
                      <option value="pending">Pending</option>
                      <option value="declined">Declined</option>
                    </select>
                  </td>

                  <td className="py-3 px-4 text-center font-mono-numbers font-medium text-slate-900">
                    {1 + (guest.plusOnes || 0)} {guest.plusOnes > 0 ? `(+${guest.plusOnes})` : ''}
                  </td>

                  <td className="py-3 px-4">
                    {guest.dietary === 'none' ? (
                      <span className="text-slate-500">Standard</span>
                    ) : (
                      <div>
                        <span className="font-semibold text-slate-800">
                          {DIETARY_LABELS[guest.dietary] || guest.dietary}
                        </span>
                        {guest.dietaryDetails && (
                          <div className="text-[11px] text-amber-800 font-medium">
                            {guest.dietaryDetails}
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-4 text-center font-mono-numbers text-slate-700 font-semibold">
                    {guest.tableNumber ? `Table ${guest.tableNumber}` : '—'}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleDeleteGuest(guest.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove guest"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
