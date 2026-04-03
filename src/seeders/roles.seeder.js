import Role from '../models/Role.model.js';

// Default modules in the system; extendable without code change by updating DB
// Include 'roles' so role-management endpoints can be permissioned as well
const MODULES = ['users', 'orders', 'reports', 'inventory', 'roles', 'suppliers', 'products', 'customers'];

const buildPermissions = (modules, actions) => modules.map(m => ({ module: m, actions }));

export const seedDefaultRoles = async () => {
  const adminPerms = buildPermissions(MODULES, ['create', 'read', 'update', 'delete']);
  const managerPerms = buildPermissions(MODULES, ['create', 'read', 'update']);
  const staffPerms = buildPermissions(MODULES, ['read']);

  const roles = [
    { name: 'Admin', description: 'Full access', permissions: adminPerms },
    { name: 'Manager', description: 'Manage resources without delete', permissions: managerPerms },
    { name: 'Staff', description: 'Read-only access', permissions: staffPerms }
  ];

  for (const r of roles) {
    // Insert-only: do NOT overwrite existing role documents so custom edits are preserved.
    // If a role with the given name exists, skip it (safe non-destructive behavior).
    const existing = await Role.findOne({ name: r.name });
    if (!existing) {
      await Role.create(r);
    }
  }
};

// Allow running directly when executed with an active mongoose connection
if (require.main === module) {
  (async () => {
    try {
      await seedDefaultRoles();
      // eslint-disable-next-line no-console
      console.log('Default roles seeded');
      process.exit(0);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    }
  })();
}
