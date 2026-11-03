/**
 * Canonical admin permission resources. Add new resources here and run the
 * Prisma seed (or open a role permission matrix) to materialize their keys.
 */
export const DEPARTMENTS = Object.freeze([
  "Administration",
  "Catalog",
  "Sales",
  "Marketing",
  "Inventory",
  "Procurement",
  "Finance",
  "Content",
  "Customer Support",
  "AI",
]);

export const RESOURCE_REGISTRY = Object.freeze([
  // Administration
  { key: "dashboard", label: "Dashboard", department: "Administration" },
  { key: "user", label: "Users", department: "Administration" },
  { key: "role", label: "Roles", department: "Administration" },
  { key: "resource", label: "Resource registry", department: "Administration" },
  { key: "rolePermission", label: "Role permissions", department: "Administration" },
  { key: "siteSetting", label: "Site settings", department: "Administration" },
  { key: "seoSettings", label: "SEO settings", department: "Administration" },
  { key: "provider", label: "Providers", department: "Administration" },
  // Catalog
  { key: "category", label: "Categories", department: "Catalog" },
  { key: "product", label: "Products", department: "Catalog" },
  { key: "variation", label: "Variations", department: "Catalog" },
  { key: "specification", label: "Specifications", department: "Catalog" },
  { key: "media", label: "Media", department: "Catalog" },
  // Sales
  { key: "order", label: "Orders", department: "Sales" },
  { key: "pos", label: "Point of sale", department: "Sales" },
  // Marketing
  { key: "campaign", label: "Campaigns", department: "Marketing" },
  { key: "socialTracking", label: "Social tracking", department: "Marketing" },
  { key: "sellReport", label: "Sales reports", department: "Marketing" },
  // Inventory
  { key: "inventory", label: "Inventory", department: "Inventory" },
  { key: "warehouse", label: "Warehouses", department: "Inventory" },
  { key: "delivery", label: "Deliveries", department: "Inventory" },
  // Procurement
  { key: "supplier", label: "Suppliers", department: "Procurement" },
  { key: "purchase", label: "Purchases", department: "Procurement" },
  { key: "goodsReceipt", label: "Goods receipts", department: "Procurement" },
  // Finance
  { key: "supplierPayment", label: "Supplier payments", department: "Finance" },
  { key: "expense", label: "Expenses", department: "Finance" },
  { key: "accounting", label: "Accounting", department: "Finance" },
  // Content
  { key: "contentPage", label: "Content pages", department: "Content" },
  // Customer Support
  { key: "chatInbox", label: "Chat Inbox", department: "Customer Support" },
  { key: "chatComments", label: "Page Comments", department: "Customer Support" },
  { key: "chatSettings", label: "Chat Settings", department: "Customer Support" },
  // AI
  { key: "aiSettings", label: "AI Settings", department: "AI" },
  { key: "aiTeach", label: "AI Teach", department: "AI" },
]);

export const RESOURCE_KEYS = Object.freeze(RESOURCE_REGISTRY.map(({ key }) => key));
export const ACTION_KEYS = Object.freeze(["create", "view", "update", "delete"]);
