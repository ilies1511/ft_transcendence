#!/usr/bin/env bash
# Clean up demo data inserted by seed_db.sh script
# Usage: ./scripts/cleanup_db.sh [path-to-db]       (defaults to core/backend/data/post_merge.db)

set -e
DB_PATH="${1:-core/backend/data/post_merge.db}"

echo "🗑️  Cleaning up demo data from database: $DB_PATH"

sqlite3 "$DB_PATH" <<'SQL'
PRAGMA foreign_keys = ON;
BEGIN;

------------------------------------------------------------------
-- 1. Delete match participants (must be done first due to foreign keys)
------------------------------------------------------------------
DELETE FROM match_participants 
WHERE match_id IN (
    SELECT id FROM matches 
    WHERE mode = 2 AND duration BETWEEN 60 AND 180
);

------------------------------------------------------------------
-- 2. Delete the demo matches
------------------------------------------------------------------
DELETE FROM matches 
WHERE mode = 2 AND duration BETWEEN 60 AND 180;

------------------------------------------------------------------
-- 3. Remove friendships between demo users
------------------------------------------------------------------
DELETE FROM friendships 
WHERE (user_id = 1 AND friend_id = 2) 
   OR (user_id = 2 AND friend_id = 1);

------------------------------------------------------------------
-- 4. Remove demo users (optional - uncomment if you want to remove them)
------------------------------------------------------------------
-- DELETE FROM users WHERE id IN (1, 2);

------------------------------------------------------------------
-- Reset auto-increment counters for clean IDs (optional)
------------------------------------------------------------------
DELETE FROM sqlite_sequence WHERE name IN ('matches', 'match_participants');

COMMIT;
SQL

echo "✅  Demo data cleanup completed"
