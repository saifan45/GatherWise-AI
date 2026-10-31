/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventPlan } from '../types/event.ts';

const STORAGE_KEY = 'gatherwise_event_plan_v1';
const HISTORY_KEY = 'gatherwise_plans_history_v1';

export const STARTER_TEMPLATES: Record<string, EventPlan> = {
  wedding: {
    id: 'starter-wedding',
    isTemplate: true,
    templateId: 'wedding-showcase',
    title: 'Elegance Under the Stars Wedding',
    type: 'wedding',
    theme: 'Modern Romantic with Botanical Accents & Warm Candlelight',
    targetDate: '2027-06-19',
    startTime: '15:30',
    endTime: '23:30',
    location: {
      name: 'The Glasshouse Pavilion & Terrace',
      city: 'Sonoma, CA',
      setting: 'hybrid',
    },
    guestCount: 135,
    totalBudget: 42000,
    currency: '$',
    dietaryNotes: '14 Vegetarians, 6 Gluten-Free, 2 Nut Allergies',
    accessibilityNeeds: ['Step-free aisle access', 'Seated cocktail area for elderly grandparents'],
    specialRequests: 'Sunset outdoor ceremony, acoustic duo for walking down aisle, sparkler farewell sendoff at 11:15 PM.',
    overview: {
      summary: 'A curated, modern romantic wedding combining an airy outdoor lawn ceremony with an architectural glass pavilion dinner and high-energy live band reception.',
      keyHighlights: [
        'Golden hour ceremony with customized vows',
        'Chef-curated farm-to-table seasonal dinner stations',
        'Dedicated artisan espresso & craft cocktail bar',
        'Coordinated sparkler send-off corridor',
      ],
      vibeKeywords: ['Timeless', 'Intimate', 'Luminous', 'Effortless'],
      weatherContingencyPlan: 'In event of rain, lawn ceremony seamlessly shifts into the Pavilion Atrium with 90-minute venue flip protocol pre-assigned to staff.',
      accessibilityNotes: 'Ramped terrace entry, reserved front-row padded seating, golf cart shuttle available from parking grove.',
    },
    schedule: [
      {
        id: 'w-1',
        time: '12:00',
        durationMinutes: 120,
        title: 'Vendor Load-in & Floral Installation',
        description: 'Florist, lighting crew, and sound engineer arrive for pavilion and pergola setup.',
        category: 'logistics',
        assignedRole: 'Event Lead & Production Crew',
        locationZone: 'Main Lawn & Pavilion',
        bufferMinutes: 30,
        isKeyMilestone: false,
      },
      {
        id: 'w-2',
        time: '14:30',
        durationMinutes: 45,
        title: 'First Look & Wedding Party Portraits',
        description: 'Couple private first look in olive grove followed by wedding party and immediate family photos.',
        category: 'photo',
        assignedRole: 'Lead Photographer',
        locationZone: 'North Olive Grove',
        bufferMinutes: 15,
        isKeyMilestone: true,
      },
      {
        id: 'w-3',
        time: '15:30',
        durationMinutes: 30,
        title: 'Guest Arrival & Welcome Refreshments',
        description: 'Acoustic guitar playing, guests welcomed with lavender lemonade and iced prosecco.',
        category: 'reception',
        assignedRole: 'Maître D & Hospitality Staff',
        locationZone: 'Courtyard Terrace',
        bufferMinutes: 10,
        isKeyMilestone: false,
      },
      {
        id: 'w-4',
        time: '16:00',
        durationMinutes: 35,
        title: 'Ceremony & Ring Exchange',
        description: 'Processional, customized personal vows, ring exchange, and pronouncement.',
        category: 'ceremony',
        assignedRole: 'Officiant & Wedding Lead',
        locationZone: 'Lawn Pergola',
        bufferMinutes: 15,
        isKeyMilestone: true,
      },
      {
        id: 'w-5',
        time: '16:45',
        durationMinutes: 75,
        title: 'Cocktail Hour & Passed Hors d’Oeuvres',
        description: 'Signature cocktails, oyster bar, crostini station; sunset golden hour portrait wrap-up.',
        category: 'food_beverage',
        assignedRole: 'Catering Lead & Acoustic Duo',
        locationZone: 'Sunset Terrace',
        bufferMinutes: 15,
        isKeyMilestone: false,
      },
      {
        id: 'w-6',
        time: '18:15',
        durationMinutes: 90,
        title: 'Dinner Service & Speeches',
        description: 'Grand entrance, welcome speech by parents, plated three-course farm-to-table dinner, maid of honor and best man toasts.',
        category: 'speech',
        assignedRole: 'Catering Captain & Emcee',
        locationZone: 'Glasshouse Dining Hall',
        bufferMinutes: 15,
        isKeyMilestone: true,
      },
      {
        id: 'w-7',
        time: '20:00',
        durationMinutes: 45,
        title: 'First Dance & Cake Cutting',
        description: 'First dance to live band, parent dances, followed by ceremonial floral cake cutting and dessert bar opening.',
        category: 'entertainment',
        assignedRole: 'Bandleader & Photo Lead',
        locationZone: 'Central Dancefloor',
        bufferMinutes: 10,
        isKeyMilestone: true,
      },
      {
        id: 'w-8',
        time: '20:45',
        durationMinutes: 150,
        title: 'Open Dance Floor & Late Night Tacos',
        description: 'Full 8-piece band, roaming late night gourmet taco cart at 10:00 PM, festive dancing.',
        category: 'entertainment',
        assignedRole: 'Band & Catering Staff',
        locationZone: 'Dance Hall & Patio',
        bufferMinutes: 15,
        isKeyMilestone: false,
      },
      {
        id: 'w-9',
        time: '23:15',
        durationMinutes: 20,
        title: 'Grand Sparkler Send-off & Departure',
        description: 'Guests line the stone walkway with 36-inch smoke-free sparklers as couple exits into vintage cabriolet.',
        category: 'reception',
        assignedRole: 'Day-of Coordinator & Transportation',
        locationZone: 'Front Promenade',
        bufferMinutes: 15,
        isKeyMilestone: true,
      },
    ],
    budget: [
      {
        id: 'b-1',
        category: 'Venue',
        name: 'Pavilion & Lawn Exclusive Rental (10 hrs)',
        estimatedCost: 11000,
        actualCost: 11000,
        paidCost: 5500,
        notes: 'Includes tables, Chiavari chairs, security guard, bridal suite.',
        costSavingTip: 'Sunday or Friday dates typically save 15-20% on baseline rates.',
      },
      {
        id: 'b-2',
        category: 'Catering & Bar',
        name: 'Plated 3-Course Dinner & Open Premium Bar',
        estimatedCost: 16500,
        actualCost: 16200,
        paidCost: 8000,
        notes: '$120/head food + $40/head beverage package for 135 guests.',
        costSavingTip: 'Opting for signature his/hers cocktails instead of full top-shelf open bar trims $12/person.',
      },
      {
        id: 'b-3',
        category: 'Photography & Video',
        name: 'Dual Photographer & 4K Cinema Drone Package',
        estimatedCost: 4800,
        actualCost: 4800,
        paidCost: 2400,
        notes: '9 hours coverage, raw footage, edited highlight film + digital gallery.',
      },
      {
        id: 'b-4',
        category: 'Entertainment & Sound',
        name: 'Acoustic Ceremony Duo + 7-Piece Reception Band',
        estimatedCost: 4200,
        actualCost: 4400,
        paidCost: 2000,
        notes: 'Wireless lapel mics for officiant, stage lighting package included.',
      },
      {
        id: 'b-5',
        category: 'Decor & Floral',
        name: 'Ceremony Pergola Arch, Centerpieces, Bridal Bouquets',
        estimatedCost: 3500,
        actualCost: 3300,
        paidCost: 1500,
        notes: 'Repurposing ceremony floral pillars to flank the sweetheart table for dinner.',
        costSavingTip: 'Repurposing ceremony installations saves up to $900 in secondary arrangements.',
      },
      {
        id: 'b-6',
        category: 'Logistics & Rentals',
        name: 'Shuttle Buses (2x 30-passenger) & Vintage Exit Car',
        estimatedCost: 1200,
        actualCost: 1150,
        paidCost: 600,
        notes: 'Transports hotel guests to/from Sonoma Plaza.',
      },
      {
        id: 'b-7',
        category: 'Contingency',
        name: 'Weather & Emergency Reserve',
        estimatedCost: 800,
        actualCost: 250,
        paidCost: 0,
        notes: 'Heater rentals or emergency supplies cushion.',
      },
    ],
    checklist: [
      {
        id: 'c-1',
        phase: '12_months',
        title: 'Lock In Venue & Date',
        details: 'Review contracts, curfew clauses, decibel limits, and deposit payment schedule.',
        category: 'Venue',
        priority: 'high',
        completed: true,
        dueDate: '2025-09-18',
        assignee: 'Couple',
      },
      {
        id: 'c-2',
        phase: '6_months',
        title: 'Catering Menu Tasting & Bar Selection',
        details: 'Sample seasonal entrees, finalize dietary alternative portions, select wine pairings.',
        category: 'Catering',
        priority: 'high',
        completed: true,
        dueDate: '2026-03-18',
        assignee: 'Couple & Coordinator',
      },
      {
        id: 'c-3',
        phase: '3_months',
        title: 'Send Formal Invitations & Launch RSVP Portal',
        details: 'Track postal delivery and digital dietary preference forms.',
        category: 'Stationery',
        priority: 'high',
        completed: true,
        dueDate: '2026-06-18',
        assignee: 'Lead Planner',
      },
      {
        id: 'c-4',
        phase: '1_month',
        title: 'Finalize Floorplan, Seating Chart & Vendor Run Sheet',
        details: 'Ensure 36-inch aisle clearances for accessibility and confirm power drops for the band.',
        category: 'Logistics',
        priority: 'medium',
        completed: false,
        dueDate: '2026-08-18',
        assignee: 'Day-of Coordinator',
      },
      {
        id: 'c-5',
        phase: '1_week',
        title: 'Confirm Final Headcount with Caterer & Rehearsal Walkthrough',
        details: 'Submit final plate counts including vendor meals and finalize toast order.',
        category: 'Coordination',
        priority: 'high',
        completed: false,
        dueDate: '2026-09-11',
        assignee: 'Couple',
      },
      {
        id: 'c-6',
        phase: 'day_of',
        title: 'Coordinate Vendor Check-in & Distribute Emergency Kits',
        details: 'Safety pins, stain remover, timeline printouts, and cash gratuity envelopes.',
        category: 'Day-of',
        priority: 'high',
        completed: false,
        dueDate: '2026-09-18',
        assignee: 'Day-of Coordinator',
      },
    ],
    guests: [
      { id: 'g-1', name: 'Eleanor & Marcus Vance', group: 'Bride Family', rsvpStatus: 'attending', plusOnes: 1, dietary: 'vegetarian', tableNumber: 1 },
      { id: 'g-2', name: 'Dr. Raymond Chen', group: 'Groom Family', rsvpStatus: 'attending', plusOnes: 0, dietary: 'gluten_free', dietaryDetails: 'Celiac safe', tableNumber: 1 },
      { id: 'g-3', name: 'Sofia Rodriguez', group: 'Bridal Party', rsvpStatus: 'attending', plusOnes: 1, dietary: 'none', tableNumber: 2 },
      { id: 'g-4', name: 'Julian Thorne', group: 'College Friends', rsvpStatus: 'attending', plusOnes: 0, dietary: 'none', tableNumber: 3 },
      { id: 'g-5', name: 'Claire & Thomas King', group: 'Family Friends', rsvpStatus: 'pending', plusOnes: 1, dietary: 'allergy', dietaryDetails: 'Peanut allergy', tableNumber: 4 },
    ],
    speeches: [
      {
        id: 's-1',
        type: 'vow',
        title: 'Personal Ceremony Vows',
        speaker: 'Partner A',
        tone: 'heartfelt',
        content: 'From the rainy afternoon in Seattle where we shared our first coffee, to building our home together, you have been my anchor and my greatest adventure. Today, before our favorite people, I promise to listen with an open heart, celebrate every quiet victory with you, and never let us run out of warm laughter.',
        keyPoints: ['First coffee shop meeting', 'Shared values of kindness & adventure', 'Lifelong commitment through all seasons'],
      },
      {
        id: 's-2',
        type: 'welcome_toast',
        title: 'Host Welcome & Toast',
        speaker: 'Parents of the Bride',
        tone: 'heartfelt',
        content: 'Good evening everyone. Looking across this room filled with warm candlelight and the people who have shaped both our families, our hearts could not be fuller. To see these two build a love founded on genuine kindness, shared respect, and joy is the greatest gift. Please raise your glasses to love, health, and a remarkable future together!',
        keyPoints: ['Gratitude to traveling guests', 'Celebrating the couple\'s harmony', 'Cheers to the future'],
      },
    ],
    createdAt: '2026-10-28T12:00:00Z',
    updatedAt: '2026-10-28T12:00:00Z',
  },
  birthday: {
    id: 'starter-birthday',
    isTemplate: true,
    templateId: 'birthday-showcase',
    title: 'The Golden 30th Milestone Soirée',
    type: 'birthday',
    theme: 'Warm Velvet & Brass Cocktail Lounge with Live DJ & Dessert Atelier',
    targetDate: '2026-11-14',
    startTime: '19:00',
    endTime: '00:30',
    location: {
      name: 'The Loft at Foundry 42',
      city: 'Austin, TX',
      setting: 'indoor',
    },
    guestCount: 65,
    totalBudget: 8500,
    currency: '$',
    dietaryNotes: '5 Dairy-free, 3 Vegan, 4 Gluten-free',
    accessibilityNeeds: ['Elevator access to 2nd floor loft'],
    specialRequests: 'Custom neon photo backdrop, artisanal cake reveal at 9:30 PM, curated vinyl lounge hour.',
    overview: {
      summary: 'A sophisticated 30th birthday cocktail evening featuring gourmet roaming small bites, signature craft drinks, personalized trivia, and a midnight dessert bar.',
      keyHighlights: [
        'Curated vinyl listening hour during arrival',
        'Interactive friend trivia tournament with custom prizes',
        'Showstopper architectural cake presentation',
        'Signature espresso martini bar station',
      ],
      vibeKeywords: ['Chic', 'Playful', 'Vibrant', 'Stylish'],
      weatherContingencyPlan: 'Completely indoor loft venue with climate control and coat check.',
      accessibilityNotes: 'Direct elevator lift from street level to loft floor; wheelchair accessible restrooms.',
    },
    schedule: [
      {
        id: 'b-1',
        time: '17:30',
        durationMinutes: 90,
        title: 'Host Prep & DJ Soundcheck',
        description: 'Balloons, floral installations, cake delivery, and DJ soundcheck.',
        category: 'logistics',
        assignedRole: 'Event Host & Venue Coordinator',
        locationZone: 'Main Loft Floor',
        bufferMinutes: 15,
        isKeyMilestone: false,
      },
      {
        id: 'b-2',
        time: '19:00',
        durationMinutes: 60,
        title: 'Guest Welcome & Signature Cocktails',
        description: 'Guests arrive to ambient vinyl beats, welcome cocktails, and gourmet grazing table.',
        category: 'reception',
        assignedRole: 'Bartenders & Host',
        locationZone: 'Lounge & Bar',
        bufferMinutes: 10,
        isKeyMilestone: true,
      },
      {
        id: 'b-3',
        time: '20:00',
        durationMinutes: 45,
        title: 'Interactive 30-Year Trivia & Roasting',
        description: 'Hosted trivia game featuring funny childhood milestones, photo slideshow, and mini toasts.',
        category: 'entertainment',
        assignedRole: 'Best Friend Emcee & DJ',
        locationZone: 'Stage & Seating Area',
        bufferMinutes: 15,
        isKeyMilestone: true,
      },
      {
        id: 'b-4',
        time: '20:45',
        durationMinutes: 60,
        title: 'Heavy Tapas & Roaming Sliders',
        description: 'Warm gourmet sliders, truffle fries, vegan dumplings, and seasonal skewers served.',
        category: 'food_beverage',
        assignedRole: 'Catering Captain',
        locationZone: 'Tasting Lounge',
        bufferMinutes: 15,
        isKeyMilestone: false,
      },
      {
        id: 'b-5',
        time: '21:45',
        durationMinutes: 30,
        title: 'Birthday Cake Reveal & Champagne Toast',
        description: 'Artisanal cake presentation with sparklers, birthday song, emotional toast, and champagne toast.',
        category: 'speech',
        assignedRole: 'Host & Photographer',
        locationZone: 'Central Dessert Display',
        bufferMinutes: 15,
        isKeyMilestone: true,
      },
      {
        id: 'b-6',
        time: '22:15',
        durationMinutes: 135,
        title: 'High-Energy DJ Set & Espresso Bar',
        description: 'Dancefloor open with custom party playlist, espresso martinis, and dessert atelier.',
        category: 'entertainment',
        assignedRole: 'DJ & Bar Crew',
        locationZone: 'Loft Dancefloor',
        bufferMinutes: 15,
        isKeyMilestone: false,
      },
    ],
    budget: [
      { id: 'bb-1', category: 'Venue', name: 'Industrial Loft Private Rental (6 hrs)', estimatedCost: 2800, actualCost: 2800, paidCost: 1400, notes: 'Includes bar setup, lounge couches, basic sound system.' },
      { id: 'bb-2', category: 'Catering & Bar', name: 'Gourmet Tapas & Craft Cocktail Package', estimatedCost: 3200, actualCost: 3100, paidCost: 1500, notes: 'Grazing table + passed warm bites + 2 bartenders.' },
      { id: 'bb-3', category: 'Entertainment & Sound', name: 'Live DJ & Lighting Package (4 hrs)', estimatedCost: 950, actualCost: 900, paidCost: 450, notes: 'Custom setlist with vinyl warm-up.' },
      { id: 'bb-4', category: 'Decor & Floral', name: 'Custom Neon Sign, Florals & Cake Atelier', estimatedCost: 850, actualCost: 850, paidCost: 850, notes: '3-tier custom naked cake + floral table arrangements.' },
      { id: 'bb-5', category: 'Photography & Video', name: 'Candid Documentary Photographer (3 hrs)', estimatedCost: 700, actualCost: 700, paidCost: 350, notes: 'Capturing arrivals, trivia, cake cutting, and dancing.' },
    ],
    checklist: [
      { id: 'bc-1', phase: '3_months', title: 'Reserve Loft & Confirm Deposit', details: 'Check noise curfew and vendor delivery window.', category: 'Venue', priority: 'high', completed: true },
      { id: 'bc-2', phase: '1_month', title: 'Order Custom Cake & Finalize Tapas Menu', details: 'Coordinate vegan and gluten-free dessert plates.', category: 'Catering', priority: 'high', completed: true },
      { id: 'bc-3', phase: '1_week', title: 'Compile Trivia Questions & Spotify Playlist Backup', details: 'Submit question slides to DJ and gather prize bags.', category: 'Entertainment', priority: 'medium', completed: false },
      { id: 'bc-4', phase: 'day_of', title: 'Pickup Cake & Coordinate Ice/Bar Delivery', details: 'Verify garnishes, glassware, and cooler space.', category: 'Logistics', priority: 'high', completed: false },
    ],
    guests: [
      { id: 'bg-1', name: 'Jordan Miller', group: 'Inner Circle', rsvpStatus: 'attending', plusOnes: 1, dietary: 'gluten_free', tableNumber: 1 },
      { id: 'bg-2', name: 'Maya Patel', group: 'College Crew', rsvpStatus: 'attending', plusOnes: 0, dietary: 'vegan', tableNumber: 1 },
      { id: 'bg-3', name: 'David & Lisa Vance', group: 'Work Team', rsvpStatus: 'attending', plusOnes: 1, dietary: 'none', tableNumber: 2 },
    ],
    speeches: [
      {
        id: 'bs-1',
        type: 'welcome_toast',
        title: 'The Big 30 Birthday Toast',
        speaker: 'Birthday Honoree',
        tone: 'joyful_witty',
        content: 'They say your twenties are for finding out who you are, and your thirties are for enjoying who you found! Looking around this room at friends who have held my hair back, celebrated my promotions, and flown across the country to be here tonight—I am the luckiest person in Austin. Thank you for making these thirty years extraordinary. Let’s celebrate!',
        keyPoints: ['Reflecting on growth from 20s to 30s', 'Gratitude for friends who traveled', 'Invitation to eat, drink, and dance'],
      },
    ],
    createdAt: '2026-10-28T12:00:00Z',
    updatedAt: '2026-10-28T12:00:00Z',
  },
  community: {
    id: 'starter-community',
    isTemplate: true,
    templateId: 'community-showcase',
    title: 'Greenwood Neighborhood Harvest & Unity Festival',
    type: 'community',
    theme: 'Local Artisan Showcase, Live Acoustic Stage & Community Potluck',
    targetDate: '2027-09-11',
    startTime: '11:00',
    endTime: '18:00',
    location: {
      name: 'Oak Creek Memorial Park & Pavilion',
      city: 'Portland, OR',
      setting: 'outdoor',
    },
    guestCount: 450,
    totalBudget: 14500,
    currency: '$',
    dietaryNotes: 'Multicultural dietary accommodation (Halal, Kosher, Vegan options required)',
    accessibilityNeeds: ['Paved accessible pathways between pavilions', 'Sensory-quiet rest tent', 'ASL interpreter for stage speeches'],
    specialRequests: 'Zero-waste compost stations, local youth maker tables, free children art workshop, public raffle for park restoration fund.',
    overview: {
      summary: 'A family-friendly, high-impact public gathering celebrating neighborhood culture, sustainable living, local musical artists, and communal culinary heritage.',
      keyHighlights: [
        'Main stage featuring four neighborhood bands and youth choir',
        'Zero-waste volunteer-supported sorting and water refill hubs',
        'Intergenerational storytelling booth and photo history archive',
        'Charity silent auction supporting local youth sports programs',
      ],
      vibeKeywords: ['Inclusive', 'Warm', 'Grassroots', 'Lively'],
      weatherContingencyPlan: 'Covered central picnic pavilion fits 250 seated; waterproof 20x40 marquee tents reserved on standby for booth operators.',
      accessibilityNotes: 'Dedicated ADA parking adjacent to park path, portable accessible restrooms, sensory chillout tent with shaded seating.',
    },
    schedule: [
      {
        id: 'cf-1',
        time: '08:00',
        durationMinutes: 150,
        title: 'Volunteer Briefing & Canopy Setup',
        description: 'Canopy tents, generator lines, vendor stall marking, waste station setup.',
        category: 'logistics',
        assignedRole: 'Festival Operations Director',
        locationZone: 'Central Meadow & Perimeter',
        bufferMinutes: 30,
        isKeyMilestone: false,
      },
      {
        id: 'cf-2',
        time: '11:00',
        durationMinutes: 60,
        title: 'Gates Open & Community Welcome Opening',
        description: 'Opening remarks from community council chair, land acknowledgment, and youth choir performance.',
        category: 'ceremony',
        assignedRole: 'Council Chair & Youth Director',
        locationZone: 'Main Pavilion Stage',
        bufferMinutes: 15,
        isKeyMilestone: true,
      },
      {
        id: 'cf-3',
        time: '12:00',
        durationMinutes: 120,
        title: 'Food Truck Alley & Cultural Cooking Demos',
        description: 'Local food vendors open, interactive sourdough and fermentation demos, community picnic seating.',
        category: 'food_beverage',
        assignedRole: 'Food Logistics Lead',
        locationZone: 'North Pavilion Lane',
        bufferMinutes: 15,
        isKeyMilestone: false,
      },
      {
        id: 'cf-4',
        time: '14:00',
        durationMinutes: 75,
        title: 'Acoustic Stage & Local Artist Spotlights',
        description: 'Folk and bluegrass trio performance, maker spotlight interviews with local craft artisans.',
        category: 'entertainment',
        assignedRole: 'Stage Manager',
        locationZone: 'Main Pavilion Stage',
        bufferMinutes: 15,
        isKeyMilestone: false,
      },
      {
        id: 'cf-5',
        time: '15:30',
        durationMinutes: 60,
        title: 'Community Honor Awards & Charity Raffle',
        description: 'Recognizing community volunteers of the year, youth leadership certificates, and raffle drawing.',
        category: 'speech',
        assignedRole: 'Festival Emcee & ASL Interpreter',
        locationZone: 'Main Pavilion Stage',
        bufferMinutes: 15,
        isKeyMilestone: true,
      },
      {
        id: 'cf-6',
        time: '16:45',
        durationMinutes: 60,
        title: 'Finale Headliner Band & Community Circle Dance',
        description: 'Upbeat funk-soul band performance, communal dancing, and closing appreciations.',
        category: 'entertainment',
        assignedRole: 'Band & Sound Tech',
        locationZone: 'Main Meadow Lawn',
        bufferMinutes: 15,
        isKeyMilestone: true,
      },
      {
        id: 'cf-7',
        time: '17:45',
        durationMinutes: 75,
        title: 'Festival Wrap, Clean-Up & Site Restoration',
        description: 'Zero-waste sorting audit, vendor breakdown, park sweep inspection with municipal ranger.',
        category: 'logistics',
        assignedRole: 'Green Team Volunteers',
        locationZone: 'All Park Zones',
        bufferMinutes: 15,
        isKeyMilestone: false,
      },
    ],
    budget: [
      { id: 'cb-1', category: 'Venue', name: 'Municipal Park Permit & Pavilion Booking', estimatedCost: 1200, actualCost: 1200, paidCost: 1200, notes: 'Includes electricity hookup, sprinkler shutdown, parking reservation.' },
      { id: 'cb-2', category: 'Permits & Insurance', name: 'City Special Event Permit, Health Dept & Liability Insurance', estimatedCost: 1800, actualCost: 1650, paidCost: 1650, notes: 'Covers 500 attendees and commercial food trucks.' },
      { id: 'cb-3', category: 'Logistics & Rentals', name: 'Canopy Tents (10x), Tables, Sound PA & ADA Restrooms', estimatedCost: 4500, actualCost: 4300, paidCost: 2000, notes: 'Includes delivery and anchor weights.' },
      { id: 'cb-4', category: 'Entertainment & Sound', name: 'Sound Engineer & Artist Stipends', estimatedCost: 3200, actualCost: 3200, paidCost: 1600, notes: 'Stipends for 4 musical acts + certified sound tech.' },
      { id: 'cb-5', category: 'Decor & Floral', name: 'Signage, Wayfinding, Reusable Banners & Kids Art Supplies', estimatedCost: 1600, actualCost: 1450, paidCost: 1450, notes: 'Printed on recycled board; includes bilingual directional signs.' },
      { id: 'cb-6', category: 'Contingency', name: 'Green Volunteer Refreshments & Emergency Reserve', estimatedCost: 1200, actualCost: 600, paidCost: 300, notes: 'Snacks, water, first-aid and safety gear for 35 volunteers.' },
    ],
    checklist: [
      { id: 'cc-1', phase: '6_months', title: 'Submit Municipal Park & Street Closure Permits', details: 'File paperwork with city parks department and traffic division.', category: 'Permits', priority: 'high', completed: true },
      { id: 'cc-2', phase: '3_months', title: 'Recruit Community Food Trucks & Artisan Makers', details: 'Collect proof of insurance and food handler certifications.', category: 'Vendors', priority: 'high', completed: true },
      { id: 'cc-3', phase: '1_month', title: 'Confirm Sound Equipment & Audio Engineer Schedule', details: 'Verify generator wattage and stage rain cover.', category: 'Production', priority: 'medium', completed: false },
      { id: 'cc-4', phase: '1_week', title: 'Volunteer Orientation & Emergency Protocol Briefing', details: 'Assign team leads for first aid, lost children, and zero-waste sorting.', category: 'Operations', priority: 'high', completed: false },
      { id: 'cc-5', phase: 'day_of', title: 'Morning Safety Inspection & Wayfinding Signage Placement', details: 'Check paths for tripping hazards and test wireless microphones.', category: 'Safety', priority: 'high', completed: false },
    ],
    guests: [
      { id: 'cg-1', name: 'Maria Santos (City Councilor)', group: 'Civic Leadership', rsvpStatus: 'attending', plusOnes: 0, dietary: 'vegetarian' },
      { id: 'cg-2', name: 'Marcus Bell (Youth Arts Lead)', group: 'Program Partner', rsvpStatus: 'attending', plusOnes: 2, dietary: 'none' },
      { id: 'cg-3', name: 'Aisha Al-Mansoor (Green Team Captain)', group: 'Lead Volunteer', rsvpStatus: 'attending', plusOnes: 1, dietary: 'halal' },
    ],
    speeches: [
      {
        id: 'cs-1',
        type: 'keynote',
        title: 'Festival Opening Keynote',
        speaker: 'Council Chair & Organizer',
        tone: 'inspirational',
        content: 'Welcome neighbors, friends, and families! Today, Oak Creek Park belongs to our collective community. In a world that often rushes by on screens, there is sacred power in gathering together on the grass, sharing bread from our local bakers, listening to homegrown songs, and celebrating what makes our neighborhood resilient. Thank you to the 35 volunteers who showed up at 7 AM. Let us make this day unforgettable!',
        keyPoints: ['Power of in-person community gathering', 'Gratitude for local artisans and volunteers', 'Celebration of collective neighborhood resilience'],
      },
    ],
    createdAt: '2026-10-28T12:00:00Z',
    updatedAt: '2026-10-28T12:00:00Z',
  },
};

