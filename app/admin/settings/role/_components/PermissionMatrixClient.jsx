"use client";

import { saveRolePermissions } from "@/backend/serverActions/roleAction";
import { DEPARTMENTS } from "@/backend/config/resourceRegistry.mjs";
import { Fragment, useEffect, useRef } from "react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "react-toastify";

function BulkPermissionCheckbox({ checked, indeterminate, onChange, label }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
    <input ref={ref} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4" aria-label={label} />
    {label}
  </label>;
}

export default function PermissionMatrixClient({
  roleId,
  resources,
  actions,
  permissions,
}) {
  // 🔁 DB → UI format
  const initialState = useMemo(() => {
    const state = {};

    permissions.forEach((p) => {
      if (!state[p.resourceId]) state[p.resourceId] = {};
      state[p.resourceId][p.actionId] = p.allowed;
    });

    return state;
  }, [permissions]);

  const [matrix, setMatrix] = useState(initialState);
  const groupedResources = useMemo(() => {
    const groups = new Map();
    for (const resource of resources) {
      const department = resource.department || "Other";
      if (!groups.has(department)) groups.set(department, []);
      groups.get(department).push(resource);
    }
    return DEPARTMENTS
      .map((department) => [department, groups.get(department) || []])
      .filter(([, departmentResources]) => departmentResources.length > 0);
  }, [resources]);

  const allPermissionCount = resources.length * actions.length;
  const selectedPermissionCount = resources.reduce((total, resource) =>
    total + actions.filter((action) => Boolean(matrix?.[resource.id]?.[action.id])).length, 0);
  const allSelected = allPermissionCount > 0 && selectedPermissionCount === allPermissionCount;
  const someSelected = selectedPermissionCount > 0 && !allSelected;

  const setResourcesPermissions = (resourceIds, checked) => {
    setMatrix((previous) => {
      const next = { ...previous };
      for (const resourceId of resourceIds) {
        next[resourceId] = { ...next[resourceId] };
        for (const action of actions) next[resourceId][action.id] = checked;
      }
      return next;
    });
  };

  const toggleAll = (checked) => setResourcesPermissions(resources.map((resource) => resource.id), checked);

  const toggle = (resourceId, actionId) => {
    setMatrix((prev) => ({
      ...prev,
      [resourceId]: {
        ...prev[resourceId],
        [actionId]: !prev?.[resourceId]?.[actionId],
      },
    }));
  };
  const [isPending, startTransition] = useTransition();
  const handleSave = () => {
    startTransition(async () => {
      const res = await saveRolePermissions(roleId, matrix);

      if (res?.success) {
        toast.success("Permissions updated successfully ✅");
      }
    });
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Role Permissions</h1>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-surface-muted px-3 py-2">
        <BulkPermissionCheckbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} label={allSelected ? "সব permission untick করুন" : "সব permission tick করুন"} />
        <span className="text-xs text-text-muted">{selectedPermissionCount} / {allPermissionCount} selected</span>
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-20 bg-gray-100">
            <tr>
              <th className="border p-2 text-left">Resource</th>
              {actions.map((action) => (
                <th key={action.id} className="border p-2 text-center">
                  {action.key}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {groupedResources.map(([department, departmentResources]) => (
              <Fragment key={department}>
                <tr className="bg-slate-100">
                  <td className="border px-3 py-2" colSpan={actions.length + 1}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <strong>{department}</strong>
                      {(() => {
                        const ids = departmentResources.map((resource) => resource.id);
                        const total = ids.length * actions.length;
                        const selected = ids.reduce((count, id) => count + actions.filter((action) => Boolean(matrix?.[id]?.[action.id])).length, 0);
                        const checked = total > 0 && selected === total;
                        return <BulkPermissionCheckbox checked={checked} indeterminate={selected > 0 && !checked} onChange={(value) => setResourcesPermissions(ids, value)} label={checked ? "এই বিভাগের সব untick করুন" : "এই বিভাগের সব tick করুন"} />;
                      })()}
                    </div>
                  </td>
                </tr>
                {departmentResources.map((resource) => (
                  <tr key={resource.id}>
                    <td className="border p-2 font-medium">{resource.label || resource.key}</td>
                    {actions.map((action) => (
                      <td key={action.id} className="border p-2 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${department}: ${resource.key} ${action.key}`}
                          checked={!!matrix?.[resource.id]?.[action.id]}
                          onChange={() => toggle(resource.id, action.id)}
                          className="w-4 h-4"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleSave}
        className="px-4 py-2 bg-black text-white rounded"
      >
        {isPending ? "Saving..." : "Save Permissions"}
      </button>
    </div>
  );
}
