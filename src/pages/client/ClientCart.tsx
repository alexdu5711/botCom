import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trash2, Plus, Minus, ShoppingBag, CheckCircle2, MapPin } from 'lucide-react';
import { useCart } from '../../store/useCart';
import { Button } from '../../components/ui/Button';
import { Input, TextArea } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { formatPrice } from '../../lib/utils';
import { createOrder, saveClient, getClient, getSeller, updateClientInfo } from '../../services/db';
import { notifyNewOrder } from '../../services/whatsapp';
import { Seller } from '../../types';

const splitNameAndFirstName = (rawValue: string) => {
  const value = rawValue.trim();
  if (!value) return { name: '', firstName: '' };

  if (value.includes('+')) {
    const [namePart, ...firstNameParts] = value.split('+').map(part => part.trim()).filter(Boolean);
    return { name: namePart || '', firstName: firstNameParts.join(' ') };
  }

  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return { name: parts[0], firstName: parts.slice(1).join(' ') };
  }

  return { name: value, firstName: '' };
};

export default function ClientCart() {
  const { sellerId, clientId } = useParams();
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, clearCart } = useCart();
  const clientNameFromStore = useCart(state => state.clientName);
  const total = useCart(state => state.items.reduce((acc, item) => acc + item.price * item.quantity, 0));
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [sellerLogo, setSellerLogo] = useState('');
  const [seller, setSeller] = useState<Seller | null>(null);

  const [formData, setFormData] = useState({
    name: clientNameFromStore || '',
    firstName: '',
    phone: clientId || '',
    location: '',
    date: '',
    details: ''
  });

  useEffect(() => {
    if (!clientNameFromStore) return;
    const { name, firstName } = splitNameAndFirstName(clientNameFromStore);
    setFormData(prev => {
      const nextName = prev.name || name;
      const nextFirstName = prev.firstName || firstName;
      if (nextName === prev.name && nextFirstName === prev.firstName) return prev;
      return { ...prev, name: nextName, firstName: nextFirstName };
    });
  }, [clientNameFromStore]);

  useEffect(() => {
    const prefill = async () => {
      if (!clientId || !sellerId) return;
      const [client, seller] = await Promise.all([
        getClient(clientId, sellerId),
        getSeller(sellerId)
      ]);
      if (client?.deliveryPlace) {
        setFormData(prev => ({ ...prev, location: client.deliveryPlace! }));
      }
      if (client?.name) setFormData(prev => ({ ...prev, name: client.name }));
      if (client?.firstName) setFormData(prev => ({ ...prev, firstName: client.firstName! }));
      if (seller) {
        setSeller(seller);
        if (seller.logoUrl) setSellerLogo(seller.logoUrl);
      }
    };
    prefill();
  }, [clientId, sellerId]);

  const handleGetLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async pos => {
          const { latitude, longitude } = pos.coords;
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
            setFormData(prev => ({ ...prev, location: lieu }));
          } catch {
            setFormData(prev => ({ ...prev, location: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    
    setLoading(true);
    setError(null);
    try {
      const resolvedName = (formData.name || clientNameFromStore).trim();
      if (!resolvedName) {
        setError('Veuillez renseigner votre nom.');
        setLoading(false);
        return;
      }
      const clientUniqueId = formData.phone;
      const deliveryDetails = {
        ...formData,
        name: resolvedName
      };
      // 1. Créer ou mettre à jour le client (nom/prénom toujours à jour)
      const existingClient = await getClient(clientUniqueId, sellerId!);
      if (!existingClient) {
        await saveClient({
          id: clientUniqueId,
          sellerId: sellerId!,
          phone: formData.phone,
          name: resolvedName,
          firstName: formData.firstName,
          createdAt: new Date()
        });
      } else {
        await updateClientInfo(clientUniqueId, sellerId!, {
          name: resolvedName,
          firstName: formData.firstName,
        });
      }

      // 2. Create Order
      const reference = await createOrder({
        sellerId: sellerId!,
        clientId: clientUniqueId,
        items: items.map(item => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        total,
        status: 'processing',
        deliveryDetails
      });

      setOrderSuccess(reference);
      clearCart();
      if (seller) notifyNewOrder(seller.id, seller.phone, clientId!, reference);
    } catch (error) {
      console.error("Error placing order:", error);
      setError("Une erreur est survenue lors de la commande.");
    } finally {
      setLoading(false);
    }
  };

  if (orderSuccess) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20 text-center space-y-6"
      >
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
          <CheckCircle2 size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Commande Validée !</h2>
          <p className="text-zinc-500">Votre commande a été enregistrée avec succès.</p>
          <div className="bg-zinc-100 px-4 py-2 rounded-lg font-mono font-bold text-lg mt-4">
            {orderSuccess}
          </div>
        </div>
        <Button onClick={() => navigate(`/client/${sellerId}/${clientId}/orders`)} className="w-full">
          Suivre mes commandes
        </Button>
      </motion.div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-16 h-16 bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center">
          <ShoppingBag size={32} />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-lg">Votre panier est vide</h3>
          <p className="text-zinc-500">Ajoutez des produits pour commander.</p>
        </div>
        <Button onClick={() => navigate(`/client/${sellerId}/${clientId}`)}>
          Voir les produits
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Mon Panier</h2>
      
      {/* Cart Items */}
      <div className="space-y-4">
        {items.map(item => (
          <Card key={item.id} className="flex items-center p-3 gap-4">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-zinc-100 flex-shrink-0">
              <img src={item.imageUrl || sellerLogo || `https://picsum.photos/400/400?random=${item.id}`} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">{item.name}</h4>
              <p className="text-zinc-500 text-xs">{formatPrice(item.price)}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-zinc-200 rounded-lg">
                <button 
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="p-1 text-zinc-500 hover:text-black"
                >
                  <Minus size={16} />
                </button>
                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                <button 
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="p-1 text-zinc-500 hover:text-black"
                >
                  <Plus size={16} />
                </button>
              </div>
              <button onClick={() => removeItem(item.id)} className="text-zinc-400 hover:text-red-500">
                <Trash2 size={18} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-black text-white p-6 rounded-2xl space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-zinc-400">Total</span>
          <span className="text-2xl font-bold">{formatPrice(total)}</span>
        </div>
      </div>

      {/* Checkout Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <h3 className="text-lg font-bold">Détails de livraison</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input 
            label="Nom" 
            placeholder="Votre nom" 
            required 
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
          />
          <Input 
            label="Prénoms" 
            placeholder="Votre prénom" 
            required 
            value={formData.firstName}
            onChange={e => setFormData({...formData, firstName: e.target.value})}
          />
        </div>
        <Input 
          label="Téléphone" 
          placeholder="Numéro de téléphone" 
          required 
          value={formData.phone}
          onChange={e => setFormData({...formData, phone: e.target.value})}
        />
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              label="Lieu de livraison"
              placeholder="Quartier, Rue, Maison..."
              required
              value={formData.location}
              onChange={e => setFormData({...formData, location: e.target.value})}
            />
          </div>
          <Button type="button" onClick={handleGetLocation} disabled={locationLoading} className="px-3 h-11 flex-shrink-0">
            {locationLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <MapPin size={20} />}
          </Button>
        </div>
        <Input 
          label="Date de livraison" 
          type="date" 
          required 
          value={formData.date}
          onChange={e => setFormData({...formData, date: e.target.value})}
        />
        <TextArea 
          label="Détails supplémentaires" 
          placeholder="Instructions pour le livreur..." 
          value={formData.details}
          onChange={e => setFormData({...formData, details: e.target.value})}
        />
        
        <Button type="submit" className="w-full h-14 text-lg" isLoading={loading}>
          Valider la commande
        </Button>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </form>
    </div>
  );
}

