# RENTIFY — Student Rental Management System

A web application for students to list, browse, and rent items from each other.

---

## Team

CMPT 315 — Web Application Development
Team Members:
1. Angelica Billiones
2. Nikky Lee
3. Jheaney Perico
4. Ethan Proctor
5. Kaitlyn Littlejohn

---

## Project Overview

RENTIFY allows students to post items for rent and request rentals from other students. Admins can manage listings, users, locations, and rental approvals. The platform supports messaging between users and tracks rental history.

---

## Pages / Sitemap

| Route | Description |
|---|---|
| `/` | Home — browse available items with category filter |
| `/login` | Sign in or register a new account |
| `/items/[id]` | Item detail page |
| `/items/[id]/rent` | Submit a rental request for an item |
| `/items/new` | List a new item for rent |
| `/my-items` | Manage your own listings |
| `/my-rentals` | View your rental history as a renter |
| `/rentals/[id]` | Rental detail page |
| `/messages` | Inbox and messaging between users |
| `/profile` | View and edit your profile |
| `/payment-methods` | Manage payment methods |
| `/locations` | Browse rental pickup/dropoff locations |
| `/locations/[id]` | Location detail page |
| `/rate/[rentalId]` | Rate a completed rental |
| `/admin` | Admin dashboard overview |
| `/admin/items` | Admin: manage all item listings |
| `/admin/rentals` | Admin: manage all rentals |
| `/admin/users` | Admin: manage users |
| `/admin/locations` | Admin: manage locations |

---

## Setup Instructions

### Prerequisites

- Node.js v18 or higher
- npm

### Make sure to be inside the main folder
```bash
cd 315project-main
```
### 1. Install dependencies 

```bash
npm install
```

### 2. Set up environment variables

Create a file named `.env.local` in the root of the project folder (same level as `package.json`) and paste the following:

```
NEXT_PUBLIC_SUPABASE_URL=https://dpcqpusasvgpnertdvwf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwY3FwdXNhc3ZncG5lcnRkdndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDYyOTAsImV4cCI6MjA4NzU4MjI5MH0.PjVcNs_MBmse7Tk5ANmXn0AFTIRGe94qM0-V5gtUuEQ
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Test Accounts

You can register a new account from the `/login` page, or use one of the following existing accounts:

| Role | Email | Password |

| Admin | admin@macewan.ca | 11111111 |

| Student | kw@macewan.ca | 11111111 |

| Student | mc@macewan.ca | 11111111 |

---
