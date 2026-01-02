// "use client";
// import jsPDF from "jspdf";
// import autoTable from "jspdf-autotable";
// import { useState } from "react";
// import { generateInvoicePDF } from "./components/GenerateInvoice";
// import OrderFooter from "./components/OrderFooter";
// export default function OrdeManager({ order }) {
//   const [status, setStatus] = useState(order.status || "PENDING");
//   const [courier, setCourier] = useState(order?.courier || "");
//   const [discount, setDiscount] = useState(order?.discount || 0);
//   const [note, setNote] = useState(order.note || "");

//   const updateStatus = () => {
//     alert("Status updated!");
//   };
//   const createCourierOrder = () => {
//     alert(`Courier Order Created with: ${courier}`);
//   };
//   const saveDiscountNote = () => {
//     alert("Discount & Note Saved!");
//   };

//   const downloadInvoice = () => {
//     const doc = new jsPDF();
//     doc.setFontSize(18);
//     doc.text("Invoice", 14, 22);

//     doc.setFontSize(12);
//     doc.text(`Order ID: ${order.id}`, 14, 32);
//     doc.text(`Customer: ${order.customerName}`, 14, 40);
//     doc.text(`Phone: ${order.phone}`, 14, 48);
//     doc.text(`Address: ${order.address}`, 14, 56);
//     doc.text(`Payment Method: ${order.paymentMethod}`, 14, 64);

//     const tableData = order.items.map((item) => [
//       item.name,
//       item.qty,
//       item.unitPrice,
//       item.total,
//     ]);
//     autoTable(doc, {
//       startY: 72,
//       head: [["Product", "Qty", "Unit Price", "Total"]],
//       body: tableData,
//     });

//     const finalY = doc.lastAutoTable.finalY || 72;
//     doc.text(`Subtotal: ${order.subtotal} BDT`, 14, finalY + 10);
//     doc.text(`Delivery: ${order.deliveryCharge} BDT`, 14, finalY + 16);
//     doc.text(`Discount: -${order.discount} BDT`, 14, finalY + 22);
//     doc.text(`Total: ${order.amount} BDT`, 14, finalY + 28);

//     doc.save(`${order.id}_invoice.pdf`);
//   };

//   const downloadAwb = () => {
//     const doc = new jsPDF();
//     doc.setFontSize(18);
//     doc.text("AWB", 14, 22);

//     doc.setFontSize(12);
//     doc.text(`Order ID: ${order.id}`, 14, 32);
//     doc.text(`Courier: ${courier || "N/A"}`, 14, 40);
//     doc.text(`Customer: ${order.customerName}`, 14, 48);
//     doc.text(`Phone: ${order.phone}`, 14, 56);
//     doc.text(`Address: ${order.address}`, 14, 64);

//     doc.save(`${order.id}_AWB.pdf`);
//   };

//   // Timeline steps
//   const timelineSteps = [
//     "PENDING",
//     "PROCESSING",
//     "PACKED",
//     "SHIPPED",
//     "DELIVERED",
//   ];

//   return (
//     <div className="w-full min-h-screen p-6 bg-gray-100">
//       <div className="max-w-6xl mx-auto space-y-6">
//         {/* ORDER INFO CARD */}
//         <div className="bg-white p-6 rounded-2xl shadow">
//           <h2 className="text-2xl font-bold mb-3">Order Details</h2>
//           <div className="text-sm space-y-1">
//             <p>
//               <strong>Order ID:</strong> {order.orderNo}
//             </p>
//             <p>
//               <strong>Customer:</strong> {order.customerName}
//             </p>
//             <p>
//               <strong>Phone:</strong> {order.phoneNumber}
//             </p>
//             <p>
//               <strong>Address:</strong> {order.deliveryAddress}
//             </p>
//             <p>
//               <strong>Payment Method:</strong> {order.paymentMethod}
//             </p>
//           </div>

//           {/* Timeline */}
//           <div className="mt-4 flex space-x-2">
//             {timelineSteps.map((step) => (
//               <div
//                 key={step}
//                 className={`px-3 py-1 rounded-full text-sm font-semibold ${
//                   status === step ||
//                   timelineSteps.indexOf(step) < timelineSteps.indexOf(status)
//                     ? "bg-green-600 text-white"
//                     : "bg-gray-300 text-gray-700"
//                 }`}
//               >
//                 {step}
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* ORDER ITEMS */}
//         <div className="bg-white p-6 rounded-2xl shadow space-y-4">
//           <h3 className="text-xl font-semibold mb-3">Order Items</h3>
//           <div className="space-y-3">
//             {order.items?.map((item) => (
//               <div
//                 key={item.id}
//                 className="flex flex-col md:flex-row justify-between items-center border-b pb-3 gap-3"
//               >
//                 <div className="flex items-center gap-3 w-full md:w-auto">
//                   {item.image && (
//                     <img
//                       src={item.image}
//                       alt={item.name}
//                       className="w-20 h-20 object-cover rounded-lg"
//                     />
//                   )}
//                   <div>
//                     <p className="font-medium text-lg">{item.name}</p>
//                     <p className="text-sm text-gray-600">Qty: {item.qty}</p>
//                   </div>
//                 </div>
//                 <div className="font-semibold text-lg">{item.total} BDT</div>
//               </div>
//             ))}
//           </div>

