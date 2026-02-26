export interface Seller {
  id: string; // 7 chars unique ID
  name: string; // Owner name
  shopName: string; // Displayed shop name
  phone: string;
  logoUrl?: string;
  whatsappApiKey?: string;
  whatsappSender?: string;
  createdAt: any;
}

export interface AppUser {
  uid: string;
  email: string;
  sellerId: string;
  role: 'seller_admin' | 'super_admin';
  createdAt: any;
}

export interface Category {
  id: string;
  name: string;
  sellerId: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  imageUrl: string;
  sellerId: string;
  promotionPrice?: number;
  stock?: number;
  isOutOfStock?: boolean;
}

export type OrderStatus = 'processing' | 'processed' | 'cancelled' | 'refused';

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  reference: string;
  sellerId: string;
  clientId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  deliveryDetails: {
    name: string;
    firstName: string;
    phone: string;
    secondContact?: string;
    location: string;
    date: string;
    timeSlot?: string;
    details: string;
  };
  createdAt: any;
}

export interface Client {
  id: string;
  phone: string;
  name: string;
  firstName?: string;
  sellerId: string;
  deliveryPlace?: string;
  location?: { latitude: number; longitude: number };
  createdAt: any;
}
