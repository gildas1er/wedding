import type { Metadata } from 'next';
import { LegalPage, Section } from '../../components/LegalPage';
import { LEGAL } from '../../lib/legal';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: 'Quelles données WeddingStudio collecte, pourquoi, et comment exercer vos droits.',
};

export default function ConfidentialitePage() {
  return (
    <LegalPage
      eyebrow="Vos données"
      title="Politique de confidentialité"
      intro="Nous traitons vos données et celles de vos invités uniquement pour vous aider à organiser votre mariage. Voici lesquelles, pourquoi, et quels sont vos droits."
    >
      <Section title="1. Responsable du traitement">
        <p>
          Pour les données de votre compte : <strong>{LEGAL.editorName}</strong>, {LEGAL.editorCity} ({LEGAL.contactEmail}).
        </p>
        <p>
          Pour les données de vos invités, <strong>vous</strong> décidez de leur collecte et de leur usage : {LEGAL.siteName} les traite pour votre compte, selon vos instructions, et ne les utilise jamais à d&apos;autres fins.
        </p>
      </Section>

      <Section title="2. Données collectées">
        <ul>
          <li><strong>Votre compte :</strong> prénoms des mariés, e-mail, téléphone, date du mariage, rôle, préférences de l&apos;invitation.</li>
          <li><strong>Vos invités :</strong> nom, numéro WhatsApp, catégorie, nombre d&apos;accompagnants, réponse aux cérémonies, notes (par exemple une allergie), table attribuée.</li>
          <li><strong>Contenus :</strong> photos de couverture, photos et messages déposés par vos invités, musique envoyée.</li>
          <li><strong>Paiement :</strong> référence, montant et statut de la transaction. Les données de carte ou de paiement mobile sont traitées uniquement par GeniusPay.</li>
          <li><strong>Technique :</strong> cookies nécessaires à la connexion et à l&apos;accès à la galerie (aucun cookie publicitaire), préférences d&apos;affichage enregistrées dans votre navigateur.</li>
        </ul>
      </Section>

      <Section title="3. Pourquoi ?">
        <ul>
          <li>Fournir le service que vous avez demandé (exécution du contrat) : invitations, RSVP, plan de table, budget, album…</li>
          <li>Gérer le paiement de l&apos;offre Premium et répondre à vos demandes.</li>
          <li>Vous envoyer des nouveautés, <strong>seulement si vous l&apos;avez accepté</strong> (désinscription possible à tout moment).</li>
          <li>Assurer la sécurité du service (prévention des abus).</li>
        </ul>
        <p>Nous ne vendons ni ne louons aucune donnée, et n&apos;affichons aucune publicité.</p>
      </Section>

      <Section title="4. Informer vos invités">
        <p>Vos invités n&apos;ont pas eux-mêmes créé de compte. En utilisant {LEGAL.siteName}, vous vous engagez à ne saisir que les informations utiles à l&apos;organisation et à pouvoir les informer, s&apos;ils le demandent, de l&apos;usage de leurs données. Un invité peut demander à tout moment la suppression de ses informations, auprès de vous ou en nous écrivant.</p>
      </Section>

      <Section title="5. Qui y a accès ?">
        <ul>
          <li>Vous, et les personnes à qui vous donnez accès à votre compte.</li>
          <li>Chaque invité ne voit que sa propre invitation et les informations publiques du mariage (programme, lieux, infos pratiques).</li>
          <li>Nos prestataires techniques, uniquement pour faire fonctionner le service : <strong>Supabase</strong> (base de données et stockage), <strong>Vercel</strong> (hébergement du site), <strong>GeniusPay</strong> (paiement), <strong>Wikimedia</strong> (lecture des musiques proposées).</li>
        </ul>
        <p>Ces prestataires peuvent héberger les données hors de Côte d&apos;Ivoire (Europe, États-Unis). Nous choisissons des prestataires qui offrent des garanties de sécurité et de confidentialité reconnues.</p>
      </Section>

      <Section title="6. Durée de conservation">
        <p>Les données de votre mariage sont conservées tant que votre compte est actif, et au plus tard 12 mois après la date du mariage, sauf si vous demandez leur conservation plus longue ou leur suppression plus tôt. Les données de paiement sont conservées le temps exigé par les obligations comptables.</p>
      </Section>

      <Section title="7. Sécurité">
        <p>Connexions chiffrées (HTTPS), accès aux données limité par des règles strictes (chaque couple n&apos;accède qu&apos;à son propre mariage), mots de passe jamais stockés en clair, galerie protégée par un mot de passe vérifié côté serveur.</p>
      </Section>

      <Section title="8. Vos droits">
        <p>Conformément à la loi ivoirienne n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel, vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;opposition et de suppression de vos données. Écrivez à <strong>{LEGAL.contactEmail}</strong> ; nous répondons sous 30 jours.</p>
        <p>Vous pouvez également saisir l&apos;Autorité de Régulation des Télécommunications/TIC de Côte d&apos;Ivoire (ARTCI), autorité de protection des données personnelles.</p>
      </Section>
    </LegalPage>
  );
}
