#!/bin/bash

echo "🚀 Starting Deployment Process..."

# 1. Check status
git status

# 2. Add all changes
echo "📦 Staging files..."
git add .

# 3. Commit
echo "💾 Committing changes..."
# Uses a generic message, user can edit this script to take arguments
git commit -m "Refactor: Complete System Overhaul (Backend + Frontend Redesign)"

# 4. Push
echo "⬆️ Pushing to origin..."
git push origin main

echo "✅ Deployment to GitHub complete!"
echo "Now go to Render.com and trigger a deploy if not auto-configured."
