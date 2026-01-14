// backend/src/middleware/permissions.js
/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Implements granular permissions for:
 * - SUPER_ADMIN: Platform-wide access
 * - OWNER: Full organization access
 * - ADMIN: Organization management (no billing)
 * - MANAGER: CRM + Analytics
 * - MEMBER: Limited CRM access
 */

const prisma = require('../lib/prisma');



/**
 * Check if user has permission for action on resource
 */
function checkPermission(resource, action) {
    return async (req, res, next) => {
        try {
            // Prefer DB-defined roleId, fallback to legacy string role
            const userId = req.user?.userId || req.user?.id;
            const userStringRole = req.user?.role;
            const tenantId = req.user?.tenantId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    code: 'NO_USER'
                });
            }

            // Fetch User with Role and Permissions
            // We use findUnique on userId, getting definedRole and its permissions
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    definedRole: {
                        include: {
                            permissions: true
                        }
                    }
                }
            });

            // 1. Resolve Permissions
            let assignedPermissions = [];
            let effectiveRoleName = userStringRole;

            if (user?.definedRole) {
                effectiveRoleName = user.definedRole.name;
                assignedPermissions = user.definedRole.permissions;
            } else if (userStringRole) {
                // FALLBACK: If user has a string role but no DB relation yet,
                // try to fetch the Role from DB by name to get permissions
                // This supports users who haven't been migrated to roleId yet
                const roleConfig = await prisma.role.findUnique({
                    where: { name: userStringRole },
                    include: { permissions: true }
                });
                if (roleConfig) {
                    assignedPermissions = roleConfig.permissions;
                }
            }

            if (!effectiveRoleName) {
                return res.status(403).json({
                    success: false,
                    error: 'No role assigned',
                    code: 'NO_ROLE'
                });
            }

            // DEBUG: Log resolved role and permissions for troubleshooting
            try {
                const debugPerms = assignedPermissions.map(p => `${p.resource}:${p.action}`).slice(0,50);
                console.log('[RBAC DEBUG] userId=', userId, 'effectiveRole=', effectiveRoleName, 'assignedPermissionsSample=', debugPerms);
            } catch (e) {
                console.log('[RBAC DEBUG] failed to stringify permissions', e);
            }

            // 2. Check Permission Matches
            // Permission is granted if:
            // - The user has a permission for the resource with matching action
            // - OR the user has a permission for the resource with action '*'
            // - OR the user is SUPER_ADMIN (implicit override)

            if (effectiveRoleName === 'SUPER_ADMIN') {
                return next(); // Super Admin bypass
            }

            const hasPermission = assignedPermissions.some(perm =>
                perm.resource === resource && (perm.action === '*' || perm.action === action)
            );

            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    error: `Access denied to ${resource}`,
                    code: 'ACCESS_DENIED',
                    resource,
                    action,
                    role: effectiveRoleName
                });
            }

            // For non-super-admins, verify tenant isolation
            if (tenantId) {
                req.scopedTenantId = tenantId; // Enforce tenant scoping
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({
                success: false,
                error: 'Permission verification failed',
                code: 'PERMISSION_CHECK_ERROR'
            });
        }
    };
}

/**
 * Require specific role(s)
 */
function requireRole(...roles) {
    return (req, res, next) => {
        const userRole = req.user?.role;

        if (!userRole) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'NO_ROLE'
            });
        }

        if (!roles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                error: `This action requires one of these roles: ${roles.join(', ')}`,
                code: 'INSUFFICIENT_ROLE',
                required: roles,
                current: userRole
            });
        }

        next();
    };
}

/**
 * Super Admin only middleware
 */
function requireSuperAdmin(req, res, next) {
    const userRole = req.user?.role;

    if (userRole !== 'SUPER_ADMIN') {
        return res.status(403).json({
            success: false,
            error: 'Super Admin access required',
            code: 'SUPER_ADMIN_ONLY'
        });
    }

    next();
}

/**
 * Owner or Admin only
 */
