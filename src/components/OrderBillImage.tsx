import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { getOrderIdForDisplay } from '@/utils/orderIdGenerator';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  selectedVariant?: { weight: string; price: number };
}

interface OrderBillImageProps {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  deliveryType: string;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  createdAt: string;
}

const OrderBillImage = forwardRef<HTMLDivElement, OrderBillImageProps>(({
  orderId,
  customerName,
  customerPhone,
  customerAddress,
  deliveryType,
  paymentMethod,
  paymentStatus,
  orderStatus,
  items,
  subtotal,
  shippingCost,
  total,
  createdAt,
}, ref) => {
  const displayOrderId = getOrderIdForDisplay(orderId);

  return (
    <div
      ref={ref}
      style={{
        width: '400px',
        padding: '24px',
        backgroundColor: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#1a1a1a',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px dashed #e0e0e0', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#8B5CF6', margin: 0 }}>
          🛍️ PUTHIYAM PRODUCTS
        </h1>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
          Quality Products • Delivered with Love
        </p>
        <div style={{ 
          marginTop: '10px', 
          padding: '6px 12px', 
          backgroundColor: '#F3F4F6', 
          borderRadius: '6px',
          display: 'inline-block'
        }}>
          <p style={{ fontSize: '14px', color: '#333', margin: 0, fontWeight: 'bold' }}>
            Order ID: {displayOrderId}
          </p>
        </div>
      </div>

      {/* Order Date & Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '12px' }}>
        <span style={{ color: '#666' }}>
          📅 {format(new Date(createdAt), 'dd MMM yyyy, hh:mm a')}
        </span>
        <span style={{
          backgroundColor: orderStatus === 'delivered' ? '#22c55e' : orderStatus === 'cancelled' ? '#ef4444' : '#f59e0b',
          color: 'white',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '10px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
        }}>
          {orderStatus}
        </span>
      </div>

      {/* Customer Details */}
      <div style={{ backgroundColor: '#f8f8f8', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
        <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '14px' }}>
          👤 {customerName}
        </p>
        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#666' }}>
          📞 {customerPhone}
        </p>
        {customerAddress && (
          <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
            📍 {customerAddress}
          </p>
        )}
        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#888' }}>
          🚚 {deliveryType === 'shipping' ? 'Home Delivery' : 'Self Pickup'}
        </p>
      </div>

      {/* Items */}
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
          ORDER ITEMS:
        </p>
        {items.map((item, index) => (
          <div key={index} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: index < items.length - 1 ? '1px solid #eee' : 'none',
            fontSize: '13px',
          }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: '500' }}>{item.name}</span>
              {item.selectedVariant && (
                <span style={{ color: '#666', fontSize: '11px', marginLeft: '4px' }}>
                  ({item.selectedVariant.weight})
                </span>
              )}
              <span style={{ color: '#888', marginLeft: '8px' }}>× {item.quantity}</span>
            </div>
            <span style={{ fontWeight: '500' }}>
              ₹{(item.selectedVariant?.price || item.price) * item.quantity}
            </span>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div style={{ borderTop: '2px dashed #e0e0e0', paddingTop: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', color: '#666' }}>
          <span>Subtotal</span>
          <span>₹{subtotal}</span>
        </div>
        {shippingCost > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', color: '#666' }}>
            <span>Shipping</span>
            <span>₹{shippingCost}</span>
          </div>
        )}
        {shippingCost === 0 && deliveryType === 'shipping' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', color: '#22c55e' }}>
            <span>Shipping</span>
            <span>FREE</span>
          </div>
        )}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '16px',
          fontWeight: 'bold',
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid #ddd',
        }}>
          <span>GRAND TOTAL</span>
          <span style={{ color: '#8B5CF6' }}>₹{total}</span>
        </div>
      </div>

      {/* Payment Info */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        backgroundColor: paymentStatus === 'paid' ? '#dcfce7' : '#fef3c7',
        borderRadius: '8px',
        textAlign: 'center',
        fontSize: '12px',
      }}>
        <span style={{ fontWeight: 'bold', color: paymentStatus === 'paid' ? '#166534' : '#92400e' }}>
          {paymentStatus === 'paid' ? '✅ PAID' : '⏳ PAYMENT PENDING'}
        </span>
        <span style={{ marginLeft: '8px', color: '#666' }}>
          via {paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment (UPI)'}
        </span>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '20px',
        textAlign: 'center',
        fontSize: '10px',
        color: '#999',
        borderTop: '1px solid #eee',
        paddingTop: '12px',
      }}>
        <p style={{ margin: '0 0 4px 0' }}>Thank you for shopping with us! 🙏</p>
        <p style={{ margin: '0' }}>
          📞 9361284773 | WhatsApp for support
        </p>
        <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: '#8B5CF6' }}>
          UPI: kathaiahkarthik@okhdfcbank (TMB Bank)
        </p>
      </div>
    </div>
  );
});

OrderBillImage.displayName = 'OrderBillImage';

export default OrderBillImage;
