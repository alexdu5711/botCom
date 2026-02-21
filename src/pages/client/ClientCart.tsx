import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trash2, Plus, Minus, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { useCart } from '../../store/useCart';
import { Button } from '../../components/ui/Button';
import { Input, TextArea } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { formatPrice } from '../../lib/utils';
import { createOrder, saveClient, getClient } from '../../services/db';

export default function ClientCart() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { items, total, updateQuantity, removeItem, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    firstName: '',
    phone: clientId || '',
    location: '',
    date: '',
    details: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    
    setLoading(true);
    setError(null);
    try {
      const clientUniqueId = formData.phone;
      // 1. Check if client exists for this specific seller, if not save them
      const existingClient = await getClient(clientUniqueId, clientId!);
      if (!existingClient) {
        await saveClient({
          id: clientUniqueId,
          sellerId: clientId!,
          phone: formData.phone,
          name: formData.name,
          firstName: formData.firstName,
          createdAt: new Date()
        });
      }

      // 2. Create Order
      const reference = await createOrder({
        sellerId: clientId!,
        clientId: clientUniqueId,
        items: items.map(item => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        total,
        status: 'processing',
        deliveryDetails: formData
      });

      setOrderSuccess(reference);
      clearCart();
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
        <Button onClick={() => navigate(`/client/${clientId}/orders`)} className="w-full">
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
        <Button onClick={() => navigate(`/client/${clientId}`)}>
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
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
        <Input 
          label="Lieu de livraison" 
          placeholder="Quartier, Rue, Maison..." 
          required 
          value={formData.location}
          onChange={e => setFormData({...formData, location: e.target.value})}
        />
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