export function loadCurrentPlan(): EventPlan {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as EventPlan;
      if (parsed && parsed.id && parsed.schedule && parsed.budget) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse cached plan from localStorage:', err);
  }
  return STARTER_TEMPLATES.wedding;
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingPlanToSave: EventPlan | null = null;

function executeSave(plan: EventPlan): void {
  try {
    const updated = { ...plan, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Also update history list
    const historyRaw = localStorage.getItem(HISTORY_KEY);
    const history: EventPlan[] = historyRaw ? JSON.parse(historyRaw) : [];
    const index = history.findIndex((p) => p.id === plan.id);
    if (index >= 0) {
      history[index] = updated;
    } else {
      history.unshift(updated);
    }
    // keep max 10 in history
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
  } catch (err) {
    console.warn('Failed to save plan to localStorage:', err);
  }
}

/**
 * Persists the current plan to local storage. Uses high-performance debouncing
 * to prevent main thread blocking during continuous user interactions.
 */
export function saveCurrentPlan(plan: EventPlan, immediate = false): void {
  pendingPlanToSave = plan;
  if (immediate) {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }
    executeSave(plan);
    return;
  }
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    if (pendingPlanToSave) {
      executeSave(pendingPlanToSave);
      pendingPlanToSave = null;
    }
  }, 200);
}

// Flush pending writes immediately if user navigates away or closes tab
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (pendingPlanToSave) {
      executeSave(pendingPlanToSave);
      pendingPlanToSave = null;
    }
  });
}

export function loadPlanHistory(): EventPlan[] {
  try {
    const historyRaw = localStorage.getItem(HISTORY_KEY);
    if (historyRaw) {
      return JSON.parse(historyRaw);
    }
  } catch (err) {
    console.warn('Failed to load history:', err);
  }
  return [STARTER_TEMPLATES.wedding, STARTER_TEMPLATES.birthday, STARTER_TEMPLATES.community];
}

export function isTemplatePlan(plan: EventPlan): boolean {
  return Boolean(plan.isTemplate);
}

export function duplicateTemplateAsUserPlan(template: EventPlan, customTitle?: string): EventPlan {
  const cloned: EventPlan = JSON.parse(JSON.stringify(template));
  return {
    ...cloned,
    id: `user-plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: customTitle || `Custom ${template.title}`,
    isTemplate: false,
    templateId: template.templateId || template.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
