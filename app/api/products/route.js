export async function GET(request) {
  const data = await prisma.product.findMany();
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
