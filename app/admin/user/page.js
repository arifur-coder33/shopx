import { GetUserList } from "@/backend/serverActions/authActions"
import UserListTable from "@/app/admin/user/_components/UserListTable"

export default async function UserListPage(){
    const {data}=await GetUserList()
if (data?.length===0) {
    return "No user found!"
}

console.log(data)
return (
    <UserListTable data={data}/>
)
}