"use client";

import { useState,useEffect  } from "react";
import { motion, AnimatePresence } from "framer-motion"; // for animation
import { Trash2 } from "lucide-react"; // for delete icon
const variations = [
    {
      categoryId: "680e5f4023f68d8030ccdd36",
      variationId: "67f9535fd08e2f544a79656c",
      value: "4 gb",
      variation: { id: "67f9535fd08e2f544a79656c", name: "RAM" }
    },
    {
        categoryId: "680e5f4023f68d8030ccdd36",
        variationId: "67f9535fd08e2f544a79656c",
        value: "16 gb",
        variation: { id: "67f9535fd08e2f544a79656c", name: "RAM" }
      },
    {
      categoryId: "680e5f4023f68d8030ccdd36",
      variationId: "67f9535fd08e2f544a79656d",
      value: "8 gb",
      variation: { id: "67f9535fd08e2f544a79656d", name: "Storage" }
    },
    {
      categoryId: "680e5f4023f68d8030ccdd36",
      variationId: "67f9535fd08e2f544a79656e",
      value: "Red",
      variation: { id: "67f9535fd08e2f544a79656e", name: "Color" }
    }
  ];
  export default function ProductVariationInput({ colSpan }) {
    const [selectedValues, setSelectedValues] = useState({});
    const [expandedCategories, setExpandedCategories] = useState({});
    const [rows, setRows] = useState([]);
  
    const categories = [...new Map(variations.map(v => [v.variation.name, v])).values()];
    const variationValues = variations.reduce((acc, item) => {
      if (!acc[item.variation.name]) {
        acc[item.variation.name] = [];
      }
      acc[item.variation.name].push(item.value);
      return acc;
    }, {});
  
    const handleValueSelect = (categoryName, value) => {
      setSelectedValues(prev => {
        const currentValues = prev[categoryName] || [];
        if (currentValues.includes(value)) {
          return {
            ...prev,
            [categoryName]: currentValues.filter(v => v !== value)
          };
        } else {
          return {
            ...prev,
            [categoryName]: [...currentValues, value]
          };
        }
      });
    };
  
    const toggleCategoryExpand = (categoryName) => {
      setExpandedCategories(prev => ({
        ...prev,
        [categoryName]: !prev[categoryName]
      }));
    };
  
    useEffect(() => {
      const selectedCategories = Object.keys(selectedValues).filter(key => selectedValues[key].length > 0);
  
      if (selectedCategories.length === 0) {
        setRows([]);
        return;
      }
  
      let combinations = [[]];
  
      selectedCategories.forEach(category => {
        const newCombinations = [];
        combinations.forEach(combination => {
          selectedValues[category].forEach(value => {
            newCombinations.push([...combination, { category, value }]);
          });
        });
        combinations = newCombinations;
      });
  
      const formattedRows = combinations.map((combination, index) => ({
        id: index,
        combination,
        image: null,
        imageUrl: null,
        sku: "",
        price: "",
        quantity: ""
      }));
  
      setRows(formattedRows);
  
    }, [selectedValues]);
  
    const handleRowChange = (rowId, field, value) => {
      setRows(prevRows =>
        prevRows.map(row =>
          row.id === rowId ? { ...row, [field]: value } : row
        )
      );
    };
  
    const handleDeleteRow = (rowId) => {
      setRows(prevRows => prevRows.filter(row => row.id !== rowId));
    };
  
    const handleImageChange = (rowId, file) => {
      const imageUrl = file ? URL.createObjectURL(file) : null;
      setRows(prevRows =>
        prevRows.map(row =>
          row.id === rowId ? { ...row, image: file, imageUrl } : row
        )
      );
    };
  
    const allSelectedCategories = Object.keys(selectedValues).filter(cat => selectedValues[cat].length > 0);
  
    return (
      <div className={`space-y-8 col-span-${colSpan}`}>
  
        {/* Select Variations */}
        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat.variation.name}>
              {/* Category name clickable */}
              <button
                type="button"
                onClick={() => toggleCategoryExpand(cat.variation.name)}
                className="text-lg font-semibold flex items-center space-x-2"
              >
                <span>{cat.variation.name}</span>
                <span className="text-sm">{expandedCategories[cat.variation.name] ? "▲" : "▼"}</span>
              </button>
  
              {/* Animated expand/collapse */}
              <AnimatePresence>
                {expandedCategories[cat.variation.name] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-4 mt-2">
                      {variationValues[cat.variation.name]?.map(value => (
                        <label key={value} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedValues[cat.variation.name]?.includes(value) || false}
                            onChange={() => handleValueSelect(cat.variation.name, value)}
                          />
                          <span>{value}</span>
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
  
        {/* Table format */}
        {rows.length > 0 && (
          <div className="mt-8 overflow-x-auto">
            <table className="min-w-full table-auto border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  {/* Dynamic variation headers */}
                  {allSelectedCategories.map(category => (
                    <th key={category} className="border px-4 py-2">{category}</th>
                  ))}
                  {/* Fixed headers */}
                  <th className="border px-4 py-2">Image</th>
                  <th className="border px-4 py-2">SKU</th>
                  <th className="border px-4 py-2">Price</th>
                  <th className="border px-4 py-2">Qty</th>
                  <th className="border px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    {/* Show variations */}
                    {allSelectedCategories.map(category => {
                      const variation = row.combination.find(c => c.category === category);
                      return (
                        <td key={category} className="border px-4 py-2 text-center">
                          {variation?.value || "-"}
                        </td>
                      );
                    })}
  
                    {/* File input with preview */}
                    <td className="border px-4 py-2 text-center">
                      {row.imageUrl ? (
                        <img
                          src={row.imageUrl}
                          alt="Preview"
                          className="w-12 h-12 object-cover mx-auto mb-1 rounded"
                        />
                      ) : null}
                      <input
                        type="file"
                        onChange={(e) => handleImageChange(row.id, e.target.files[0])}
                      />
                    </td>
  
                    {/* SKU input */}
                    <td className="border px-4 py-2">
                      <input
                        type="text"
                        className="border px-2 py-1 rounded w-full"
                        placeholder="SKU"
                        value={row.sku}
                        onChange={(e) => handleRowChange(row.id, 'sku', e.target.value)}
                      />
                    </td>
  
                    {/* Price input */}
                    <td className="border px-4 py-2">
                      <input
                        type="number"
                        className="border px-2 py-1 rounded w-full"
                        placeholder="Price"
                        value={row.price}
                        onChange={(e) => handleRowChange(row.id, 'price', e.target.value)}
                      />
                    </td>
  
                    {/* Quantity input */}
                    <td className="border px-4 py-2">
                      <input
                        type="number"
                        className="border px-2 py-1 rounded w-full"
                        placeholder="Qty"
                        value={row.quantity}
                        onChange={(e) => handleRowChange(row.id, 'quantity', e.target.value)}
                      />
                    </td>
  
                    {/* Delete row */}
                    <td className="border px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(row.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={20} />
                      </button>
                    </td>
  
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
  
      </div>
    );
  }