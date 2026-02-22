import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  useParams, 
  useNavigate,
  Link,
  useLocation
} from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  User, 
  LayoutDashboard, 
  Package, 
  List, 
  Users, 
  ChevronLeft,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle
} from 'lucide-react';

// Pages & Components (to be created)
import { useCart } from './store/useCart';
import ClientHome from './pages/client/ClientHome';
import ClientCart from './pages/client/ClientCart';
import ClientOrders from './pages/client/ClientOrders';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminCategories from './pages/admin/AdminCategories';
import AdminClients from './pages/admin/AdminClients';
import SuperAdminSellers from './pages/admin/SuperAdminSellers';
import Login from './pages/admin/Login';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from './lib/firebase';
import { getAppUser, getSeller } from './services/db';
import { AppUser, Seller } from './types';
import { LogOut } from 'lucide-react';

// Auth Context
interface AuthContextType {
  user: FirebaseUser | null;
  appUser: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userData = await getAppUser(u.uid);
        setAppUser(userData);
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    if (auth) await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, appUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const ProtectedRoute = ({ children, requireSuperAdmin = false }: { children: React.ReactNode, requireSuperAdmin?: boolean }) => {
  const { user, appUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireSuperAdmin && appUser?.role !== 'super_admin') {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

// Layouts
const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  const { sellerId, clientId } = useParams();
  const location = useLocation();
  const [sellerName, setSellerName] = useState('Eco-Shop');
  const setClientName = useCart(state => state.setClientName);
  const cartCount = useCart(state => state.items.reduce((acc, i) => acc + i.quantity, 0));

  useEffect(() => {
    const fetchSeller = async () => {
      if (sellerId) {
        const { getSeller } = await import('./services/db');
        const seller = await getSeller(sellerId);
        if (seller) setSellerName(seller.shopName);
      }
    };
    fetchSeller();
  }, [sellerId]);

  useEffect(() => {
    const queryName = new URLSearchParams(location.search).get('name');
    if (queryName?.trim()) {
      setClientName(queryName);
    }
  }, [location.search, setClientName]);

  const base = `/client/${sellerId}/${clientId}`;

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-zinc-100 px-4 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <h1 className="text-xl font-bold tracking-tight">{sellerName}</h1>
          <Link to={`${base}/orders`} className="text-zinc-500 hover:text-black transition-colors">
            <Clock size={22} />
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-100 px-6 py-3">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <Link
            to={base}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              location.pathname === base ? "text-black" : "text-zinc-400"
            )}
          >
            <Package size={24} />
            <span className="text-[10px] font-medium uppercase tracking-wider">Boutique</span>
          </Link>
          <Link
            to={`${base}/cart`}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors relative",
              location.pathname === `${base}/cart` ? "text-black" : "text-zinc-400"
            )}
          >
            <div className="relative">
              <ShoppingBag size={24} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-black text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider">Panier</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { appUser, logout } = useAuth();
  const [currentSeller, setCurrentSeller] = useState<Seller | null>(null);
  
  // Use sellerId from search params if super_admin, otherwise use from appUser
  const currentSellerId = appUser?.role === 'super_admin' 
    ? (searchParams.get('sellerId') || appUser?.sellerId)
    : appUser?.sellerId;

  useEffect(() => {
    const fetchSellerDetails = async () => {
      if (currentSellerId) {
        const seller = await getSeller(currentSellerId);
        setCurrentSeller(seller);
      } else {
        setCurrentSeller(null);
      }
    };
    fetchSellerDetails();
  }, [currentSellerId]);

  const getLinkWithSeller = (path: string) => {
    if (appUser?.role === 'super_admin' && currentSellerId) {
      return `${path}?sellerId=${currentSellerId}`;
    }
    return path;
  };
  
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-white border-r border-zinc-100 p-6 flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold">A</div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Eco Admin</h2>
              {currentSeller && (
                <p className="text-[10px] text-zinc-400 font-medium truncate max-w-[120px]">
                  {currentSeller.shopName}
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={logout}
            className="md:hidden p-2 text-zinc-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>

        {appUser && (
          <div className="px-4 py-3 bg-zinc-50 rounded-2xl border border-zinc-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Session</p>
            <p className="text-sm font-bold truncate">{appUser.name}</p>
            <p className="text-[10px] text-zinc-500 capitalize">{appUser.role.replace('_', ' ')}</p>
          </div>
        )}
        
        <nav className="flex flex-col gap-2 flex-1">
          {appUser?.role === 'super_admin' && (
            <AdminNavLink to="/admin/sellers" icon={<Users size={20} />} label="Vendeurs" active={location.pathname === '/admin/sellers'} />
          )}
          
          {(currentSellerId || appUser?.role === 'super_admin') ? (
            <div className="mt-6 pt-6 border-t border-zinc-100 space-y-2">
              <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Gestion Boutique</p>
              <AdminNavLink to={getLinkWithSeller('/admin')} icon={<LayoutDashboard size={20} />} label="Dashboard" active={location.pathname === '/admin'} />
              <AdminNavLink to={getLinkWithSeller('/admin/products')} icon={<Package size={20} />} label="Produits" active={location.pathname === '/admin/products'} />
              <AdminNavLink to={getLinkWithSeller('/admin/categories')} icon={<List size={20} />} label="Catégories" active={location.pathname === '/admin/categories'} />
              <AdminNavLink to={getLinkWithSeller('/admin/clients')} icon={<Users size={20} />} label="Clients" active={location.pathname === '/admin/clients'} />
            </div>
          ) : (
            appUser?.role === 'seller_admin' && (
              <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-700 text-xs text-center">
                Aucune boutique associée à votre compte.
              </div>
            )
          )}
        </nav>

        <div className="mt-auto pt-6 border-t border-zinc-100 hidden md:block">
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-zinc-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>
      
      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
};

const AdminNavLink = ({ to, icon, label, active }: { to: string, icon: React.ReactNode, label: string, active: boolean }) => (
  <Link 
    to={to} 
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
      active ? "bg-black text-white shadow-lg shadow-black/10" : "text-zinc-500 hover:bg-zinc-100"
    )}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </Link>
);

