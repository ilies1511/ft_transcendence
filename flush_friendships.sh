#!/bin/bash
sqlite3 core/backend/data/24_07.db \
  "DELETE FROM friendships; DELETE FROM sqlite_sequence WHERE name='friendships';"