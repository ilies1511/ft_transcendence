#!/bin/bash
token=$1

curl -i -X POST http://localhost:3000/api/2fa/generate --cookie "token=${token}"
