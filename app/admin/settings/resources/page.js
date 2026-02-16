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

import AdminListPage from "@/app/admin/_components/AdminListPage";
import { resourceConfig } from "@/app/admin/settings/resources/config";
export default function ResourcesListPage() {
  return <AdminListPage {...resourceConfig} />;
}
