import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Store, Phone, ArrowRight } from 'lucide-react';
import { getSeller } from '../../services/db';
import { Seller } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function ClientLanding() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sellerId) return;
    getSeller(sellerId).then(setSeller);
  }, [sellerId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = phone.trim().replace(/\s+/g, '');
    if (!cleaned) return;
    navigate(`/client/${sellerId}/${cleaned}`);
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        {/* Logo + nom boutique */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            {seller?.logoUrl ? (
              <img
                src={seller.logoUrl}
                alt={seller.shopName}
                className="w-20 h-20 rounded-2xl object-cover shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center shadow-lg">
                <Store size={36} className="text-white" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{seller?.shopName || 'Boutique'}</h1>
            <p className="text-zinc-500 text-sm mt-1">Entrez votre numéro pour accéder à la boutique</p>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-zinc-100 p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3 text-zinc-400">
            <Phone size={20} />
            <span className="text-sm font-medium">Votre numéro de téléphone</span>
          </div>
          <Input
            type="tel"
            placeholder="Ex: 2250707000000"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
            autoFocus
          />
          <Button type="submit" className="w-full gap-2" isLoading={loading}>
            Accéder à la boutique <ArrowRight size={16} />
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
