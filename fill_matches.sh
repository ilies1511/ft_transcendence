#!/usr/bin/env bash

set -e
DB_PATH="${1:-core/backend/data/post_merge.db}"

sqlite3 "$DB_PATH" <<'SQL'
PRAGMA foreign_keys = ON;
BEGIN;

------------------------------------------------------------------
-- 2  Generate 10 one-versus-one matches spread over last 10 days
--    • mode 2: classic Pong
--    • duration: 60–180 s
--    • created_at: now − n·86400 s
------------------------------------------------------------------
WITH RECURSIVE seq(n) AS (
  SELECT 0
  UNION ALL
  SELECT n+1 FROM seq WHERE n < 9
)
INSERT INTO matches (mode, duration, created_at)
SELECT
  2,
  60 + (abs(random()) % 121),
  strftime('%s','now') - n*86400
FROM seq;

------------------------------------------------------------------
-- 3  Attach participants:
--    • User 1 plays; wins ~50% of games
--    • User 2 gets inverse score/result
------------------------------------------------------------------
/* user 1 rows */
INSERT INTO match_participants (match_id, user_id, score, result)
SELECT m.id,
       1,
       15 + (abs(random()) % 7),
       CASE WHEN (abs(random()) % 2)=0 THEN 'win' ELSE 'loss' END
FROM matches m
ORDER BY m.id DESC
LIMIT 10;

/* user 2 rows */
INSERT INTO match_participants (match_id, user_id, score, result)
SELECT p.match_id,
       2,
       30 - p.score,
       CASE p.result WHEN 'win' THEN 'loss' WHEN 'loss' THEN 'win' ELSE 'draw' END
FROM match_participants p
WHERE p.user_id = 1
ORDER BY p.match_id DESC
LIMIT 10;

COMMIT;
SQL

echo "✅ Seed complete for users 1 & 2"
