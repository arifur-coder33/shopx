import { CreditCard, MapPin, Phone, User } from "lucide-react";

export default function CustomerInfo({ customer }) {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Customer Details</h3>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <User className="text-gray-400 mt-0.5" size={18} />
          <div>
            <p className="text-sm text-gray-500">Customer</p>
            <p className="font-medium">{customer.customerName}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Phone className="text-gray-400 mt-0.5" size={18} />
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <a href={`tel:${customer.phoneNumber}`} className="font-medium">
              {customer.phoneNumber}
            </a>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="text-gray-400 mt-0.5" size={18} />
          <div>
            <p className="text-sm text-gray-500">Shipping Address</p>
            <p className="font-medium leading-snug">
              {customer.deliveryAddress}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <CreditCard className="text-gray-400 mt-0.5" size={18} />
          <div>
            <p className="text-sm text-gray-500">Payment Method</p>
            <p className="font-medium badge badge-ghost">
              {customer.paymentMethod}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
