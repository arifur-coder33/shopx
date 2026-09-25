"use client";

import { deleteCampaign } from "@/backend/serverActions/campaignAction";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

export default function CampaignDeleteButton({ id, disabled = false }) {
  const router = useRouter();
  async function remove() {
    if (disabled || !window.confirm("Delete this campaign?")) return;
    const result = await deleteCampaign(id);
    if (result.success) { toast.success("Campaign deleted"); router.refresh(); } else toast.error(result.message);
  }
  return <button type="button" disabled={disabled} onClick={remove} title={disabled ? "This campaign has already been used by an order." : undefined} className="rounded border border-red-300 px-3 py-1 text-red-600 disabled:cursor-not-allowed disabled:opacity-40">Delete</button>;
}
