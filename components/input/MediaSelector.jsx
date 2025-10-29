// "use client";
// import { getAllMedia } from "@/backend/serverActions/fileUploadAction";
// import Button from "@/components/button";
// import Imagecustom from "@/components/images/ImageCustom";
// import FileUploader from "@/components/input/FileUploader";
// import { useModalContext } from "@/context/ModalContext";
// import { UploadCloudIcon } from "lucide-react";
// import { useEffect, useState } from "react";
// import ModalButton from "../modal/ModalButton";
// export default function MediaSelector({
//   multipleSelect = false,
//   inputName = "selectedMedia",
//   onSelect,
// }) {
//   const [media, setMedia] = useState([]);
//   const [selectedMedia, setSelectedMedia] = useState([]);
//   const { closeModal, isOpen } = useModalContext();
//   const [newUpload, setNewUpload] = useState();
//   // Fetch media when the modal opens
//   useEffect(() => {
//     async function fetchMedia() {
//       const { data } = await getAllMedia();
//       const newData = data.map((item) => ({ ...item, isSelected: false }));
//       setMedia(newData || []);
//     }
//     fetchMedia(); // Fetch media only when the modal is open
//   }, [newUpload]);
//   console.log(media);
//   // Handle selecting/deselecting media
//   const handleSelect = (item) => {
//     // Update the media state to toggle isSelected
//     setMedia((prevMedia) =>
//       prevMedia.map((m) =>
//         m.id === item.id
//           ? { ...m, isSelected: !m.isSelected } // Create a new object with updated isSelected
//           : m
//       )
//     );

//     // Update the selectedMedia state
//     setSelectedMedia((prev) => {
//       const isAlreadySelected = prev.some((m) => m.id === item.id);
//       if (isAlreadySelected) {
//         // Remove the item if it's already selected
//         return prev.filter((m) => m.id !== item.id);
//       } else {
//         // Add the item if it's not selected
//         return multipleSelect ? [...prev, item] : [item];
//       }
//     });
//   };

//   // Handle confirming the selection
//   const handleConfirm = () => {
//     const selectedIds = selectedMedia.map((m) => m.id).join(",");
//     console.log(selectedIds);
//     if (onSelect) onSelect(selectedMedia); // Pass selected IDs to the parent
//     document.getElementById(inputName).value = selectedIds; // Update hidden input
//     closeModal(); // Close the modal
//   };

//   return (
//     <div>
//       {/* Hidden Input Field for Form Submission */}
//       <ModalButton
//         buttonName={
//           <div className="flex flex-col items-center hover:shadow-xl bg-gray-200 w-fit rounded-md p-1">
//             <UploadCloudIcon /> <span>Upload New</span>
//           </div>
//         }
//       >
//         <FileUploader onUpload={setNewUpload} multiple={true} />
//       </ModalButton>
//       <input
//         type="hidden"
//         id={inputName}
//         name={"inputName"}
//         value={selectedMedia.map((m) => m.id).join(",")}
//       />
//       <div className="p-4">
//         <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto">
//           {media.map((item) => {
//             const isSelected = selectedMedia.some((m) => m.id === item.id);
//             return (
//               <div
//                 key={item.id}
//                 className={`border p-1 cursor-pointer relative transition-all ${
//                   isSelected ? "border-blue-500" : "border-gray-300"
//                 }`}
//                 onClick={() => handleSelect(item)}
//               >
//                 <Imagecustom
//                   src={item.name} // Use item.url instead of item.name
//                   h={100}
//                   w={100}
//                   alt={item.name}
//                 />
//                 <input
//                   type="checkbox"
//                   checked={isSelected} // Use the isSelected state
//                   className="absolute top-1 left-1 w-4 h-4"
//                   readOnly
//                 />
//               </div>
//             );
//           })}
//         </div>
//         <Button onClick={handleConfirm} className="mt-4 w-full">
//           Confirm Selection
//         </Button>
//       </div>
//       {/* <ModalButton buttonName={"Select Media"}>
//         <div className="p-4">
//           <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto">
//             {media.map((item) => {
//               const isSelected = selectedMedia.some((m) => m.id === item.id);
//               return (
//                 <div
//                   key={item.id}
//                   className={`border p-1 cursor-pointer relative transition-all ${
//                     isSelected ? "border-blue-500" : "border-gray-300"
//                   }`}
//                   onClick={() => handleSelect(item)}
//                 >
//                   {isSelected ? "Selected" : "Not Selected"}
//                   <Imagecustom
//                     src={item.name} // Use item.url instead of item.name
//                     h={100}
//                     w={100}
//                     alt={item.name}
//                   />
//                   <input
//                     type="checkbox"
//                     checked={isSelected} // Use the isSelected state
//                     className="absolute top-1 left-1 w-4 h-4"
//                     readOnly
//                   />
//                 </div>
//               );
//             })}
//           </div>
//           <Button onClick={handleConfirm} className="mt-4 w-full">
//             Confirm Selection
//           </Button>
//         </div>
//       </ModalButton> */}
//     </div>
//   );
// }
"use client";
import { getAllMedia } from "@/backend/serverActions/fileUploadAction";
import Button from "@/components/button";
import Imagecustom from "@/components/images/ImageCustom";
import FileUploader from "@/components/input/FileUploader";
import { useModalContext } from "@/context/ModalContext new";
import { CheckCircle2, ImageOff, UploadCloudIcon } from "lucide-react";
import React, { memo, useCallback, useEffect, useState } from "react"; // Import memo and useCallback
import LoadingSpinner from "../common/LoadingSpinner";
import ModalButton from "../modal/ModalButton";

