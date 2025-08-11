import UserListTable from "@/app/admin/users/_components/UserListTable";
import { GetUserList } from "@/backend/serverActions/authActions";

export default async function UserListPage() {
  const { data } = await GetUserList();
  if (data?.length === 0) {
    return "No user found!";
  }

  console.log(data);
  return <UserListTable data={data} />;
}
