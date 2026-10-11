"use client";
import { updateUserAction } from "@/backend/serverActions/authActions";
import DynamicForm from "@/components/common/DynamicForm";
export default function UserUpdateForm({ data }) {
  const fromFields = [
    { label: "Name", name: "name", type: "text", colSpan: "full", editable: true },

    {
      label: "Phone",
      name: "phone",
      type: "text",
      colSpan: "full",
      editable: true,
    },
    {
      label: "Gender",
      name: "gender",
      type: "text",
      editable: true,
      colSpan: "full",
    },
  ];

  return (
    <div className="min-w-lg">
      <DynamicForm
        fromFields={fromFields}
        actionType={"edit"}
        // createAction={}
        data={data}
        updateAction={updateUserAction}
      ></DynamicForm>
    </div>
  );
}
