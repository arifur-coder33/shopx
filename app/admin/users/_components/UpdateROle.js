"use client";
import { userConfig } from "../config";

export default function UpdateROle({ itemId, item, updateRole }) {
  const handleChange = ({ itemId, item }) => {
    console.log("Updating role for itemId:", itemId, "with item:", item);
    console.log("role updated");
  };
  const getconfig = userConfig({ updateRole: handleChange });
  return getconfig;
}
