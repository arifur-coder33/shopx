import { auth } from "@/auth";
import { DEPARTMENTS, RESOURCE_REGISTRY, ACTION_KEYS } from "@/backend/config/resourceRegistry.mjs";
import { hasUIPermission } from "@/lib/hasUIPermission.js";

export default async function ResourcesPage() {
  const session = await auth();
  if (!hasUIPermission(session?.user?.permissions, "resource", "view")) {
    return <div className="card p-5">Unauthorized</div>;
  }

  const departmentResources = RESOURCE_REGISTRY.reduce((groups, resource) => {
    const items = groups.get(resource.department) || [];
    items.push(resource);
    groups.set(resource.department, items);
    return groups;
  }, new Map());
  const departments = DEPARTMENTS
    .filter((department) => departmentResources.has(department))
    .map((department) => [department, departmentResources.get(department)]);

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4">
      <header>
        <h1 className="text-2xl font-bold text-text">Resource registry</h1>
        <p className="mt-1 text-sm text-text-muted">
          Resources are defined in code and grouped by department. Role access is managed from each role’s permission matrix.
        </p>
      </header>

      {departments.map(([department, resources]) => (
        <section className="overflow-hidden rounded-xl border border-border bg-surface" key={department}>
          <h2 className="border-b border-border bg-background px-4 py-3 font-semibold text-text">{department}</h2>
          <div className="divide-y divide-border">
            {resources.map((resource) => (
              <div className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center" key={resource.key}>
                <div>
                  <div className="font-medium text-text">{resource.label}</div>
                  <code className="text-xs text-text-muted">{resource.key}</code>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ACTION_KEYS.map((action) => (
                    <span className="rounded-full bg-background px-2.5 py-1 text-xs text-text-muted" key={action}>{action}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <p className="rounded-lg border border-border bg-background p-3 text-sm text-text-muted">
        To add or rename a resource, update the code registry and deploy. The database keeps role grants and the resource keys needed to link those grants.
      </p>
    </main>
  );
}
