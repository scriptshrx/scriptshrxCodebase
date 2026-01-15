-- ScriptishRx Complete Supabase Schema
-- Updated: 2024-12-24
-- Matches Prisma schema with all Phase 1 & 2 features

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
  phone_number text unique,
  
  -- Customization & Subscription
  plan text default 'Basic',
  brand_color text default '#000000',
  logo_url text,
  ai_name text default 'ScriptishRx AI',
  ai_welcome_message text,
  custom_system_prompt text,
  integrations text,
  
  -- Communication & AI Configuration (JSON)
  twilio_config jsonb, -- { accountSid, authToken, phoneNumber, voiceSettings }
  ai_config jsonb,     -- { model, temperature, systemPrompt, voiceId, welcomeMessage, faqs }
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Roles Table (RBAC)
create table if not exists roles (
  id uuid default uuid_generate_v4() primary key,
  name text unique not null, -- SUPER_ADMIN, OWNER, ADMIN, MEMBER, SUBSCRIBER
  description text,
  is_system boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Permissions Table
create table if not exists permissions (
  id uuid default uuid_generate_v4() primary key,
  resource text not null, -- e.g. clients, settings
  action text not null,   -- e.g. create, read
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(resource, action)
);

-- Role-Permission Junction Table
create table if not exists _permission_to_role (
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
  roleId uuid references roles(id) on delete set null,
  tenantId uuid references tenants(id) on delete cascade not null,
  avatarUrl text,
  phoneNumber text,
  createdAt timestamp with time zone default timezone('utc'::text, now()) not null,
  updatedAt timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Clients Table
create table if not exists clients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  phone text,
  email text,
  notes text,
  source text default 'Direct',
  tenant_id uuid references tenants(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Bookings Table
create table if not exists bookings (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references clients(id) on delete cascade not null,
  tenant_id uuid references tenants(id) on delete cascade not null,
  date timestamp with time zone not null,
  status text default 'Scheduled',
  purpose text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Meeting Minutes Table
create table if not exists meeting_minutes (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references clients(id) on delete cascade not null,
  tenant_id uuid references tenants(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================
-- CALL & MESSAGING
-- =====================

-- Call Sessions Table (Voice Call Tracking)
create table if not exists call_sessions (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references tenants(id) on delete cascade not null,
  client_id uuid references clients(id) on delete set null,
  call_sid text unique not null, -- Twilio Call SID
  caller_phone text,
  status text default 'in_progress', -- in_progress, completed, failed
  direction text default 'inbound',  -- inbound, outbound
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  ended_at timestamp with time zone,
  duration integer, -- Duration in seconds
  transcript text,  -- Full conversation transcript
  summary text,     -- AI-generated summary
  action_items jsonb, -- [{type, description, completed}]
  booking_id text,  -- If a booking was created during call
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Messages Table (Unified Chat/Voice/SMS History)
create table if not exists messages (
  id uuid default uuid_generate_v4() primary key,
  session_id text not null,
  role text not null, -- user, assistant, system
  content text not null,
  tenant_id uuid references tenants(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  source text default 'chat', -- chat, voice, sms
  call_session_id uuid references call_sessions(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================
-- CUSTOM TOOLS (AI Function Calling)
-- =====================

create table if not exists custom_tools (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references tenants(id) on delete cascade not null,
  name text not null,        -- Function name: check_inventory, schedule_pickup
  display_name text,         -- Human-readable name
  description text not null, -- Description for OpenAI function calling
  parameters jsonb not null, -- OpenAI function schema { type, properties, required }
  handler_type text default 'webhook', -- webhook, internal, api
  webhook_url text,          -- URL for webhook handlers
  api_config jsonb,          -- { endpoint, method, headers, bodyTemplate }
  internal_handler text,     -- Built-in handler name
  is_active boolean default true,
  timeout integer default 10000, -- Timeout in ms
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(tenant_id, name)
);

-- =====================
-- SUBSCRIPTIONS & BILLING
-- =====================

create table if not exists subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users(id) on delete cascade unique not null,
  plan text not null,
  status text not null,
  stripe_id text,
  paypal_id text,
  start_date timestamp with time zone default timezone('utc'::text, now()) not null,
  end_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================
-- AUTOMATION & WORKFLOWS
-- =====================

create table if not exists workflows (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  trigger text not null,
  actions text not null,
  is_active boolean default true,
  tenant_id uuid references tenants(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists campaigns (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  type text not null,
  status text not null,
  sent_count integer default 0,
  open_count integer default 0,
  tenant_id uuid references tenants(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================
-- NOTIFICATIONS & AUDIT
-- =====================

create table if not exists notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users(id) on delete cascade not null,
  title text not null,
  message text not null,
  is_read boolean default false,
  type text not null,
  link text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists audit_logs (
  id uuid default uuid_generate_v4() primary key,
  tenant_id text not null,
  user_id text,
  action text not null,
  details text,
  ip_address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================
-- INVITES
-- =====================

create table if not exists invites (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references tenants(id) on delete cascade not null,
  email text not null,
  role text not null,
  token text unique not null,
  expires_at timestamp with time zone not null,
  accepted_at timestamp with time zone,
  created_by text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================
-- INDEXES
-- =====================

create index if not exists idx_tenants_name on tenants(name);
create index if not exists idx_users_tenant_id on users(tenant_id);
create index if not exists idx_users_email on users(email);
create index if not exists idx_users_role on users(role);
create index if not exists idx_clients_tenant_id on clients(tenant_id);
create index if not exists idx_clients_phone on clients(phone);
create index if not exists idx_clients_email on clients(email);
create index if not exists idx_bookings_tenant_id on bookings(tenant_id);
create index if not exists idx_bookings_client_id on bookings(client_id);
create index if not exists idx_bookings_date on bookings(date);
create index if not exists idx_bookings_status on bookings(status);
create index if not exists idx_meeting_minutes_tenant_id on meeting_minutes(tenant_id);
create index if not exists idx_meeting_minutes_client_id on meeting_minutes(client_id);
create index if not exists idx_messages_session_id on messages(session_id);
create index if not exists idx_messages_tenant_id on messages(tenant_id);
create index if not exists idx_messages_call_session_id on messages(call_session_id);
create index if not exists idx_call_sessions_tenant_id on call_sessions(tenant_id);
create index if not exists idx_call_sessions_client_id on call_sessions(client_id);
create index if not exists idx_call_sessions_call_sid on call_sessions(call_sid);
create index if not exists idx_call_sessions_caller_phone on call_sessions(caller_phone);
create index if not exists idx_custom_tools_tenant_id on custom_tools(tenant_id);
create index if not exists idx_custom_tools_is_active on custom_tools(is_active);
create index if not exists idx_workflows_tenant_id on workflows(tenant_id);
create index if not exists idx_campaigns_tenant_id on campaigns(tenant_id);
create index if not exists idx_notifications_user_id on notifications(user_id);
create index if not exists idx_audit_logs_tenant_id on audit_logs(tenant_id);
create index if not exists idx_invites_token on invites(token);
create index if not exists idx_invites_email on invites(email);
create index if not exists idx_invites_tenant_id on invites(tenant_id);

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

-- Note: Add RLS policies based on your authentication strategy
-- Example: Users can only see data from their own tenant
