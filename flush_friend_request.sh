#!/bin/bash
sqlite3 core/backend/data/post_merge.db \
  "DELETE FROM friend_requests; DELETE FROM sqlite_sequence WHERE name='friend_requests';"