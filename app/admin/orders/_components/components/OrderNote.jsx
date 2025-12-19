export default function OrderNote({ note }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      {" "}
      <h4 className="font-semibold text-lg mb-2">Order Note:</h4>
      {note} valo kore check kore diben
    </div>
  );
}
