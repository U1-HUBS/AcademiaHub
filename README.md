# AcademiaHub

React + Vite + Firebase implementation of a role-based school enrollment workflow. The current UI includes polished responsive portals for Registrar, Program Chair, Teacher, and Student roles; switch roles from the header to review each experience. Firebase services are wired through `src/firebase.js`, while privileged account, registration, and advising operations live in callable Functions.

## Run locally

1. Install Node 20+, Firebase CLI, and dependencies: `npm install` then `npm --prefix functions install`.
2. Copy `.env.example` to `.env.local`. For emulator work, add `VITE_USE_EMULATORS=true`.
3. Start Firebase: `npm run emulators` (Auth 9099, Firestore 8080, Functions 5001, Emulator UI 4000).
4. In another terminal run `npm run dev`, then open the Vite URL.
5. Build verification: `npm run build`.

For emulator testing, run `npm run seed`. It creates these accounts with the password `Password123!`: `registrar@northstar.edu`, `chair@northstar.edu`, `teacher@northstar.edu`, and `jordan@northstar.edu`. The login shortcuts appear only when `VITE_USE_EMULATORS=true`.

Use `firebase emulators:export ./emulator-data` after creating local sample data. Keep production credentials in environment variables; never commit service-account JSON. Create the first production Registrar through a one-time Admin SDK script or Firebase Console, then use the Registrar’s account-management screen/functions to create the other roles.

## Data model

`users` holds role claims and scope; `students` references a user and program; `programs` and `curricula` define academic structure; `subjects` hold regular semester and prerequisite IDs; `terms` and `offerings` represent actual sections; `registrations` are unique per student/term; `enrollments` join a registration to offerings; `gradeAttempts` preserve every retake; `payments` and `fees` track balances and down-payment verification; `specialOfferingRequests` lead to term offerings after Registrar approval; `announcements` support school-wide or program scope. Composite indexes are in `firestore.indexes.json`.

## Policy configuration

The school’s passing-grade threshold, incomplete handling, regular-semester mapping, curriculum versions, fee schedule, and approved special-offering rules remain configurable in Firestore. Backend validation is designed to check finalized passing attempts across all historical grade attempts; a same-term prerequisite never counts.

## Acceptance coverage

The callable backend blocks registration without verified payment, duplicate student/term registration, unauthorized account/role changes, cross-program Chair actions, and non-assigned grade edits. Firestore rules protect student scope and announcement permissions. The emulator is the intended verification environment for adding the remaining seeded records and exercising the full workflow.
