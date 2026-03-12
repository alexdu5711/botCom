export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-zinc-100 shadow-xl shadow-black/5 p-8 space-y-8">

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Politique de Confidentialité</h1>
          <p className="text-zinc-500 text-sm">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">1. Présentation de l'application</h2>
          <p className="text-zinc-600 leading-relaxed">
            <strong>Eco-Shop Bot</strong> est une application de commande en ligne connectée à WhatsApp. Elle permet aux clients de passer des commandes auprès de vendeurs partenaires et de recevoir des notifications de suivi directement sur WhatsApp.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">2. Données collectées</h2>
          <p className="text-zinc-600 leading-relaxed">Dans le cadre de l'utilisation de l'application, nous collectons les informations suivantes :</p>
          <ul className="space-y-2">
            {[
              { label: 'Prénom et nom', desc: 'Pour personnaliser vos notifications et identifier votre commande.' },
              { label: 'Numéro de téléphone WhatsApp', desc: 'Pour vous envoyer les confirmations et mises à jour de commande.' },
            ].map(({ label, desc }) => (
              <li key={label} className="flex gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="w-2 h-2 mt-2 rounded-full bg-black shrink-0" />
                <span className="text-zinc-600 text-sm"><strong>{label}</strong> — {desc}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">3. Finalité du traitement</h2>
          <p className="text-zinc-600 leading-relaxed">
            Vos données personnelles sont collectées <strong>uniquement dans le but de vous notifier</strong> du statut de vos commandes (confirmation, préparation, livraison, etc.). Elles ne sont <strong>pas utilisées à des fins commerciales, publicitaires ou marketing</strong>, et ne sont <strong>pas revendues</strong> à des tiers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">4. Conservation des données</h2>
          <p className="text-zinc-600 leading-relaxed">
            Vos données sont conservées le temps nécessaire au traitement et au suivi de vos commandes. Elles sont stockées de manière sécurisée sur les serveurs de <strong>Google Firebase</strong> (infrastructure cloud conforme RGPD).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">5. Partage des données</h2>
          <p className="text-zinc-600 leading-relaxed">
            Vos données ne sont partagées qu'avec :
          </p>
          <ul className="space-y-2">
            {[
              `Le vendeur concerné par votre commande, afin qu'il puisse la traiter.`,
              `L'API WhatsApp Business (Meta) pour l'envoi des notifications.`,
              'Google Firebase pour le stockage sécurisé des données.',
            ].map((item, i) => (
              <li key={i} className="flex gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="w-2 h-2 mt-2 rounded-full bg-black shrink-0" />
                <span className="text-zinc-600 text-sm">{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-zinc-600 leading-relaxed">
            Aucun autre tiers n'a accès à vos données.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">6. Vos droits</h2>
          <p className="text-zinc-600 leading-relaxed">
            Conformément à la réglementation applicable, vous disposez des droits suivants :
          </p>
          <ul className="space-y-2">
            {[
              'Droit d\'accès à vos données personnelles',
              'Droit de rectification en cas d\'inexactitude',
              'Droit à l\'effacement (droit à l\'oubli)',
              'Droit d\'opposition au traitement',
            ].map((item, i) => (
              <li key={i} className="flex gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="w-2 h-2 mt-2 rounded-full bg-black shrink-0" />
                <span className="text-zinc-600 text-sm">{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-zinc-600 leading-relaxed">
            Pour exercer ces droits, contactez-nous via WhatsApp ou par le biais du vendeur auprès duquel vous avez passé commande.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">7. Sécurité</h2>
          <p className="text-zinc-600 leading-relaxed">
            Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, perte ou divulgation.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">8. Contact</h2>
          <p className="text-zinc-600 leading-relaxed">
            Pour toute question relative à cette politique de confidentialité ou à vos données personnelles, vous pouvez contacter le responsable de traitement directement via l'application ou auprès du vendeur concerné.
          </p>
        </section>

        <div className="pt-4 border-t border-zinc-100 text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} Eco-Shop Bot — Tous droits réservés
        </div>
      </div>
    </div>
  );
}
