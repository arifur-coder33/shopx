"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { deleteSpecification } from "@/backend/serverActions/specificationActions";

export default function DeleteSpecificationButton({ id, disabled }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return <button type="button" disabled={disabled || busy} title={disabled ? "Used by a category, product or child specification" : "Delete unused specification"} className="rounded border px-3 py-1.5 text-red-600 disabled:opacity-40" onClick={async () => {
    if (!window.confirm("Delete this unused specification?")) return;
    setBusy(true);
    try {
      const result = await deleteSpecification(id);
      if (!result.success) toast.error(result.message);
      else { toast.success("Specification deleted."); router.refresh(); }
    } catch { toast.error("Unable to delete specification."); }
    finally { setBusy(false); }
  }}>Delete</button>;
}
