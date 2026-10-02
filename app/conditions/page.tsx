import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, Section } from '../../components/LegalPage';
import { LEGAL } from '../../lib/legal';
import { ACTIVE_MONTHS_AFTER_WEDDING, DELETE_MONTHS_AFTER_WEDDING, EXTENSION_MONTHS, EXTENSION_PRICE_XOF } from '../../lib/lifecycle';
import { FREE_GUEST_LIMIT, ONLINE_PAYMENT_ENABLED, PREMIUM_ACCESS_MONTHS_AFTER_WEDDING, PREMIUM_CONTACT, PREMIUM_PRICE_XOF, formatXof } from '../../lib/plan';

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation et de vente",
  description: "Les règles d'utilisation de WeddingStudio et les conditions de l'offre Premium.",
};

export default function ConditionsPage() {
  return (
    <LegalPage
      eyebrow="Conditions générales"
      title="Conditions d'utilisation et de vente"
      intro={`Ces conditions encadrent l'utilisation de ${LEGAL.siteName} et l'achat de l'offre Premium. En créant un compte, vous les acceptez.`}
    >
      <Section title="1. Qui sommes-nous ?">
        <p>
          {LEGAL.siteName} est un service en ligne d&apos;organisation de mariage édité par <strong>{LEGAL.editorName}</strong>, {LEGAL.editorStatus}, {LEGAL.editorCity}.
          Contact : <strong>{LEGAL.contactEmail}</strong>.
        </p>
        <p>Le site est hébergé par Vercel Inc. (États-Unis) ; les données sont stockées par Supabase Inc.{ONLINE_PAYMENT_ENABLED && ' Le paiement est assuré par GeniusPay.'}</p>
      </Section>

      <Section title="2. Le service">
        <p>{LEGAL.siteName} permet aux futurs mariés de gérer leur liste d&apos;invités, d&apos;envoyer des invitations et de recueillir les réponses (RSVP), de composer un faire-part en ligne, d&apos;organiser le plan de table, le budget, les tâches et le déroulé du jour J, et de recevoir les photos et messages de leurs proches.</p>
        <p>Les invitations WhatsApp sont envoyées <strong>depuis le téléphone de l&apos;utilisateur</strong> : {LEGAL.siteName} prépare le message, l&apos;utilisateur l&apos;envoie lui-même.</p>
      </Section>

      <Section title="3. Votre compte">
        <ul>
          <li>Vous devez avoir au moins 18 ans et fournir des informations exactes.</li>
          <li>Vous êtes responsable de la confidentialité de votre mot de passe et de l&apos;usage de votre compte.</li>
          <li>Vous pouvez demander la suppression de votre compte à tout moment en écrivant à {LEGAL.contactEmail}.</li>
        </ul>
      </Section>

      <Section title="4. Vos engagements">
        <ul>
          <li><strong>Données de vos invités.</strong> Vous saisissez les noms, numéros et réponses de vos proches. Vous vous engagez à ne les utiliser que pour l&apos;organisation de votre mariage et à les informer de ce traitement (voir la <Link href="/confidentialite" className="text-rose-600 underline-offset-4 hover:underline">politique de confidentialité</Link>).</li>
          <li><strong>Contenus.</strong> Vous garantissez détenir les droits sur les photos, musiques et textes que vous publiez (photo de couverture, chanson personnelle, messages).</li>
          <li><strong>Usage loyal.</strong> Il est interdit d&apos;utiliser le service pour envoyer des messages non sollicités, des contenus illicites, ou pour tenter d&apos;en contourner les protections.</li>
        </ul>
      </Section>

      <Section title="5. Contenus des invités">
        <p>Les photos et messages déposés par vos invités (album, livre d&apos;or) sont visibles par les mariés et, pour le livre d&apos;or, par les personnes disposant du lien. Nous pouvons retirer tout contenu manifestement illicite qui nous serait signalé.</p>
      </Section>

      <Section title="6. Disponibilité et responsabilité">
        <p>Nous faisons notre possible pour que le service soit disponible et fiable, sans pouvoir garantir une disponibilité permanente. Nous ne sommes pas responsables des services tiers (WhatsApp, opérateurs de paiement, Google Maps) ni d&apos;une mauvaise utilisation du service. Nous vous conseillons de conserver une copie de vos listes importantes (exports disponibles dans Paramètres → Export).</p>
      </Section>

      <Section id="vente" title="7. Offre gratuite et offre Premium">
        <ul>
          <li><strong>Gratuit :</strong> toutes les fonctionnalités, jusqu&apos;à {FREE_GUEST_LIMIT} fiches invités.</li>
          <li><strong>Premium :</strong> {formatXof(PREMIUM_PRICE_XOF)}, paiement unique, invités illimités. L&apos;accès Premium est valable jusqu&apos;à {PREMIUM_ACCESS_MONTHS_AFTER_WEDDING} mois après la date de votre mariage indiquée dans votre espace.</li>
          {ONLINE_PAYMENT_ENABLED ? (
            <>
              <li><strong>Paiement :</strong> Wave, Orange Money, MTN MoMo, Moov Money ou carte bancaire, via la page sécurisée de GeniusPay. Nous n&apos;avons jamais accès à vos données de carte ni à votre code de paiement mobile.</li>
              <li><strong>Activation :</strong> immédiate, dès la confirmation du paiement par GeniusPay. En cas de souci, écrivez-nous avec la référence du paiement.</li>
            </>
          ) : (
            <>
              <li><strong>Paiement :</strong> sur demande, par appel ou WhatsApp au <strong>{PREMIUM_CONTACT.display}</strong>. Le règlement se fait par Wave, Orange Money, MTN MoMo ou Moov Money. Ne communiquez jamais votre code secret de paiement mobile.</li>
              <li><strong>Activation :</strong> dès réception du paiement, avec la référence de votre espace (affichée sur la page Premium).</li>
            </>
          )}
          <li><strong>Remboursement :</strong> vous pouvez demander le remboursement dans les 7 jours suivant le paiement, tant que vous n&apos;avez pas dépassé {FREE_GUEST_LIMIT} fiches invités. Au-delà, le service ayant été pleinement utilisé, il n&apos;est pas remboursable, sauf dysfonctionnement de notre fait.</li>
          <li>À la fin de l&apos;accès Premium, vos données restent consultables ; seul l&apos;ajout d&apos;invités au-delà de la limite gratuite est de nouveau bloqué.</li>
        </ul>
      </Section>

      <Section id="apres-le-mariage" title="8. Après le mariage">
        <ul>
          <li><strong>Jusqu&apos;à {ACTIVE_MONTHS_AFTER_WEDDING} mois après le mariage :</strong> votre espace reste complet (réponses, photos, livre d&apos;or, modifications).</li>
          <li><strong>Mode souvenir :</strong> ensuite, l&apos;espace passe en lecture seule. Vous pouvez consulter et télécharger vos données, mais plus les modifier ; les invités ne peuvent plus répondre ni envoyer de photos ou de messages.</li>
          <li><strong>Suppression automatique :</strong> {DELETE_MONTHS_AFTER_WEDDING} mois après la date du mariage, l&apos;espace, ses données, ses fichiers et le compte de connexion sont supprimés définitivement. La date de suppression est affichée dans votre espace.</li>
          <li><strong>Prolongation :</strong> {formatXof(EXTENSION_PRICE_XOF)} pour {EXTENSION_MONTHS} mois, sur demande au {PREMIUM_CONTACT.display}. L&apos;espace redevient complet et n&apos;est pas supprimé avant la fin de la prolongation.</li>
          <li><strong>Suppression à votre demande :</strong> vous pouvez supprimer définitivement votre compte à tout moment depuis votre espace (Paramètres ou Mes souvenirs). Cette suppression est immédiate et ne peut pas être annulée.</li>
          <li>Une fois le mariage passé, sa date ne peut plus être modifiée.</li>
        </ul>
      </Section>

      <Section title="9. Propriété intellectuelle">
        <p>Le site, son design et ses textes appartiennent à l&apos;éditeur. Vos contenus restent les vôtres : vous nous autorisez seulement à les héberger et à les afficher pour faire fonctionner le service.</p>
      </Section>

      <Section title="10. Modification des conditions">
        <p>Ces conditions peuvent évoluer. En cas de changement important, vous en serez informé dans votre espace ; la version applicable est celle en vigueur à la date d&apos;utilisation.</p>
      </Section>

      <Section title="11. Droit applicable">
        <p>Ces conditions sont soumises au droit ivoirien. En cas de litige, une solution amiable sera recherchée avant toute action ; à défaut, les tribunaux d&apos;Abidjan seront compétents.</p>
      </Section>
    </LegalPage>
  );
}
