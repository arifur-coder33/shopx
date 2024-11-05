import NavBar from "@/components/NavBar";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "আমার শপ",
  description: "ঘরে বসে পন্য অর্ডার করুন",
};
const solaiman = localFont({
  src: "../public/fonts/SolaimanLipi.ttf",
});

const KalpanaUNICODE = localFont({
  src: "../public/fonts/KalpanaUNICODE.ttf",
});
export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <body
        className={`${geistSans.variable} ${solaiman.className} ${geistMono.variable} antialiased  theam`}
      >
        <NavBar />
        <div className="max-w-7xl mx-auto p-2">{children}</div>
      </body>
    </html>
  );
}
