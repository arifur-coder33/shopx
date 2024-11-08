import ProductListHeader from "./productListHeader";

export default function ProductList({
  headerName,
  children,
  mobile = "2",
  tablet = "4",
  laptop = "5",
}) {
  return (
    <div>
      {headerName && <ProductListHeader headerName={headerName} />}
      <div
        className={`w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3  `}
      >
        {children}
      </div>
    </div>
  );
}
