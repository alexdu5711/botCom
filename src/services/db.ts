import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  getDoc,
  setDoc,
  Timestamp
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Category, Product, Order, Client, OrderStatus, Seller, AppUser } from "../types";

const ensureDb = () => {
  if (!db) throw new Error("Database not initialized. Check your Firebase configuration.");
  return db;
};

const CLOUDINARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const CLOUDINARY_KEY   = import.meta.env.VITE_CLOUDINARY_API_KEY as string;
const CLOUDINARY_SECRET = import.meta.env.VITE_CLOUDINARY_API_SECRET as string;

const sha1Hex = async (str: string): Promise<string> => {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
};

// Sellers (Merchants)
export const getSellers = async (): Promise<Seller[]> => {
  const database = ensureDb();
  const snapshot = await getDocs(collection(database, "sellers"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Seller));
};

export const getSeller = async (id: string): Promise<Seller | null> => {
  const database = ensureDb();
  const docRef = doc(database, "sellers", id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Seller;
  }
  return null;
};

export const addSeller = async (seller: Omit<Seller, 'createdAt'>) => {
  const database = ensureDb();
  const docRef = doc(database, "sellers", seller.id);
  return await setDoc(docRef, {
    ...seller,
    createdAt: Timestamp.now()
  });
};

export const updateSeller = async (id: string, data: Partial<Omit<Seller, 'id' | 'createdAt'>>) => {
  const database = ensureDb();
  return await updateDoc(doc(database, "sellers", id), data);
};

// Users
export const createAppUser = async (user: Omit<AppUser, 'createdAt'>) => {
  const database = ensureDb();
  const docRef = doc(database, "users", user.uid);
  return await setDoc(docRef, {
    ...user,
    createdAt: Timestamp.now()
  });
};

export const getAppUser = async (uid: string): Promise<AppUser | null> => {
  const database = ensureDb();
  const docRef = doc(database, "users", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { uid: docSnap.id, ...docSnap.data() } as AppUser;
  }
  return null;
};

// Categories
export const getCategories = async (sellerId: string): Promise<Category[]> => {
  const database = ensureDb();
  const q = query(collection(database, "categories"), where("sellerId", "==", sellerId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
};

export const addCategory = async (name: string, sellerId: string) => {
  const database = ensureDb();
  return await addDoc(collection(database, "categories"), { name, sellerId });
};

export const updateCategory = async (id: string, name: string) => {
  const database = ensureDb();
  return await updateDoc(doc(database, "categories", id), { name });
};

export const deleteCategory = async (id: string) => {
  const database = ensureDb();
  return await deleteDoc(doc(database, "categories", id));
};

// Products
export const getProducts = async (sellerId: string, categoryId?: string): Promise<Product[]> => {
  const database = ensureDb();
  let q = query(collection(database, "products"), where("sellerId", "==", sellerId));
  if (categoryId) {
    q = query(collection(database, "products"), where("sellerId", "==", sellerId), where("categoryId", "==", categoryId));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
};

export const addProduct = async (product: Omit<Product, 'id'>) => {
  const database = ensureDb();
  return await addDoc(collection(database, "products"), product);
};

export const updateProduct = async (id: string, data: Partial<Omit<Product, 'id' | 'sellerId'>>) => {
  const database = ensureDb();
  return await updateDoc(doc(database, "products", id), data);
};

export const deleteProduct = async (id: string) => {
  const database = ensureDb();
  return await deleteDoc(doc(database, "products", id));
};

export const uploadProductImage = async (file: File): Promise<string> => {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await sha1Hex(`timestamp=${timestamp}${CLOUDINARY_SECRET}`);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', CLOUDINARY_KEY);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Cloudinary upload failed');
  const data = await res.json();
  return data.secure_url as string;
};

// Orders
export const createOrder = async (orderData: Omit<Order, 'id' | 'reference' | 'createdAt'>): Promise<string> => {
  const database = ensureDb();
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
  const random = Math.floor(1000 + Math.random() * 9000);
  const reference = `CO-${dateStr}-${random}`;
  
  const docRef = await addDoc(collection(database, "orders"), {
    ...orderData,
    reference,
    createdAt: Timestamp.now()
  });
  return reference;
};

export const getOrders = async (sellerId: string): Promise<Order[]> => {
  const database = ensureDb();
  const q = query(collection(database, "orders"), where("sellerId", "==", sellerId));
  const snapshot = await getDocs(q);
  const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
  
  // Sort client-side to avoid Firestore index requirement
  return orders.sort((a, b) => {
    const dateA = (a.createdAt as any)?.seconds || 0;
    const dateB = (b.createdAt as any)?.seconds || 0;
    return dateB - dateA;
  });
};

export const getClientOrders = async (clientId: string, sellerId: string): Promise<Order[]> => {
  const database = ensureDb();
  const q = query(
    collection(database, "orders"), 
    where("clientId", "==", clientId), 
    where("sellerId", "==", sellerId)
  );
  const snapshot = await getDocs(q);
  const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));

  // Sort client-side to avoid Firestore index requirement
  return orders.sort((a, b) => {
    const dateA = (a.createdAt as any)?.seconds || 0;
    const dateB = (b.createdAt as any)?.seconds || 0;
    return dateB - dateA;
  });
};

export const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
  const database = ensureDb();
  const docRef = doc(database, "orders", orderId);
  return await updateDoc(docRef, { status });
};

// Clients
export const getClient = async (id: string, sellerId: string): Promise<Client | null> => {
  const database = ensureDb();
  const q = query(collection(database, "clients"), where("id", "==", id), where("sellerId", "==", sellerId));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Client;
  }
  return null;
};

export const saveClient = async (client: Client) => {
  const database = ensureDb();
  // We use a composite ID or just addDoc with a query check
  // For simplicity in this mobile-first app, we'll use a unique doc per seller/client
  const clientDocId = `${client.sellerId}_${client.id}`;
  const docRef = doc(database, "clients", clientDocId);
  return await setDoc(docRef, {
    ...client,
    createdAt: Timestamp.now()
  }, { merge: true });
};

export const updateClientInfo = async (clientId: string, sellerId: string, data: { name?: string; firstName?: string; deliveryPlace?: string }) => {
  const database = ensureDb();
  const clientDocId = `${sellerId}_${clientId}`;
  return await updateDoc(doc(database, "clients", clientDocId), data);
};

export const getAllClients = async (sellerId: string): Promise<Client[]> => {
  const database = ensureDb();
  const q = query(collection(database, "clients"), where("sellerId", "==", sellerId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
};
