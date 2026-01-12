#!/bin/bash

# LI-Creator - LinkedIn Content Creation App
# Environment Setup and Development Server Script

set -e

echo "=================================="
echo "LI-Creator - Development Setup"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Node.js version
echo -e "${BLUE}Checking Node.js version...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18+ is required. Current version: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}Node.js version: $(node -v) ✓${NC}"

# Check npm
echo -e "${BLUE}Checking npm...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}npm version: $(npm -v) ✓${NC}"

# Install dependencies
echo ""
echo -e "${BLUE}Installing dependencies...${NC}"
npm install

# Check if SQLite database exists, if not it will be created on first run
if [ ! -f "data/app.db" ]; then
    echo -e "${YELLOW}Note: SQLite database will be created on first run.${NC}"
fi

# Check for .env.local file
if [ ! -f ".env.local" ]; then
    echo ""
    echo -e "${YELLOW}Creating .env.local file...${NC}"
    cat > .env.local << 'EOF'
# Claude SDK Configuration
# The app expects Claude to be running in a separate terminal window
# with local authentication configured

# Database path (SQLite)
DATABASE_PATH=./data/app.db

# Development settings
NODE_ENV=development
EOF
    echo -e "${GREEN}.env.local created ✓${NC}"
fi

echo ""
echo "=================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=================================="
echo ""
echo -e "${BLUE}Prerequisites:${NC}"
echo "  1. Ensure Claude is running in a separate terminal window"
echo "  2. Claude Agent SDK should be configured for local authentication"
echo ""
echo -e "${BLUE}To start the development server:${NC}"
echo "  npm run dev"
echo ""
echo -e "${BLUE}Then open:${NC}"
echo "  http://localhost:3000"
echo ""
echo -e "${BLUE}Reference Documentation:${NC}"
echo "  - Engineering Guide: https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk"
echo "  - SDK Overview: https://platform.claude.com/docs/en/agent-sdk/overview"
echo "  - TypeScript SDK: https://platform.claude.com/docs/en/agent-sdk/typescript"
echo ""
