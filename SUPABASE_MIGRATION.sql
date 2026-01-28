-- Add password reset fields to users table
-- Run this in Supabase SQL Editor

-- Add resetToken column (unique, nullable)
ALTER TABLE "users" ADD COLUMN "resetToken" TEXT UNIQUE;

-- Add resetTokenExpiry column (timestamp, nullable)
ALTER TABLE "users" ADD COLUMN "resetTokenExpiry" TIMESTAMP(3);

-- Create index on resetToken for faster lookups
CREATE INDEX "users_resetToken_idx" ON "users"("resetToken");

-- Create index on resetTokenExpiry for cleanup queries
CREATE INDEX "users_resetTokenExpiry_idx" ON "users"("resetTokenExpiry");
