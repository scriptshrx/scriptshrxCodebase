#!/bin/bash

# Multi-Tenant Calendar Integration - Setup Script
# Run this to set up the tenant calendar feature

set -e

echo "🚀 ScriptishRx Multi-Tenant Calendar Setup"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    echo "   cd /home/ezehmark/scriptshrx/backend"
    exit 1
fi

echo "✅ Backend directory confirmed"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found"
    exit 1
fi

echo "✅ .env file found"
echo ""

# Check for required environment variables
echo "📋 Checking environment variables..."

required_vars=("GOOGLE_CLIENT_ID" "GOOGLE_CLIENT_SECRET" "GOOGLE_REDIRECT_URI" "DATABASE_URL")

for var in "${required_vars[@]}"; do
    if grep -q "^$var=" .env; then
        echo "  ✅ $var is set"
    else
        echo "  ⚠️  WARNING: $var might not be set"
    fi
done

echo ""

# Check Node modules
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "  Installing node_modules..."
    npm install
else
    echo "  ✅ node_modules found"
fi

echo ""

# Test database connection
echo "🔗 Testing database connection..."
if timeout 5 npx prisma db execute --stdin <<< "SELECT NOW();" 2>/dev/null; then
    echo "  ✅ Database connection successful"
    echo ""
    echo "🚀 Ready to run migration!"
    echo ""
    echo "Next steps:"
    echo "  1. Run: npx prisma migrate dev --name add_tenant_calendar_tokens"
    echo "  2. Verify: node verify_tenant_calendar.js"
    echo "  3. Restart: npm start"
else
    echo "  ⚠️  Cannot connect to database"
    echo ""
    echo "Fix database connection:"
    echo "  1. Check DATABASE_URL in .env"
    echo "  2. Ensure Supabase is accessible from your network"
    echo "  3. Verify credentials are correct"
    echo ""
    echo "To continue anyway (migration can run later):"
    echo "  Run: npm start"
    echo "  Then when database is available: npx prisma migrate dev --name add_tenant_calendar_tokens"
fi

echo ""
echo "📖 For detailed documentation, see: TENANT_CALENDAR_GUIDE.md"
echo ""
