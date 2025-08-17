#!/usr/bin/env bash
set -euo pipefail

PORT=${1:-17880}

echo "Testing multiple slots simultaneously..."
echo "Port: $PORT"
echo

# Check available slots first
echo "Checking available slots..."
curl -sS localhost:$PORT/slots | jq .
echo

# Start test services simultaneously in background
echo "Starting test services..."
curl -sS -X POST localhost:$PORT/start \
  -H 'Content-Type: application/json' \
  -d '{"id":"data-ingest","name":"Data Ingest"}' | jq . &

curl -sS -X POST localhost:$PORT/start \
  -H 'Content-Type: application/json' \
  -d '{"id":"video-encode","name":"Video Encode"}' | jq . &

curl -sS -X POST localhost:$PORT/start \
  -H 'Content-Type: application/json' \
  -d '{"id":"backup-sync","name":"Backup Sync"}' | jq . &

curl -sS -X POST localhost:$PORT/start \
  -H 'Content-Type: application/json' \
  -d '{"id":"ai-training","name":"AI Training"}' | jq . &

# Wait for all background jobs to complete
wait

echo "All services started! Check your Stream Deck."
echo

# Show current status
echo "Current slot status:"
curl -sS localhost:$PORT/slots | jq .
echo

# Wait and update some services
sleep 5

echo "Services running for 5 seconds..."

# Wait more
sleep 5

# Complete services at different times
echo "Completing services one by one..."

echo "Completing Data Ingest..."
curl -sS -X POST localhost:$PORT/finish \
  -H 'Content-Type: application/json' \
  -d '{"id":"data-ingest","ok":true}' | jq .
sleep 2

echo "Completing Video Encode..."
curl -sS -X POST localhost:$PORT/finish \
  -H 'Content-Type: application/json' \
  -d '{"id":"video-encode","ok":true}' | jq .
sleep 2

echo "Failing Backup Sync (demo)..."
curl -sS -X POST localhost:$PORT/finish \
  -H 'Content-Type: application/json' \
  -d '{"id":"backup-sync","ok":false}' | jq .
sleep 2

echo "Completing AI Training..."
curl -sS -X POST localhost:$PORT/finish \
  -H 'Content-Type: application/json' \
  -d '{"id":"ai-training","ok":true}' | jq .

echo
echo "Demo completed! Configured slots should show different states."
echo "Tap the completed keys to free up slots for new services."
echo

# Final status
echo "Final slot status:"
curl -sS localhost:$PORT/slots | jq .