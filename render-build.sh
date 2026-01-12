#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "🚀 Starting Render Build..."

# 1. Install specific root dependencies if needed (likely handled by Render's auto detect, but safe to be explicit)
# npm install

# 2. Install Backend Dependencies
echo "📦 Installing Backend Dependencies..."
cd backend
npm install
echo "🗄️ Generating Prisma Client..."
npx prisma generate
cd ..

# 3. Install Frontend Dependencies
echo "📦 Installing Frontend Dependencies..."
cd frontend
npm install

# 4. Build Frontend (Next.js Static Export)
echo "🏗️ Building Frontend..."
rm -rf .next out
npm run build
cd ..

# 5. Prepare Production Assets
echo "🚚 Moving Static Assets to Backend..."
rm -rf backend/public
mkdir -p backend/public
cp -R frontend/out/* backend/public/

echo "✅ Build Complete!"
