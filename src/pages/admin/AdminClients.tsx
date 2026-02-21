import React, { useState, useEffect } from 'react';
import { Users, Phone, Calendar, Search, Mail } from 'lucide-react';
import { getAllClients } from '../../services/db';
import { Client } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { useAuth } from '../../App';
import { useSearchParams } from 'react-router-dom';

export default function AdminClients() {
  const [searchParams] = useSearchParams();
  const { appUser } = useAuth();
  const sellerId = appUser?.role === 'super_admin' 
    ? (searchParams.get('sellerId') || appUser?.sellerId)
    : appUser?.sellerId;
    
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadClients = async () => {
      if (!sellerId) return;
      try {
        const data = await getAllClients(sellerId);
        setClients(data);
      } catch (error) {
        console.error("Error loading clients:", error);
      } finally {
        setLoading(false);
      }
    };
    loadClients();
  }, [sellerId]);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  if (!sellerId && appUser?.role === 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400">
          <Users size={32} />
        </div>
        <div>
          <h2 className="text-xl font-bold">Aucun vendeur sélectionné</h2>
          <p className="text-zinc-500">Veuillez d'abord sélectionner un vendeur dans la liste pour voir ses clients.</p>
        </div>
        <Button onClick={() => window.location.href = '/admin/sellers'}>
          Voir les vendeurs
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-zinc-500">Consultez la liste de vos clients enregistrés.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <Input 
            placeholder="Rechercher un client..." 
            className="pl-10"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.length > 0 ? (
            filteredClients.map(client => (
              <Card key={client.id} className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center text-xl font-bold">
                    {client.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{client.name} {client.firstName}</h3>
                    <p className="text-zinc-500 text-sm flex items-center gap-1">
                      <Phone size={14} /> {client.phone}
                    </p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-zinc-50 flex items-center justify-between text-xs text-zinc-400 font-medium uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> Inscrit le {client.createdAt?.toDate ? format(client.createdAt.toDate(), 'PP', { locale: fr }) : 'N/A'}
                  </span>
                  <span>ID: {client.id.slice(-6)}</span>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-zinc-100 space-y-4">
              <div className="w-20 h-20 bg-zinc-50 text-zinc-300 rounded-full flex items-center justify-center mx-auto">
                <Users size={40} />
              </div>
              <p className="text-zinc-500 font-medium">Aucun client trouvé</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
