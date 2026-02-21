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
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase";
import { Category, Product, Order, Client, OrderStatus, Seller, AppUser } from "../types";

const ensureDb = () => {
  if (!db) throw new Error("Database not initialized. Check your Firebase configuration.");
  return db;
};

const ensureStorage = () => {
  if (!storage) throw new Error("Storage not initialized. Check your Firebase configuration.");
  return storage;
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

export const deleteProduct = async (id: string) => {
  const database = ensureDb();
  return await deleteDoc(doc(database, "products", id));
};

export const uploadProductImage = async (file: File): Promise<string> => {
  const store = ensureStorage();
  const storageRef = ref(store, `products/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
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
  const q = query(collection(database, "orders"), where("sellerId", "==", sellerId), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
};

export const getClientOrders = async (clientId: string, sellerId: string): Promise<Order[]> => {
  const database = ensureDb();
  const q = query(
    collection(database, "orders"), 
    where("clientId", "==", clientId), 
    where("sellerId", "==", sellerId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
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

export const getAllClients = async (sellerId: string): Promise<Client[]> => {
  const database = ensureDb();
  const q = query(collection(database, "clients"), where("sellerId", "==", sellerId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
};
