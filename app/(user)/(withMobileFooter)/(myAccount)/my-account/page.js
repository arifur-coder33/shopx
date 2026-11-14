// app/profile/page.js

import { auth } from "@/auth"; // your auth function
import { fetchSingleData } from "@/backend/serverActions/fetchDataActon";
import prisma from "@/lib/prisma";
import Button from "@/components/button";
import SocialAccountLinkButton from "@/components/auth/SocialAccountLinkButton";
import LazyModalButton from "@/components/modal/LazyModalButton";
import Link from "next/link";
import { Suspense } from "react";
import { getSocialAuthAvailability } from "@/backend/services/socialAuthService";
import ContactVerification from "@/components/account/ContactVerification";
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
      emailVerifiedAt: true,
      phoneVerifiedAt: true,
      // dob: true, // date of birth
      image: true,
    },
  });

  const user = res?.data;
  const socialLogin = await getSocialAuthAvailability();
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
          {user.image && (
            <img src={user.image} alt="Profile photo" width={96} height={96}
              referrerPolicy="no-referrer"
              className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500" />
          )}
          <p className="mt-2 text-lg font-medium ">{user?.name}</p>
        </div>

        {/* Profile Fields */}
        <div className="space-y-4">
          {[
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
        <ContactVerification
          email={user.email}
          emailVerified={Boolean(user.emailVerifiedAt)}
          phone={user.phone}
          phoneVerified={Boolean(user.phoneVerifiedAt)}
        />
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
          {socialLogin.google && <SocialAccountLinkButton provider="google" connected={Boolean(googleAccount)} enabled />}
          {socialLogin.facebook && <SocialAccountLinkButton provider="facebook" connected={Boolean(facebookAccount)} enabled />}
          <p className="text-center text-xs text-text-muted">Connect once with your current email/password login. After that, Google will open this same account.</p>
        </div>
      </div>
    </div>
  );
}
