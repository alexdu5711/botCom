import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Store, Lock, User as UserIcon, AlertCircle, Pencil, X, Image as ImageIcon, Check, Copy } from 'lucide-react';
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

const emptyForm = () => ({ id: generateId(), name: '', shopName: '', phone: '', email: '', password: '', logoUrl: '', whatsappApiKey: '', whatsappSender: '' });

export default function SuperAdminSellers() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [newSeller, setNewSeller] = useState(emptyForm());
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [editForm, setEditForm] = useState({ name: '', shopName: '', phone: '', logoUrl: '', whatsappApiKey: '', whatsappSender: '' });
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
    setEditForm({ name: seller.name, shopName: seller.shopName, phone: seller.phone, logoUrl: seller.logoUrl || '', whatsappApiKey: seller.whatsappApiKey || '', whatsappSender: seller.whatsappSender || '' });
    setEditLogoFile(null);
  };

  const handleSaveEdit = async () => {
    if (!editingSeller) return;
    setIsSavingEdit(true);
    try {
      let logoUrl = editForm.logoUrl;
      if (editLogoFile) logoUrl = await uploadProductImage(editLogoFile);
      await updateSeller(editingSeller.id, { name: editForm.name, shopName: editForm.shopName, phone: editForm.phone, logoUrl, whatsappApiKey: editForm.whatsappApiKey, whatsappSender: editForm.whatsappSender });
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
      await addSeller({ id: newSeller.id, name: newSeller.name, shopName: newSeller.shopName, phone: newSeller.phone, logoUrl, whatsappApiKey: newSeller.whatsappApiKey, whatsappSender: newSeller.whatsappSender });
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

            {/* WhatsApp */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-zinc-400 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp API
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Clé API WhatsApp" placeholder="Coller la clé API ici" value={newSeller.whatsappApiKey} onChange={e => setNewSeller({ ...newSeller, whatsappApiKey: e.target.value })} />
                <Input label="Expéditeur WhatsApp" placeholder="Ex: 2250707000000" value={newSeller.whatsappSender} onChange={e => setNewSeller({ ...newSeller, whatsappSender: e.target.value })} />
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

              <div className="bg-zinc-50 rounded-xl p-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Lien Client :</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-mono text-zinc-600 flex-1 break-all">
                    {window.location.origin}/client/{seller.id}
                  </p>
                  <button
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/client/${seller.id}`)}
                    className="p-1 text-zinc-400 hover:text-black rounded-lg hover:bg-zinc-200 transition-colors flex-shrink-0"
                    title="Copier le lien"
                  >
                    <Copy size={14} />
                  </button>
                </div>
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
                <Input label="Clé API WhatsApp" placeholder="Coller la clé API ici" value={editForm.whatsappApiKey} onChange={e => setEditForm({ ...editForm, whatsappApiKey: e.target.value })} />
                <Input label="Expéditeur WhatsApp" placeholder="Ex: 2250707000000" value={editForm.whatsappSender} onChange={e => setEditForm({ ...editForm, whatsappSender: e.target.value })} />
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
