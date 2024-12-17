'use client'
import SelectInput from "@/components/input/SelectInput";

export default function OrderStatusUpdate({status}){

    const updateOrderStatus= (e)=>{
        alert(e)
    }

    return(
        <SelectInput onChangeEvent={updateOrderStatus} value={status} data={[{id:'PENDING',name:"PENDING"},{id:'APPROVED',name:"APPROVED"}]}/>
    )
}