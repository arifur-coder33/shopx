"use client";
import { getAllMedia } from "@/backend/serverActions/fileUploadAction";
import Button from "@/components/button";
import Imagecustom from "@/components/images/ImageCustom";
import FileUploader from "@/components/input/FileUploader";
import { useModalContext } from "@/context/ModalContext";
import { UploadCloudIcon } from "lucide-react";
import { useEffect, useState } from "react";
import ModalButton from "../modal/ModalButton";
export default function MediaSelector({
  multipleSelect = false,
  inputName = "selectedMedia",
  onSelect,
}) {
  const [media, setMedia] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const { closeModal, isOpen } = useModalContext();
  const [newUpload, setNewUpload] = useState();
  // Fetch media when the modal opens
  useEffect(() => {
    async function fetchMedia() {
      const { data } = await getAllMedia();
      const newData = data.map((item) => ({ ...item, isSelected: false }));
      setMedia(newData || []);
    }
    fetchMedia(); // Fetch media only when the modal is open
  }, [newUpload]);
  console.log(media);
  // Handle selecting/deselecting media
  const handleSelect = (item) => {
    // Update the media state to toggle isSelected
    setMedia((prevMedia) =>
      prevMedia.map((m) =>
        m.id === item.id
          ? { ...m, isSelected: !m.isSelected } // Create a new object with updated isSelected
          : m
      )
    );

    // Update the selectedMedia state
    setSelectedMedia((prev) => {
      const isAlreadySelected = prev.some((m) => m.id === item.id);
      if (isAlreadySelected) {
        // Remove the item if it's already selected
        return prev.filter((m) => m.id !== item.id);
      } else {
        // Add the item if it's not selected
        return multipleSelect ? [...prev, item] : [item];
      }
    });
  };

  // Handle confirming the selection
  const handleConfirm = () => {
    const selectedIds = selectedMedia.map((m) => m.id).join(",");
    console.log(selectedIds);
    if (onSelect) onSelect(selectedMedia); // Pass selected IDs to the parent
    document.getElementById(inputName).value = selectedIds; // Update hidden input
    closeModal(); // Close the modal
  };

  return (
    <div>
      {/* Hidden Input Field for Form Submission */}
      <ModalButton
        buttonName={
          <div className="flex flex-col items-center hover:shadow-xl bg-gray-200 w-fit rounded-md p-1">
            <UploadCloudIcon /> <span>Upload New</span>
          </div>
        }
      >
        <FileUploader onUpload={setNewUpload} multiple={true} />
      </ModalButton>
      <input
        type="hidden"
        id={inputName}
        name={"inputName"}
        value={selectedMedia.map((m) => m.id).join(",")}
      />
      <div className="p-4">
        <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto">
          {media.map((item) => {
            const isSelected = selectedMedia.some((m) => m.id === item.id);
            return (
              <div
                key={item.id}
                className={`border p-1 cursor-pointer relative transition-all ${
                  isSelected ? "border-blue-500" : "border-gray-300"
                }`}
                onClick={() => handleSelect(item)}
              >
                <Imagecustom
                  src={item.name} // Use item.url instead of item.name
                  h={100}
                  w={100}
                  alt={item.name}
                />
                <input
                  type="checkbox"
                  checked={isSelected} // Use the isSelected state
                  className="absolute top-1 left-1 w-4 h-4"
                  readOnly
                />
              </div>
            );
          })}
        </div>
        <Button onClick={handleConfirm} className="mt-4 w-full">
          Confirm Selection
        </Button>
      </div>
      {/* <ModalButton buttonName={"Select Media"}>
        <div className="p-4">
          <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto">
            {media.map((item) => {
              const isSelected = selectedMedia.some((m) => m.id === item.id);
              return (
                <div
                  key={item.id}
                  className={`border p-1 cursor-pointer relative transition-all ${
                    isSelected ? "border-blue-500" : "border-gray-300"
                  }`}
                  onClick={() => handleSelect(item)}
                >
                  {isSelected ? "Selected" : "Not Selected"}
                  <Imagecustom
                    src={item.name} // Use item.url instead of item.name
                    h={100}
                    w={100}
                    alt={item.name}
                  />
                  <input
                    type="checkbox"
                    checked={isSelected} // Use the isSelected state
                    className="absolute top-1 left-1 w-4 h-4"
                    readOnly
                  />
                </div>
              );
            })}
          </div>
          <Button onClick={handleConfirm} className="mt-4 w-full">
            Confirm Selection
          </Button>
        </div>
      </ModalButton> */}
    </div>
  );
}
