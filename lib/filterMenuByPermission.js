import { hasUIPermission } from "./hasUIPermission.js";

export function filterMenuByPermission(menu, permissions) {
  return menu
    .map((item) => {
      if (item.subMenu) {
        const filteredSubMenu = item.subMenu.filter((sub) =>
          hasUIPermission(permissions, sub.resource, "view"),
        );

        if (filteredSubMenu.length === 0) return null;

        return {
          ...item,
          subMenu: filteredSubMenu,
        };
      }

      if (!hasUIPermission(permissions, item.resource, "view")) {
        return null;
      }

      return item;
    })
    .filter(Boolean);
}
