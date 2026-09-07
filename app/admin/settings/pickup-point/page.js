import { getPickupPointPageData } from "@/backend/serverActions/pickupPointAction";
import PickupPointManager from "./_components/PickupPointManager";

export const dynamic = "force-dynamic";

export default async function PickupPointPage({ searchParams }) {
  const filters = (await searchParams) || {};
  return <PickupPointManager result={await getPickupPointPageData(filters)} />;
}