//           <div className="pt-4 text-sm border-t space-y-2">
//             <p className="flex justify-between">
//               <span>Subtotal</span>
//               <span>{order.subtotal} BDT</span>
//             </p>
//             <p className="flex justify-between">
//               <span>Delivery Charge</span>
//               <span>{order.deliveryCharge} BDT</span>
//             </p>
//             <p className="flex justify-between">
//               <span>Discount</span>
//               <span>-{order.discount} BDT</span>
//             </p>
//             <p className="flex justify-between font-bold text-lg">
//               <span>Total</span>
//               <span>{order.amount} BDT</span>
//             </p>
//           </div>
//         </div>

//         {/* STATUS & COURIER */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           <div className="bg-white p-6 rounded-2xl shadow space-y-3">
//             <label className="block font-medium mb-1">Update Status</label>
//             <select
//               value={status}
//               onChange={(e) => setStatus(e.target.value)}
//               className="w-full p-2 border rounded-lg"
//             >
//               {timelineSteps.map((step) => (
//                 <option key={step} value={step}>
//                   {step}
//                 </option>
//               ))}
//             </select>
//             <button
//               onClick={updateStatus}
//               className="w-full bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 mt-2"
//             >
//               Update Status
//             </button>
//           </div>

//           <div className="bg-white p-6 rounded-2xl shadow space-y-3">
//             <label className="block font-medium mb-1">Select Courier</label>
//             <select
//               value={courier}
//               onChange={(e) => setCourier(e.target.value)}
//               className="w-full p-2 border rounded-lg"
//             >
//               <option value="">Choose Courier</option>
//               <option value="SteadFast">SteadFast</option>
//               <option value="Pathao">Pathao</option>
//               <option value="RedX">RedX</option>
//               <option value="Sundarban">Sundarban</option>
//             </select>
//             <button
//               onClick={createCourierOrder}
//               className="w-full bg-indigo-600 text-white py-2 rounded-xl hover:bg-indigo-700 mt-2"
//             >
//               Create Courier Order
//             </button>
//           </div>
//         </div>

//         {/* DISCOUNT + NOTE */}
//         <div className="bg-white p-6 rounded-2xl shadow space-y-3">
//           <div>
//             <label className="block font-medium mb-1">Discount (৳)</label>
//             <input
//               type="number"
//               value={discount}
//               onChange={(e) => setDiscount(e.target.value)}
//               className="w-full p-2 border rounded-lg"
//             />
//           </div>
//           <div>
//             <label className="block font-medium mb-1">Order Note</label>
//             <textarea
//               value={note}
//               onChange={(e) => setNote(e.target.value)}
//               className="w-full p-2 border rounded-lg h-24"
//             ></textarea>
//           </div>
//           <button
//             onClick={saveDiscountNote}
//             className="w-full bg-green-600 text-white py-2 rounded-xl hover:bg-green-700"
//           >
//             Save Discount & Note
//           </button>
//         </div>

//         {/* PDF DOWNLOAD */}
//         <div className="grid grid-cols-2 gap-3">
//           <button
//             onClick={() => generateInvoicePDF({ actionType: "download" })}
//             className="bg-yellow-600 text-white py-2 rounded-xl hover:bg-yellow-700"
//           >
//             Download Invoice
//           </button>
//           <button
//             onClick={() => generateInvoicePDF({ actionType: "view" })}
//             className="bg-yellow-600 text-white py-2 rounded-xl hover:bg-yellow-700"
//           >
//             View Invoice
//           </button>
//           <button
//             onClick={downloadAwb}
//             className="bg-purple-600 text-white py-2 rounded-xl hover:bg-purple-700"
//           >
//             Download AWB
//           </button>
//         </div>
//       </div>
//       <OrderFooter
//         status={status}
//         setStatus={setStatus}
//         courier={courier}
//         setCourier={setCourier}
//         onCreateCourier={createCourierOrder}
//       />
//     </div>
//   );
// }
