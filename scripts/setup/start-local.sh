#!/bin/bash

echo "Starting ClassReflect Local Development"
echo "======================================="

# Start backend
echo "Starting backend API..."
cd backend
npm run dev &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Services running:"
echo "Frontend: http://localhost:3002"
echo "Backend API: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID" INT
wait
