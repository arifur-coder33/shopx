import { auth } from "@/auth";
import ContactVerification from "@/components/account/ContactVerification";
import LazyModalButton from "@/components/modal/LazyModalButton";
import UpdateUserPassword from "@/components/common/UpdateUserPassword";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(value)
    : "—";

export default async function AdminProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      gender: true,
      emailVerifiedAt: true,
      phoneVerifiedAt: true,
      createdAt: true,
      role: { select: { name: true } },
    },
  });

  if (!user) return <div className="card p-5">User profile not found.</div>;

  const details = [
    ["Name", user.name],
    ["Gender", user.gender],
    ["Role", user.role?.name],
    ["Joined", formatDate(user.createdAt)],
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="mt-1 text-2xl font-bold text-text-primary">Your admin profile</h1>
        <p className="mt-1 text-sm text-text-secondary">View and update your account details.</p>
      </header>

      <section className="card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-text-primary">Account details</h2>
          <LazyModalButton
            componentKey="UserUpdateForm"
            itemId={user.id}
            data={user}
            button={<button type="button" className="button">Edit details</button>}
          />
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</dt>
              <dd className="mt-1 break-words text-sm font-medium text-text-primary">{value || "—"}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4">
          <ContactVerification
            email={user.email}
            emailVerified={Boolean(user.emailVerifiedAt)}
            phone={user.phone}
            phoneVerified={Boolean(user.phoneVerifiedAt)}
          />
        </div>
      </section>

      <section id="password" className="card rounded-2xl p-5 sm:p-6">
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Change password</h2>
        <UpdateUserPassword />
      </section>
    </div>
  );
}
