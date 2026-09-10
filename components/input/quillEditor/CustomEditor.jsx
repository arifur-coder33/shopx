"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import "react-quill-new/dist/quill.snow.css";
import styles from "./CustomEditor.module.css";
// Dynamically import ReactQuill with SSR disabled
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
export default function CustomEditor({ defaultValue, label, name, readOnly = false }) {
  const [editorValue, setEditorValue] = useState(defaultValue || "");
  const modules = {
    toolbar: [
      ["bold", "italic", "underline", "strike"], // toggled buttons
      ["blockquote", "code-block"],
      ["link", "video", "formula"],

      [{ header: 1 }, { header: 2 }], // custom button values
      [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
      [{ script: "sub" }, { script: "super" }], // superscript/subscript
      [{ indent: "-1" }, { indent: "+1" }], // outdent/indent
      [{ direction: "rtl" }], // text direction

      [{ header: [1, 2, 3, 4, 5, 6, false] }],

      [{ color: [] }, { background: [] }], // dropdown with defaults from theme

      ["clean"],
    ],
  };

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "blockquote",
    "list",
    "bullet",
    "indent",
    "link",
    "image",
  ];

  return (
    <div className={styles.editorWrapper}>
      <label htmlFor={name} className="block  text-sm font-medium">
        {label}
      </label>
      <input type="hidden" name={name} value={editorValue} readOnly />
      <ReactQuill
        id={name}
        theme="snow"
        className="dark:text-slate-950 custom-quill"
        value={editorValue}
        readOnly={readOnly}
        onChange={setEditorValue} // Updates state when the editor content changes
        modules={modules}
      />
    </div>
  );
}
