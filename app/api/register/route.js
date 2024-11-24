import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const allUsers = await prisma.user.findMany();
  console.log(allUsers);
  return new Response(JSON.stringify(allUsers), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req) {
  try {
    const { name, email, phone, password } = await req.json();
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(request.body);
    if (!email || !password) {
      return new Response(
        JSON.stringify({ message: "Email and password are required" }),
        { status: 400 }
      );
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });
    return user;
  } catch (error) {
    // Handle errors (e.g., unique constraint violation)
    throw error;
  }
}
