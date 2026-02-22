import { getClient, saveClient } from '../../services/db';
import { Client } from '../../types';
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, Plus, ShoppingBag, Package, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { getCategories, getProducts, getSeller } from '../../services/db';
import { Category, Product } from '../../types';
import { useCart } from '../../store/useCart';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { formatPrice } from '../../lib/utils';

export default function ClientHome() {
  const { clientId: paramClientId, sellerId } = useParams();
  const clientId = paramClientId || '';
  const [client, setClient] = useState<Client | null>(null);
  const [deliveryPlace, setDeliveryPlace] = useState('');
  const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [loading, setLoading] = useState(true);
  const [sellerLogo, setSellerLogo] = useState('');
  const addItem = useCart(state => state.addItem);
  const clientName = useCart(state => state.clientName);

  useEffect(() => {
    const checkClient = async () => {
      if (!clientId || !sellerId) return;
      const found = await getClient(clientId, sellerId);
      if (found) {
        setClient(found);
        setShowDeliveryForm(false);
      } else {
        setShowDeliveryForm(true);
      }
    };
    checkClient();
  }, [clientId, sellerId]);

  const handleGetLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async pos => {
          const { latitude, longitude } = pos.coords;
          setGpsLocation({ latitude, longitude });
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
              { headers: { 'Accept-Language': 'fr' } }
            );
            const data = await res.json();
            console.log('Nominatim full response:', data);
            console.log('Address fields:', data.address);
            const addr = data.address;
            const parts = [
              addr.road,
              addr.quarter,
              addr.suburb || addr.neighbourhood || addr.village,
              addr.city || addr.town || addr.county,
            ].filter(Boolean);
            const lieu = parts.length > 0 ? parts.join(', ') : data.display_name;
            setDeliveryPlace(lieu);
          } catch {
            setDeliveryPlace(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          }
          setLocationLoading(false);
        },
        () => {
          setLocationLoading(false);
          alert("Impossible d'obtenir la localisation.");
        }
      );
    } else {
      setLocationLoading(false);
      alert("La géolocalisation n'est pas supportée.");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!clientId) return;
      try {
        const [cats, prods, seller] = await Promise.all([
          getCategories(sellerId || ''),
          getProducts(sellerId || ''),
          getSeller(sellerId || '')
        ]);
        setCategories(cats);
        setProducts(prods);
        if (seller?.logoUrl) setSellerLogo(seller.logoUrl);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [sellerId]);

  const handleSaveDelivery = async () => {
    if (!clientId || !sellerId || !deliveryPlace) return;
    const clientData: Client = {
      id: clientId,
      sellerId,
      deliveryPlace,
      ...(gpsLocation ? { location: gpsLocation } : {}),
      createdAt: new Date().toISOString()
    } as Client;
    await saveClient(clientData);
    setShowDeliveryForm(false);
    setClient(clientData);
  };

  const filteredProducts = products.filter(p => {
    const matchCategory = !selectedCategory || p.categoryId === selectedCategory;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const pagedProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilter = (cb: () => void) => { cb(); setPage(1); };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 font-medium">Chargement des produits...</p>
      </div>
    );
  }

  if (showDeliveryForm) {
    return (
      <div className="max-w-md mx-auto py-20">
        <h2 className="text-xl font-bold mb-4">
          {clientName ? `Bienvenue, ${clientName} !` : 'Bienvenue !'}
        </h2>
        <p className="mb-4 text-zinc-500">Indiquez votre lieu de livraison pour accéder à la boutique.</p>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={deliveryPlace}
            onChange={e => setDeliveryPlace(e.target.value)}
            placeholder="Lieu de livraison"
            className="border border-zinc-300 rounded-lg px-4 py-2 flex-1"
          />
          <Button type="button" onClick={handleGetLocation} disabled={locationLoading} className="px-3">
            {locationLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <MapPin size={20} />}
          </Button>
        </div>
        <Button onClick={handleSaveDelivery} className="w-full">Valider</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => handleFilter(() => setSearch(e.target.value))}
          placeholder="Rechercher un produit..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm outline-none focus:border-black transition-colors"
        />
      </div>

      {/* Categories — sticky sliding */}
      <div className="sticky top-[61px] z-30 bg-zinc-50 -mx-4 px-4 py-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => handleFilter(() => setSelectedCategory(null))}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === null
                ? "bg-black text-white"
                : "bg-white text-zinc-500 border border-zinc-200"
            }`}
          >
            Tout
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => handleFilter(() => setSelectedCategory(category.id))}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === category.id
                  ? "bg-black text-white"
                  : "bg-white text-zinc-500 border border-zinc-200"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 gap-4">
        {pagedProducts.length > 0 ? (
          pagedProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full flex flex-col group">
                <div className="aspect-square relative overflow-hidden bg-zinc-100">
                  <img 
                    src={product.imageUrl || sellerLogo || `https://picsum.photos/400/400?random=${product.id}`}
                    alt={product.name}
                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-sm line-clamp-1">{product.name}</h3>
                    <p className="text-zinc-500 text-xs line-clamp-2 mt-1">{product.description}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-sm">{formatPrice(product.price)}</span>
                    <Button 
                      size="icon" 
                      className="rounded-full w-8 h-8"
                      onClick={() => addItem(product)}
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        ) : (
          <div className="col-span-2 py-20 text-center space-y-2">
            <Package className="mx-auto text-zinc-300" size={48} />
            <p className="text-zinc-500 font-medium">Aucun produit trouvé</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-zinc-100 rounded-2xl px-4 py-3 shadow-sm">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 disabled:opacity-30 hover:text-black transition-colors"
          >
            <ChevronLeft size={16} />
            Préc.
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => {
              const isActive = n === page;
              const isNear = Math.abs(n - page) <= 1 || n === 1 || n === totalPages;
              if (!isNear) {
                return n === page - 2 || n === page + 2
                  ? <span key={n} className="w-6 text-center text-zinc-300 text-sm">…</span>
                  : null;
              }
              return (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-black text-white shadow-md shadow-black/20'
                      : 'text-zinc-500 hover:bg-zinc-100'
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 disabled:opacity-30 hover:text-black transition-colors"
          >
            Suiv.
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
