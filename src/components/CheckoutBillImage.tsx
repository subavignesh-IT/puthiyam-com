import React, { forwardRef } from 'react';
import { CartItem } from '@/types/product';

interface CheckoutBillImageProps {
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  deliveryType: 'shipping' | 'self-pickup';
  paymentMethod: 'online' | 'cod';
  paymentStatus: 'paid' | 'pending';
  items: CartItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
}

const CheckoutBillImage = forwardRef<HTMLDivElement, CheckoutBillImageProps>(
  ({ customerName, customerPhone, customerAddress, deliveryType, paymentMethod, paymentStatus, items, subtotal, shippingCost, total }, ref) => {
    const orderDate = new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return (
      <div
        ref={ref}
        style={{
          width: '400px',
          padding: '24px',
          backgroundColor: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          border: '2px solid #8B4513',
          borderRadius: '12px',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px dashed #8B4513', paddingBottom: '16px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #8B4513, #D2691E)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <span style={{ color: 'white', fontSize: '28px', fontWeight: 'bold', fontFamily: 'Georgia, serif' }}>P</span>
          </div>
          <h1 style={{ margin: '0', fontSize: '22px', fontWeight: 'bold', color: '#8B4513', fontFamily: 'Georgia, serif' }}>
            PUTHIYAM PRODUCTS
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#666' }}>Quality Products, Trusted Service</p>
          <p style={{ margin: '8px 0 0', fontSize: '10px', color: '#888' }}>{orderDate}</p>
        </div>

        {/* Customer Details */}
        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#FFF8DC', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '12px', color: '#8B4513', fontWeight: 'bold' }}>Customer Details</h3>
          <p style={{ margin: '2px 0', fontSize: '12px', color: '#333' }}>
            <strong>Name:</strong> {customerName}
          </p>
          <p style={{ margin: '2px 0', fontSize: '12px', color: '#333' }}>
            <strong>Phone:</strong> {customerPhone}
          </p>
          {deliveryType === 'shipping' && customerAddress && (
            <p style={{ margin: '2px 0', fontSize: '12px', color: '#333' }}>
              <strong>Address:</strong> {customerAddress}
            </p>
          )}
          <p style={{ margin: '2px 0', fontSize: '12px', color: '#333' }}>
            <strong>Delivery:</strong> {deliveryType === 'shipping' ? 'Home Delivery' : 'Self Pickup'}
          </p>
        </div>

        {/* Order Items */}
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '12px', color: '#8B4513', fontWeight: 'bold' }}>Order Items</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <th style={{ textAlign: 'left', padding: '6px 4px', color: '#666' }}>Item</th>
                <th style={{ textAlign: 'center', padding: '6px 4px', color: '#666' }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '6px 4px', color: '#666' }}>Price</th>
                <th style={{ textAlign: 'right', padding: '6px 4px', color: '#666' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px 4px', color: '#333' }}>{item.name}</td>
                  <td style={{ textAlign: 'center', padding: '6px 4px', color: '#333' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '6px 4px', color: '#333' }}>₹{item.price}</td>
                  <td style={{ textAlign: 'right', padding: '6px 4px', color: '#333', fontWeight: 'bold' }}>
                    ₹{item.price * item.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bill Summary */}
        <div style={{ borderTop: '2px dashed #8B4513', paddingTop: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
            <span style={{ color: '#666' }}>Subtotal:</span>
            <span style={{ color: '#333' }}>₹{subtotal}</span>
          </div>
          {deliveryType === 'shipping' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
              <span style={{ color: '#666' }}>Shipping:</span>
              <span style={{ color: shippingCost === 0 ? '#228B22' : '#333' }}>
                {shippingCost === 0 ? 'FREE' : `₹${shippingCost}`}
              </span>
            </div>
          )}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid #ddd',
            fontSize: '16px',
            fontWeight: 'bold',
          }}>
            <span style={{ color: '#333' }}>Grand Total:</span>
            <span style={{ color: '#8B4513' }}>₹{total}</span>
          </div>
        </div>

        {/* Payment Status */}
        <div style={{
          textAlign: 'center',
          padding: '10px',
          backgroundColor: paymentStatus === 'paid' ? '#E8F5E9' : '#FFF3E0',
          borderRadius: '8px',
          marginBottom: '16px',
        }}>
          <span style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: paymentStatus === 'paid' ? '#2E7D32' : '#E65100',
          }}>
            {paymentStatus === 'paid' ? '✅ PAID' : '⏳ PAYMENT PENDING (COD)'}
          </span>
          <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#666' }}>
            Payment Method: {paymentMethod === 'online' ? 'Online (UPI)' : 'Cash on Delivery'}
          </p>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '10px', color: '#888' }}>
          <p style={{ margin: '0' }}>📞 Contact: 9361284773</p>
          <p style={{ margin: '4px 0 0' }}>Thank you for shopping with us!</p>
        </div>
      </div>
    );
  }
);

CheckoutBillImage.displayName = 'CheckoutBillImage';

export default CheckoutBillImage;
