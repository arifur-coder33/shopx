import ProductListHeader from "./productListHeader";
import WishlistHydrationSync from "../wishlist/WishlistHydrationSync";

export default function ProductList({
  headerName,
  link,
  children,
  mobile = "2",
  tablet = "4",
  laptop = "5",
}) {
  return (
    <div>
      {headerName && <ProductListHeader link={link} headerName={headerName} />}
      <div
        className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5"
      >
        {children}
      </div>
      <WishlistHydrationSync />
    </div>
  );
}
