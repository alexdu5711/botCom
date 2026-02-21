import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Image as ImageIcon, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { getProducts, getCategories, addProduct, uploadProductImage, deleteProduct } from '../../services/db';
import { Product, Category } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input, TextArea } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { formatPrice, cn } from '../../lib/utils';

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
  
  // Filter & Pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer ce produit ?")) return;
    try {
      await deleteProduct(id);
      loadData();
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Produits</h1>
          <p className="text-zinc-500 text-sm sm:text-base">Gérez votre catalogue de produits.</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} className="gap-2 w-full sm:w-auto">
          {isAdding ? 'Annuler' : <><Plus size={20} /> Nouveau Produit</>}
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <Input 
            placeholder="Rechercher un produit..." 
            className="pl-10 h-11"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
              selectedCategory === 'all' 
                ? "bg-black text-white border-black" 
                : "bg-white text-zinc-500 border-zinc-100 hover:border-zinc-300"
            )}
          >
            Tous
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                selectedCategory === cat.id 
                  ? "bg-black text-white border-black" 
                  : "bg-white text-zinc-500 border-zinc-100 hover:border-zinc-300"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
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
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
            {paginatedProducts.map(product => (
              <Card key={product.id} className="group overflow-hidden flex flex-col h-full">
                <div className="aspect-[4/5] bg-zinc-100 overflow-hidden relative">
                  <img 
                    src={product.imageUrl || "https://picsum.photos/400/500?random=" + product.id} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleDelete(product.id)}
                      className="p-2 bg-white/90 backdrop-blur-sm text-red-500 rounded-lg shadow-sm hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm truncate mb-0.5">{product.name}</h3>
                    <p className="text-[10px] text-zinc-500 line-clamp-1 mb-2">{product.description}</p>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="font-bold text-xs sm:text-sm">{formatPrice(product.price)}</span>
                    <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded">
                      {categories.find(c => c.id === product.categoryId)?.name || '...'}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="py-20 text-center bg-white rounded-3xl border border-zinc-100 space-y-4">
              <div className="w-16 h-16 bg-zinc-50 text-zinc-300 rounded-full flex items-center justify-center mx-auto">
                <Search size={32} />
              </div>
              <p className="text-zinc-500 font-medium">Aucun produit trouvé</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-8">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-50 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "w-10 h-10 rounded-xl font-bold text-sm transition-all",
                      currentPage === page 
                        ? "bg-black text-white shadow-lg shadow-black/10" 
                        : "text-zinc-500 hover:bg-zinc-100"
                    )}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-50 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
