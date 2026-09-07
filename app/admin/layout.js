import AdminShell from "./AdminShell";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
