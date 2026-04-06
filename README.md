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

RENTIFY is a platform that allows students to list items for rent and request rentals from other users. Administrators can manage listings, users, locations, and rental approvals. The platform also includes messaging features and tracks rental history.

The primary target audience is university students who need items for short-term use, such as for projects, assignments, or other academic purposes. RENTIFY provides an affordable alternative to purchasing expensive items that may only be needed temporarily, helping students avoid unnecessary long-term ownership.

The platform is also open to non-student users, who can list items that may be useful to students.

# Main Goal 

The main goal of this project is to demonstrate a platform that enables students to temporarily access items during their studies without the need to purchase them at full price. Additionally, it allows users to rent out items they no longer need, creating an opportunity to earn extra income.
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
## Website Features
- Browse items by location or category
- Search for specific items
- List items for rent or request items from other users
- Edit profile information, including profile image, address, and phone number
- Add and manage multiple payment methods
- View personal listings (active or currently rented out)
- View and manage rental requests from other users
- Rate sellers after completing a rental
- Send and receive messages through the platform
---

## Tech Stack
Frontend: React / HTML / CSS
Backend/Database: Supabase
---

## User Roles
Student/User: Browse items, request rentals, message others
Admin: Manage users, listings, locations, and approvals
---

## User Guide
1. Register or log in
2. Browse available items
3. Request a rental
4. Wait for approval of the rental from the seller
5. Seller approves or denies the rental request
---

## Limitations
- No payment integration implemented 
- Not optimized for mobile devices
- No notification system