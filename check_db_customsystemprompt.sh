#!/bin/bash

# Diagnostic: Check if customSystemPrompt is being saved to database

DB_URL="${DATABASE_URL}"

echo "=== Database Diagnostic ==="
echo "Checking Tenant table for customSystemPrompt field..."

# Query to show all tenant system prompts
psql "$DB_URL" -c "SELECT id, name, customSystemPrompt, aiConfig FROM tenants LIMIT 5;" 2>/dev/null || echo "Note: psql not available, but this shows what to check"

echo ""
echo "If customSystemPrompt shows NULL for your tenant, the PATCH save is not working correctly."
echo "The field exists in schema.prisma but might not be populated during save."