// --- 1. Create a Memoized Media Item Component ---
const MediaItem = memo(
  // Wrap component in memo
  ({ item, isSelected, onSelectItem }) => {
    // Receive props
    // console.log(`Rendering MediaItem: ${item.name}, Selected: ${isSelected}`); // For debugging re-renders

    // Determine conditional classes without clsx
    const baseClasses =
      "relative aspect-square rounded-md overflow-hidden cursor-pointer group border-2 transition-all duration-150 ease-in-out";
    const conditionalClasses = isSelected
      ? "border-blue-500 ring-2 ring-blue-300 ring-offset-1"
      : "border-gray-200 hover:border-gray-400";
    const itemClasses = `${baseClasses} ${conditionalClasses}`;

    return (
      <div
        className={itemClasses}
        onClick={() => onSelectItem(item)} // Call the passed handler
        title={item.name}
      >
        <Imagecustom
          src={item.name} // ** Use actual image URL/path **
          alt={item.altText || item.name || "Media item"}
          w={150}
          h={150}
          className="object-cover w-full h-full transition-transform duration-200 group-hover:scale-105"
        />
        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute inset-0 bg-blue-500 bg-opacity-40 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-white drop-shadow-md" />
          </div>
        )}
        {/* Hover overlay when not selected */}
        {!isSelected && (
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-150 ease-in-out"></div>
        )}
      </div>
    );
  }
);
MediaItem.displayName = "MediaItem"; // Add display name for DevTools

