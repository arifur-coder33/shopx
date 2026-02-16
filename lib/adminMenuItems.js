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
  },
  {
    name: "Orders",
    slug: "#", // A '#' slug indicates it's a dropdown toggle, not a link
    icon: ShoppingCart,
    subMenu: [
      {
        name: "Order List",
        slug: "orders",
        icon: ClipboardList,
      },
      {
        name: "Pending Orders",
        slug: "orders/pending",
        icon: ClipboardX,
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
      },
      {
        name: "Add Product",
        slug: "products/add",
        icon: PackagePlus,
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
      },
      {
        name: "Add Category",
        slug: "categories/add",
        icon: PackagePlus, // You might want a different icon
      },
    ],
  },
  {
    name: "Variation",
    slug: "variation",
    icon: Tags,
  },
  {
    name: "Users",
    slug: "users",
    icon: Users,
  },
  {
    name: "Media",
    slug: "media",
    icon: Image,
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
      },
      {
        name: "Resource",
        slug: "settings/resources",
        icon: List,
      },
    ],
  },
];
