import MobileFooter from "@/components/footer/MobileFooter";

export default async function UserLayout({ children }) {
  return (
    <>
      <main>{children}</main>

      <MobileFooter />
    </>
  );
}
