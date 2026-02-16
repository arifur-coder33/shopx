import { getRolePermissionData } from "@/backend/serverActions/roleAction";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { useEffect, useState } from "react";
import PermissionMatrixClient from "./PermissionMatrixClient";

export default function RolePermissionPage({ id }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getData = async () => {
      try {
        const { resources, actions, permissions } =
          await getRolePermissionData(id);

        setData({ resources, actions, permissions });
      } catch (error) {
        setError("Failed to load product data.");
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    getData();
  }, [id]);

  if (loading)
    return (
      <div>
        <LoadingSpinner message="Just a second.. " />
      </div>
    );
  if (error) return <div>{error}</div>;
  if (!data) return <div>No Data Found</div>;
  return (
    <PermissionMatrixClient
      roleId={id}
      resources={data.resources}
      actions={data.actions}
      permissions={data.permissions}
    />
  );
}
