# DaraLearn MVP backend

The Prisma schema in `prisma/schema.prisma` is the source of truth for the
student, tutor, admin, booking, wallet, and payout domains.

## Core flows

1. Register as a student or tutor.
2. Create a six-digit email OTP and verify the email before protected actions.
3. Issue a short-lived access token and support forgot/reset/change password.
4. Students choose subjects and receive tutors ranked by matching skills and
   tutor KYC status.
5. Students book a tutor. A successful wallet payment creates the booking and
   subscription record together.
6. Tutors submit certificate/KYC data, set a monthly price, manage bookings,
   and request payouts.
7. Admins approve KYC and process payout requests.

## Payment boundary

Wallet funding should be initialized through Paystack and credited only after
server-side transaction verification. Never trust an amount or successful
payment status sent by the browser. Store the Paystack reference uniquely in
`WalletTransaction.reference` so webhook retries are idempotent.

## Local setup

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

The Prisma service, auth guards, request DTOs, and controllers are now
implemented under `src/database`, `src/auth`, `src/learning`, and `src/wallet`.
The remaining deployment work is running the first migration, seeding subjects,
adding production SMTP/Paystack credentials, and replacing the demo dashboard
cards with the authenticated API responses.
