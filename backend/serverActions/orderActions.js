'use server'
import prisma from "@/lib/prisma";

export async function createOrder(formData) {
    const formDataObj = Object.fromEntries(formData.entries());
    
    console.log (formDataObj)
}