import React, { useState, useEffect } from 'react';
import { Plus, Trash2, List, Pencil, Check, X } from 'lucide-react';
import { getCategories, addCategory, updateCategory, deleteCategory } from '../../services/db';
import { Category } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../App';
import { useSearchParams } from 'react-router-dom';

export default function AdminCategories() {
  const [searchParams] = useSearchParams();
  const { appUser } = useAuth();
  const sellerId = appUser?.role === 'super_admin'
    ? (searchParams.get('sellerId') || appUser?.sellerId)
    : appUser?.sellerId;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const loadCategories = async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      setCategories(await getCategories(sellerId));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadCategories(); }, [sellerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !sellerId) return;
    setIsSubmitting(true);
    try {
      await addCategory(newName.trim(), sellerId);
      setNewName('');
      loadCategories();
    } catch (e) { console.error(e); }
    finally { setIsSubmitting(false); }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateCategory(id, editName.trim());
      setEditingId(null);
      loadCategories();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette catégorie ?')) return;
    try {
      await deleteCategory(id);
      loadCategories();
    } catch (e) { console.error(e); }
  };

  if (!sellerId && appUser?.role === 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400">
          <List size={32} />
        </div>
        <div>
          <h2 className="text-xl font-bold">Aucun vendeur sélectionné</h2>
          <p className="text-zinc-500">Veuillez d'abord sélectionner un vendeur dans la liste pour gérer ses catégories.</p>
        </div>
        <Button onClick={() => window.location.href = '/admin/sellers'}>Voir les vendeurs</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Catégories</h1>
        <p className="text-zinc-500">Organisez vos produits par catégories.</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="flex gap-4 items-end">
          <div className="flex-1">
            <Input
              label="Nouvelle catégorie"
              placeholder="Ex: Electronique, Mode..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
            />
          </div>
          <Button type="submit" isLoading={isSubmitting} className="h-11 px-8">Ajouter</Button>
        </form>
      </Card>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid gap-3">
          {categories.length > 0 ? (
            categories.map(category => (
              <Card key={category.id} className="p-4 flex items-center gap-3 group">
                <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-500 flex-shrink-0">
                  <List size={20} />
                </div>

                {editingId === category.id ? (
                  <>
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(category.id); if (e.key === 'Escape') setEditingId(null); }}
                      className="flex-1 text-sm font-semibold border border-zinc-300 rounded-lg px-3 py-1.5 outline-none focus:border-black"
                    />
                    <button onClick={() => handleSaveEdit(category.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                      <Check size={16} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 text-zinc-400 hover:bg-zinc-100 rounded-lg transition-colors">
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-semibold">{category.name}</span>
                    <button onClick={() => startEdit(category)} className="p-1.5 text-zinc-300 hover:text-black opacity-0 group-hover:opacity-100 hover:bg-zinc-100 rounded-lg transition-all">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(category.id)} className="p-1.5 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </Card>
            ))
          ) : (
            <div className="py-10 text-center text-zinc-500">Aucune catégorie créée.</div>
          )}
        </div>
      )}
    </div>
  );
}
