"use client";

import React, { useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css"; // Include the Quill styles

export default function TextEditor() {
  const [content, setContent] = useState("");

  return (
    <div>
      <ReactQuill value={content} onChange={setContent} />
    </div>
  );
}
