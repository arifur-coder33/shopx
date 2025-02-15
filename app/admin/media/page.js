import { getAllMedia } from "@/backend/serverActions/fileUploadAction";
import Imagecustom from "@/components/images/ImageCustom";
import FileUploader from "@/components/input/FileUploader";
import MediaSelector from "@/components/input/MediaSelector";
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
      <MediaSelector multipleSelect={true} inputName="mediaIds" />
    </div>
  );
}
