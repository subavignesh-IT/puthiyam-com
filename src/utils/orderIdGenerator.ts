// Order ID Format: MonthCode + DayOfWeekCode + Date + BillNumber
// Example: BA0801 = February (B), Sunday (A), 08th date, 01st order of the day

const MONTH_CODES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
// A=Jan, B=Feb, C=Mar, D=Apr, E=May, F=Jun, G=Jul, H=Aug, I=Sep, J=Oct, K=Nov, L=Dec

const DAY_CODES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
// A=Sun, B=Mon, C=Tue, D=Wed, E=Thu, F=Fri, G=Sat

export const generateOrderId = (existingOrdersToday: number = 0): string => {
  const now = new Date();
  
  const monthCode = MONTH_CODES[now.getMonth()]; // 0-11 -> A-L
  const dayOfWeekCode = DAY_CODES[now.getDay()]; // 0-6 -> A-G (0 = Sunday)
  const date = String(now.getDate()).padStart(2, '0'); // 01-31
  const billNumber = String(existingOrdersToday + 1).padStart(2, '0'); // 01, 02, ...

  return `${monthCode}${dayOfWeekCode}${date}${billNumber}`;
};

export const parseOrderId = (orderId: string): {
  month: string;
  dayOfWeek: string;
  date: string;
  billNumber: string;
} | null => {
  if (orderId.length < 6) return null;
  
  const monthIndex = MONTH_CODES.indexOf(orderId[0]);
  const dayIndex = DAY_CODES.indexOf(orderId[1]);
  
  if (monthIndex === -1 || dayIndex === -1) return null;
  
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  return {
    month: months[monthIndex],
    dayOfWeek: days[dayIndex],
    date: orderId.slice(2, 4),
    billNumber: orderId.slice(4),
  };
};

export const getOrderIdForDisplay = (orderId: string): string => {
  // If it's our custom format (6 chars), return as-is
  if (orderId.length === 6 && /^[A-L][A-G]\d{4}$/.test(orderId)) {
    return orderId;
  }
  // Otherwise, it's a UUID - return first 8 chars uppercase
  return orderId.slice(0, 8).toUpperCase();
};
