"use client";
import { getAllMedia } from "@/backend/serverActions/fileUploadAction";
import Button from "@/components/button";
import Imagecustom from "@/components/images/ImageCustom";
import ModalButton from "@/components/modal/ModalButton";
import { useEffect, useState } from "react";

export default function MediaSelector({
  multipleSelect = false,
  inputName = "selectedMedia",
  onSelect,
}) {
  const [media, setMedia] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState([]);

  useEffect(() => {
    async function fetchMedia() {
      const { data } = await getAllMedia();
      setMedia(data || []);
    }
    fetchMedia();
  }, []);

  const handleSelect = (item) => {
    if (multipleSelect) {
      setSelectedMedia((prev) =>
        prev.find((m) => m.id === item.id)
          ? prev.filter((m) => m.id !== item.id)
          : [...prev, item]
      );
    } else {
      setSelectedMedia([item]);
    }
  };

  const handleConfirm = () => {
    const selectedIds = selectedMedia.map((m) => m.id).join(",");
    // onSelect(selectedIds);
    document.getElementById(inputName).value = selectedIds; // Update hidden input value
  };

  return (
    <div>
      {/* Hidden Input Field for Form Submission */}
      <input
        type="hidden"
        id={inputName}
        name={inputName}
        value={selectedMedia.map((m) => m.id).join(",")}
      />

      <ModalButton buttonName={"Select Media"}>
        <div className="p-4">
          <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto">
            {media.map((item) => (
              <div
                key={item.id}
                className={`border p-1 cursor-pointer relative ${
                  selectedMedia.some((m) => m.id === item.id)
                    ? "border-blue-500"
                    : "border-gray-300"
                }`}
                onClick={() => handleSelect(item)}
              >
                <Imagecustom src={item.name} h={100} w={100} alt={item.name} />
                <input
                  type="checkbox"
                  defaultChecked={selectedMedia.find((m) => m.id === item.id)}
                  className="absolute top-1 left-1 w-4 h-4"
                />
              </div>
            ))}
          </div>
          <Button onClick={handleConfirm} className="mt-4 w-full">
            Confirm Selection
          </Button>
        </div>
      </ModalButton>
    </div>
  );
}
