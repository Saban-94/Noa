export enum OrderStatus {
  PENDING = 'pending',
  READY = 'ready',
  SCHEDULED = 'scheduled',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minLevel: number;
  price: number;
  category: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
  }[];
  driverId?: string;
  driverName?: string;
  status: OrderStatus;
  deliveryAddress: string;
  dueDate: string;
  createdAt: string;
  specialOrder?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  uiComponent?: React.ReactNode;
}
