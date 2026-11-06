import { userregistration } from "@/backend/serverActions/authActions";

export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(
    { message: "Method not allowed" },
    { status: 405, headers: { Allow: "POST" } },
  );
}

export async function POST(request) {
  return userregistration(request);
}
// export async function POST(request) {
//   const formData = await request.formData()
//   const name = formData.get('name')
//   const email = formData.get('email')
//   return Response.json({ name, email })
// }
