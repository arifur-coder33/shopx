// app/profile/page.js

import { auth } from "@/auth"; // your auth function
import { fetchSingleData } from "@/backend/serverActions/fetchDataActon";
import prisma from "@/lib/prisma";
import Button from "@/components/button";
import ImageCustomServer from "@/components/images/ImageCustomServer";
import SocialAccountLinkButton from "@/components/auth/SocialAccountLinkButton";
import LazyModalButton from "@/components/modal/LazyModalButton";
import Link from "next/link";
import { Suspense } from "react";
export default async function ProfilePage() {
  const session = await auth();
  const userId = session?.user?.id;

  const res = await fetchSingleData({
    model: "user",
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      gender: true,
      // dob: true, // date of birth
      // avatar: true, // optional avatar URL
    },
  });

  const user = res?.data;
  const [googleAccount, facebookAccount] = userId
    ? await Promise.all([
        prisma.account.findFirst({ where: { userId, provider: "google" }, select: { id: true } }),
        prisma.account.findFirst({ where: { userId, provider: "facebook" }, select: { id: true } }),
      ])
    : [null, null];

  if (!user) return <p>User not found.</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Profile</h1>

      <div className="p-6 rounded-2xl shadow-lg border border-gray-100 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <ImageCustomServer
            w={50}
            h={50}
            src={user?.avatar}
            alt="Avatar"
            className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500"
          />
          <p className="mt-2 text-lg font-medium ">{user?.name}</p>
        </div>

        {/* Profile Fields */}
        <div className="space-y-4">
          {[
            {
              label: "Email",
              field: "email",
              value: user?.email,
              editable: false,
            },
            { label: "Name", field: "name", value: user?.name, editable: true },
            {
              label: "Phone",
              field: "phone",
              value: user?.phone,
              editable: true,
            },
            {
              label: "Gender",
              field: "gender",
              value: user?.gender,
              editable: true,
            },
            {
              label: "Date of Birth",
              field: "dob",
              value: user?.dob,
              editable: true,
            },
          ].map((field) => (
            <div
              key={field.label}
              className="flex justify-between items-center p-4 rounded-lg"
            >
              <div>
                <p className="text-sm ">{field.label}:</p>

                <p className="font-medium t">{field.value || "-"}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-center">
          <Suspense>
            <Button>
              <LazyModalButton
                button={"Update Details"}
                componentKey={"UserUpdateForm"}
                itemId={userId}
                data={user}
              />
            </Button>
          </Suspense>
        </div>
        {/* Change Password */}
        <div className="mt-4 flex justify-center">
          <Link
            href="/my-account/updatePassword"
            className="text-indigo-600 hover:text-indigo-800"
          >
            Change Password
          </Link>
        </div>
        <div className="mt-4 flex flex-col items-center gap-2 border-t border-border pt-4">
          <SocialAccountLinkButton
            provider="google"
            connected={Boolean(googleAccount)}
            enabled={Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)}
          />
          <SocialAccountLinkButton provider="facebook" connected={Boolean(facebookAccount)} enabled={Boolean(process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET)} />
          <p className="text-center text-xs text-text-muted">Connect once with your current email/password login. After that, Google will open this same account.</p>
        </div>
      </div>
    </div>
  );
}
