// import UserListTable from "@/app/admin/users/_components/UserListTable";
// import { GetUserList } from "@/backend/serverActions/authActions";

// export default async function UserListPage() {
//   const { data } = await GetUserList();
//   if (data?.length === 0) {
//     return "No user found!";
//   }

//   console.log(data);
//   return <UserListTable data={data} />;
// }

import { auth } from "@/auth";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import AdminListPage from "../_components/AdminListPage";
import { UserConfig } from "./config";
export default async function UserListPage() {
  const session = await auth();

  if (!hasUIPermission(session.user.permissions, "user", "view")) {
    return <div>Unauthorized</div>;
  }
  return <AdminListPage {...UserConfig} />;
}
