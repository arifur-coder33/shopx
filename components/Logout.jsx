"use server";
import { auth } from "@/auth";
import { logout } from "@/backend/serverActions/authActions";
import { LogOutIcon } from "lucide-react";

export default async function Logout() {
  const session = await auth();

  if (session) {
    return (
      <button onClick={logout}>
        <LogOutIcon />
      </button>
    );
  } else {
    return <></>;
  }
}
