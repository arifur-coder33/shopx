import NavBar from "@/components/NavBar";
import { solaiman,KalpanaUNICODE } from "./fonts/font";
import {Tiro_Bangla} from "next/font/google"
import "./globals.css";

const tiro_bangla = Tiro_Bangla({
  subsets: [''],
  display: 'swap',
   weight: '400'

})


export const metadata = {
  title: "আমার শপ",
  description: "ঘরে বসে পন্য অর্ডার করুন",
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <body
        className={` ${tiro_bangla.className}  antialiased  theam`}
      >
        <NavBar />
  
        <div className="max-w-7xl mx-auto p-2">{children}</div>
      </body>
    </html>
  );
}
