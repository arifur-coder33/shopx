"use server";

import { storeSignOut } from "@/auth/store";

export async function signOutStoreAdmin() {
  await storeSignOut({ redirectTo: "/store-login" });
}
