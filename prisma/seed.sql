INSERT INTO "Subject" ("id", "name", "slug", "description") VALUES
  ('subject-mathematics', 'Mathematics', 'mathematics', 'Build confidence with numbers, problem-solving, and logical thinking.'),
  ('subject-physics', 'Physics', 'physics', 'Understand the laws that explain how the world works.'),
  ('subject-english', 'English', 'english', 'Improve communication, writing, reading, and comprehension.'),
  ('subject-chemistry', 'Chemistry', 'chemistry', 'Learn how matter behaves through clear, practical explanations.'),
  ('subject-computer-science', 'Computer Science', 'computer-science', 'Learn programming and the foundations of modern technology.')
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description";
