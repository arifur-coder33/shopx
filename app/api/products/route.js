import { auth } from "@/auth";
import { getProductsOnScroll } from "@/backend/serverActions/productActions";
export async function GET(request) {
  // const data = await prisma.product.findMany();
  const session = await auth();
  console.log(session);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }
  const getp = await getProductsOnScroll({ page: 1, limit: 10 });
  return new Response(JSON.stringify(getp.data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
