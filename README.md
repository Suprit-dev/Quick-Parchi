# Quick Parchi 🏥

A modern healthcare digital queue & appointment management system. Patients book tokens ("Parchi"), track their queue position in real time, and avoid unnecessary waiting at hospitals.

## Features

### Patient
- Create account / login
- Search hospitals, doctors, departments, specializations
- Book online token (Parchi) - hospital → department → doctor → date → slot
- Real-time queue tracking with token number, position, estimated wait
- Digital Parchi with QR code for staff verification
- View upcoming & past appointments, cancel bookings
- Role-based access

### Doctor
- Dashboard with today's appointments & live queue
- Start / pause / complete consultations
- Call next patient, skip, recall skipped patients
- View statistics (waiting, in-consultation, completed, cancelled)
- Set online/offline/on-break status
- Real-time queue updates

### Hospital Admin
- Overview with stats (doctors, patients, queues, waiting, completed, cancelled)
- Live queue monitor across all doctors
- Manage doctors (set online/offline)
- Analytics with charts (patients/day, hourly distribution)
- Manage departments & staff

### Super Admin
- Platform-wide overview
- All hospitals, doctors, patients, appointments
- User management & activation

### Technical Highlights
- **Real-time**: Socket.IO server broadcasts queue updates to connected patients/doctors/admins
- **Secure**: NextAuth (JWT sessions), bcrypt password hashing, role-based route protection via Proxy middleware
- **Server-controlled queue**: Authoritative queue state maintained on the backend
- **Token generation**: Unique sequential tokens (e.g., CD-001, CD-002) with dedup
- **RBAC**: SUPER_ADMIN, HOSPITAL_ADMIN, DOCTOR, STAFF, PATIENT

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Node.js
- **Database**: Prisma ORM + SQLite (dev) / PostgreSQL (production, switch provider)
- **Realtime**: Socket.IO
- **Auth**: NextAuth.js (Credentials + JWT)
- **QR**: qrcode
- **Charts**: Recharts

## Getting Started

### Prerequisites
- Node.js 18+ / 20+

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Set up the database (SQLite by default)
npx prisma db push

# 3. Seed demo data
npm run db:seed

# 4a. Start the realtime socket server (terminal 1)
npm run socket

# 4b. Start the Next.js app (terminal 2)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Patient | patient@demo.com | demo123 |
| Doctor | doctor@demo.com | demo123 |
| Hospital Admin | admin@demo.com | demo123 |
| Super Admin | superadmin@demo.com | demo123 |

### Demo Data

Seeded with:
- **Hospitals**: City Care Hospital, LifeLine Medical Center
- **Departments**: General Medicine, Cardiology, Dermatology, Orthopedics, Pediatrics
- **Doctors**: Dr. Arjun Sharma (Cardiology), Dr. Priya Roy (Dermatology), Dr. Rahul Das (General Medicine)
- **Active queues**: Real booking data for today's queue running now

## Real-Time Queue Flow

1. Patient books a token → gets unique token & queue position
2. Doctor clicks **CALL NEXT** → system moves queue forward, updates "Now Serving", broadcasts via WebSocket
3. Patient's queue screen updates in real time (position, estimated wait, status)
4. Doctor **START** → IN_CONSULTATION → **COMPLETE** → COMPLETED
5. Skip / Recall buttons for flexible queue management

## Project Structure

```
quick-parchi/
├── prisma/
│   ├── schema.prisma    # Database schema (Users, Hospitals, Doctors, Appointments, Queues, etc.)
│   └── seed.js          # Demo data
├── server/
│   └── socket.js        # Real-time Socket.IO server (port 3001)
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── auth/                 # Login & register
│   │   ├── patient/              # Patient dashboard, booking, tracking
│   │   ├── doctor/               # Doctor dashboard & live queue
│   │   ├── hospital-admin/       # Admin dashboard, doctors, analytics
│   │   ├── super-admin/          # Platform admin
│   │   ├── scan/                 # QR verification page
│   │   └── api/                  # API routes
│   ├── components/               # Reusable components
│   ├── lib/                      # Auth, prisma, queue logic, socket client
│   ├── types/                    # TypeScript types
│   └── proxy.ts                  # Role-based route protection
└── scripts/
    └── test-flow.js              # End-to-end flow test
```

## Scripts

```bash
npm run dev          # Start Next.js dev server
npm run socket       # Start Socket.IO realtime server
npm run build        # Production build
npm run db:push      # Sync database schema
npm run db:seed      # Seed demo data
npm run db:reset     # Force-reset DB & reseed
node scripts/test-flow.js  # Verify the full queue flow
```

## Switching to PostgreSQL (Production)

1. Update `prisma/schema.prisma` datasource to `postgresql`
2. Set `DATABASE_URL` in `.env` to your PostgreSQL connection string
3. Run `npx prisma db push` (or `migrate`)

> Note: The schema uses string-based role/status values for SQLite compatibility. The enums are defined in `src/types/index.ts` and enforced in the application layer.

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT session authentication
- Route protection via Proxy middleware (per-role)
- API routes check session roles
- Input validation on all mutations
- No sensitive patient data exposed unnecessarily

## License

MIT
