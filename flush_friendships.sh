#!/bin/bash
sqlite3 core/backend/data/32_07.db "DELETE FROM friendships; DELETE FROM sqlite_sequence WHERE name='friendships';"
echo -e "🗑️ All friendships deleted 🗑️"