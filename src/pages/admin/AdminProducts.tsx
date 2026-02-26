import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Image as ImageIcon, Search, ChevronLeft, ChevronRight, Pencil, X, Check, Tag, PackageX, Package } from 'lucide-react';
import { getProducts, getCategories, addProduct, uploadProductImage, deleteProduct, updateProduct, getSeller } from '../../services/db';
import { Product, Category } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input, TextArea } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { formatPrice, cn } from '../../lib/utils';
import { AnimatePresence, motion } from 'motion/react';

import { useAuth } from '../../App';
import { useSearchParams } from 'react-router-dom';

const emptyNewProduct = (sellerId: string, categoryId = '') => ({
  name: '',
  description: '',
  price: 0,
  categoryId,
  imageUrl: '',
  sellerId,
  stock: '' as number | '',
  promotionPrice: '' as number | '',
  isOutOfStock: false,
});

export default function AdminProducts() {
  const [searchParams] = useSearchParams();
  const { appUser } = useAuth();
  const sellerId = appUser?.role === 'super_admin'
    ? (searchParams.get('sellerId') || appUser?.sellerId)
    : appUser?.sellerId;

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sellerLogo, setSellerLogo] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [newProduct, setNewProduct] = useState(emptyNewProduct(sellerId || ''));

  useEffect(() => {
    if (sellerId) {
      setNewProduct(prev => ({ ...prev, sellerId }));
    }
  }, [sellerId]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    name: '', description: '', price: 0, categoryId: '', imageUrl: '',
    stock: '' as number | '',
    promotionPrice: '' as number | '',
    isOutOfStock: false,
  });
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      description: product.description,
      price: product.price,
      categoryId: product.categoryId,
      imageUrl: product.imageUrl,
      stock: product.stock ?? '',
      promotionPrice: product.promotionPrice ?? '',
      isOutOfStock: product.isOutOfStock ?? false,
    });
    setEditImageFile(null);
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    if (editForm.promotionPrice !== '' && Number(editForm.promotionPrice) >= editForm.price) {
      alert('Le prix promotionnel doit être inférieur au prix normal.');
      return;
    }
    setIsSavingEdit(true);
    try {
      let imageUrl = editForm.imageUrl;
      if (editImageFile) imageUrl = await uploadProductImage(editImageFile);
      await updateProduct(editingProduct.id, {
        ...editForm,
        imageUrl,
        stock: editForm.stock === '' ? undefined : Number(editForm.stock),
        promotionPrice: editForm.promotionPrice === '' ? undefined : Number(editForm.promotionPrice),
      });
      setEditingProduct(null);
      loadData();
    } catch (e) { console.error(e); }
    finally { setIsSavingEdit(false); }
  };

  const handleToggleOutOfStock = async (product: Product) => {
    try {
      await updateProduct(product.id, { isOutOfStock: !product.isOutOfStock });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isOutOfStock: !p.isOutOfStock } : p));
    } catch (e) { console.error(e); }
  };

  const loadData = async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      const [prods, cats, seller] = await Promise.all([
        getProducts(sellerId),
        getCategories(sellerId),
        getSeller(sellerId)
      ]);
      setProducts(prods);
      setCategories(cats);
      setSellerLogo(seller?.logoUrl || '/src/assets/images/EcoShop_Logo_v2.png');
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  const filteredProducts = products
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           p.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const aRupture = a.isOutOfStock || a.stock === 0 ? 1 : 0;
      const bRupture = b.isOutOfStock || b.stock === 0 ? 1 : 0;
      return aRupture - bRupture;
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
    if (newProduct.promotionPrice !== '' && Number(newProduct.promotionPrice) >= newProduct.price) {
      setError('Le prix promotionnel doit être inférieur au prix normal.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      let imageUrl = newProduct.imageUrl;
      if (imageFile) {
        imageUrl = await uploadProductImage(imageFile);
      }
      await addProduct({
        ...newProduct,
        imageUrl,
        stock: newProduct.stock === '' ? undefined : Number(newProduct.stock),
        promotionPrice: newProduct.promotionPrice === '' ? undefined : Number(newProduct.promotionPrice),
      });
      setIsAdding(false);
      setNewProduct(emptyNewProduct(sellerId || '', categories[0]?.id || ''));
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

  // Nettoyage produits sellerId=Q0H645W (action admin)
  const handleCleanupQ0H645W = async () => {
    if (!window.confirm('Supprimer tous les produits du vendeur Q0H645W sauf 5 ?')) return;
    try {
      const all = await getProducts('Q0H645W');
      if (all.length <= 5) {
        alert('Il y a 5 produits ou moins, rien à supprimer.');
        return;
      }
      const toKeep = all.slice(0, 5).map(p => p.id);
      const toDelete = all.filter(p => !toKeep.includes(p.id));
      for (const prod of toDelete) {
        await deleteProduct(prod.id);
      }
      alert(`Suppression terminée. ${toDelete.length} produits supprimés, 5 conservés.`);
      if (sellerId === 'Q0H645W') loadData();
    } catch (e) {
      alert('Erreur lors du nettoyage : ' + e);
    }
  };

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Produits</h1>
          <p className="text-zinc-500 text-sm sm:text-base">Gérez votre catalogue de produits.</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} className="gap-2 w-full sm:w-auto">
          {isAdding ? 'Annuler' : <><Plus size={20} /> Nouveau Produit</>}
        </Button>
        {/* Bouton de nettoyage spécial super_admin */}
        {appUser?.role === 'super_admin' && (
          <Button variant="destructive" onClick={handleCleanupQ0H645W} className="ml-2">
            Nettoyer Q0H645W (garder 5)
          </Button>
        )}
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

                {/* Stock & Promotion */}
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Stock initial (optionnel)"
                    type="number"
                    placeholder="Ex: 50"
                    value={newProduct.stock}
                    onChange={e => setNewProduct({...newProduct, stock: e.target.value === '' ? '' : Number(e.target.value)})}
                  />
                  <div className="space-y-1.5">
                    <Input
                      label="Prix promotionnel (optionnel)"
                      type="number"
                      placeholder={`< ${newProduct.price || '...'}`}
                      value={newProduct.promotionPrice}
                      onChange={e => setNewProduct({...newProduct, promotionPrice: e.target.value === '' ? '' : Number(e.target.value)})}
                    />
                    {newProduct.promotionPrice !== '' && newProduct.price > 0 && Number(newProduct.promotionPrice) >= newProduct.price && (
                      <p className="text-xs text-red-500">Doit être inférieur au prix normal</p>
                    )}
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
            {paginatedProducts.map(product => {
              const isRupture = product.isOutOfStock || product.stock === 0;
              const hasPromo = product.promotionPrice !== undefined && product.promotionPrice < product.price;
              return (
                <Card key={product.id} className="group overflow-hidden flex flex-col h-full">
                  <div className="aspect-[4/5] bg-zinc-100 overflow-hidden relative">
                    <img
                      src={product.imageUrl || sellerLogo || "/src/assets/images/EcoShop_Logo_v2.png"}
                      alt={product.name}
                      className={cn(
                        "w-full h-full object-cover group-hover:scale-105 transition-transform duration-500",
                        isRupture && "opacity-50 grayscale"
                      )}
                      referrerPolicy="no-referrer"
                    />

                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {isRupture && (
                        <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                          Rupture
                        </span>
                      )}
                      {hasPromo && (
                        <span className="px-2 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-full">
                          Promo
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                      <button
                        onClick={() => openEdit(product)}
                        className="p-2 bg-white/90 backdrop-blur-sm text-zinc-600 rounded-lg shadow-sm hover:bg-zinc-100 transition-colors"
                        title="Modifier"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleOutOfStock(product)}
                        className={cn(
                          "p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm transition-colors",
                          product.isOutOfStock ? "text-red-500 hover:bg-red-50" : "text-zinc-600 hover:bg-zinc-100"
                        )}
                        title={product.isOutOfStock ? "Remettre en stock" : "Déclarer rupture"}
                      >
                        <PackageX size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 bg-white/90 backdrop-blur-sm text-red-500 rounded-lg shadow-sm hover:bg-red-50 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-xs sm:text-sm truncate mb-0.5">{product.name}</h3>
                      <p className="text-[10px] text-zinc-500 line-clamp-1 mb-1">{product.description}</p>
                      {product.stock !== undefined && (
                        <p className={cn(
                          "text-[10px] font-bold",
                          product.stock === 0 ? "text-red-500" : product.stock <= 5 ? "text-orange-500" : "text-zinc-400"
                        )}>
                          Stock: {product.stock} unité{product.stock !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex flex-col">
                        {hasPromo ? (
                          <>
                            <span className="font-bold text-xs sm:text-sm text-orange-600">{formatPrice(product.promotionPrice!)}</span>
                            <span className="text-[10px] line-through text-zinc-400">{formatPrice(product.price)}</span>
                          </>
                        ) : (
                          <span className="font-bold text-xs sm:text-sm">{formatPrice(product.price)}</span>
                        )}
                      </div>
                      <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded">
                        {categories.find(c => c.id === product.categoryId)?.name || '...'}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
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

      {/* Edit Product Modal */}
      <AnimatePresence>
        {editingProduct && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setEditingProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-2xl space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Modifier le produit</h2>
                <button onClick={() => setEditingProduct(null)} className="p-2 text-zinc-400 hover:text-black rounded-xl hover:bg-zinc-100 transition-colors"><X size={20} /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Input label="Nom" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Prix" type="number" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: Number(e.target.value) })} />
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-700">Catégorie</label>
                      <select
                        className="flex h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        value={editForm.categoryId}
                        onChange={e => setEditForm({ ...editForm, categoryId: e.target.value })}
                      >
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Stock & Promotion */}
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Stock (optionnel)"
                      type="number"
                      placeholder="Laisser vide si non géré"
                      value={editForm.stock}
                      onChange={e => setEditForm({ ...editForm, stock: e.target.value === '' ? '' : Number(e.target.value) })}
                    />
                    <div className="space-y-1.5">
                      <Input
                        label="Prix promo (optionnel)"
                        type="number"
                        placeholder={`< ${editForm.price || '...'}`}
                        value={editForm.promotionPrice}
                        onChange={e => setEditForm({ ...editForm, promotionPrice: e.target.value === '' ? '' : Number(e.target.value) })}
                      />
                      {editForm.promotionPrice !== '' && editForm.price > 0 && Number(editForm.promotionPrice) >= editForm.price && (
                        <p className="text-xs text-red-500">Doit être inférieur au prix normal</p>
                      )}
                    </div>
                  </div>

                  {/* Out of stock toggle */}
                  <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <div className="flex items-center gap-2">
                      <PackageX size={18} className={editForm.isOutOfStock ? "text-red-500" : "text-zinc-400"} />
                      <span className="text-sm font-medium">Rupture de stock</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, isOutOfStock: !editForm.isOutOfStock })}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        editForm.isOutOfStock ? "bg-red-500" : "bg-zinc-200"
                      )}
                    >
                      <span className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                        editForm.isOutOfStock ? "translate-x-6" : "translate-x-1"
                      )} />
                    </button>
                  </div>

                  <TextArea label="Description" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                </div>
                <div className="space-y-4">
                  <label className="text-sm font-medium text-zinc-700">Image</label>
                  <div className="border-2 border-dashed border-zinc-200 rounded-2xl aspect-video flex items-center justify-center bg-zinc-50 overflow-hidden relative">
                    {(editImageFile || editForm.imageUrl) ? (
                      <img src={editImageFile ? URL.createObjectURL(editImageFile) : editForm.imageUrl} className="w-full h-full object-cover" alt="preview" referrerPolicy="no-referrer" />
                    ) : (
                      <ImageIcon size={40} className="text-zinc-300" />
                    )}
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setEditImageFile(e.target.files?.[0] || null)} />
                  </div>
                  <Input label="Ou URL de l'image" value={editForm.imageUrl} onChange={e => setEditForm({ ...editForm, imageUrl: e.target.value })} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditingProduct(null)}>Annuler</Button>
                <Button className="flex-1 gap-2" isLoading={isSavingEdit} onClick={handleSaveEdit}><Check size={16} /> Enregistrer</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