function requireOwnerOrAdmin(req, res, next) {
    const userRole = req.user?.role;

    if (!['OWNER', 'ADMIN'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            error: 'Owner or Admin access required',
            code: 'OWNER_ADMIN_ONLY',
            current: userRole
        });
    }

    next();
}

/**
 * Verify user belongs to tenant (tenant isolation)
 */
async function verifyTenantAccess(req, res, next) {
    try {
        const userId = req.user?.userId || req.user?.id;
        const userTenantId = req.user?.tenantId;
        const requestedTenantId = req.params?.tenantId || req.body?.tenantId || req.query?.tenantId;

        console.log(`verifyTenantAccess - userId: ${userId}, userTenantId: ${userTenantId}, requestedTenantId: ${requestedTenantId}`);

        // Super admin can access any tenant
        if (req.user?.role === 'SUPER_ADMIN') {
            console.log('Super admin bypass');
            if (requestedTenantId) {
                req.scopedTenantId = requestedTenantId;
                console.log('Super admin: using requestedTenantId', requestedTenantId);
            } else if (userTenantId) {
                req.scopedTenantId = userTenantId;
                console.log('Super admin: using userTenantId', userTenantId);
            }
            return next();
        }

        // No tenant requested - use user's tenant
        if (!requestedTenantId) {
            // FALLBACK: If token doesn't have tenantId (legacy token), fetch from DB
            if (!userTenantId && userId) {
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { tenantId: true }
                });
                if (user) {
                    req.user.tenantId = user.tenantId; // Update req.user for subsequent middleware
                    req.scopedTenantId = user.tenantId;
                    console.log('Fetched tenantId from DB (Legacy Token):', user.tenantId);
                    return next();
                }
            }

            req.scopedTenantId = userTenantId; // Enforce tenant scoping
            console.log('No requested tenant, using userTenantId:', userTenantId);
            return next();
        }

        // Verify user belongs to requested tenant
        if (requestedTenantId !== userTenantId) {
            console.warn('Tenant mismatch in verifyTenantAccess', { requestedTenantId, userTenantId });
            return res.status(403).json({
                success: false,
                error: 'Access denied to this organization',
                code: 'TENANT_ACCESS_DENIED'
            });
        }

        req.scopedTenantId = userTenantId;
        console.log('Tenant verification passed, scopedTenantId set to', userTenantId);
        next();
    } catch (error) {
        console.error('Tenant verification error:', error);
        return res.status(500).json({
            success: false,
            error: 'Tenant verification failed'
        });
    }
}

/**
 * Get user's effective permissions
 */
async function getUserPermissions(req, res) {
    try {
        const userId = req.user?.userId || req.user?.id;
        const userStringRole = req.user?.role;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                tenant: true,
                subscription: true,
                definedRole: {
                    include: { permissions: true }
                }
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        let assignedPermissions = {};
        let permissionsList = user.definedRole?.permissions || [];

        // Fallback for legacy users with string role but no DB relation
        if (permissionsList.length === 0 && userStringRole) {
            const roleConfig = await prisma.role.findUnique({
                where: { name: userStringRole },
                include: { permissions: true }
            });
            if (roleConfig) {
                permissionsList = roleConfig.permissions;
            }
        }

        // Convert DB permissions list to the expected format { resource: [actions] }
        permissionsList.forEach(p => {
            if (!assignedPermissions[p.resource]) {
                assignedPermissions[p.resource] = [];
            }
            assignedPermissions[p.resource].push(p.action);
        });

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                tenantId: user.tenantId
            },
            tenant: {
                id: user.tenant.id,
                name: user.tenant.name,
                plan: user.tenant.plan
            },
            permissions: assignedPermissions,
            isSuperAdmin: userStringRole === 'SUPER_ADMIN',
            isOwner: userStringRole === 'OWNER',
            isAdmin: ['OWNER', 'ADMIN'].includes(userStringRole)
        });
    } catch (error) {
        console.error('Error fetching user permissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch permissions'
        });
    }
}

module.exports = {
    checkPermission,
    requireRole,
    requireSuperAdmin,
    requireOwnerOrAdmin,
    verifyTenantAccess,
    getUserPermissions
};
