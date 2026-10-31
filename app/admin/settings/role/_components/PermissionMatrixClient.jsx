"use client";

import { saveRolePermissions } from "@/backend/serverActions/roleAction";
import { DEPARTMENTS } from "@/backend/config/resourceRegistry.mjs";
import { Fragment } from "react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "react-toastify";

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

      <div className="overflow-x-auto border rounded">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100">
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
                  <td className="border px-3 py-2 font-semibold" colSpan={actions.length + 1}>
                    {department}
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
