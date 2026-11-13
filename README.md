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

## RentEase Connect

Both portals include **Messages** for private, realtime text chat. Messaging is available automatically for active assigned tenancies. The tenant’s owner chat opens automatically when Messages is visited. Owners see tenant names with floor/room labels immediately, even before the first message; selecting a tenant opens the chat directly. No enable/start step is required. Owners can also use **Message tenant** in the tenant directory. **Discuss with Owner** on a maintenance request carries its reference into messages. Messages display timestamps, sent/read receipts and per-conversation unread counts. History loads 40 messages at a time; older messages are fetched only on demand. There is no attachment storage, polling or paid backend service.

One conversation uses the tenancy ID as its document ID. Transactions prevent duplicate creation and keep message ordering/counters atomic. Retry IDs prevent duplicate sends after uncertain responses. The message body is plain React text, limited to 2,000 characters. No typing/presence writes are generated. Tenant/room labels are resolved from authorized records with shared room/property reads cached per refresh. The conversation list subscribes only while Messages is open, for the signed-in participant (maximum 100 conversations); only the selected thread has a live message subscription. Read markers advance only after the latest messages load in a visible page. Firestore's normal Spark read/write quotas still apply; this is not server-enforced rate limiting.

### Owner assignment and privacy

`properties/{propertyId}.ownerUid` identifies an explicitly assigned owner. Legacy properties resolve to `settings/general.bootstrapUid`, the owner created by initial setup. If neither is available, chat is blocked instead of selecting an arbitrary administrator. Existing owner-management authority is preserved; trusted administrators manage tenancy/property assignments. Chat does not give unrelated administrators access to conversations.

Conversation participants and tenancy IDs are immutable. Active accounts can read their original private history after a lease ends, but cannot send without an active matching tenancy and current assigned owner. Reassigning ownership locks the old conversation for sending; transferring historical chat to a new owner is deliberately unsupported and requires a separate, reviewed migration. Disabled accounts cannot read chat. Only the sender can create a message, and messages cannot be edited or deleted by clients. Maintenance references must match the tenant and room. Tenant profiles are not made public to enable chat.

### Activation and checks

The Connect rules and Hosting build were deployed to `rentease-3f04f` on 14 November 2026 after explicit owner approval. For another environment, review and deploy the `/conversations/{tenancyId}` and nested `/messages/{messageId}` rules before using chat. The UI reports unavailable access if the rules are missing.

```bash
npm run test:chat:rules  # local Firebase emulator; Java and Firebase CLI required
npm run test:run
npm run build
```

See `docs/CONNECT_RULES_REVIEW.md` for the rule review. Future rules/Hosting deployments and GitHub pushes require the repository owner's approval.
