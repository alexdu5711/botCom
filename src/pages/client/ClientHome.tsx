import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, Plus, ShoppingBag, Package } from 'lucide-react';
import { getCategories, getProducts } from '../../services/db';
import { Category, Product } from '../../types';
import { useCart } from '../../store/useCart';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { formatPrice } from '../../lib/utils';

export default function ClientHome() {
  const { clientId } = useParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const addItem = useCart(state => state.addItem);

  useEffect(() => {
    const loadData = async () => {
      if (!clientId) return;
      try {
        const [cats, prods] = await Promise.all([
          getCategories(clientId),
          getProducts(clientId)
        ]);
        setCategories(cats);
        setProducts(prods);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [clientId]);

  const filteredProducts = selectedCategory 
    ? products.filter(p => p.categoryId === selectedCategory)
    : products;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 font-medium">Chargement des produits...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            selectedCategory === null 
              ? "bg-black text-white" 
              : "bg-white text-zinc-500 border border-zinc-100"
          }`}
        >
          Tout
        </button>
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === category.id 
                ? "bg-black text-white" 
                : "bg-white text-zinc-500 border border-zinc-100"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 gap-4">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full flex flex-col group">
                <div className="aspect-square relative overflow-hidden bg-zinc-100">
                  <img 
                    src={product.imageUrl || "https://picsum.photos/400/400?random=" + product.id} 
                    alt={product.name}
                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-sm line-clamp-1">{product.name}</h3>
                    <p className="text-zinc-500 text-xs line-clamp-2 mt-1">{product.description}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-sm">{formatPrice(product.price)}</span>
                    <Button 
                      size="icon" 
                      className="rounded-full w-8 h-8"
                      onClick={() => addItem(product)}
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        ) : (
          <div className="col-span-2 py-20 text-center space-y-2">
            <Package className="mx-auto text-zinc-300" size={48} />
            <p className="text-zinc-500 font-medium">Aucun produit trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
}
