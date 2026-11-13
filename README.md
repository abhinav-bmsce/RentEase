# RentEase

A responsive rental property management application for property owners and tenants, built with React, TypeScript and Firebase.

**Live application:** [rentease-3f04f.web.app](https://rentease-3f04f.web.app)

## Features

- Role-based owner and tenant portals with protected routes.
- Property, floor and room management, occupancy and tenant profiles.
- Monthly rent and electricity billing, invoice PDF downloads and paid/unpaid status.
- UPI payment instructions, payment-proof submission and owner approval.
- Payment history, security-deposit tracking and financial reports.
- Maintenance requests with photographs, priority and a repair-status workflow.
- Notifications, responsive navigation, light/dark themes and loading/error states.
- Configurable occupant registration deadlines and manual inspection drafts.

Identity-document uploads remain disabled pending private storage and review infrastructure. Co-occupant invitations and automated reminders are not implemented. Inspection drafts are local and are not shared, persisted inspections. Payment proofs require owner verification; the application does not automatically verify bank transfers.

## Technology

React 18 · TypeScript · Vite · React Router · Tailwind CSS · Radix UI · Firebase Authentication · Cloud Firestore · Firebase Hosting · jsPDF · Recharts · Vitest

## Local setup

Use a current Node.js LTS release and npm.

```bash
git clone https://github.com/abhinav-bmsce/RentEase.git
cd RentEase
npm install
cp .env.example .env
```

Fill `.env` with your Firebase web-app configuration. Enable Email/Password authentication and configure Firestore access rules for your own environment. Never put service-account keys or private credentials in `VITE_*` variables: Vite includes these values in browser assets.

```bash
npm run dev
```

Open the localhost URL printed by Vite. Owner and tenant access requires an authorized account; no production credentials or tenant records are included in this repository. First-time initialization is intended only for a new, uninitialized Firebase project.

## Commands

```bash
npm run build       # Type-check and build into dist
npm run preview     # Preview production build locally
npm run lint
npm run typecheck
npm run test:run
npm run test:rules  # Firebase emulator tests; requires Firebase CLI and Java
```

## Deployment

Firebase Hosting serves `dist` with an SPA rewrite for nested routes. The checked-in Firebase target identifies this portfolio deployment. Select your own project before deploying a fork.

```bash
npm run build
firebase deploy --only hosting
```

Hosting deployment does not update Firestore rules, indexes or records. Review database/security changes separately before publishing them.

## Repository structure

- `src/features/` — owner, tenant and shared rental workflows
- `src/components/` — reusable UI, authentication and layouts
- `src/services/` — Firebase operations, payments and invoice generation
- `src/hooks/` — authentication and realtime data hooks
- `public/` — RentEase branding and application icons
- `scripts/` — initialization, emulator checks and sample invoice generation

## Privacy

Environment files, credentials, uploaded documents, local records, dependencies and build outputs are excluded from version control. Portfolio screenshots containing real tenant information are intentionally omitted. Do not use production identity documents as test fixtures.
