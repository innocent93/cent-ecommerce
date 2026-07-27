// Central source of truth for roles and what each one can do. Everything
// else (middleware, services, controllers) reads from here rather than
// hardcoding role checks in scattered places — one file to audit, one file
// to change when the business needs a new role or permission.

export const ROLES = Object.freeze({
  CUSTOMER: 'customer',
  SUPPORT: 'support',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
});

// Roles that can authenticate through the staff login flow at all
// (customers use the regular login; these use the same endpoint but are
// distinguished by role once logged in).
export const STAFF_ROLES = [ROLES.SUPPORT, ROLES.ADMIN, ROLES.SUPERADMIN];

export const PERMISSIONS = Object.freeze({
  // Orders
  ORDER_VIEW: 'order:view',
  ORDER_UPDATE_STATUS: 'order:update_status',
  ORDER_CANCEL: 'order:cancel',

  // Refunds
  REFUND_VIEW: 'refund:view',
  REFUND_DECIDE: 'refund:decide', // approve/reject

  // Catalog
  PRODUCT_MANAGE: 'product:manage', // create/edit/delete

  // Marketing
  COUPON_MANAGE: 'coupon:manage',

  // Customers (support use: look up a customer's order history, not edit their account)
  CUSTOMER_VIEW: 'customer:view',

  // Staff management — who can create/edit/deactivate other staff accounts.
  // Deliberately superadmin-only: an admin being able to create other admins
  // (or promote themselves) is a privilege-escalation risk.
  STAFF_MANAGE: 'staff:manage',
});

// Support: can see what's happening and help customers (order status,
// answering "where's my order"), but can't touch the catalog, money
// (refunds), or marketing — matches a real support agent's job.
const SUPPORT_PERMISSIONS = [
  PERMISSIONS.ORDER_VIEW,
  PERMISSIONS.ORDER_UPDATE_STATUS,
  PERMISSIONS.REFUND_VIEW,
  PERMISSIONS.CUSTOMER_VIEW,
];

// Admin: runs the store day to day — catalog, orders, refunds, coupons —
// but can't create or manage other staff accounts.
const ADMIN_PERMISSIONS = [
  ...SUPPORT_PERMISSIONS,
  PERMISSIONS.ORDER_CANCEL,
  PERMISSIONS.REFUND_DECIDE,
  PERMISSIONS.PRODUCT_MANAGE,
  PERMISSIONS.COUPON_MANAGE,
];

// Superadmin: everything, plus the ability to create/manage other staff.
const SUPERADMIN_PERMISSIONS = [...ADMIN_PERMISSIONS, PERMISSIONS.STAFF_MANAGE];

export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.CUSTOMER]: [],
  [ROLES.SUPPORT]: SUPPORT_PERMISSIONS,
  [ROLES.ADMIN]: ADMIN_PERMISSIONS,
  [ROLES.SUPERADMIN]: SUPERADMIN_PERMISSIONS,
});

export const roleHasPermission = (role, permission) =>
  Boolean(ROLE_PERMISSIONS[role]?.includes(permission));

export default { ROLES, STAFF_ROLES, PERMISSIONS, ROLE_PERMISSIONS, roleHasPermission };
