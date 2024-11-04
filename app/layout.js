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
export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <body
        className={`${geistSans.variable} ${solaiman.className} ${geistMono.variable} antialiased  bg-slate-200 dark:bg-slate-900 text-slate-950 dark:text-slate-300`}
      >
        <NavBar />
        <div className="max-w-7xl mx-auto">{children}</div>
      </body>
    </html>
  );
}
