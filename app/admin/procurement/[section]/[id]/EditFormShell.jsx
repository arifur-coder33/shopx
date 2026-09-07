"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "react-toastify";

export default function EditFormShell({ action, section, className, children }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const submit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await action(formData);
      if (!result?.success) return toast.error(result?.message || "Update failed.");
      toast.success(result.message || "Record updated successfully.");
      router.push(`/admin/procurement/${section}`);
      router.refresh();
    });
  };
  return <form id="record-edit-form" onSubmit={submit} className={className} aria-busy={pending}>{children}</form>;
}
