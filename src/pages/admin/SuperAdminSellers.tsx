import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Store, Lock, User as UserIcon, AlertCircle, Pencil, X, Image as ImageIcon, Check } from 'lucide-react';
import { getSellers, addSeller, createAppUser, updateSeller, uploadProductImage } from '../../services/db';
import { Seller } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';

const generateId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 7; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
};

const emptyForm = () => ({ id: generateId(), name: '', shopName: '', phone: '', email: '', password: '', logoUrl: '' });

export default function SuperAdminSellers() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [newSeller, setNewSeller] = useState(emptyForm());
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [editForm, setEditForm] = useState({ name: '', shopName: '', phone: '', logoUrl: '' });
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const loadSellers = async () => {
    setLoading(true);
    try { setSellers(await getSellers()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadSellers(); }, []);

  const openEdit = (seller: Seller) => {
    setEditingSeller(seller);
    setEditForm({ name: seller.name, shopName: seller.shopName, phone: seller.phone, logoUrl: seller.logoUrl || '' });
    setEditLogoFile(null);
  };

  const handleSaveEdit = async () => {
    if (!editingSeller) return;
    setIsSavingEdit(true);
    try {
      let logoUrl = editForm.logoUrl;
      if (editLogoFile) logoUrl = await uploadProductImage(editLogoFile);
      await updateSeller(editingSeller.id, { name: editForm.name, shopName: editForm.shopName, phone: editForm.phone, logoUrl });
      setEditingSeller(null);
      loadSellers();
    } catch (e) { console.error(e); }
    finally { setIsSavingEdit(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStatus(null);
    if (!auth) { setErrorStatus("Firebase Auth n'est pas configuré."); return; }
    setIsSubmitting(true);
    try {
      let logoUrl = newSeller.logoUrl;
      if (logoFile) logoUrl = await uploadProductImage(logoFile);

      const userCredential = await createUserWithEmailAndPassword(auth, newSeller.email, newSeller.password);
      await addSeller({ id: newSeller.id, name: newSeller.name, shopName: newSeller.shopName, phone: newSeller.phone, logoUrl });
      await createAppUser({ uid: userCredential.user.uid, email: newSeller.email, sellerId: newSeller.id, role: 'seller_admin' });

      setIsAdding(false);
      setNewSeller(emptyForm());
      setLogoFile(null);
      loadSellers();
    } catch (error: any) {
      setErrorStatus("Erreur : " + (error.message || "Inconnue"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendeurs</h1>
          <p className="text-zinc-500">Gérez les comptes vendeurs et leurs accès.</p>
        </div>
        <Button onClick={() => { setIsAdding(!isAdding); if (!isAdding) setNewSeller(emptyForm()); }} className="gap-2">
          {isAdding ? 'Annuler' : <><Plus size={20} /> Nouveau Vendeur</>}
        </Button>
      </div>

      {errorStatus && (
        <div className="bg-red-50 text-red-700 p-4 rounded-2xl flex items-center gap-3 border border-red-100">
          <AlertCircle size={20} /><span className="font-medium">{errorStatus}</span>
        </div>
      )}

      {isAdding && (
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Logo */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold flex items-center gap-2"><ImageIcon size={20} className="text-zinc-400" /> Logo de la boutique</h3>
              <div className="flex items-center gap-6">
                <div className="relative w-20 h-20 rounded-2xl bg-zinc-100 overflow-hidden flex items-center justify-center border-2 border-dashed border-zinc-200 flex-shrink-0">
                  {(logoFile || newSeller.logoUrl) ? (
                    <img src={logoFile ? URL.createObjectURL(logoFile) : newSeller.logoUrl} className="w-full h-full object-cover" alt="logo" />
                  ) : (
                    <Store size={28} className="text-zinc-300" />
                  )}
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
                </div>
                <div className="flex-1">
                  <Input label="Ou URL du logo" value={newSeller.logoUrl} onChange={e => setNewSeller({ ...newSeller, logoUrl: e.target.value })} placeholder="https://..." />
                </div>
              </div>
            </div>

            {/* Infos boutique */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Store size={20} className="text-zinc-400" /> Informations Boutique</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input label="ID Unique" readOnly className="bg-zinc-50 font-mono font-bold" value={newSeller.id} />
                <Input label="Nom du Propriétaire" required placeholder="Nom complet" value={newSeller.name} onChange={e => setNewSeller({ ...newSeller, name: e.target.value })} />
                <Input label="Boutique Affichée" required placeholder="Nom de l'enseigne" value={newSeller.shopName} onChange={e => setNewSeller({ ...newSeller, shopName: e.target.value })} />
                <Input label="Téléphone" required placeholder="Numéro" value={newSeller.phone} onChange={e => setNewSeller({ ...newSeller, phone: e.target.value })} />
              </div>
            </div>

            {/* Compte */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Lock size={20} className="text-zinc-400" /> Compte Utilisateur</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Email" type="email" required placeholder="vendeur@exemple.com" value={newSeller.email} onChange={e => setNewSeller({ ...newSeller, email: e.target.value })} />
                <Input label="Mot de passe" type="password" required placeholder="Min. 6 caractères" value={newSeller.password} onChange={e => setNewSeller({ ...newSeller, password: e.target.value })} />
              </div>
            </div>

            <Button type="submit" isLoading={isSubmitting} className="px-12 h-12 text-lg">Créer le Vendeur</Button>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sellers.map(seller => (
            <Card key={seller.id} className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-zinc-100 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0">
                  {seller.logoUrl ? (
                    <img src={seller.logoUrl} alt={seller.shopName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Store size={26} className="text-zinc-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg truncate">{seller.shopName}</h3>
                  <p className="text-zinc-500 text-sm flex items-center gap-1"><UserIcon size={14} /> {seller.name}</p>
                </div>
                <button onClick={() => openEdit(seller)} className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-xl transition-colors">
                  <Pencil size={16} />
                </button>
              </div>

              <div className="bg-zinc-50 rounded-xl p-3 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Lien Client :</p>
                <p className="text-xs font-mono break-all text-zinc-600">{window.location.origin}/client/{seller.id}</p>
              </div>

              <div className="pt-4 border-t border-zinc-50 flex items-center justify-between text-xs text-zinc-400">
                <span>ID: <span className="font-mono font-bold text-black">{seller.id}</span></span>
                <Button variant="outline" size="sm" onClick={() => window.open(`/admin?sellerId=${seller.id}`, '_blank')}>Gérer Articles</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingSeller && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setEditingSeller(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-lg space-y-6 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Modifier le vendeur</h2>
                <button onClick={() => setEditingSeller(null)} className="p-2 text-zinc-400 hover:text-black rounded-xl hover:bg-zinc-100 transition-colors"><X size={20} /></button>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-2xl bg-zinc-100 overflow-hidden flex items-center justify-center border-2 border-dashed border-zinc-200 flex-shrink-0">
                  {(editLogoFile || editForm.logoUrl) ? (
                    <img src={editLogoFile ? URL.createObjectURL(editLogoFile) : editForm.logoUrl} className="w-full h-full object-cover" alt="logo" />
                  ) : (
                    <Store size={28} className="text-zinc-300" />
                  )}
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setEditLogoFile(e.target.files?.[0] || null)} />
                </div>
                <Input label="URL du logo" value={editForm.logoUrl} onChange={e => setEditForm({ ...editForm, logoUrl: e.target.value })} placeholder="https://..." />
              </div>

              <div className="space-y-4">
                <Input label="Nom du propriétaire" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                <Input label="Nom de la boutique" value={editForm.shopName} onChange={e => setEditForm({ ...editForm, shopName: e.target.value })} />
                <Input label="Téléphone" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditingSeller(null)}>Annuler</Button>
                <Button className="flex-1 gap-2" isLoading={isSavingEdit} onClick={handleSaveEdit}><Check size={16} /> Enregistrer</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