// --- 2. Memoize MediaSelector and use useCallback for handlers ---
const MediaSelector = memo(
  ({
    // Wrap default export in memo
    multipleSelect = false,
    inputName = "selectedMedia",
    onSelect, // Make sure this is stable from parent (useCallback)
    initialSelectedIds = [], // Make sure this is stable from parent (useMemo if derived)
  }) => {
    // console.log("Rendering MediaSelector"); // For debugging re-renders

    const [media, setMedia] = useState([]);
    const [selectedMedia, setSelectedMedia] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const { closeModal } = useModalContext(); // Assuming closeModal is stable

    // --- Fetch Media (useCallback is good here) ---
    const fetchMedia = useCallback(async () => {
      // console.log("Fetching media..."); // Debug fetch calls
      setLoading(true);
      setIsUploading(false); // Ensure upload state is reset before fetch
      try {
        const { data, error } = await getAllMedia();
        if (error) {
          console.error("Error fetching media:", error);
          setMedia([]);
        } else {
          // Use a Set for faster initialSelectedIds lookup
          const initialIdsSet = new Set(initialSelectedIds);
          const formattedData = (data || []).map((item) => ({
            ...item,
            // isSelected: initialSelectedIds.includes(item.id), // Slower for large arrays
            isSelected: initialIdsSet.has(item.id), // Faster lookup
          }));
          setMedia(formattedData);
          // Correctly set initial selected state based on fetched & formatted data
          const initiallySelected = formattedData.filter(
            (item) => item.isSelected
          );
          setSelectedMedia(initiallySelected);
        }
      } catch (err) {
        console.error("Failed to fetch media:", err);
        setMedia([]);
      } finally {
        setLoading(false);
      }
    }, []); // Dependency is correct

    useEffect(() => {
      fetchMedia();
    }, [fetchMedia]); // useEffect dependency is correct

    // --- Handle Selection (Wrap in useCallback) ---
    // This is crucial because this function is passed to the memoized MediaItem
    const handleSelect = useCallback(
      (itemToSelect) => {
        setSelectedMedia((prevSelected) => {
          const isAlreadySelected = prevSelected.some(
            (m) => m.id === itemToSelect.id
          );
          if (multipleSelect) {
            return isAlreadySelected
              ? prevSelected.filter((m) => m.id !== itemToSelect.id)
              : [...prevSelected, itemToSelect];
          } else {
            return isAlreadySelected ? [] : [itemToSelect];
          }
        });
      },
      [multipleSelect]
    ); // Add multipleSelect as dependency

    // --- Handle Upload Completion (Wrap in useCallback) ---
    // If FileUploader is memoized, this helps. Otherwise, less critical but good practice.
    const handleUploadComplete = useCallback(
      (uploadResult) => {
        // console.log("Upload complete, triggering refetch:", uploadResult);
        // No need to setIsUploading(false) here, fetchMedia does it now
        fetchMedia(); // Refetch the media list
      },
      [fetchMedia]
    ); // Depends on fetchMedia

    // --- Handle Upload Start (Wrap in useCallback) ---
    const handleUploadStart = useCallback(() => {
      setIsUploading(true);
    }, []); // No dependencies

    // --- Handle Confirmation (Wrap in useCallback) ---
    // If Button is memoized or depends on onClick stability. Less critical otherwise.
    const handleConfirm = useCallback(() => {
      const selectedIds = selectedMedia.map((m) => m.id);
      if (onSelect) {
        onSelect(selectedMedia);
      }
      const hiddenInput = document.getElementById(inputName);
      if (hiddenInput) {
        hiddenInput.value = selectedIds.join(",");
      }
      closeModal();
    }, [selectedMedia, onSelect, inputName, closeModal]); // Add dependencies

    // --- isItemSelected (Wrap in useMemo for potential minor optimization if list is huge) ---
    // Creates a Set for faster lookups inside the map loop. Only recalculates when selectedMedia changes.
    const selectedIdsSet = React.useMemo(
      () => new Set(selectedMedia.map((m) => m.id)),
      [selectedMedia]
    );
    const isItemSelected = useCallback(
      (itemId) => selectedIdsSet.has(itemId),
      [selectedIdsSet]
    );
    // const isItemSelected = (itemId) => selectedMedia.some((m) => m.id === itemId); // Original, less optimized for many calls

    return (
      <div className="flex flex-col h-[70vh] sm:h-[80vh] bg-white rounded-lg overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Select Media</h2>
          <p className="text-sm text-gray-500">
            {multipleSelect
              ? "Select one or more images."
              : "Select a single image."}
          </p>
        </div>

        {/* Media Grid & Upload Area */}
        <div className="flex-grow p-4 overflow-y-auto bg-gray-50">
          {loading && !isUploading ? (
            <LoadingSpinner message="Loading media..." />
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
              {/* Upload Card */}
              {/* <div className="aspect-square border-2 border-dashed border-gray-300 rounded-md bg-gray-200 hover:border-blue-500 transition-colors flex items-center justify-center m-2 relative group"> */}
              <ModalButton
                buttonName={
                  <div className="p-4 aspect-square text-center border-2 border-dashed border-gray-300  bg-gray-200 hover:border-blue-500 transition-colors  justify-center  relative group flex flex-col items-center hover:shadow-xl  w-fit rounded-md ">
                    <UploadCloudIcon /> <span>Upload New</span>
                  </div>
                }
              >
                <FileUploader onUpload={handleUploadComplete} multiple={true} />
              </ModalButton>
              {/* </div> */}

              {/* Media Items */}
              {media.length === 0 && !loading && (
                <div className="col-span-full flex flex-col items-center justify-center text-gray-500 py-10">
                  <ImageOff className="w-12 h-12 mb-3" />
                  <p>No media found.</p>
                  <p className="text-sm">Try uploading some images.</p>
                </div>
              )}

              {media.map((item) => (
                // Render the memoized MediaItem component
                <MediaItem
                  key={item.id} // Key is essential for list updates
                  item={item}
                  isSelected={isItemSelected(item.id)} // Pass selection state
                  onSelectItem={handleSelect} // Pass the memoized select handler
                />
              ))}
            </div>
          )}
        </div>

        {/* Hidden Input */}
        <input
          type="hidden"
          id={inputName}
          name={inputName}
          value={selectedMedia.map((m) => m.id).join(",")}
        />

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <Button
            onClick={handleConfirm} // Pass stable callback
            className="w-full"
            disabled={selectedMedia.length === 0 || loading || isUploading}
          >
            Confirm Selection ({selectedMedia.length})
          </Button>
        </div>
      </div>
    );
  }
); // Close the memo wrapper for MediaSelector

MediaSelector.displayName = "MediaSelector"; // Add display name for DevTools

export default MediaSelector; // Export the memoized component
