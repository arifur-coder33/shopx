'use client';

import { useState, useTransition } from 'react';
import Button from '../button';
import DefaultInput from '../input/DefaultInput';

import { useRouter } from 'next/navigation'; 
import { credentialLogin } from '@/backend/serverActions/authActions';

export default function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const router=useRouter()


  const [loading, setLoading] = useState("");


  async function onSubmit(event) {
    event.preventDefault();

    try {
      setError("");
      setLoading(true);
      const formData = new FormData(event.currentTarget);
      const response = await credentialLogin(formData);

      if (!!response.error) {
        console.error(response.error);
        setError(response.error);
      } else {
        router.push("/");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className='mt-6' onSubmit={onSubmit}>
      
        {error &&  <div className='w-full rounded-md bg-red-200 p-2 text-base text-red-600 overflow-hidden'>   {error}    </div> }
         
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
        {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
      </Button>
     
      {success && <p style={{ color: 'green' }}>{success}</p>}
    </form>
  );
}
