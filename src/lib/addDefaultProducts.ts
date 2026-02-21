import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";

const products = [
  {
    name: "Azzaro Chrome",
    description: "Fragrances intenses, boisées et charismatiques.",
    price: 5000,
    imageUrl: "",
    categoryId: "0ya2TQZzX3zzvrG97G1c",
    sellerId: "Q0H645W"
  },
  { name: "Invictus (Paco Rabanne)" },
  { name: "Sauvage Dior" },
  { name: "One Million (Paco Rabanne)" },
  { name: "Creed Aventus" },
  { name: "Terre d'Hermès" },
  { name: "Hugo Red" }
];

export async function addDefaultProducts() {
  for (const prod of products) {
    const data = {
      ...prod,
      description: prod.description || "Fragrances intenses, boisées et charismatiques.",
      price: prod.price || 5000,
      imageUrl: prod.imageUrl || "",
      categoryId: prod.categoryId || "0ya2TQZzX3zzvrG97G1c",
      sellerId: prod.sellerId || "Q0H645W"
    };
    try {
      const docRef = await addDoc(collection(db, "products"), data);
      console.log("Ajouté:", data.name, "ID:", docRef.id);
    } catch (e) {
      console.error("Erreur pour", data.name, e);
    }
  }
}
