import { getProductsOnScroll } from "@/backend/serverActions/productActions";

export async function GET(request) {
  // const data = await prisma.product.findMany();
  const getp=await getProductsOnScroll({page:1,limit:10})
  return new Response(JSON.stringify(getp.data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
