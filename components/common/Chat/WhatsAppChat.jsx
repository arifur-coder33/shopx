"use client";

import { MessageCircle,  } from "lucide-react";

import { usePathname, useSearchParams } from 'next/navigation';

export default function WhatsAppChat({WAnumber,Message}) {
  


  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = searchParams.toString();
//   const fullUrl = `${protocol}://${host}${pathname}${query ? `?${query}` : ''}`;

  const fullUrl = `https://www.bdmart24.online/${pathname}${query ? `?${query}` : ''}`;

  if (!WAnumber) return null; // Loading state

  const phoneNumber = WAnumber ;
  const whatsappMessage = Message || encodeURIComponent(
    `হ্যালো, আমি আপনার সাথে যোগাযোগ করতে চাই।\nলিঙ্ক: ${fullUrl}`
  );
  const whatsappLink = `https://wa.me/${phoneNumber}?text=${whatsappMessage}`;

  return (
        <div>
          <a
            href={whatsappLink}
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 rounded-md transition"
          >
            <MessageCircle />
            WhatsApp চ্যাট
          </a>
        </div>

      
     
  );
}
