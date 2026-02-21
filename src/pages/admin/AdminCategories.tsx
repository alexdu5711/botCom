import React, { useState, useEffect } from 'react';
import { Plus, Trash2, List } from 'lucide-react';
import { getCategories, addCategory } from '../../services/db';
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

  const loadCategories = async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      const data = await getCategories(sellerId);
      setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [sellerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !sellerId) return;
    
    setIsSubmitting(true);
    try {
      await addCategory(newName, sellerId);
      setNewName('');
      loadCategories();
    } catch (error) {
      console.error("Error adding category:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <Button type="submit" isLoading={isSubmitting} className="h-11 px-8">
            Ajouter
          </Button>
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
              <Card key={category.id} className="p-4 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-500">
                    <List size={20} />
                  </div>
                  <span className="font-semibold">{category.name}</span>
                </div>
                <button className="text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 size={18} />
                </button>
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
