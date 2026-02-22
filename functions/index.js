const { onCall } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();

exports.sendWhatsappMessage = onCall({ cors: true }, async (request) => {
  const { sellerId, phone, text } = request.data;

  if (!sellerId || !phone || !text) {
    console.warn('[WA CF] Paramètres manquants:', { sellerId, phone, hasText: !!text });
    return { success: false, reason: 'missing_params' };
  }

  const db = getFirestore();
  const sellerDoc = await db.collection('sellers').doc(sellerId).get();

  if (!sellerDoc.exists) {
    console.warn('[WA CF] Vendeur introuvable:', sellerId);
    return { success: false, reason: 'seller_not_found' };
  }

  const seller = sellerDoc.data();

  if (!seller.whatsappApiKey || !seller.whatsappSender) {
    console.log('[WA CF] Credentials manquants pour seller:', sellerId);
    return { success: false, reason: 'no_credentials' };
  }

  const url = `https://wa.nivle.net/api/messages?phone=${encodeURIComponent(phone)}&from=${encodeURIComponent(seller.whatsappSender)}&text=${encodeURIComponent(text)}`;

  console.log('[WA CF] Envoi vers', phone, '| from:', seller.whatsappSender);
  console.log('[WA CF] Message:', text);

  const response = await fetch(url, {
    method: 'GET',
    headers: { authorization: seller.whatsappApiKey },
  });

  const body = await response.text();
  console.log('[WA CF] Réponse HTTP', response.status, '→', body);

  return { success: response.ok, status: response.status, body };
});
