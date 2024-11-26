import { userregistration } from "@/backend/serverActions/authActions"
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
import bcrypt from "bcryptjs";
export async function GET(request) {
  const allUsers = await prisma.user.findMany();
  console.log(allUsers);
  return new Response(JSON.stringify(allUsers), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request) {

return userregistration(request)
}
// export async function POST(request) {
//   const formData = await request.formData()
//   const name = formData.get('name')
//   const email = formData.get('email')
//   return Response.json({ name, email })
// }