// Example location: /lib/adminMenuItems.js

import {
  ClipboardList,
  ClipboardX,
  FolderTree,
  GalleryHorizontalEnd,
  Globe,
  Image,
  LayoutDashboard,
  List,
  Megaphone,
  Package,
  PackagePlus,
  Settings,
  ShoppingCart,
  Tags,
  Users,
} from "lucide-react";

export const adminMenuItems = [
  {
    name: "Dashboard",
    slug: "/",
    icon: LayoutDashboard,
    resource: "dashboard",
  },

  {
    name: "Orders",
    slug: "#",
    icon: ShoppingCart,
    subMenu: [
      {
        name: "Order List",
        slug: "orders",
        icon: ClipboardList,
        resource: "order",
      },
      {
        name: "Pending Orders",
        slug: "orders/pending",
        icon: ClipboardX,
        resource: "order",
      },
    ],
  },

  {
    name: "Products",
    slug: "#",
    icon: Package,
    subMenu: [
      {
        name: "Product List",
        slug: "products",
        icon: Package,
        resource: "product",
      },
      {
        name: "Add Product",
        slug: "products/add",
        icon: PackagePlus,
        resource: "product",
      },
    ],
  },

  {
    name: "Categories",
    slug: "#",
    icon: FolderTree,
    subMenu: [
      {
        name: "Category List",
        slug: "categories",
        icon: FolderTree,
        resource: "category",
      },
      {
        name: "Add Category",
        slug: "categories/add",
        icon: PackagePlus,
        resource: "category",
      },
    ],
  },

  {
    name: "Users",
    slug: "users",
    icon: Users,
    resource: "user",
  },

  {
    name: "Media",
    slug: "media",
    icon: Image,
    resource: "media",
  },

  {
    name: "Variation",
    slug: "variation",
    icon: Tags,
    resource: "variation",
  },
  {
    name: "Content",
    slug: "#",
    icon: GalleryHorizontalEnd,
    subMenu: [
      {
        name: "Banners",
        slug: "banners",
        icon: GalleryHorizontalEnd,
      },
      {
        name: "Notices",
        slug: "notices",
        icon: Megaphone,
      },
    ],
  },
  {
    name: "Site Settings",
    slug: "#",
    icon: Settings,
    subMenu: [
      {
        name: "General Settings",
        slug: "settings",
        icon: Settings,
      },
      {
        name: "SEO",
        slug: "settings/seo",
        icon: Globe,
      },
      {
        name: "Role",
        slug: "settings/role",
        icon: Users,
        resource: "role",
      },
      {
        name: "Resource",
        slug: "settings/resources",
        icon: List,
        resource: "resource",
      },
    ],
  },
];
