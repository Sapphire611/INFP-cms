INSERT INTO users (id, email, username, password, user_type, is_active, created_at,
  updated_at)
  VALUES (
    'user-id-uuid',
    'user@example.com',
    'username',
    '$2b$10$2QdGnRmyOgo.WiZAF95.COTcVsHEdPRkWNu5flAFVjpqd/jVgIyeC',
    'user',
    true,
    NOW(),
    NOW()
  );