import { cn } from './lib/utils';
import { isConfigured } from './lib/firebase';
import { AlertTriangle, LogOut as LogOutIcon } from 'lucide-react';
import { useSearchParams, Navigate } from 'react-router-dom';

const SetupWarning = () => (
  <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
    <div className="max-w-md w-full bg-white rounded-3xl border border-zinc-100 p-8 shadow-xl shadow-black/5 text-center space-y-6">
      <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
        <AlertTriangle size={40} />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Configuration Requise</h2>
        <p className="text-zinc-500">
          Veuillez configurer vos clés API Firebase dans les secrets de l'AI Studio pour activer les fonctionnalités de l'application.
        </p>
      </div>
      <div className="bg-zinc-50 rounded-2xl p-4 text-left space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Variables requises :</p>
        <ul className="text-sm font-mono text-zinc-600 space-y-1">
          <li>VITE_FIREBASE_API_KEY</li>
          <li>VITE_FIREBASE_PROJECT_ID</li>
          <li>... (voir .env.example)</li>
        </ul>
        <p className="text-[10px] text-zinc-400 mt-4 italic">
          Note: Après configuration, créez votre premier compte Super Admin via la console Firebase (Auth + collection 'users').
        </p>
      </div>
    </div>
  </div>
);

export default function App() {
  if (!isConfigured) {
    return <SetupWarning />;
  }

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Client Routes */}
          <Route path="/client/:sellerId/:clientId" element={<ClientLayout><ClientHome /></ClientLayout>} />
          <Route path="/client/:sellerId/:clientId/cart" element={<ClientLayout><ClientCart /></ClientLayout>} />
          <Route path="/client/:sellerId/:clientId/orders" element={<ClientLayout><ClientOrders /></ClientLayout>} />
          
          {/* Auth */}
          <Route path="/login" element={<Login />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/products" element={<ProtectedRoute><AdminLayout><AdminProducts /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/categories" element={<ProtectedRoute><AdminLayout><AdminCategories /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/clients" element={<ProtectedRoute><AdminLayout><AdminClients /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/sellers" element={<ProtectedRoute requireSuperAdmin><AdminLayout><SuperAdminSellers /></AdminLayout></ProtectedRoute>} />
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
