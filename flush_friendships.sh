#!/bin/bash
sqlite3 core/backend/data/post_merge.db \
  "DELETE FROM friendships; DELETE FROM sqlite_sequence WHERE name='friendships';"