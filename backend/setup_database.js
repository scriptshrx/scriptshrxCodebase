#!/usr/bin/env node
/**
 * Database Setup Script
 * Runs Prisma migration and creates super admin user
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Setting up database...\n');

    try {
        // 1. Create Super Admin User
        console.log('📝 Creating Super Admin user...');

        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@scriptishrx.com';
        const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin123!@#';

        // Check if super admin already exists
        const existingAdmin = await prisma.user.findFirst({
            where: { role: 'SUPER_ADMIN' }
        });

        if (existingAdmin) {
            console.log('✅ Super Admin already exists:', existingAdmin.email);
        } else {
            // Create platform tenant for super admin
            const platformTenant = await prisma.tenant.upsert({
                where: { id: 'platform_admin_tenant' },
                update: {},
                create: {
                    id: 'platform_admin_tenant',
                    name: 'ScriptishRx Platform',
                    location: 'Global',
                    timezone: 'UTC',
                    plan: 'Platform'
                }
            });

            const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

            const superAdmin = await prisma.user.create({
                data: {
                    email: superAdminEmail,
                    password: hashedPassword,
                    name: 'Super Administrator',
                    role: 'SUPER_ADMIN',
                    tenantId: platformTenant.id
                }
            });

            console.log('✅ Super Admin created:');
            console.log('   Email:', superAdminEmail);
            console.log('   Password:', superAdminPassword);
            console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY IN PRODUCTION!\n');
        }

        // 2. Verify database schema
        console.log('📊 Verifying database schema...');

        const tableCount = await prisma.$queryRaw`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `;

        console.log(`✅ Database has ${tableCount[0].count} tables\n`);

        // 3. Check for existing data
        const tenantCount = await prisma.tenant.count();
        const userCount = await prisma.user.count();

        console.log('📈 Current database stats:');
        console.log(`   Organizations: ${tenantCount}`);
        console.log(`   Users: ${userCount}`);

        // 4. Verify Invite model exists
        try {
            const inviteCount = await prisma.invite.count();
            console.log(`   Pending Invites: ${inviteCount}\n`);
            console.log('✅ Invite model verified');
        } catch (error) {
            console.log('❌ Invite model not found - migration may be needed');
            console.log('   Run: npx prisma migrate dev --name add_invites\n');
        }

        console.log('\n✅ Database setup complete!');

    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
