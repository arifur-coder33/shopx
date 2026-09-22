import prisma from "@/lib/prisma";
import { requirePlatformPage } from "@/backend/services/platformConsole.server";
import { createPlatformMemberAction, setPlatformMemberStatusAction } from "@/backend/serverActions/platformConsoleActions";
import { DateValue, Empty, Feedback, Field, inputClass, buttonClass, Pager, Panel, Status, TableWrap, Td, Th } from "../../_components/PlatformUI";
import SubmitButton from "../../_components/SubmitButton";

export const metadata = { title: "Platform members" };

export default async function PlatformMembersPage({ searchParams }) {
  await requirePlatformPage("PLATFORM", "MANAGE");
  const params = await searchParams;
  const page = Math.max(1, Math.min(10000, Number.parseInt(params?.page, 10) || 1));
  const [members, roles] = await Promise.all([
    prisma.platformMember.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * 20, take: 21,
      select: { id: true, name: true, email: true, status: true, createdAt: true, role: { select: { name: true, code: true } } } }),
    prisma.platformRole.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
  ]);
  return <><div><p className="text-sm font-semibold text-indigo-700">Restricted administration</p><h1 className="text-3xl font-bold">Platform members</h1><p className="mt-1 text-sm text-slate-600">Only Platform SUPER_ADMIN can administer identities here.</p></div><Feedback searchParams={params} />
    <Panel title="Members">{!members.length ? <Empty>No PlatformMembers found.</Empty> : <><TableWrap><thead><tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Status</Th><Th>Created</Th><Th>Action</Th></tr></thead><tbody>{members.slice(0, 20).map((member) => <tr key={member.id}><Td>{member.name}</Td><Td>{member.email}</Td><Td>{member.role.name}</Td><Td><Status value={member.status} /></Td><Td><DateValue value={member.createdAt} /></Td><Td><details><summary className="cursor-pointer text-indigo-700">{member.status === "ACTIVE" ? "Deactivate" : "Activate"}</summary><form action={setPlatformMemberStatusAction} className="mt-2 space-y-2"><input type="hidden" name="memberId" value={member.id} /><input type="hidden" name="status" value={member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"} /><p className="text-xs">Confirm status change for {member.name}.</p><button className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Confirm</button></form></details></Td></tr>)}</tbody></TableWrap><Pager path="/platform/members" page={page} hasMore={members.length > 20} /></>}</Panel>
    <Panel title="Add PlatformMember"><form action={createPlatformMemberAction} className="grid gap-4 sm:grid-cols-2"><Field label="Name"><input required name="name" minLength={2} className={inputClass} /></Field><Field label="Email"><input required type="email" name="email" className={inputClass} /></Field><Field label="Role"><select required name="roleId" className={inputClass}><option value="">Select role</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></Field><Field label="Initial password"><input required type="password" name="password" minLength={10} autoComplete="new-password" className={inputClass} /></Field><div className="sm:col-span-2"><SubmitButton className={buttonClass}>Create member</SubmitButton></div></form></Panel>
  </>;
}
