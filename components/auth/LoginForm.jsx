
'use client'

import { loginWithCreds } from '@/backend/serverActions/authActions';
import Button from '../button';
import DefaultInput from '../input/DefaultInput';

import { useState } from "react";

export default function LoginForm() {

  async function HandleSubmit(formData){
    try {
     await loginWithCreds(formData)
  
    } catch (error) {

    }
 
  }
  return (
    <form className='mt-6' 
    action={HandleSubmit}
    >
      
        {/* {error &&  <div className='w-full rounded-md bg-red-200 p-2 text-base text-red-600 overflow-hidden'>   {error}    </div> } */}
         
      <DefaultInput
        name="email"
        label="ইমেইলঃ"
        placeholder="আপনার ইমেইল দিন।"
        required
        type="email"
      />

   
      <DefaultInput
        name="password"
        label="পাসওয়ার্ডঃ"
        placeholder="আপনার পাসওয়ার্ড দিন।"
        required
        type="password"
      />
  
      <Button className="w-full mt-2 py-2">
        {/* {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'} */}
        লগইন করুন
      </Button>
     
      {/* {success && <p style={{ color: 'green' }}>{success}</p>} */}
    </form>
  );
}
