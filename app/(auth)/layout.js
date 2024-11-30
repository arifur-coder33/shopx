import NavBar from "@/components/NavBar";

export default function AuthLayout({ children }) {
  return (
    <>
      <NavBar hideCart={true} />
      <div className="">{children}</div>
    </>
  );
}
