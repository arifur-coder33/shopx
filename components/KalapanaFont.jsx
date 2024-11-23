import { KalpanaUNICODE } from "@/app/fonts/font";
export default function KalapanaFont({ children }) {
  return (
    <div className={`${KalpanaUNICODE.className} tracking-wider`}>
      {children}
    </div>
  );
}
