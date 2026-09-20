// Backward-compatible aliases for the old, unused pickup-store category module.
// The canonical category actions enforce trusted Store ownership.
export {
  createCategoryAction as createPickupStoreAction,
  deleteCategoryAction,
  getCategory,
  getCategoryById,
  updateCategoryAction,
} from "./catagoryActions";
