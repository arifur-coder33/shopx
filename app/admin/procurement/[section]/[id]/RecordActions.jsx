"use client";

import { deleteProcurementRecord } from "@/backend/serverActions/procurementDetailAction";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "react-toastify";

export default function RecordActions({ section, id, capabilities, compact = false }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const remove = () => {
    if (!capabilities.canDelete || !window.confirm("Delete this record? This action is allowed only while it has no dependent documents.")) return;
    startTransition(async () => {
      const result = await deleteProcurementRecord(section, id);
      if (!result.success) return toast.error(result.message);
      toast.success(result.message);
      router.push(`/admin/procurement/${section}`);
      router.refresh();
    });
  };
  const edit = () => compact ? router.push(`/admin/procurement/${section}/${id}#record-edit-form`) : document.getElementById("record-edit-form")?.scrollIntoView({ behavior: "smooth" });
  return <div className="flex flex-wrap items-center gap-2"><button type="button" disabled={!capabilities.canEdit} title={!capabilities.canEdit ? capabilities.reason : "Edit this record"} onClick={edit} className={`${compact ? "min-h-9 rounded-brand border border-border px-2 text-xs font-semibold" : "button"} disabled:cursor-not-allowed disabled:opacity-40`}><Pencil className="h-4 w-4" />{!compact && " Edit"}</button><button type="button" disabled={pending || !capabilities.canDelete} title={!capabilities.canDelete ? capabilities.reason : "Delete this record"} onClick={remove} className={`inline-flex items-center gap-2 rounded-brand border border-danger text-sm font-semibold text-danger hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-40 ${compact ? "min-h-9 px-2" : "min-h-11 px-4"}`}><Trash2 className="h-4 w-4" />{!compact && " Delete"}</button>{!compact && capabilities.reason && <span className="max-w-md text-xs text-text-muted">{capabilities.reason}</span>}</div>;
}
