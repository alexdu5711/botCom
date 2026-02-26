import { getClient, saveClient } from '../../services/db';
import { Client } from '../../types';
import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, Plus, ShoppingBag, Package, MapPin, ChevronLeft, ChevronRight, Tag } from 'lucide-react';
import { getCategories, getProducts, getSeller } from '../../services/db';
import { Category, Product } from '../../types';
import { useCart } from '../../store/useCart';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { formatPrice, cn } from '../../lib/utils';

const PROMO_TAB = '__PROMO__';

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
  const cartItems = useCart(state => state.items);
  const clientName = useCart(state => state.clientName);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const productQuantities = cartItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.id] = item.quantity;
    return acc;
  }, {});
  const base = `/client/${sellerId}/${clientId}`;

  const hasPromos = products.some(p => p.promotionPrice !== undefined && p.promotionPrice < p.price);

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

  const filteredProducts = products
    .filter(p => {
      let matchCategory: boolean;
      if (selectedCategory === PROMO_TAB) {
        matchCategory = p.promotionPrice !== undefined && p.promotionPrice < p.price;
      } else {
        matchCategory = !selectedCategory || p.categoryId === selectedCategory;
      }
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    })
    .sort((a, b) => {
      const aRupture = a.isOutOfStock || a.stock === 0 ? 1 : 0;
      const bRupture = b.isOutOfStock || b.stock === 0 ? 1 : 0;
      return aRupture - bRupture;
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

      {/* Categories + Promos tab — sticky sliding */}
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

          {hasPromos && (
            <button
              onClick={() => handleFilter(() => setSelectedCategory(PROMO_TAB))}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCategory === PROMO_TAB
                  ? "bg-orange-500 text-white"
                  : "bg-orange-50 text-orange-600 border border-orange-200"
              }`}
            >
              <Tag size={13} />
              Promotions
            </button>
          )}

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
          pagedProducts.map((product, index) => {
            const isRupture = product.isOutOfStock || product.stock === 0;
            const hasPromo = product.promotionPrice !== undefined && product.promotionPrice < product.price;
            const effectivePrice = hasPromo ? product.promotionPrice! : product.price;
            const showStock = product.stock !== undefined && product.stock > 0 && product.stock <= 10;

            return (
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
                      className={cn(
                        "object-cover w-full h-full group-hover:scale-110 transition-transform duration-500",
                        isRupture && "opacity-40 grayscale"
                      )}
                      referrerPolicy="no-referrer"
                    />

                    {/* Promo badge */}
                    {hasPromo && !isRupture && (
                      <div className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Promo
                      </div>
                    )}

                    {/* Rupture overlay */}
                    {isRupture && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                          Rupture
                        </span>
                      </div>
                    )}

                    {/* Cart quantity badge */}
                    {productQuantities[product.id] > 0 && !isRupture && (
                      <div className="absolute top-2 right-2 min-w-6 h-6 px-1.5 rounded-full bg-black text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-black/20">
                        {productQuantities[product.id]}
                      </div>
                    )}
                  </div>

                  <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-sm line-clamp-1">{product.name}</h3>
                      <p className="text-zinc-500 text-xs line-clamp-2 mt-1">{product.description}</p>
                    </div>
                    <div className="flex items-end justify-between mt-2">
                      <div className="flex flex-col">
                        {hasPromo ? (
                          <>
                            <span className="font-bold text-sm text-orange-600">{formatPrice(effectivePrice)}</span>
                            <span className="text-[11px] line-through text-zinc-400">{formatPrice(product.price)}</span>
                          </>
                        ) : (
                          <span className="font-bold text-sm">{formatPrice(product.price)}</span>
                        )}
                        {showStock && (
                          <span className={cn(
                            "text-[10px] font-semibold mt-0.5",
                            product.stock! <= 3 ? "text-red-500" : "text-orange-500"
                          )}>
                            {product.stock} restant{product.stock !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <Button
                        size="icon"
                        className={cn("rounded-full w-8 h-8", isRupture && "opacity-40 cursor-not-allowed")}
                        onClick={() => !isRupture && addItem({ ...product, price: effectivePrice })}
                        disabled={isRupture}
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })
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

      {cartCount > 0 && (
        <div className="fixed bottom-24 left-4 right-4 z-40 max-w-md mx-auto">
          <Link to={`${base}/cart`} className="block">
            <Button className="w-full h-12 rounded-2xl shadow-xl shadow-black/20 flex items-center justify-center gap-2">
              <ShoppingBag size={18} />
              Valider mon panier
              <span className="ml-1 inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-white text-black text-xs font-bold">
                {cartCount}
              </span>
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
