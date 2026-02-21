import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Store, Phone, Search, Trash2, Mail, Lock, User as UserIcon, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { getSellers, addSeller, createAppUser, initializeCollections } from '../../services/db';
import { Seller } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';

const generateId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function SuperAdminSellers() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initStatus, setInitStatus] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [newSeller, setNewSeller] = useState({
    id: generateId(),
    name: '',
    shopName: '',
    phone: '',
    email: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadSellers = async () => {
    setLoading(true);
    try {
      const data = await getSellers();
      setSellers(data);
    } catch (error) {
      console.error("Error loading sellers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSellers();
  }, []);

  const handleInitialize = async () => {
    setErrorStatus(null);
    setIsInitializing(true);
    try {
      console.log("Starting initialization with config:", {
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        hasApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY
      });
      await initializeCollections();
      setInitStatus("Base de données initialisée avec succès !");
      setTimeout(() => setInitStatus(null), 5000);
    } catch (error: any) {
      console.error("Initialization error details:", error);
      setErrorStatus("Erreur d'initialisation : " + error.message);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStatus(null);
    if (!auth) {
      setErrorStatus("Firebase Auth n'est pas configuré.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // 1. Create Firebase Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, newSeller.email, newSeller.password);
      const uid = userCredential.user.uid;

      // 2. Create Seller Document
      await addSeller({
        id: newSeller.id,
        name: newSeller.name,
        shopName: newSeller.shopName,
        phone: newSeller.phone
      });

      // 3. Create User Link Document
      await createAppUser({
        uid,
        email: newSeller.email,
        sellerId: newSeller.id,
        role: 'seller_admin'
      });

      setIsAdding(false);
      setNewSeller({ 
        id: generateId(), 
        name: '', 
        shopName: '', 
        phone: '', 
        email: '', 
        password: '' 
      });
      loadSellers();
    } catch (error: any) {
      console.error("Error adding seller:", error);
      setErrorStatus("Erreur lors de l'ajout : " + (error.message || "Inconnue"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendeurs (Customers)</h1>
          <p className="text-zinc-500">Gérez les comptes vendeurs et leurs accès.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleInitialize} 
            isLoading={isInitializing}
            className="gap-2 border-zinc-200"
          >
            <Database size={18} /> Initialiser la Base
          </Button>
          <Button onClick={() => {
            setIsAdding(!isAdding);
            if (!isAdding) setNewSeller(prev => ({ ...prev, id: generateId() }));
          }} className="gap-2">
            {isAdding ? 'Annuler' : <><Plus size={20} /> Nouveau Vendeur</>}
          </Button>
        </div>
      </div>

      {initStatus && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 text-green-700 p-4 rounded-2xl flex items-center gap-3 border border-green-100"
        >
          <CheckCircle2 size={20} />
          <span className="font-medium">{initStatus}</span>
        </motion.div>
      )}

      {errorStatus && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 text-red-700 p-4 rounded-2xl flex items-center gap-3 border border-red-100"
        >
          <AlertCircle size={20} />
          <span className="font-medium">{errorStatus}</span>
        </motion.div>
      )}

      {isAdding && (
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Store size={20} className="text-zinc-400" />
                Informations Boutique
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input 
                  label="ID Unique (7 positions)" 
                  required 
                  readOnly
                  className="bg-zinc-50 font-mono font-bold text-black"
                  value={newSeller.id}
                />
                <Input 
                  label="Nom du Propriétaire" 
                  required 
                  placeholder="Nom complet"
                  value={newSeller.name}
                  onChange={e => setNewSeller({...newSeller, name: e.target.value})}
                />
                <Input 
                  label="Boutique Affichée" 
                  required 
                  placeholder="Nom de l'enseigne"
                  value={newSeller.shopName}
                  onChange={e => setNewSeller({...newSeller, shopName: e.target.value})}
                />
                <Input 
                  label="Téléphone Contact" 
                  required 
                  placeholder="Numéro"
                  value={newSeller.phone}
                  onChange={e => setNewSeller({...newSeller, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Lock size={20} className="text-zinc-400" />
                Compte Utilisateur (Accès Admin)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="Email de connexion" 
                  type="email"
                  required 
                  placeholder="vendeur@exemple.com"
                  value={newSeller.email}
                  onChange={e => setNewSeller({...newSeller, email: e.target.value})}
                />
                <Input 
                  label="Mot de passe" 
                  type="password"
                  required 
                  placeholder="Min. 6 caractères"
                  value={newSeller.password}
                  onChange={e => setNewSeller({...newSeller, password: e.target.value})}
                />
              </div>
            </div>

            <Button type="submit" isLoading={isSubmitting} className="w-full md:w-auto px-12 h-12 text-lg">
              Créer le Vendeur et son Compte
            </Button>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sellers.map(seller => (
            <Card key={seller.id} className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-600">
                  <Store size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg truncate">{seller.shopName}</h3>
                  <p className="text-zinc-500 text-sm flex items-center gap-1">
                    <UserIcon size={14} /> {seller.name}
                  </p>
                </div>
              </div>
              
              <div className="bg-zinc-50 rounded-xl p-3 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Lien Client :</p>
                <p className="text-xs font-mono break-all text-zinc-600">
                  {window.location.origin}/client/{seller.id}
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-50 flex items-center justify-between text-xs text-zinc-400">
                <span>ID: <span className="font-mono font-bold text-black">{seller.id}</span></span>
                <Button variant="outline" size="sm" onClick={() => window.open(`/admin?sellerId=${seller.id}`, '_blank')}>
                  Gérer Articles
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
