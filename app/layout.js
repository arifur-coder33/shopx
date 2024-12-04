import {Tiro_Bangla} from "next/font/google"
import "./globals.css";
import { SessionProvider } from "next-auth/react"
const tiro_bangla = Tiro_Bangla({
  subsets: ['bengali'],
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
  <SessionProvider>
        <div className="">{children}</div>
        </SessionProvider>
      </body>
    </html>
  );
}
