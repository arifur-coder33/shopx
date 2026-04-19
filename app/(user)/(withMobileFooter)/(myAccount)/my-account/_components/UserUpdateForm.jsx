"use client";
import { updateUserAction } from "@/backend/serverActions/authActions";
import DynamicForm from "@/components/common/DynamicForm";
export default function UserUpdateForm({ id, data }) {
  const fromFields = [
    {
      label: "Email",
      name: "email",
      type: "text",
      editable: false,
      colSpan: "full",
    },
    { label: "Name", name: "name", type: "text", colSpan: 6 },

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
    {
      label: "Date of Birth",
      name: "dob",
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
