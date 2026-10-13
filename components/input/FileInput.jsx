"use client";
import { ImagePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getAllMediaByIds } from "@/backend/serverActions/fileUploadAction";

// Assuming ImageCustom accepts className and applies it to the underlying img tag
// or has props for object-fit. We'll add object-cover styling.
import ImageCustom from "../images/ImageCustom";
import ModalButton from "../modal/ModalButton";
import MediaSelector from "./MediaSelector";
export default function FileInput({
  name,
  label,
  defaultValue,
  multipleSelect,
  colSpan = "col-span-full", // Default colSpan
  onImageSelect,
  recommendedSize,
  w = 96,
  h = 96,
}) {
  // Initialize state ensuring defaultValue is always treated as an array internally
  const [images, setImages] = useState(() => {
    if (!defaultValue) return [];
    return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
  });

  // Input value derived from current images state
  const [inputValue, setInputValue] = useState(
    images.map((img) => img.id).join(","),
  );

  // Update hidden input value whenever images change
  useEffect(() => {
    setInputValue(images.map((img) => img.id).join(","));
  }, [images]);

  const imageIds = images.map((image) => image?.id).filter(Boolean).join(",");
  useEffect(() => {
    if (!imageIds) return;
    let active = true;
    getAllMediaByIds(imageIds.split(",")).then(({ data = [] }) => {
      if (!active || !data.length) return;
      const byId = new Map(data.map((item) => [item.id, item]));
      setImages((current) => current.map((image) => ({ ...byId.get(image?.id), ...image })));
    }).catch(() => {});
    return () => { active = false; };
  }, [imageIds]);

  // Handle image selection from MediaSelector
  const onSelect = (selectedImages) => {
    if (onImageSelect) {
      onImageSelect(selectedImages); // Call the parent function if provided
    }

    if (multipleSelect) {
      // Prevent duplicates if needed, assuming selectedImages are unique from modal
      const newImages = [...images, ...selectedImages];
      // Example: Simple deduplication based on id
      const uniqueImages = Array.from(
        new Map(newImages.map((img) => [img.id, img])).values(),
      );
      setImages(uniqueImages);
    } else {
      // Replace current image if single select mode
      setImages(selectedImages.length > 0 ? [selectedImages[0]] : []);
    }
  };

  // Remove an image by id
  const removeImage = (idToRemove) => {
    const filteredImages = images.filter((image) => image.id !== idToRemove);
    setImages(filteredImages);
  };

  // Determine if the "Add" button should be visible
  const showAddButton = multipleSelect || images.length === 0;

  return (
    <div className={`${colSpan} flex flex-col space-y-2`}>
      {(label || recommendedSize) && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          <span>{label || "Image"}{recommendedSize ? <span className="ml-1 font-normal text-text-muted">({recommendedSize})</span> : null}</span>
        </label>
      )}

      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={inputValue} />

      <div
        className={`flex  flex-wrap gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50   `}
      >
        {/* Display selected images */}
        {images?.map((image) => (
          <div
            key={image?.id}
            className={`relative group w-[${w}px] h-[${h}px]  flex-shrink-0`}
          >
            <ImageCustom
              className="rounded-md object-cover shadow-sm" // Ensure image covers the area
              placeholder="blur" // Keep placeholder if ImageCustom supports it
              src={image?.name} // Assuming name is the URL or path
              w={w} // Provide appropriate dimensions for ImageCustom's optimization
              h={h}
              alt={image?.alt || `Selected image ${image?.id}`} // Add alt text
            />
            <span className="absolute inset-x-0 bottom-0 truncate rounded-b-md bg-slate-950/75 px-1 py-0.5 text-[10px] text-white" title={image?.displayName || image?.name}>
              {image?.displayName || image?.name}{image?.width && image?.height ? ` · ${image.width}×${image.height}` : ""}{image?.sizeBytes ? ` · ${(image.sizeBytes / (1024 * 1024)).toFixed(2)} MB` : ""}
            </span>
            <button
              type="button" // Prevent form submission
              onClick={() => removeImage(image?.id)}
              aria-label={`Remove image ${image?.id}`}
              className="absolute -top-2 -right-2 z-10 bg-red-600 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <X size={14} strokeWidth={3} />
            </button>
            {/* Optional: Add a subtle overlay on hover */}
            <div className="absolute inset-0  group-hover:bg-opacity-10 transition-colors duration-200 ease-in-out rounded-md"></div>
          </div>
        ))}
        {/* "Add Image" Button */}
        {showAddButton && (
          <ModalButton
            // Remove default button styling from ModalButton if necessary
            // Or pass classNames to style the trigger appropriately
            buttonName={
              // Using a div styled as a button/dropzone for the trigger
              <div
                className={`
                  w-[${w}px] h-[${h}px] flex flex-col items-center justify-center
                  border-2 border-dashed border-gray-300 rounded-lg
                  text-gray-500 bg-white cursor-pointer
                  hover:border-indigo-500 hover:text-indigo-600
                  transition-colors duration-200 ease-in-out
                  focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:border-transparent
                
                `}
                // Make it keyboard accessible if ModalButton doesn't handle it
                tabIndex={0}
                role="button"
                aria-label={multipleSelect ? "Add images" : "Add image"}
              >
                <ImagePlus
                  className={`      w-[${w}px] h-[${h}px]  mb-1`}
                  strokeWidth={1.5}
                />
                <span className="text-xs font-medium text-center">
                  {multipleSelect ? "Add Images" : "Add Image"}
                </span>
              </div>
            }
          >
            {/* Content of the modal */}
            <MediaSelector
              multipleSelect={multipleSelect}
              onSelect={onSelect}
              // Pass current selection to potentially disable them in the selector
              currentSelectionIds={images.map((img) => img.id)}
            />
          </ModalButton>
        )}
      </div>
      {/* Optional: Display a count */}
      {images.length > 0 && multipleSelect && (
        <p className="text-xs text-gray-500 mt-1">
          {images.length} image{images.length > 1 ? "s" : ""} selected.
        </p>
      )}
    </div>
  );
}
