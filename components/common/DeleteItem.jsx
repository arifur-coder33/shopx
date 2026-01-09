"use client";

import { toast } from "react-toastify";
import { confirmFromUser } from "../modal/confrim/confirm";

export default function DeleteItem({ deleteItem, id, children, className }) {
  const deleteHandler = async () => {
    try {
      const ok = await confirmFromUser({
        title: "Delete Confirmation",
        message: "Are you sure you want to delete this item?",
      });
      if (ok) {
        const data = await deleteItem(id);
        console.log(data);
        if (data.success) {
          toast.success(data?.data || "Deleted!");
        } else {
          toast.warning(data?.error || "Something went Wrong.");
        }
      }
      return;
    } catch (error) {
      toast.warning("Something went Wrong.");
    }
  };
  return (
    <span className="cursor-pointer" onClick={deleteHandler}>
      {children}
    </span>
  );
}
