import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";

export async function testInsertFirestore() {
  try {
    const docRef = await addDoc(collection(db, "testCollection"), {
      testField: "valeur de test",
      date: new Date().toISOString(),
    });
    console.log("Document ajouté avec l'ID :", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("Erreur lors de l'ajout :", e);
    throw e;
  }
}
