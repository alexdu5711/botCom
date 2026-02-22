import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Clock, CheckCircle2, XCircle, AlertCircle, Search, Filter, Phone, MapPin, Calendar } from 'lucide-react';
import { getOrders, updateOrderStatus, getSeller } from '../../services/db';
import { notifyStatusChange } from '../../services/whatsapp';
import { Order, OrderStatus, Seller } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatPrice } from '../../lib/utils';
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

import { useAuth } from '../../App';
import { useSearchParams } from 'react-router-dom';

export default function AdminDashboard() {
  const [searchParams] = useSearchParams();
  const { appUser } = useAuth();
  const sellerId = appUser?.role === 'super_admin' 
    ? (searchParams.get('sellerId') || appUser?.sellerId)
    : appUser?.sellerId;
    
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [pendingChange, setPendingChange] = useState<{ orderId: string; newStatus: OrderStatus; ref: string } | null>(null);

  const loadOrders = async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      const [data, sellerData] = await Promise.all([getOrders(sellerId), getSeller(sellerId)]);
      setOrders(data);
      setSeller(sellerData);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [sellerId]);

  const handleStatusChange = (orderId: string, newStatus: OrderStatus, ref: string) => {
    setPendingChange({ orderId, newStatus, ref });
  };

  const confirmStatusChange = async () => {
    if (!pendingChange) return;
    try {
      await updateOrderStatus(pendingChange.orderId, pendingChange.newStatus);
      setOrders(orders.map(o => o.id === pendingChange.orderId ? { ...o, status: pendingChange.newStatus } : o));
      const order = orders.find(o => o.id === pendingChange.orderId);
      if (seller && order) {
        notifyStatusChange(seller.id, order.clientId, pendingChange.ref, pendingChange.newStatus);
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setPendingChange(null);
    }
  };

  const getOrderDate = (order: Order): Date => {
    const ts = order.createdAt as any;
    if (ts?.toDate) return ts.toDate();
    if (ts?.seconds) return new Date(ts.seconds * 1000);
    return new Date(ts);
  };

  const dateFilteredOrders = orders.filter(order => {
    if (dateFilter === 'all') return true;
    const d = getOrderDate(order);
    const now = new Date();
    if (dateFilter === 'today') return d >= startOfDay(now) && d <= endOfDay(now);
    if (dateFilter === 'week') return d >= startOfWeek(now, { weekStartsOn: 1 });
    if (dateFilter === 'month') return d >= startOfMonth(now);
    if (dateFilter === 'custom') {
      const from = customFrom ? startOfDay(new Date(customFrom)) : null;
      const to = customTo ? endOfDay(new Date(customTo)) : null;
      if (from && to) return d >= from && d <= to;
      if (from) return d >= from;
      if (to) return d <= to;
    }
    return true;
  });

  const filteredOrders = filter === 'all'
    ? dateFilteredOrders
    : dateFilteredOrders.filter(o => o.status === filter);

  const stats = {
    totalRevenue: dateFilteredOrders.filter(o => o.status === 'processed').reduce((acc, o) => acc + o.total, 0),
    totalOrders: dateFilteredOrders.length,
    pendingOrders: dateFilteredOrders.filter(o => o.status === 'processing').length,
    processedOrders: dateFilteredOrders.filter(o => o.status === 'processed').length,
  };

  const productSales = dateFilteredOrders.reduce((acc: Record<string, number>, order) => {
    order.items.forEach(item => {
      acc[item.name] = (acc[item.name] || 0) + item.quantity;
    });
    return acc;
  }, {});

  const topProducts = Object.entries(productSales)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processing':
        return 'text-amber-600 bg-amber-50';
      case 'processed':
        return 'text-green-600 bg-green-50';
      case 'cancelled':
        return 'text-zinc-500 bg-zinc-50';
      case 'refused':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-zinc-500 bg-zinc-50';
    }
  };

  if (!sellerId && appUser?.role === 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400">
          <Search size={32} />
        </div>
        <div>
          <h2 className="text-xl font-bold">Aucun vendeur sélectionné</h2>
          <p className="text-zinc-500">Veuillez d'abord sélectionner un vendeur dans la liste pour voir ses données.</p>
        </div>
        <Button onClick={() => window.location.href = '/admin/sellers'}>
          Voir les vendeurs
        </Button>
      </div>
    );
  }

  const statusLabels: Record<OrderStatus, string> = {
    processing: 'En cours',
    processed: 'Traité',
    cancelled: 'Annulé',
    refused: 'Refusé',
  };

  return (
    <div className="space-y-8">
      {/* Confirmation Modal */}
      {pendingChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4">
            <h3 className="text-lg font-bold">Confirmer le changement</h3>
            <p className="text-zinc-600 text-sm">
              Passer la commande <span className="font-mono font-bold">{pendingChange.ref}</span> au statut{' '}
              <span className="font-bold">« {statusLabels[pendingChange.newStatus]} »</span> ?
            </p>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setPendingChange(null)}>
                Annuler
              </Button>
              <Button variant="primary" className="flex-1" onClick={confirmStatusChange}>
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Tableau de bord</h1>
            <p className="text-zinc-500">Gérez vos commandes et suivez vos ventes.</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {(['all', 'processing', 'processed', 'cancelled', 'refused'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  filter === s
                    ? "bg-black text-white shadow-lg shadow-black/10"
                    : "bg-white text-zinc-500 border border-zinc-100 hover:bg-zinc-50"
                }`}
              >
                {s === 'all' ? 'Toutes' : s === 'processing' ? 'En cours' : s === 'processed' ? 'Traitées' : s === 'cancelled' ? 'Annulées' : 'Refusées'}
              </button>
            ))}
          </div>
        </div>

        {/* Date filter */}
        <div className="flex flex-wrap items-center gap-2">
          <Calendar size={16} className="text-zinc-400 shrink-0" />
          {(['today', 'all', 'week', 'month', 'custom'] as const).map(d => (
            <button
              key={d}
              onClick={() => setDateFilter(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                dateFilter === d
                  ? "bg-zinc-900 text-white"
                  : "bg-white text-zinc-500 border border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {d === 'all' ? 'Toutes périodes' : d === 'today' ? "Aujourd'hui" : d === 'week' ? 'Cette semaine' : d === 'month' ? 'Ce mois' : 'Personnalisé'}
            </button>
          ))}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 ml-1">
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="px-2 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-black/10"
              />
              <span className="text-xs text-zinc-400">→</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="px-2 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
          )}
          {dateFilter !== 'all' && (
            <span className="text-xs text-zinc-400 ml-1">
              {dateFilteredOrders.length} commande{dateFilteredOrders.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border-zinc-100">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Chiffre d'affaires</p>
          <p className="text-2xl font-bold mt-1">{formatPrice(stats.totalRevenue)}</p>
          <div className="mt-2 text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full inline-block">Commandes traitées</div>
        </Card>
        <Card className="p-4 bg-white border-zinc-100">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Commandes</p>
          <p className="text-2xl font-bold mt-1">{stats.totalOrders}</p>
          <div className="mt-2 text-[10px] text-zinc-500 font-bold bg-zinc-100 px-2 py-0.5 rounded-full inline-block">Toutes périodes</div>
        </Card>
        <Card className="p-4 bg-white border-zinc-100">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">En attente</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{stats.pendingOrders}</p>
          <div className="mt-2 text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full inline-block">À traiter</div>
        </Card>
        <Card className="p-4 bg-white border-zinc-100">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Traitées</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{stats.processedOrders}</p>
          <div className="mt-2 text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full inline-block">Livrées</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Commandes récentes</h2>
          </div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
              <p className="text-zinc-500 font-medium">Chargement des commandes...</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <Card key={order.id} className="p-6">
                    <div className="flex flex-col lg:flex-row gap-8">
                      {/* Order Info */}
                      <div className="flex-1 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">Ref: {order.reference}</span>
                            <h3 className="text-lg font-bold">{order.deliveryDetails.name} {order.deliveryDetails.firstName}</h3>
                            <div className="flex items-center gap-4 text-sm text-zinc-500">
                              <span className="flex items-center gap-1"><Phone size={14} /> {order.deliveryDetails.phone}</span>
                              <span className="flex items-center gap-1"><Calendar size={14} /> {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'PPp', { locale: fr }) : 'N/A'}</span>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusBadge(order.status)}`}>
                            {order.status}
                          </div>
                        </div>

                        <div className="bg-zinc-50 rounded-xl p-4 space-y-2">
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin size={16} className="text-zinc-400 mt-0.5" />
                            <div>
                              <p className="font-medium">Lieu de livraison:</p>
                              <p className="text-zinc-600">{order.deliveryDetails.location}</p>
                            </div>
                          </div>
                          {order.deliveryDetails.details && (
                            <div className="flex items-start gap-2 text-sm">
                              <AlertCircle size={16} className="text-zinc-400 mt-0.5" />
                              <div>
                                <p className="font-medium">Instructions:</p>
                                <p className="text-zinc-600">{order.deliveryDetails.details}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Items & Actions */}
                      <div className="w-full lg:w-80 space-y-6">
                        <div className="space-y-3">
                          <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Articles</h4>
                          <div className="space-y-2">
                            {order.items.map((item, i) => (
                              <div key={i} className="flex justify-between text-sm">
                                <span className="text-zinc-600">{item.quantity}x {item.name}</span>
                                <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                              </div>
                            ))}
                            <div className="pt-2 border-t border-zinc-100 flex justify-between items-center">
                              <span className="font-bold">Total</span>
                              <span className="text-xl font-bold">{formatPrice(order.total)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant={order.status === 'processing' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusChange(order.id, 'processing', order.reference)}
                            className="text-xs"
                          >
                            En cours
                          </Button>
                          <Button
                            variant={order.status === 'processed' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusChange(order.id, 'processed', order.reference)}
                            className="text-xs"
                          >
                            Traité
                          </Button>
                          <Button
                            variant={order.status === 'cancelled' ? 'danger' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusChange(order.id, 'cancelled', order.reference)}
                            className="text-xs"
                          >
                            Annulé
                          </Button>
                          <Button
                            variant={order.status === 'refused' ? 'danger' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusChange(order.id, 'refused', order.reference)}
                            className="text-xs"
                          >
                            Refusé
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="py-20 text-center bg-white rounded-3xl border border-zinc-100 space-y-4">
                  <div className="w-20 h-20 bg-zinc-50 text-zinc-300 rounded-full flex items-center justify-center mx-auto">
                    <Clock size={40} />
                  </div>
                  <p className="text-zinc-500 font-medium">Aucune commande trouvée</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Top Produits</h2>
          <Card className="p-4 space-y-4">
            {topProducts.length > 0 ? (
              topProducts.map(([name, count], i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center text-xs font-bold text-zinc-500">
                      {i + 1}
                    </div>
                    <span className="text-sm font-medium truncate max-w-[120px]">{name}</span>
                  </div>
                  <span className="text-xs font-bold bg-black text-white px-2 py-1 rounded-full">
                    {count} vendus
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500 text-center py-4">Aucune donnée de vente</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

