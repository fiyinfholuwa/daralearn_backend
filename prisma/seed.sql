BEGIN;

INSERT INTO "Subject" ("id", "name", "slug", "description") VALUES
  ('subject-mathematics', 'Mathematics', 'mathematics', 'Build confidence with numbers, problem-solving, and logical thinking.'),
  ('subject-physics', 'Physics', 'physics', 'Understand the laws that explain how the world works.'),
  ('subject-english', 'English', 'english', 'Improve communication, writing, reading, and comprehension.'),
  ('subject-chemistry', 'Chemistry', 'chemistry', 'Learn how matter behaves through clear, practical explanations.'),
  ('subject-computer-science', 'Computer Science', 'computer-science', 'Learn programming and the foundations of modern technology.')
ON CONFLICT ("slug") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";

-- All demo accounts use the password: DaraLearn123!
INSERT INTO "User" ("id", "email", "passwordHash", "firstName", "lastName", "role", "status", "emailVerifiedAt", "createdAt", "updatedAt") VALUES
  ('seed-admin-1', 'admin@daralearn.test', '$2b$12$92n/5JHZxXjfxdEe8LRiVuetbHkrbyI/bxdDfL9ivurIb2sO9CEuq', 'Ada', 'Admin', 'ADMIN', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-student-1', 'student@daralearn.test', '$2b$12$92n/5JHZxXjfxdEe8LRiVuetbHkrbyI/bxdDfL9ivurIb2sO9CEuq', 'Amara', 'Okafor', 'STUDENT', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-student-2', 'student.two@daralearn.test', '$2b$12$92n/5JHZxXjfxdEe8LRiVuetbHkrbyI/bxdDfL9ivurIb2sO9CEuq', 'Tobi', 'Adeyemi', 'STUDENT', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-student-unverified', 'unverified.student@daralearn.test', '$2b$12$92n/5JHZxXjfxdEe8LRiVuetbHkrbyI/bxdDfL9ivurIb2sO9CEuq', 'Nia', 'Williams', 'STUDENT', 'ACTIVE', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-tutor-1', 'tutor@daralearn.test', '$2b$12$92n/5JHZxXjfxdEe8LRiVuetbHkrbyI/bxdDfL9ivurIb2sO9CEuq', 'Daniel', 'Mensah', 'TUTOR', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-tutor-2', 'tutor.two@daralearn.test', '$2b$12$92n/5JHZxXjfxdEe8LRiVuetbHkrbyI/bxdDfL9ivurIb2sO9CEuq', 'Zainab', 'Bello', 'TUTOR', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-tutor-3', 'tutor.pending@daralearn.test', '$2b$12$92n/5JHZxXjfxdEe8LRiVuetbHkrbyI/bxdDfL9ivurIb2sO9CEuq', 'Leo', 'Okoro', 'TUTOR', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("email") DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash", "firstName" = EXCLUDED."firstName", "lastName" = EXCLUDED."lastName",
  "role" = EXCLUDED."role", "status" = EXCLUDED."status", "emailVerifiedAt" = EXCLUDED."emailVerifiedAt";

INSERT INTO "StudentProfile" ("id", "userId", "bio") VALUES
  ('seed-student-profile-1', (SELECT "id" FROM "User" WHERE "email" = 'student@daralearn.test'), 'A curious learner building strong STEM and communication skills.'),
  ('seed-student-profile-2', (SELECT "id" FROM "User" WHERE "email" = 'student.two@daralearn.test'), 'Preparing for exams and looking for a consistent study routine.'),
  ('seed-student-profile-3', (SELECT "id" FROM "User" WHERE "email" = 'unverified.student@daralearn.test'), 'New to DaraLearn and ready to start learning.')
ON CONFLICT ("userId") DO UPDATE SET "bio" = EXCLUDED."bio";

INSERT INTO "TutorProfile" ("id", "userId", "bio", "monthlyRate", "currency", "kycStatus", "certificateUrl", "kycNote") VALUES
  ('seed-tutor-profile-1', (SELECT "id" FROM "User" WHERE "email" = 'tutor@daralearn.test'), 'Patient mathematics tutor who makes difficult topics feel practical and clear.', 6500, 'NGN', 'APPROVED', 'https://example.com/certificates/daniel.pdf', 'Verified for mathematics and physics.'),
  ('seed-tutor-profile-2', (SELECT "id" FROM "User" WHERE "email" = 'tutor.two@daralearn.test'), 'English and chemistry tutor focused on confidence, structure, and exam preparation.', 5000, 'NGN', 'APPROVED', 'https://example.com/certificates/zainab.pdf', 'Verified for English and chemistry.'),
  ('seed-tutor-profile-3', (SELECT "id" FROM "User" WHERE "email" = 'tutor.pending@daralearn.test'), 'Computer science tutor profile awaiting admin review.', 7000, 'NGN', 'PENDING', NULL, 'Certificate submitted for review.')
ON CONFLICT ("userId") DO UPDATE SET
  "bio" = EXCLUDED."bio", "monthlyRate" = EXCLUDED."monthlyRate", "currency" = EXCLUDED."currency",
  "kycStatus" = EXCLUDED."kycStatus", "certificateUrl" = EXCLUDED."certificateUrl", "kycNote" = EXCLUDED."kycNote";

INSERT INTO "TutorSkill" ("tutorId", "subjectId") VALUES
  ((SELECT tp."id" FROM "TutorProfile" tp JOIN "User" u ON u."id" = tp."userId" WHERE u."email" = 'tutor@daralearn.test'), (SELECT "id" FROM "Subject" WHERE "slug" = 'mathematics')),
  ((SELECT tp."id" FROM "TutorProfile" tp JOIN "User" u ON u."id" = tp."userId" WHERE u."email" = 'tutor@daralearn.test'), (SELECT "id" FROM "Subject" WHERE "slug" = 'physics')),
  ((SELECT tp."id" FROM "TutorProfile" tp JOIN "User" u ON u."id" = tp."userId" WHERE u."email" = 'tutor.two@daralearn.test'), (SELECT "id" FROM "Subject" WHERE "slug" = 'english')),
  ((SELECT tp."id" FROM "TutorProfile" tp JOIN "User" u ON u."id" = tp."userId" WHERE u."email" = 'tutor.two@daralearn.test'), (SELECT "id" FROM "Subject" WHERE "slug" = 'chemistry')),
  ((SELECT tp."id" FROM "TutorProfile" tp JOIN "User" u ON u."id" = tp."userId" WHERE u."email" = 'tutor.pending@daralearn.test'), (SELECT "id" FROM "Subject" WHERE "slug" = 'computer-science'))
ON CONFLICT ("tutorId", "subjectId") DO NOTHING;

INSERT INTO "StudentInterest" ("studentId", "subjectId", "level") VALUES
  ((SELECT sp."id" FROM "StudentProfile" sp JOIN "User" u ON u."id" = sp."userId" WHERE u."email" = 'student@daralearn.test'), (SELECT "id" FROM "Subject" WHERE "slug" = 'mathematics'), 'Intermediate'),
  ((SELECT sp."id" FROM "StudentProfile" sp JOIN "User" u ON u."id" = sp."userId" WHERE u."email" = 'student@daralearn.test'), (SELECT "id" FROM "Subject" WHERE "slug" = 'physics'), 'Beginner'),
  ((SELECT sp."id" FROM "StudentProfile" sp JOIN "User" u ON u."id" = sp."userId" WHERE u."email" = 'student.two@daralearn.test'), (SELECT "id" FROM "Subject" WHERE "slug" = 'english'), 'Advanced'),
  ((SELECT sp."id" FROM "StudentProfile" sp JOIN "User" u ON u."id" = sp."userId" WHERE u."email" = 'student.two@daralearn.test'), (SELECT "id" FROM "Subject" WHERE "slug" = 'chemistry'), 'Intermediate')
ON CONFLICT ("studentId", "subjectId") DO UPDATE SET "level" = EXCLUDED."level";

INSERT INTO "Wallet" ("id", "userId", "balance", "currency") VALUES
  ('seed-wallet-student-1', (SELECT "id" FROM "User" WHERE "email" = 'student@daralearn.test'), 23500, 'NGN'),
  ('seed-wallet-student-2', (SELECT "id" FROM "User" WHERE "email" = 'student.two@daralearn.test'), 10000, 'NGN'),
  ('seed-wallet-student-3', (SELECT "id" FROM "User" WHERE "email" = 'unverified.student@daralearn.test'), 0, 'NGN'),
  ('seed-wallet-tutor-1', (SELECT "id" FROM "User" WHERE "email" = 'tutor@daralearn.test'), 4500, 'NGN'),
  ('seed-wallet-tutor-2', (SELECT "id" FROM "User" WHERE "email" = 'tutor.two@daralearn.test'), 0, 'NGN'),
  ('seed-wallet-tutor-3', (SELECT "id" FROM "User" WHERE "email" = 'tutor.pending@daralearn.test'), 0, 'NGN')
ON CONFLICT ("userId") DO UPDATE SET "balance" = EXCLUDED."balance", "currency" = EXCLUDED."currency";

INSERT INTO "Booking" ("id", "studentId", "tutorId", "subjectId", "startsAt", "endsAt", "amount", "currency", "status", "notes") VALUES
  ('seed-booking-confirmed', (SELECT "id" FROM "User" WHERE "email" = 'student@daralearn.test'), (SELECT "id" FROM "User" WHERE "email" = 'tutor@daralearn.test'), (SELECT "id" FROM "Subject" WHERE "slug" = 'mathematics'), CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '1 day 1 hour', 6500, 'NGN', 'CONFIRMED', 'Weekly mathematics lesson.'),
  ('seed-booking-completed', (SELECT "id" FROM "User" WHERE "email" = 'student@daralearn.test'), (SELECT "id" FROM "User" WHERE "email" = 'tutor.two@daralearn.test'), (SELECT "id" FROM "Subject" WHERE "slug" = 'english'), CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days' + INTERVAL '1 hour', 5000, 'NGN', 'COMPLETED', 'Completed English lesson.'),
  ('seed-booking-pending', (SELECT "id" FROM "User" WHERE "email" = 'student.two@daralearn.test'), (SELECT "id" FROM "User" WHERE "email" = 'tutor.two@daralearn.test'), (SELECT "id" FROM "Subject" WHERE "slug" = 'chemistry'), CURRENT_TIMESTAMP + INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '2 days 1 hour', 5000, 'NGN', 'PENDING', 'Pending wallet payment.')
ON CONFLICT ("id") DO UPDATE SET "startsAt" = EXCLUDED."startsAt", "endsAt" = EXCLUDED."endsAt", "amount" = EXCLUDED."amount", "status" = EXCLUDED."status", "notes" = EXCLUDED."notes";

INSERT INTO "Subscription" ("id", "bookingId", "studentId", "tutorId", "amount", "currency", "status", "startsAt", "renewsAt") VALUES
  ('seed-subscription-1', 'seed-booking-confirmed', (SELECT "id" FROM "User" WHERE "email" = 'student@daralearn.test'), (SELECT "id" FROM "User" WHERE "email" = 'tutor@daralearn.test'), 6500, 'NGN', 'ACTIVE', CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '31 days'),
  ('seed-subscription-2', 'seed-booking-completed', (SELECT "id" FROM "User" WHERE "email" = 'student@daralearn.test'), (SELECT "id" FROM "User" WHERE "email" = 'tutor.two@daralearn.test'), 5000, 'NGN', 'EXPIRED', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT ("bookingId") DO UPDATE SET "amount" = EXCLUDED."amount", "status" = EXCLUDED."status", "startsAt" = EXCLUDED."startsAt", "renewsAt" = EXCLUDED."renewsAt";

INSERT INTO "WalletTransaction" ("id", "walletId", "type", "status", "amount", "reference", "description", "createdAt") VALUES
  ('seed-transaction-1', (SELECT w."id" FROM "Wallet" w JOIN "User" u ON u."id" = w."userId" WHERE u."email" = 'student@daralearn.test'), 'FUNDING', 'SUCCESS', 30000, 'SEED-STUDENT-FUNDING-1', 'Wallet funding', CURRENT_TIMESTAMP - INTERVAL '5 days'),
  ('seed-transaction-2', (SELECT w."id" FROM "Wallet" w JOIN "User" u ON u."id" = w."userId" WHERE u."email" = 'student@daralearn.test'), 'BOOKING_PAYMENT', 'SUCCESS', 6500, 'SEED-STUDENT-BOOKING-1', 'Payment for confirmed mathematics lesson', CURRENT_TIMESTAMP - INTERVAL '2 days'),
  ('seed-transaction-3', (SELECT w."id" FROM "Wallet" w JOIN "User" u ON u."id" = w."userId" WHERE u."email" = 'student@daralearn.test'), 'FUNDING', 'PENDING', 5000, 'SEED-STUDENT-PENDING-1', 'Pending wallet funding', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
  ('seed-transaction-4', (SELECT w."id" FROM "Wallet" w JOIN "User" u ON u."id" = w."userId" WHERE u."email" = 'student.two@daralearn.test'), 'FUNDING', 'SUCCESS', 10000, 'SEED-STUDENT-2-FUNDING-1', 'Wallet funding', CURRENT_TIMESTAMP - INTERVAL '4 days'),
  ('seed-transaction-5', (SELECT w."id" FROM "Wallet" w JOIN "User" u ON u."id" = w."userId" WHERE u."email" = 'tutor@daralearn.test'), 'TUTOR_EARNING', 'SUCCESS', 6500, 'SEED-TUTOR-EARNING-1', 'Earnings from mathematics lesson', CURRENT_TIMESTAMP - INTERVAL '2 days'),
  ('seed-transaction-6', (SELECT w."id" FROM "Wallet" w JOIN "User" u ON u."id" = w."userId" WHERE u."email" = 'tutor@daralearn.test'), 'PAYOUT', 'SUCCESS', 2000, 'SEED-TUTOR-PAYOUT-1', 'Tutor payout', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT ("reference") DO UPDATE SET "walletId" = EXCLUDED."walletId", "type" = EXCLUDED."type", "status" = EXCLUDED."status", "amount" = EXCLUDED."amount", "description" = EXCLUDED."description", "createdAt" = EXCLUDED."createdAt";

INSERT INTO "Assignment" ("id", "tutorId", "studentId", "title", "instructions", "type", "options", "points", "dueAt", "durationMinutes", "createdAt", "updatedAt") VALUES
  ('seed-assignment-objective', (SELECT "id" FROM "User" WHERE "email" = 'tutor@daralearn.test'), (SELECT "id" FROM "User" WHERE "email" = 'student@daralearn.test'), 'Quadratic equations check-in', 'Choose the correct solution to the equation x + 4 = 9.', 'OBJECTIVE', '{"choices":["x = 3","x = 5","x = 9"],"correctAnswer":"x = 5"}', 10, CURRENT_TIMESTAMP + INTERVAL '3 days', 15, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP),
  ('seed-assignment-essay', (SELECT "id" FROM "User" WHERE "email" = 'tutor.two@daralearn.test'), (SELECT "id" FROM "User" WHERE "email" = 'student@daralearn.test'), 'Explain effective communication', 'Write 250 words explaining three qualities of effective communication.', 'ESSAY', NULL, 20, CURRENT_TIMESTAMP + INTERVAL '5 days', NULL, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP),
  ('seed-assignment-upload', (SELECT "id" FROM "User" WHERE "email" = 'tutor.two@daralearn.test'), (SELECT "id" FROM "User" WHERE "email" = 'student.two@daralearn.test'), 'Chemistry lab notes', 'Upload your completed lab notes as a PDF or image.', 'UPLOAD', NULL, 25, CURRENT_TIMESTAMP + INTERVAL '7 days', NULL, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "title" = EXCLUDED."title", "instructions" = EXCLUDED."instructions", "type" = EXCLUDED."type", "options" = EXCLUDED."options", "points" = EXCLUDED."points", "dueAt" = EXCLUDED."dueAt", "durationMinutes" = EXCLUDED."durationMinutes", "updatedAt" = EXCLUDED."updatedAt";

INSERT INTO "AssignmentSubmission" ("id", "assignmentId", "answer", "fileName", "fileData", "score", "feedback", "submittedAt", "gradedAt") VALUES
  ('seed-submission-objective', 'seed-assignment-objective', 'x = 5', NULL, NULL, 10, 'Correct answer. Good work.', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '12 hours'),
  ('seed-submission-essay', 'seed-assignment-essay', 'Effective communication requires listening, clarity, and empathy.', NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '4 hours', NULL)
ON CONFLICT ("assignmentId") DO UPDATE SET
  "answer" = EXCLUDED."answer", "fileName" = EXCLUDED."fileName", "fileData" = EXCLUDED."fileData", "score" = EXCLUDED."score", "feedback" = EXCLUDED."feedback", "submittedAt" = EXCLUDED."submittedAt", "gradedAt" = EXCLUDED."gradedAt";

INSERT INTO "Payout" ("id", "tutorId", "amount", "status", "note", "processedAt") VALUES
  ('seed-payout-paid', (SELECT "id" FROM "User" WHERE "email" = 'tutor@daralearn.test'), 2000, 'PAID', 'Demo paid payout', CURRENT_TIMESTAMP - INTERVAL '1 day'),
  ('seed-payout-requested', (SELECT "id" FROM "User" WHERE "email" = 'tutor.two@daralearn.test'), 1500, 'REQUESTED', 'Demo pending payout request', NULL)
ON CONFLICT ("id") DO UPDATE SET "amount" = EXCLUDED."amount", "status" = EXCLUDED."status", "note" = EXCLUDED."note", "processedAt" = EXCLUDED."processedAt";

COMMIT;
