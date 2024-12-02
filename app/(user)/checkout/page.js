import { getProductById } from "@/backend/serverActions/productActions";
import CheckOutDetails from "./_components/CheckOutDetails";

export default async function CheckOutPage(props) {
  const { p, from } = await props.searchParams;

  let data
  if (from==="directBuy") {
    data=await getProductById(p)
  }
  return (
    <div className="pt-4">
      <CheckOutDetails data={data?.data} from={from} />
    </div>
  );
}
