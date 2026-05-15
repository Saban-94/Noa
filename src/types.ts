import React from 'react';

export enum OrderStatus {
  PENDING = 'pending',
  READY = 'ready',
  SCHEDULED = 'scheduled',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export const STATUS_LABELS: Record<string, string> = {
  [OrderStatus.PENDING]: 'ממתין',
  [OrderStatus.READY]: 'מוכן',
  [OrderStatus.SCHEDULED]: 'שובץ',
  [OrderStatus.IN_TRANSIT]: 'בדרך',
  [OrderStatus.DELIVERED]: 'סופק',
  [OrderStatus.CANCELLED]: 'בוטל',
  'סופק': 'סופק'
};

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
  items?: {
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
  }[];
  itemsSummary?: string;
  productList?: string[];
  driverId?: string;
  driverName?: string;
  status: OrderStatus | string;
  deliveryAddress: string;
  dueDate?: string;
  date?: string;
  deliveryDate?: string;
  createdAt: string;
  updatedAt?: string;
  specialOrder?: boolean;
}

// Support for V41 Multiple Collections
export interface SabanDataCollection {
  ai_logs?: any[];
  brands?: any[];
  bridge_sessions?: any[];
  categories?: any[];
  chats?: any[];
  customers?: any[];
  drivers?: any[];
  inventory?: InventoryItem[];
  morning_reports?: any[];
  office_messages?: any[];
  orders?: Order[];
  sales?: any[];
  users?: any[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  uiComponent?: React.ReactNode;
}
