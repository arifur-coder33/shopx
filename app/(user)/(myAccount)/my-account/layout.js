// The metadata from this layout will be merged with the RootLayout's metadata
export const metadata = {
  title: process.env.NEXT_SHOP_NAME + " - My Account",
  description:
    "My Account - View and manage your account details, orders, and preferences.",
  // No need to preconnect again, but it doesn't hurt
};

export default function MyAccountLayout({ children }) {
  return (
    <>
      <main>{children}</main>
    </>
  );
}
