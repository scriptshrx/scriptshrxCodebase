#!/bin/bash

# Load environment variables
source backend/.env

echo "🔗 Pushing schema to Supabase..."

# Execute the SQL file directly using psql with DIRECT_URL
psql "$DIRECT_URL" -f supabase_schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Schema successfully pushed to Supabase!"
else
    echo "❌ Error pushing schema"
    exit 1
fi
