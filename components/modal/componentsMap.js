export const componentsMap = {
  SpecificationForm: () => import("@/app/admin/specifications/components/SpecificationForm"),
  CategoryForm: () => import("@/app/admin/categories/components/CategoryForm"),
  VariationForm: () => import("@/app/admin/variation/components/VariationForm"),
  ProductForm: () => import("@/app/admin/products/_components/ProductForm"),
  ProductQuickView: () =>
    import("@/app/(user)/product/_components/ProductQuickView"),
  OrderQuickView: () => import("@/app/admin/orders/_components/OrderView"),
  PickupStoreForm: () =>
    import("@/app/admin/settings/pickup-point/_components/PickupStoreForm"),
  ResourseRoleView: () =>
    import("@/app/admin/settings/role/_components/ResourseRole"),
  ResourseForm: () =>
    import("@/app/admin/settings/resources/_component/RecourceForm"),
  UserUpdateForm: () =>
    import("@/app/(user)/(withMobileFooter)/(myAccount)/my-account/_components/UserUpdateForm"),
  SupplierForm: () => import("@/app/admin/suppliers/Components/SupplierForm"),
  CampaignForm: () => import("@/app/admin/campaigns/components/CampaignForm"),
};
