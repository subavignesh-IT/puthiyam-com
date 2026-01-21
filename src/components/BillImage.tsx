import React, { forwardRef } from 'react';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface BillImageProps {
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  deliveryType: string;
  paymentMethod: string;
  paymentStatus: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  orderDate: string;
}

const BillImage = forwardRef<HTMLDivElement, BillImageProps>(({
  customerName,
  customerPhone,
  customerAddress,
  deliveryType,
  paymentMethod,
  paymentStatus,
  items,
  subtotal,
  shippingCost,
  total,
  orderDate,
}, ref) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div 
      ref={ref}
      className="bg-white p-6 w-[400px] font-sans text-black"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {/* Header */}
      <div className="text-center border-b-2 border-dashed border-gray-400 pb-4 mb-4">
        <div className="w-16 h-16 mx-auto mb-2 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-2xl">P</span>
        </div>
        <h1 className="text-xl font-bold text-gray-800">PUTHIYAM PRODUCTS</h1>
        <p className="text-sm text-gray-600">Order Invoice</p>
        <p className="text-xs text-gray-500 mt-1">{formatDate(orderDate)}</p>
      </div>

      {/* Customer Details */}
      <div className="mb-4 text-sm">
        <h3 className="font-bold text-gray-700 mb-2">Customer Details:</h3>
        <p><span className="text-gray-600">Name:</span> {customerName}</p>
        <p><span className="text-gray-600">Phone:</span> {customerPhone}</p>
        {customerAddress && (
          <p><span className="text-gray-600">Address:</span> {customerAddress}</p>
        )}
        <p><span className="text-gray-600">Delivery:</span> {deliveryType === 'shipping' ? 'Home Delivery' : 'Self Pickup'}</p>
      </div>

      {/* Items */}
      <div className="border-t border-dashed border-gray-400 pt-4 mb-4">
        <h3 className="font-bold text-gray-700 mb-2">Order Items:</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-1">Item</th>
              <th className="text-center py-1">Qty</th>
              <th className="text-right py-1">Price</th>
              <th className="text-right py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="py-1">{item.name}</td>
                <td className="text-center py-1">{item.quantity}</td>
                <td className="text-right py-1">₹{item.price}</td>
                <td className="text-right py-1">₹{item.price * item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="border-t border-dashed border-gray-400 pt-4 mb-4 text-sm">
        <div className="flex justify-between py-1">
          <span className="text-gray-600">Subtotal:</span>
          <span>₹{subtotal}</span>
        </div>
        {shippingCost > 0 && (
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Shipping:</span>
            <span>₹{shippingCost}</span>
          </div>
        )}
        {shippingCost === 0 && deliveryType === 'shipping' && (
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Shipping:</span>
            <span className="text-green-600">FREE</span>
          </div>
        )}
        <div className="flex justify-between py-2 font-bold text-lg border-t border-gray-400 mt-2">
          <span>Grand Total:</span>
          <span className="text-amber-700">₹{total}</span>
        </div>
      </div>

      {/* Payment Status */}
      <div className="text-center border-t border-dashed border-gray-400 pt-4">
        <div className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${
          paymentStatus === 'paid' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-yellow-100 text-yellow-700'
        }`}>
          {paymentStatus === 'paid' ? '✅ PAID' : '⏳ PENDING (COD)'}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Payment: {paymentMethod === 'online' ? 'UPI' : 'Cash on Delivery'}
        </p>
      </div>

      {/* Footer */}
      <div className="text-center mt-4 pt-4 border-t border-dashed border-gray-400">
        <p className="text-xs text-gray-500">Thank you for shopping with us!</p>
        <p className="text-xs text-gray-500">Contact: 9361284773</p>
      </div>
    </div>
  );
});

BillImage.displayName = 'BillImage';

export default BillImage;
