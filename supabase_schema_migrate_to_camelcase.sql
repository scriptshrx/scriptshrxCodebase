-- Drop existing tables (in reverse dependency order)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS workflows CASCADE;
DROP TABLE IF EXISTS custom_tools CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS call_sessions CASCADE;
DROP TABLE IF EXISTS meeting_minutes CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS invites CASCADE;
DROP TABLE IF EXISTS "_permission_to_role" CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- ScriptishRx Complete Supabase Schema (camelCase columns for Prisma compatibility)
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =====================
-- CORE TABLES
-- =====================

-- Tenants Table (Organizations)
create table if not exists tenants (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  location text,
  timezone text,
  "phoneNumber" text unique,
  
  -- Customization & Subscription
  plan text default 'Basic',
  "brandColor" text default '#000000',
  "logoUrl" text,
  "aiName" text default 'ScriptishRx AI',
  "aiWelcomeMessage" text,
  "customSystemPrompt" text,
  integrations text,
  
  -- Communication & AI Configuration (JSON)
  "twilioConfig" jsonb,
  "aiConfig" jsonb,
  
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
  "updatedAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Roles Table (RBAC)
create table if not exists roles (
  id uuid default uuid_generate_v4() primary key,
  name text unique not null,
  description text,
  "isSystem" boolean default false,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
  "updatedAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Permissions Table
create table if not exists permissions (
  id uuid default uuid_generate_v4() primary key,
  resource text not null,
  action text not null,
  description text,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
  "updatedAt" timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(resource, action)
);

-- Role-Permission Junction Table
create table if not exists "_permission_to_role" (
  a uuid references permissions(id) on delete cascade,
  b uuid references roles(id) on delete cascade,
  primary key (a, b)
);

-- Users Table
create table if not exists users (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  password text not null,
  name text,
  role text default 'MEMBER' check (role in ('SUPER_ADMIN', 'OWNER', 'ADMIN', 'MEMBER', 'SUBSCRIBER')),
  "roleId" uuid references roles(id) on delete set null,
  "tenantId" uuid references tenants(id) on delete cascade not null,
  "avatarUrl" text,
  "phoneNumber" text,
  "googleAccessToken" text,
  "googleRefreshToken" text,
  "googleTokenExpiry" bigint,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
  "updatedAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Clients Table
create table if not exists clients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  phone text,
  email text,
  notes text,
  source text default 'Direct',
  "tenantId" uuid references tenants(id) on delete cascade not null,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
  "updatedAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Bookings Table
create table if not exists bookings (
  id uuid default uuid_generate_v4() primary key,
  "clientId" uuid references clients(id) on delete cascade not null,
  "tenantId" uuid references tenants(id) on delete cascade not null,
  date timestamp with time zone not null,
  status text default 'Scheduled',
  purpose text,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
  "updatedAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Meeting Minutes Table
create table if not exists meeting_minutes (
  id uuid default uuid_generate_v4() primary key,
  "clientId" uuid references clients(id) on delete cascade not null,
  "tenantId" uuid references tenants(id) on delete cascade not null,
  content text not null,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
  "updatedAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================
-- CALL & MESSAGING
-- =====================

-- Call Sessions Table (For Voice Call Tracking)
create table if not exists call_sessions (
  id uuid default uuid_generate_v4() primary key,
  "tenantId" uuid references tenants(id) on delete cascade not null,
  "clientId" uuid references clients(id) on delete set null,
  "callSid" text unique not null,
  "callerPhone" text,
  status text default 'in_progress',
  direction text default 'inbound',
  "startedAt" timestamp with time zone default timezone('utc'::text, now()) not null,
  "endedAt" timestamp with time zone,
  duration integer,
  transcript text,
  summary text,
  "actionItems" jsonb,
  "bookingId" text,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
  "updatedAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Messages Table (Unified Chat/Voice/SMS History)
create table if not exists messages (
  id uuid default uuid_generate_v4() primary key,
  "sessionId" text not null,
  role text not null,
  content text not null,
  "tenantId" uuid references tenants(id) on delete cascade,
  "userId" uuid references users(id) on delete set null,
  source text default 'chat',
  "callSessionId" uuid references call_sessions(id) on delete set null,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================
-- CUSTOM TOOLS (AI Function Calling)
-- =====================

create table if not exists custom_tools (
  id uuid default uuid_generate_v4() primary key,
  "tenantId" uuid references tenants(id) on delete cascade not null,
  name text not null,
  "displayName" text,
  description text not null,
  parameters jsonb not null,
  "handlerType" text default 'webhook',
  "webhookUrl" text,
  "apiConfig" jsonb,
  "internalHandler" text,
  "isActive" boolean default true,
  timeout integer default 10000,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
  "updatedAt" timestamp with time zone default timezone('utc'::text, now()) not null,
  unique("tenantId", name)
);

-- =====================
-- SUBSCRIPTIONS & BILLING
-- =====================

create table if not exists subscriptions (
  id uuid default uuid_generate_v4() primary key,
  "userId" uuid references users(id) on delete cascade unique not null,
  plan text not null,
  status text not null,
  "stripeId" text,
  "paypalId" text,
  "startDate" timestamp with time zone default timezone('utc'::text, now()) not null,
  "endDate" timestamp with time zone,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
  "updatedAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================
-- AUTOMATION & WORKFLOWS
-- =====================

create table if not exists workflows (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  trigger text not null,
  actions text not null,
  "isActive" boolean default true,
  "tenantId" uuid references tenants(id) on delete cascade not null,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
  "updatedAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists campaigns (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  type text not null,
  status text not null,
  "sentCount" integer default 0,
  "openCount" integer default 0,
  "tenantId" uuid references tenants(id) on delete cascade not null,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
  "updatedAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================
-- NOTIFICATIONS & AUDIT
-- =====================

create table if not exists notifications (
  id uuid default uuid_generate_v4() primary key,
  "userId" uuid references users(id) on delete cascade not null,
  title text not null,
  message text not null,
  "isRead" boolean default false,
  type text not null,
  link text,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists audit_logs (
  id uuid default uuid_generate_v4() primary key,
  "tenantId" text not null,
  "userId" text,
  action text not null,
  details text,
  "ipAddress" text,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================
-- INVITES
-- =====================

create table if not exists invites (
  id uuid default uuid_generate_v4() primary key,
  "tenantId" uuid references tenants(id) on delete cascade not null,
  email text not null,
  role text not null,
  token text unique not null,
  "expiresAt" timestamp with time zone not null,
  "acceptedAt" timestamp with time zone,
  "createdBy" text not null,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================
-- INDEXES
-- =====================

create index if not exists idx_tenants_name on tenants(name);
create index if not exists idx_users_tenantid on users("tenantId");
create index if not exists idx_users_email on users(email);
create index if not exists idx_users_role on users(role);
create index if not exists idx_clients_tenantid on clients("tenantId");
create index if not exists idx_clients_phone on clients(phone);
create index if not exists idx_clients_email on clients(email);
create index if not exists idx_bookings_tenantid on bookings("tenantId");
create index if not exists idx_bookings_clientid on bookings("clientId");
create index if not exists idx_bookings_date on bookings(date);
create index if not exists idx_bookings_status on bookings(status);
create index if not exists idx_meeting_minutes_tenantid on meeting_minutes("tenantId");
create index if not exists idx_meeting_minutes_clientid on meeting_minutes("clientId");
create index if not exists idx_messages_sessionid on messages("sessionId");
create index if not exists idx_messages_tenantid on messages("tenantId");
create index if not exists idx_messages_callsessionid on messages("callSessionId");
create index if not exists idx_call_sessions_tenantid on call_sessions("tenantId");
create index if not exists idx_call_sessions_clientid on call_sessions("clientId");
create index if not exists idx_call_sessions_callsid on call_sessions("callSid");
create index if not exists idx_call_sessions_callerphone on call_sessions("callerPhone");
create index if not exists idx_custom_tools_tenantid on custom_tools("tenantId");
create index if not exists idx_custom_tools_isactive on custom_tools("isActive");
create index if not exists idx_workflows_tenantid on workflows("tenantId");
create index if not exists idx_campaigns_tenantid on campaigns("tenantId");
create index if not exists idx_notifications_userid on notifications("userId");
create index if not exists idx_audit_logs_tenantid on audit_logs("tenantId");
create index if not exists idx_invites_token on invites(token);
create index if not exists idx_invites_email on invites(email);
create index if not exists idx_invites_tenantid on invites("tenantId");

-- =====================
-- ROW LEVEL SECURITY
-- =====================

alter table tenants enable row level security;
alter table users enable row level security;
alter table clients enable row level security;
alter table bookings enable row level security;
alter table meeting_minutes enable row level security;
alter table messages enable row level security;
alter table call_sessions enable row level security;
alter table custom_tools enable row level security;
alter table subscriptions enable row level security;
alter table workflows enable row level security;
alter table campaigns enable row level security;
alter table notifications enable row level security;
alter table invites enable row level security;
