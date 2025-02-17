"use client";
import { useState } from "react";
import ModalButton from "../modal/ModalButton";
import MediaSelector from "./MediaSelector";
export default function FileInput({ name, multipleSelect, label }) {
  const [inputValue, setInputValue] = useState("");
  const handleSelect = (selectedIds) => {
    if (multipleSelect) {
      setInputValue([selectedIds]);
    }
  };
  return (
    <>
      <label> {label}</label>
      <input name={name} type="text" />
      <ModalButton buttonName={"Select Media"}>
        <MediaSelector multipleSelect={true} />
      </ModalButton>
    </>
  );
}
