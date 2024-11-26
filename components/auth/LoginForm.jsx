'use client';

import { useState, useTransition } from 'react';
import Button from '../button';
import DefaultInput from '../input/DefaultInput';
import { ceredntialLogin } from '@/backend/serverActions/authActions';
import { useRouter } from 'next/navigation'; 

export default function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const router=useRouter()

  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent default form submission
    const form = e.target; // Reference to the form element
    const formData = new FormData(form); // Collect form data
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const response = await ceredntialLogin(formData); // Call server action
      console.log(response)
      if (response.success) {
        setSuccess('Login successful!');
        form.reset(); // Clear the form on success
        setTimeout(() => {
            router.push('/')
        }, 1000);
    
      } else {
        console.log(response.error)
        setError(response.error || 'Something went wrong');
      }
    });
  };

  return (
    <form className='mt-6' onSubmit={handleSubmit}>
      
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
        {isPending ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
      </Button>
     
      {success && <p style={{ color: 'green' }}>{success}</p>}
    </form>
  );
}
