import { getAllMedia } from "@/backend/serverActions/fileUploadAction";
import Imagecustom from "@/components/images/ImageCustom";
import FileInput from "@/components/input/FileInput";
import FileUploader from "@/components/input/FileUploader";
import ModalButton from "@/components/modal/ModalButton";
export default async function MediaPage() {
  const { data } = await getAllMedia();
  return (
    <div className="flex flex-wrap gap-2">
      {data?.length > 0 &&
        data.map((item) => (
          <Imagecustom
            key={item.id}
            src={item.name}
            h={100}
            w={100}
            alt={item?.name}
          />
        ))}
      <ModalButton buttonName={"Upload File"}>
        <FileUploader multiple={true} />
      </ModalButton>

      <FileInput multipleSelect={true} />
    </div>
  );
}
