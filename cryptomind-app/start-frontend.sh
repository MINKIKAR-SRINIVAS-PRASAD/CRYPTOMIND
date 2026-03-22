#!/bin/bash
echo "=========================================="
echo "   CryptoMind - Starting Frontend"
echo "=========================================="
cd "$(dirname "$0")/frontend"
echo "Installing frontend dependencies..."
npm install
echo "Starting React development server..."
npm start
