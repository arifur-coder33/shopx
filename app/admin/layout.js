import NavBar from "@/components/NavBar";



export const metadata = {
  title: "Admin | আমার শপ",
  description: "ঘরে বসে পন্য অর্ডার করুন",
};

export default function AdminLayout({ children }) {
  return (
  
      <div
      
      >
        <NavBar />
  
        <div className="max-w-7xl mx-auto p-2">{children}</div>
      </div>
   
  );
}
