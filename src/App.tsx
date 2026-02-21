import { addDefaultProducts } from './lib/addDefaultProducts';
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
import ClientHome from './pages/client/ClientHome';
import ClientCart from './pages/client/ClientCart';
import ClientOrders from './pages/client/ClientOrders';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminCategories from './pages/admin/AdminCategories';
import AdminClients from './pages/admin/AdminClients';
import SuperAdminSellers from './pages/admin/SuperAdminSellers';

// Layouts
const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  const { clientId } = useParams();
  const location = useLocation();
  const [sellerName, setSellerName] = useState('Eco-Shop');

  useEffect(() => {
    const fetchSeller = async () => {
      if (clientId) {
        const { getSeller } = await import('./services/db');
        const seller = await getSeller(clientId);
        if (seller) setSellerName(seller.shopName);
      }
    };
    fetchSeller();
  }, [clientId]);
  
  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-zinc-100 px-4 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <h1 className="text-xl font-bold tracking-tight">{sellerName}</h1>
          <div className="flex items-center gap-4">
            <Link to={`/client/${clientId}/orders`} className="text-zinc-500 hover:text-black transition-colors">
              <Clock size={22} />
            </Link>
          </div>
        </div>
      </header>
      
      <main className="max-w-md mx-auto px-4 py-6">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-100 px-6 py-3">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <Link 
            to={`/client/${clientId}`} 
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              location.pathname === `/client/${clientId}` ? "text-black" : "text-zinc-400"
            )}
          >
            <Package size={24} />
            <span className="text-[10px] font-medium uppercase tracking-wider">Boutique</span>
          </Link>
          <Link 
            to={`/client/${clientId}/cart`} 
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              location.pathname === `/client/${clientId}/cart` ? "text-black" : "text-zinc-400"
            )}
          >
            <ShoppingBag size={24} />
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
  const sellerId = searchParams.get('sellerId');
  
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-white border-r border-zinc-100 p-6 flex flex-col gap-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold">A</div>
          <h2 className="text-lg font-bold">Eco Admin</h2>
        </div>
        
        <nav className="flex flex-col gap-2">
          <AdminNavLink to="/admin/sellers" icon={<Users size={20} />} label="Vendeurs" active={location.pathname === '/admin/sellers'} />
          
          {sellerId && (
            <div className="mt-6 pt-6 border-t border-zinc-100 space-y-2">
              <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Gestion Boutique</p>
              <AdminNavLink to={`/admin?sellerId=${sellerId}`} icon={<LayoutDashboard size={20} />} label="Dashboard" active={location.pathname === '/admin' && !!sellerId} />
              <AdminNavLink to={`/admin/products?sellerId=${sellerId}`} icon={<Package size={20} />} label="Produits" active={location.pathname === '/admin/products'} />
              <AdminNavLink to={`/admin/categories?sellerId=${sellerId}`} icon={<List size={20} />} label="Catégories" active={location.pathname === '/admin/categories'} />
              <AdminNavLink to={`/admin/clients?sellerId=${sellerId}`} icon={<Users size={20} />} label="Clients" active={location.pathname === '/admin/clients'} />
            </div>
          )}
        </nav>
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
import { AlertTriangle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

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
      </div>
    </div>
  </div>
);

export default function App() {
    useEffect(() => {
      addDefaultProducts();
    }, []);
  if (!isConfigured) {
    return <SetupWarning />;
  }

  return (
    <Router>
      <Routes>
        {/* Client Routes */}
        <Route path="/client/:clientId" element={<ClientLayout><ClientHome /></ClientLayout>} />
        <Route path="/client/:clientId/cart" element={<ClientLayout><ClientCart /></ClientLayout>} />
        <Route path="/client/:clientId/orders" element={<ClientLayout><ClientOrders /></ClientLayout>} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
        <Route path="/admin/products" element={<AdminLayout><AdminProducts /></AdminLayout>} />
        <Route path="/admin/categories" element={<AdminLayout><AdminCategories /></AdminLayout>} />
        <Route path="/admin/clients" element={<AdminLayout><AdminClients /></AdminLayout>} />
        <Route path="/admin/sellers" element={<AdminLayout><SuperAdminSellers /></AdminLayout>} />
        
        {/* Default redirect */}
        <Route path="/" element={<div className="p-10 text-center">
          <Link to="/admin/sellers" className="text-blue-500 underline">Accéder à l'administration</Link>
        </div>} />
      </Routes>
    </Router>
  );
}
