"use client";

import { useModalContext } from "@/context/ModalContext";
import { useState } from "react";
import AddItem from "../common/AddItem";
import { componentsMap } from "./componentsMap";

export default function LazyModalButton({
  componentKey,
  button,
  data,
  updateAction,
  actionType,
  getItemDataAction,
}) {
  const [LoadedComponent, setLoadedComponent] = useState(null);
  const { openModal } = useModalContext();

  const handleClick = async () => {
    if (!LoadedComponent) {
      const loadComponent = componentsMap[componentKey];
      if (!loadComponent) {
        console.error("Component not found for key:", componentKey);
        return;
      }

      const mod = await loadComponent();
      setLoadedComponent(() => mod.default);
      openModal(
        <mod.default
          data={data}
          updateAction={updateAction}
          actionType={actionType}
          getItemDataAction={getItemDataAction}
        />
      );
    } else {
      openModal(
        <LoadedComponent
          data={data}
          updateAction={updateAction}
          actionType={actionType}
          getItemDataAction={getItemDataAction}
        />
      );
    }
  };

  return (
    <div className="cursor-pointer" onClick={handleClick}>
      {button || <AddItem />}{" "}
      {/* Default to AddItem icon if no button prop is provided */}
    </div>
  );
}
