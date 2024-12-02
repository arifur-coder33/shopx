export const dynamic = "force-static";
import CheckOutDetails from "./_components/CheckOutDetails";

import {
  getProductBySlug,
  getProducts,
} from "@/backend/serverActions/productActions";

export async function generateStaticParams() {
  const data = await getProducts();

  // Render the first 10 posts at build time
  return data?.data.map((product) => ({
    slug: product.slug,
    from: "directBuy",
  }));
}

export default async function CheckOutPage(props) {
  const { product, from } = await props.searchParams;
  console.log(product);
  console.log(from);

  let data;
  if (from === "directBuy") {
    data = await getProductBySlug(product);
  }
  return (
    <div className="pt-4">
      <CheckOutDetails data={data?.data} slug={product} from={from} />
    </div>
  );
}
