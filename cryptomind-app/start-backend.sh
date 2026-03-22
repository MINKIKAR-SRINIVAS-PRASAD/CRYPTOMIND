#!/bin/bash
echo "=========================================="
echo "   CryptoMind - Starting Backend"
echo "=========================================="
cd "$(dirname "$0")/backend"
echo "Installing backend dependencies..."
npm install
echo "Starting backend server..."
npm run dev
