import { getCategoryTree } from "@/backend/serverActions/catagoryActions";
import Cart from "@/components/Cart";
import { Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import Link from "next/link";
import CategoryDrawer from "../common/Category/CategoryDrawer";
import WishlistNavLink from "../wishlist/WishlistNavLink";
export default async function MobileFooter() {
  const ccategoryData = await getCategoryTree();
  return (
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="w-full max-w-md px-2 pb-2">
        <div className="relative rounded-2xl border border-border bg-surface/95 shadow-2xl backdrop-blur">
          {/* Center Button */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2">
            <Link href="/">
              <div className="flex h-14 w-14 scale-110 items-center justify-center rounded-full bg-primary shadow-lg">
                <Home className="text-white" size={26} />
              </div>
            </Link>
          </div>

          {/* Menu */}
          <div className="flex min-h-16 items-center justify-between px-5 py-2 text-text-muted">
            <CategoryDrawer initialData={ccategoryData}>
              <LayoutGrid />
            </CategoryDrawer>
            {/* <Link href="/category">
              <LayoutGrid className="text-gray-600 dark:text-gray-300" />
            </Link> */}

            <WishlistNavLink />

            <div className="w-28" />
            <Cart>
              <ShoppingCart />
            </Cart>
            {/* <Link href="/cart">
              <ShoppingCart className="text-gray-600 dark:text-gray-300" />
            </Link> */}

            <Link prefetch={true} href="/my-account">
              <User />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
