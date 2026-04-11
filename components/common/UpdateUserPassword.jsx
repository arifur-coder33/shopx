import { updatePassword } from "@/backend/serverActions/authActions";
import DynamicForm from "@/components/common/DynamicForm";
export default function UpdateUserPassword({}) {
  const fromFields = [
    {
      label: "Old Password",
      name: "oldPassword",
      type: "password",
      editable: true,
      colSpan: "full",
    },
    {
      label: "New Password",
      name: "newPassword",
      type: "password",
      editable: true,
      colSpan: "full",
    },
    {
      label: "Confirm New Password",
      name: "confirmPassword",
      type: "password",
      colSpan: "full",
    },
  ];

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded-lg shadow-lg mt-2">
      <h1 className="card text-2xl text-center ">Update Password</h1>
      <DynamicForm
        fromFields={fromFields}
        actionType={"edit"}
        // createAction={}
        // data={data}
        updateAction={updatePassword}
      ></DynamicForm>
    </div>
  );
}
