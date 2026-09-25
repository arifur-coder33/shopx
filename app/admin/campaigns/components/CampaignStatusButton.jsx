"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { setCampaignStatus } from "@/backend/serverActions/campaignAction";

export default function CampaignStatusButton({ id, status }) {
  const router = useRouter();
  const nextStatus = status === "PUBLISHED" ? "PAUSED" : "PUBLISHED";
  async function toggle() {
    const result = await setCampaignStatus(id, nextStatus);
    if (!result.success) { toast.error(result.message || "Could not update campaign status."); return; }
    toast.success(nextStatus === "PAUSED" ? "Campaign paused" : "Campaign activated");
    router.refresh();
  }
  return <button type="button" onClick={toggle} className="rounded-lg border px-3 py-1.5 text-sm">{status === "PUBLISHED" ? "Pause" : "Activate"}</button>;
}
