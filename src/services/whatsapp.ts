import { getFunctions, httpsCallable } from 'firebase/functions';
import { OrderStatus } from '../types';

const sendViaCloudFunction = async (
  sellerId: string,
  phone: string,
  text: string
): Promise<void> => {
  if (!sellerId || !phone || !text) return;
  console.log('[WA] Appel Cloud Function | sellerId:', sellerId, '| phone:', phone);
  console.log('[WA] Message:', text);
  try {
    const fn = httpsCallable(getFunctions(), 'sendWhatsappMessage');
    const result: any = await fn({ sellerId, phone, text });
    console.log('[WA] Réponse CF:', result.data);
  } catch (e) {
    console.error('[WA] Erreur CF:', e);
  }
};

export const notifyNewOrder = async (
  sellerId: string,
  sellerPhone: string,
  clientPhone: string,
  reference: string
): Promise<void> => {
  console.log('[WA] notifyNewOrder — ref:', reference);
  const origin = window.location.origin;
  const trackingUrl = `${origin}/client/${sellerId}/${clientPhone}/orders`;
  const adminUrl = `${origin}/login`;

  await Promise.allSettled([
    sendViaCloudFunction(
      sellerId,
      clientPhone,
      `Bonjour ! Votre commande *${reference}* a bien été reçue.\nSuivez-la ici :\n${trackingUrl}`
    ),
    sendViaCloudFunction(
      sellerId,
      sellerPhone,
      `Nouvelle commande *${reference}* reçue !\nConnectez-vous pour la traiter :\n${adminUrl}`
    ),
  ]);
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  processing: 'En cours de traitement',
  processed: 'Traitée',
  cancelled: 'Annulée',
  refused: 'Refusée',
};

export const notifyStatusChange = async (
  sellerId: string,
  clientPhone: string,
  reference: string,
  newStatus: OrderStatus
): Promise<void> => {
  console.log('[WA] notifyStatusChange — ref:', reference, '| statut:', newStatus);
  await sendViaCloudFunction(
    sellerId,
    clientPhone,
    `Votre commande *${reference}* vient d'être mise à jour.\nNouveau statut : *${STATUS_LABELS[newStatus]}*`
  );
};
