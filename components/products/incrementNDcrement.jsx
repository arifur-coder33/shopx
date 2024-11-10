'use client'
import { replaceNumbers } from "@/utils/engToBanNumber"
import { useState } from "react"
import { Plus, Minus  } from 'lucide-react';
import Button from "../button";
export default function IncrementNDcrement(){
const [qty,setQty]=useState(1)
const increment=()=>{
    if (qty<10) {
        setQty(prevValue => prevValue + 1)
    }
}
const decrement=()=>{
    if (qty>1) {
        setQty(prevValue => prevValue - 1)
    }
}


    return(
       <div className="flex flex-row  gap-2 pl-2 text-center">
        <Button onClick={decrement} className="border border-slate-300 rounded-full  "><Minus/></Button>

        <input value={replaceNumbers(qty.toString())}  className="w-10 text-4xl p-1 rounded-lg border-orange-500 "/> 
       <Button onClick={increment} className="border border-slate-300 rounded-full  "><Plus/></Button>
       </div>
    )
}