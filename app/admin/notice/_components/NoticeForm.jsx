"use client";

import { updateNotice } from "@/backend/serverActions/noticeaction";

import Button from "@/components/button";

import FloatingInput from "@/components/input/FloatingInput";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";

export default function NoticeForm({ data }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);



  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
   
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const response = await updateNotice(formData);

        if (response.success) {
          setSuccess("saved successfully");

          toast.success("Product saved successfully!");
        } else {
          setError(response.message || "Something went wrong");
        }
      } catch (error) {
        setError(error.message || "Something went wrong");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      {success && <p style={{ color: "green" }}>{success}</p>}
      {error && (
        <div className="w-full rounded-md bg-red-200 p-2 text-base text-red-600">
          {error}
        </div>
      )}
      <div className="md:grid md:grid-cols-6 gap-2">
        <FloatingInput
          defaultValue={data?.notice}
          label={"Notice"}
          name={"notice"}
          type={"text"}
          colSpan="full"
        />

<FloatingInput
  defaultValue={
    data?.start
      ? new Date(data.start).toISOString().slice(0, 16) // Format to 'YYYY-MM-DDTHH:mm'
      : ""
  }
  label={"Start date"}
  name={"start"}
  type={"datetime-local"}
  colSpan="3"
/>
<FloatingInput
  defaultValue={
    data?.end
      ? new Date(data.end).toISOString().slice(0, 16) // Format to 'YYYY-MM-DDTHH:mm'
      : ""
  }
  label={"End date"}
  name={"end"}
  type={"datetime-local"}
  colSpan="3"
/>

      
      


        <Button
          type={"submit"}
          disabled={isPending}
          className="w-full mt-2 py-2 col-span-full"
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
