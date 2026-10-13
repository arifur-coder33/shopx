import { auth } from "@/auth";
import { getAllMedia } from "@/backend/serverActions/fileUploadAction";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import MediaLibrary from "./MediaLibrary";

export default async function MediaPage() {
  const session = await auth();
  const permissions = session?.user?.permissions;
  if (!hasUIPermission(permissions, "media", "view")) return <div>Unauthorized</div>;

  const { data = [] } = await getAllMedia();
  return <MediaLibrary initialMedia={data} canUpload={hasUIPermission(permissions, "media", "create")} canDelete={hasUIPermission(permissions, "media", "delete")} />;
}
