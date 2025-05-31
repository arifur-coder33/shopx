"use client";

import { toast } from "react-toastify";

export default function DeleteItem({ deleteItem, id, children, className }) {
  const deleteHandler = async () => {
    try {
      const confirmFromUser = confirm("Do you want to delete?");
      if (confirmFromUser) {
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
  return <span onClick={deleteHandler}>{children}</span>;
}
