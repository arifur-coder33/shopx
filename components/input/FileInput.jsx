// "use client";
// import { ImagePlus, X } from "lucide-react";
// import { useEffect, useState } from "react";

// import Imagecustom from "../images/ImageCustom";
// import ModalButton from "../modal/ModalButton";
// import MediaSelector from "./MediaSelector";

// export default function FileInput({
//   name,
//   label,
//   defaultValue,
//   multipleSelect,
//   colSpan,
// }) {
//   const [images, setImages] = useState(
//     multipleSelect ? defaultValue || [] : defaultValue ? [defaultValue] : []
//   );
//   const [inputValue, setInputValue] = useState("");

//   const onSelect = (selectedImages) => {
//     setImages(selectedImages);
//     setInputValue(selectedImages.map((img) => img.id).join(","));
//   };
//   useEffect(() => {
//     setInputValue(
//       images?.length > 0 ? images.map((img) => img.id).join(",") : []
//     );
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);
//   const removeImage = (id) => {
//     const filteredImages = images.filter((image) => image.id !== id);
//     setImages(filteredImages);
//     setInputValue(filteredImages.map((img) => img.id).join(","));
//   };

//   return (
//     <div className={`col-span-full ${colSpan} flex flex-col gap-2`}>
//       <div className="grid grid-cols-6  md:grid-cols-12 items-center  gap-4">
//         <div className="flex flex-col items-center flex-shrink-0 col-span-2 ">
//           {label && <label className="text-sm text-gray-600">{label}</label>}

//           <input hidden name={name} value={inputValue} type="text" readOnly />
//           {(images?.length > 0 && multipleSelect) ||
//             (images?.length === 0 && (
//               <ModalButton
//                 buttonName={
//                   <label className="cursor-pointer text-center flex flex-col items-center rounded-md border-2">
//                     <ImagePlus className="w-16 h-16 text-gray-500" />
//                   </label>
//                 }
//               >
//                 <MediaSelector
//                   multipleSelect={multipleSelect}
//                   onSelect={onSelect}
//                 />
//               </ModalButton>
//             ))}
//         </div>

//         {images?.length > 0 &&
//           images?.map((image) => (
//             <div key={image?.id} className="relative col-span-1 ">
//               <Imagecustom
//                 className="rounded-md"
//                 placeholder="blur"
//                 src={image?.name}
//                 w={200}
//                 h={200}
//                 alt={image?.name}
//               />
//               <button
//                 onClick={() => removeImage(image?.id)}
//                 className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-700"
//               >
//                 <X size={16} />
//               </button>
//             </div>
//           ))}
//       </div>
//     </div>
//   );
// }
"use client";
import { ImagePlus, X } from "lucide-react";
import { useEffect, useState } from "react";

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
    images.map((img) => img.id).join(",")
  );

  // Update hidden input value whenever images change
  useEffect(() => {
    setInputValue(images.map((img) => img.id).join(","));
  }, [images]);

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
        new Map(newImages.map((img) => [img.id, img])).values()
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
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}

      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={inputValue} />

      <div className="flex flex-wrap gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50 min-h-[100px]">
        {/* Display selected images */}
        {images.map((image) => (
          <div
            key={image?.id}
            className={`relative group w-[${w}px] h-[${h}px]  flex-shrink-0`} // Fixed size for previews
          >
            <ImageCustom
              className="rounded-md object-cover w-full h-full shadow-sm" // Ensure image covers the area
              placeholder="blur" // Keep placeholder if ImageCustom supports it
              src={image?.name} // Assuming name is the URL or path
              w={w} // Provide appropriate dimensions for ImageCustom's optimization
              h={h}
              alt={image?.alt || `Selected image ${image?.id}`} // Add alt text
            />
            <button
              type="button" // Prevent form submission
              onClick={() => removeImage(image?.id)}
              aria-label={`Remove image ${image?.id}`}
              className="absolute -top-2 -right-2 z-10 bg-red-600 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <X size={14} strokeWidth={3} />
            </button>
            {/* Optional: Add a subtle overlay on hover */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-colors duration-200 ease-in-out rounded-md"></div>
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
