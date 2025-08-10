#!/bin/bash
sqlite3 core/backend/data/24_07.db "DELETE FROM friend_requests; DELETE FROM sqlite_sequence WHERE name='friend_requests';"
echo -e "🗑️ All friend requests deleted 🗑️"