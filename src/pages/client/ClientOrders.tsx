import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Clock, CheckCircle2, XCircle, AlertCircle, Package } from 'lucide-react';
import { getClientOrders } from '../../services/db';
import { Order } from '../../types';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { formatPrice } from '../../lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ClientOrders() {
  const { clientId } = useParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState(localStorage.getItem('client_phone') || '');
  const [hasSearched, setHasSearched] = useState(!!phone);

  const loadOrders = async (phoneToSearch: string) => {
    if (!clientId || !phoneToSearch) return;
    setLoading(true);
    try {
      const data = await getClientOrders(phoneToSearch, clientId);
      setOrders(data);
      setHasSearched(true);
      localStorage.setItem('client_phone', phoneToSearch);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (phone) {
      loadOrders(phone);
    }
  }, [clientId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders(phone);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'processing':
        return { label: 'En cours', color: 'text-amber-600 bg-amber-50', icon: <Clock size={16} /> };
      case 'processed':
        return { label: 'Traité', color: 'text-green-600 bg-green-50', icon: <CheckCircle2 size={16} /> };
      case 'cancelled':
        return { label: 'Annulé', color: 'text-zinc-500 bg-zinc-50', icon: <XCircle size={16} /> };
      case 'refused':
        return { label: 'Refusé', color: 'text-red-600 bg-red-50', icon: <AlertCircle size={16} /> };
      default:
        return { label: status, color: 'text-zinc-500 bg-zinc-50', icon: <Clock size={16} /> };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 font-medium">Chargement de vos commandes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Mes Commandes</h2>
        <p className="text-zinc-500 text-sm">Entrez votre numéro de téléphone pour suivre vos commandes.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1">
          <Input 
            placeholder="Votre numéro de téléphone" 
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
          />
        </div>
        <Button type="submit" isLoading={loading}>
          Suivre
        </Button>
      </form>
      
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        ) : hasSearched ? (
          orders.length > 0 ? (
            orders.map((order, index) => {
            const status = getStatusInfo(order.status);
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">Ref: {order.reference}</p>
                      <p className="text-sm font-medium">
                        {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'PPP', { locale: fr }) : 'Date inconnue'}
                      </p>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${status.color}`}>
                      {status.icon}
                      {status.label}
                    </div>
                  </div>
                  
                  <div className="border-t border-zinc-50 pt-3 space-y-2">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-zinc-600">{item.quantity}x {item.name}</span>
                        <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t border-zinc-50">
                    <span className="text-sm font-bold">Total</span>
                    <span className="text-lg font-bold">{formatPrice(order.total)}</span>
                  </div>
                </Card>
              </motion.div>
            );
          })
        ) : (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-zinc-100 text-zinc-300 rounded-full flex items-center justify-center mx-auto">
              <Package size={32} />
            </div>
            <p className="text-zinc-500">Aucune commande trouvée pour ce numéro.</p>
          </div>
        )) : (
          <div className="py-10 text-center text-zinc-400 italic">
            Veuillez entrer votre numéro pour voir vos commandes.
          </div>
        )}
      </div>
    </div>
  );
}
