-- Reset Database Script
-- This will delete all data from all tables in the correct order (respecting foreign key constraints)

-- Delete data from tables with foreign keys first
DELETE FROM comments;
DELETE FROM likes;
DELETE FROM messages;
DELETE FROM friendships;
DELETE FROM ai_doctor_chat_history;
DELETE FROM doctor_verifications;
DELETE FROM admin_users;
DELETE FROM posts;
DELETE FROM profiles;

-- Reset sequences if needed (optional, for auto-incrementing IDs)
-- Note: Since we're using UUIDs, this is not necessary but included for completeness

-- Verify deletion
SELECT 'comments' as table_name, COUNT(*) as remaining_rows FROM comments
UNION ALL
SELECT 'likes', COUNT(*) FROM likes
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'friendships', COUNT(*) FROM friendships
UNION ALL
SELECT 'ai_doctor_chat_history', COUNT(*) FROM ai_doctor_chat_history
UNION ALL
SELECT 'doctor_verifications', COUNT(*) FROM doctor_verifications
UNION ALL
SELECT 'admin_users', COUNT(*) FROM admin_users
UNION ALL
SELECT 'posts', COUNT(*) FROM posts
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles;
