import { hasUIPermission } from "./hasUIPermission.js";

export function filterMenuByPermission(menu, permissions) {
  const canAccess = (item) =>
    (item.actions || [item.action || "view"]).some((action) =>
      hasUIPermission(permissions, item.resource, action),
    );

  return menu
    .map((item) => {
      if (item.subMenu) {
        const filteredSubMenu = item.subMenu.filter(canAccess);

        if (filteredSubMenu.length === 0) return null;

        return {
          ...item,
          subMenu: filteredSubMenu,
        };
      }

      if (!canAccess(item)) {
        return null;
      }

      return item;
    })
    .filter(Boolean);
}
