import { getProducts, deleteProduct } from "../src/services/db";

async function cleanupQ0H645W() {
  const sellerId = "Q0H645W";
  const products = await getProducts(sellerId);
  if (!products.length) {
    console.log("Aucun produit trouvé pour ce vendeur.");
    return;
  }
  const toKeep = products.slice(0, 5).map(p => p.id);
  const toDelete = products.filter(p => !toKeep.includes(p.id));
  console.log(`Suppression de ${toDelete.length} produits, conservation de ${toKeep.length}`);
  for (const prod of toDelete) {
    await deleteProduct(prod.id);
    console.log(`Supprimé: ${prod.name} (${prod.id})`);
  }
  console.log("Nettoyage terminé.");
}

cleanupQ0H645W().catch(console.error);
