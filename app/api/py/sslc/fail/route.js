export async function POST(req) {
  const formData = await req.formData();
  const order_id = formData.get("value_a");
  return Response.redirect(
    `http://localhost:3000/payment/failed?order_id=${order_id}`,
  );
}
