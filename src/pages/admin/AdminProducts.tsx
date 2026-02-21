import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Image as ImageIcon, Search } from 'lucide-react';
import { getProducts, getCategories, addProduct, uploadProductImage } from '../../services/db';
import { Product, Category } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input, TextArea } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { formatPrice } from '../../lib/utils';

import { useAuth } from '../../App';
import { useSearchParams } from 'react-router-dom';

export default function AdminProducts() {
  const [searchParams] = useSearchParams();
  const { appUser } = useAuth();
  const sellerId = appUser?.role === 'super_admin' 
    ? (searchParams.get('sellerId') || appUser?.sellerId)
    : appUser?.sellerId;

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: 0,
    categoryId: '',
    imageUrl: '',
    sellerId: sellerId || ''
  });

  useEffect(() => {
    if (sellerId) {
      setNewProduct(prev => ({ ...prev, sellerId }));
    }
  }, [sellerId]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        getProducts(sellerId), 
        getCategories(sellerId)
      ]);
      setProducts(prods);
      setCategories(cats);
      if (cats.length > 0) setNewProduct(prev => ({ ...prev, categoryId: cats[0].id }));
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sellerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      let imageUrl = newProduct.imageUrl;
      if (imageFile) {
        imageUrl = await uploadProductImage(imageFile);
      }
      
      await addProduct({ ...newProduct, imageUrl });
      setIsAdding(false);
      setNewProduct({ name: '', description: '', price: 0, categoryId: categories[0]?.id || '', imageUrl: '' });
      setImageFile(null);
      loadData();
    } catch (error) {
      console.error("Error adding product:", error);
      setError("Erreur lors de l'ajout du produit.");
    } finally {
      setIsSubmitting(false);
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
          <p className="text-zinc-500">Veuillez d'abord sélectionner un vendeur dans la liste pour gérer ses produits.</p>
        </div>
        <Button onClick={() => window.location.href = '/admin/sellers'}>
          Voir les vendeurs
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Produits</h1>
          <p className="text-zinc-500">Gérez votre catalogue de produits.</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} className="gap-2">
          {isAdding ? 'Annuler' : <><Plus size={20} /> Nouveau Produit</>}
        </Button>
      </div>

      {isAdding && (
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Input 
                  label="Nom du produit" 
                  required 
                  value={newProduct.name}
                  onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="Prix" 
                    type="number" 
                    required 
                    value={newProduct.price}
                    onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}
                  />
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-700">Catégorie</label>
                    <select 
                      className="flex h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
                      value={newProduct.categoryId}
                      onChange={e => setNewProduct({...newProduct, categoryId: e.target.value})}
                      required
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <TextArea 
                  label="Description" 
                  required 
                  value={newProduct.description}
                  onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                />
              </div>
              <div className="space-y-4">
                <label className="text-sm font-medium text-zinc-700">Image du produit</label>
                <div className="border-2 border-dashed border-zinc-200 rounded-2xl aspect-video flex flex-col items-center justify-center gap-2 bg-zinc-50 overflow-hidden relative">
                  {imageFile || newProduct.imageUrl ? (
                    <img 
                      src={imageFile ? URL.createObjectURL(imageFile) : newProduct.imageUrl} 
                      className="w-full h-full object-cover" 
                      alt="Preview" 
                    />
                  ) : (
                    <>
                      <ImageIcon size={40} className="text-zinc-300" />
                      <p className="text-xs text-zinc-500">Cliquez pour ajouter une image</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={e => setImageFile(e.target.files?.[0] || null)}
                    accept="image/*"
                  />
                </div>
                <Input 
                  label="Ou URL de l'image" 
                  value={newProduct.imageUrl}
                  onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})}
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button type="submit" className="w-full md:w-auto px-12" isLoading={isSubmitting}>
                Enregistrer le produit
              </Button>
              {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 font-medium">Chargement des produits...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map(product => (
            <Card key={product.id} className="group">
              <div className="aspect-square bg-zinc-100 overflow-hidden">
                <img 
                  src={product.imageUrl || "https://picsum.photos/400/400?random=" + product.id} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold truncate">{product.name}</h3>
                  <span className="font-bold text-sm">{formatPrice(product.price)}</span>
                </div>
                <p className="text-xs text-zinc-500 line-clamp-2">{product.description}</p>
                <div className="pt-2 flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-100 px-2 py-1 rounded">
                    {categories.find(c => c.id === product.categoryId)?.name || 'Sans catégorie'}
                  </span>
                  <button className="text-zinc-400 hover:text-red-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
