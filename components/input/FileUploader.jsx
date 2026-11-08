"use client";

import { uploadImagesAction } from "@/backend/serverActions/fileUploadAction";
import { useModalContext } from "@/context/ModalContext";
import { ImagePlus, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "react-toastify";

async function inspectImage(file) {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      resolve({ preview: objectUrl, width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => resolve({ preview: objectUrl, width: null, height: null });
    image.src = objectUrl;
  });
}

const megabytes = (bytes) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;

async function prepareUploadFile(file) {
  if (file.size <= MAX_UPLOAD_BYTES) return file;
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 5000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("ছবিটি প্রস্তুত করা যায়নি।");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const outputType = file.type === "image/webp" ? "image/webp" : "image/jpeg";
    for (const quality of [0.9, 0.82, 0.74, 0.66, 0.58]) {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, outputType, quality));
      if (blob && blob.size <= MAX_UPLOAD_BYTES) {
        const extension = outputType === "image/webp" ? "webp" : "jpg";
        const name = `${file.name.replace(/\.[^.]+$/u, "")}.${extension}`;
        return new File([blob], name, { type: outputType, lastModified: file.lastModified });
      }
    }
    throw new Error("ছবিটি 4.5 MB-এর নিচে আনা যায়নি। ছোট ছবি ব্যবহার করুন।");
  } finally {
    bitmap.close();
  }
}

export default function FileUploader({ multiple = false, onUpload }) {
  const [images, setImages] = useState([]);
  const imagesRef = useRef(images);
  const [uploading, setUploading] = useState(false);
  const { closeModal } = useModalContext();

  useEffect(() => { imagesRef.current = images; }, [images]);
  useEffect(() => () => imagesRef.current.forEach(({ preview }) => URL.revokeObjectURL(preview)), []);

  const onDrop = useCallback(async (acceptedFiles) => {
    const inspected = await Promise.all(acceptedFiles.map(async (file) => ({
      file,
      displayName: file.name.replace(/\.[^.]+$/, ""),
      ...(await inspectImage(file)),
    })));
    setImages((current) => {
      const next = multiple ? [...current, ...inspected] : inspected;
      if (!multiple) current.forEach(({ preview }) => URL.revokeObjectURL(preview));
      return next;
    });
  }, [multiple]);

  const updateName = (index, displayName) => {
    setImages((current) => current.map((image, i) => i === index ? { ...image, displayName } : image));
  };

  const removeImage = (index) => {
    setImages((current) => {
      const removed = current[index];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return current.filter((_, i) => i !== index);
    });
  };

  const handleUpload = async () => {
    if (!images.length || uploading) return;
    setUploading(true);
    try {
      const uploaded = [];
      const failed = [];
      for (const image of images) {
        try {
          const file = await prepareUploadFile(image.file);
          const formData = new FormData();
          formData.append("imageGallery", file);
          formData.append("imageGalleryName", image.displayName.trim());
          const result = await uploadImagesAction(formData);
          if (!result.success) throw new Error(result.message || "Image upload failed.");
          uploaded.push(...(result.data || []));
        } catch (error) {
          failed.push({ ...image, error: error?.message || "Image upload failed." });
        }
      }
      if (uploaded.length) onUpload?.(uploaded);
      if (failed.length) {
        const failedSet = new Set(failed.map((image) => image.preview));
        images.filter((image) => !failedSet.has(image.preview)).forEach(({ preview }) => URL.revokeObjectURL(preview));
        setImages(failed);
        toast.error(`${uploaded.length}টি upload হয়েছে, ${failed.length}টি হয়নি। ${failed[0].error}`);
      } else {
        toast.success(`${uploaded.length}টি image upload হয়েছে।`);
        images.forEach(({ preview }) => URL.revokeObjectURL(preview));
        setImages([]);
        closeModal();
      }
    } catch (error) {
      toast.error(error?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"], "image/gif": [".gif"] }, multiple });

  return (
    <div className="mx-auto flex max-h-[78vh] w-full max-w-4xl flex-col gap-4 p-1">
      <header><h2 className="text-xl font-bold">Upload media</h2><p className="text-sm text-text-muted">Add a searchable name, then review each image’s dimensions and file size.</p></header>
      <div {...getRootProps()} className={`cursor-pointer rounded-xl border-2 border-dashed p-7 text-center transition-colors ${isDragActive ? "border-primary bg-primary-soft" : "border-border bg-surface-muted hover:border-primary"}`}>
        <input {...getInputProps()} />
        <Upload className="mx-auto mb-2 h-8 w-8 text-primary" />
        <p className="font-medium">{isDragActive ? "Drop images here" : "Drag images here or click to choose"}</p>
        <p className="mt-1 text-xs text-text-muted">PNG, JPG, WebP and other image formats</p>
      </div>

      {images.length > 0 && <div className="grid gap-3 overflow-y-auto sm:grid-cols-2">
        {images.map((image, index) => (
          <article key={`${image.file.name}-${index}`} className="flex gap-3 rounded-xl border border-border bg-surface p-3">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-muted"><img src={image.preview} alt={image.displayName || "Selected image"} className="h-full w-full object-cover" /><button type="button" onClick={() => removeImage(index)} className="absolute right-1 top-1 rounded-full bg-slate-950/75 p-1 text-white" aria-label="Remove image"><X size={14} /></button></div>
            <div className="min-w-0 flex-1 space-y-2">
              <label className="block text-xs font-medium">Media name<input maxLength={120} value={image.displayName} onChange={(event) => updateName(index, event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm" placeholder="Enter a searchable name" /></label>
              <p className="text-xs text-text-muted">{image.width && image.height ? `${image.width} × ${image.height} px` : "Dimensions unavailable"} · {megabytes(image.file.size)}</p>
              <p className="truncate text-[11px] text-text-muted" title={image.file.name}>{image.file.name}</p>
            </div>
          </article>
        ))}
      </div>}

      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-sm text-text-muted">{images.length} image{images.length === 1 ? "" : "s"} selected</span>
        <button type="button" onClick={handleUpload} disabled={!images.length || uploading || images.some((image) => !image.displayName.trim())} className="button disabled:cursor-not-allowed disabled:opacity-50"><ImagePlus size={17} />{uploading ? "Uploading…" : "Upload"}</button>
      </div>
    </div>
  );
}
