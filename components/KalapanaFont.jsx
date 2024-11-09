import { KalpanaUNICODE } from "@/app/fonts/font"
export default function KalapanaFont({children}){
    return (
        <span className={`${KalpanaUNICODE.className}`}>
{children}
        </span>
    )
}