# Product Requirements Document

**Restaurant Command Center — Explorex Prototype**  
Version 1.0 | July 2026

---

## What We're Building

A single-screen restaurant operations dashboard that gives a restaurant operator real-time visibility into their business without switching between multiple tools. The goal is to demonstrate what a unified restaurant OS looks like from the operator's perspective, directly addressing the fragmentation problem Explorex is solving.

This is a frontend-only prototype using dummy data. No backend, no authentication, no real API calls.

---

## Who It's For

**Primary user:** Restaurant operator or manager (not the diner)

They open this dashboard at the start of their shift and keep it open all day. They need to see:

- What's happening right now
- What needs their attention
- How the day is tracking against targets

They are not technical. Every piece of information needs to be scannable in under 3 seconds.

---

## Core Screens

Build exactly these three views, nothing more:

### 1. Live Overview (default/home screen)

- Today's revenue vs target (e.g. ₹18,400 of ₹25,000 target)
- Orders in progress count (e.g. 7 active orders)
- Tables occupied vs total (e.g. 12 of 20 tables)
- Top selling item today (e.g. "Butter Chicken — 34 orders")
- Recent activity feed (last 5 order events with timestamps)

### 2. Table Map

- Grid of tables showing status: Available (green), Occupied (yellow), Waiting for bill (red)
- Each table shows: table number, number of guests, time seated, order total
- Clicking a table shows a simple order summary panel

### 3. Today's Orders

- List of all orders for today
- Filter by: All, Active, Completed, Cancelled
- Each order shows: order ID, table number, items ordered, total amount, status, time placed
- No editing, just read-only view

---

## Data Model

Use this dummy data structure. Hardcode it in a single `data.js` file:

```javascript
// Restaurant info
restaurant: {
  name: "Spice Garden",
  target_revenue: 25000,
  total_tables: 20
}

// Tables (20 total)
tables: [
  { id: 1, status: "occupied", guests: 4, seated_at: "12:30 PM", order_total: 1240 },
  { id: 2, status: "available" },
  { id: 3, status: "waiting_for_bill", guests: 2, seated_at: "11:45 AM", order_total: 680 },
  // ... populate 20 tables with mix of all three statuses
]

// Orders (today's orders)
orders: [
  { id: "ORD-001", table: 1, items: ["Butter Chicken x2", "Naan x4", "Lassi x2"], total: 1240, status: "active", time: "12:31 PM" },
  { id: "ORD-002", table: 3, items: ["Dal Makhani x1", "Roti x2"], total: 680, status: "waiting_for_bill", time: "11:46 AM" },
  // ... 15-20 orders total mixing active, completed, cancelled
]

// Today's revenue
revenue: {
  current: 18400,
  target: 25000,
  top_item: { name: "Butter Chicken", count: 34 }
}
```

---

## What We Are NOT Building

Be explicit with Cursor about these boundaries:

- No login or authentication
- No backend or API calls
- No real-time updates (static dummy data only)
- No payment processing
- No menu management
- No staff management
- No inventory tracking
- No mobile responsive layout (desktop only for now)
- No dark mode
- No animations beyond simple hover states

---

## Design Direction

- Clean, minimal, professional
- Color system: white background, dark text, green for available/positive, amber for occupied/attention, red for urgent
- Typography: clear hierarchy, numbers should be large and scannable
- No decorative elements, this is a tool not a marketing page
- Sidebar navigation with three items: Overview, Tables, Orders

---

## Tech Stack

- React (Vite)
- Tailwind CSS
- All data from a single `data.js` file
- Deploy to Vercel when done

---

## Success Criteria

When this is done, Mainak or Pritam should be able to open the URL, understand what it does in under 10 seconds, and think "this is exactly the kind of thinking we need on our design team."
