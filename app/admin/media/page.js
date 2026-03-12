import { auth } from "@/auth";
import { getAllMedia } from "@/backend/serverActions/fileUploadAction";
import DeleteItem from "@/components/common/DeleteItem";
import DynamicForm from "@/components/common/DynamicForm";
import Imagecustom from "@/components/images/ImageCustom";
import FileInput from "@/components/input/FileInput";
import FileUploader from "@/components/input/FileUploader";
import ModalButton from "@/components/modal/ModalButton";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { UploadCloudIcon, X } from "lucide-react";
import { Suspense } from "react";
export default async function MediaPage() {
  const session = await auth();

  if (!hasUIPermission(session.user.permissions, "media", "view")) {
    return <div>Unauthorized</div>;
  }

  const { data } = await getAllMedia();
  return (
    <div>
      <ModalButton
        buttonName={
          <UploadCloudIcon
            className="hover:bg-slate-200 cursor-pointer border-dashed border-2 border-slate-300 m-4 rounded-md p-2"
            height={100}
            width={100}
          />
        }
      >
        <FileUploader multiple={true} />
      </ModalButton>

      <div className="flex flex-wrap gap-2">
        {data?.length > 0 &&
          data.map((item) => (
            <div key={item.id} className="relative ">
              <ModalButton
                buttonName={
                  <>
                    <Suspense fallback={<div>Loading...</div>}>
                      <Imagecustom
                        key={item.id}
                        src={item.name}
                        h={100}
                        w={100}
                        alt={item?.name}
                        objectFit="cover"
                        imageClassName="cursor-pointer"
                      />
                    </Suspense>
                  </>
                }
              >
                <DynamicForm actionType={"edit"}>
                  <FileInput w={800} h={800} defaultValue={item} />
                </DynamicForm>
              </ModalButton>
              <div className="absolute cursor-pointer top-0 right-0 text-red-500 bg-white rounded-full p-1 hover:bg-red-700 hover:text-white">
                <DeleteItem id={item?.id}>
                  {" "}
                  <X size={14} strokeWidth={3} />{" "}
                </DeleteItem>{" "}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
