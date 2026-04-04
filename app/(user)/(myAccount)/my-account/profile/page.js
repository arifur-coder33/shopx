// app/profile/page.js
import { auth } from "@/auth"; // your auth function
import { fetchSingleData } from "@/backend/serverActions/fetchDataActon";
import Button from "@/components/button";
import ImageCustomServer from "@/components/images/ImageCustomServer";

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
      // gender: true,
      // dob: true, // date of birth
      // avatar: true, // optional avatar URL
    },
  });

  const user = res?.data;

  if (!user) return <p>User not found.</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Profile</h1>

      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <ImageCustomServer
            w={50}
            h={50}
            src={user?.avatar}
            alt="Avatar"
            className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500"
          />
          <p className="mt-2 text-lg font-medium text-gray-800">{user?.name}</p>
        </div>

        {/* Profile Fields */}
        <div className="space-y-4">
          {[
            { label: "Email", value: user?.email },
            { label: "Phone", value: user?.phone },
            { label: "Gender", value: user?.gender },
            { label: "Date of Birth", value: user?.dob },
          ].map((field) => (
            <div
              key={field.label}
              className="flex justify-between items-center bg-gray-50 p-4 rounded-lg"
            >
              <div>
                <p className="text-sm text-gray-500">{field.label}</p>
                <p className="font-medium text-gray-900">
                  {field.value || "-"}
                </p>
              </div>
              <button className="text-indigo-600 hover:underline text-sm font-medium">
                Change
              </button>
            </div>
          ))}
        </div>

        {/* Change Password */}
        <div className="mt-4 flex justify-center">
          <Button>Change Password</Button>
        </div>
      </div>
    </div>
  );
}
