import { getNotice } from "@/backend/serverActions/noticeaction";

export default async function Notice() {
  const { data } = await getNotice();
  const currentDate = new Date();

  // Parse start and end dates
  const startDate = new Date(data?.start);
  const endDate = new Date(data?.end);

  // Check if the current date is within the validity range
  const isValid = currentDate >= startDate && currentDate <= endDate;

  if (!isValid) {
    // Render nothing if the notice is not valid
    return null;
  }

  return (
    <marquee className="pt-1" >{data?.notice}</marquee>
  );
}
