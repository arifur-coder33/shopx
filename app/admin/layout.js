import AdminShell from "./AdminShell";
import { getSiteSetting } from "@/backend/serverActions/siteSettingAction";

export const dynamic = "force-dynamic";
export const metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }) {
  const { data: siteSetting } = await getSiteSetting();
  return <AdminShell siteSetting={siteSetting}>{children}</AdminShell>;
}
