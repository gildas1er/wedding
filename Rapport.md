# Rapport de développement — WeddingStudio

*Dernière mise à jour : 9 octobre 2026*

WeddingStudio est une plateforme d'organisation de mariage pensée pour la Côte d'Ivoire. Elle couvre les invitations et réponses par WhatsApp, le faire-part en ligne, le plan de table, le budget, la checklist, le déroulé du Jour J, l'album photos et le livre d'or.

- **Site public** : `https://wedding-five-rho-78.vercel.app`
- **Technique** : Next.js 16 (App Router, `proxy.ts`), React 19, Tailwind CSS v4, Supabase (base de données, connexion, stockage), déployé sur Vercel.

---

## 1. À faire avant la mise en production

Ces actions sont nécessaires pour que tout ce qui est décrit ci-dessous fonctionne en ligne.

### 1.1 Migrations Supabase

À lancer **dans l'ordre**, dans le SQL Editor (`supabase/migrations/`) :

| N° | Fichier | Objet |
|---|---|---|
| 01 | `20260930_01_schema_et_fonctions_publiques.sql` | Index, contraintes, fonctions publiques (invitation, réponse, table) |
| 02 | `20260930_02_verrouillage_rls.sql` | Règles d'accès (RLS) : chaque couple ne voit que ses données |
| 03 | `20260930_03_studio_ceremonies_message.sql` | Cérémonies affichées, message WhatsApp |
| 04 | `20260930_04_cadrage_photo_couverture.sql` | Cadrage de la photo de couverture |
| 05 | `20260930_05_couleur_accent.sql` | Couleur d'accent de la palette |
| 06 | `20260930_06_rubriques_pratiques.sql` | Rubriques pratiques (dress code, contact…) |
| 07 | `20260930_07_premium_et_consentement.sql` | Offre Premium, consentement CGU, limite gratuite |
| 08 | `20261001_08_deroule_jour_j.sql` | Heure de fin et responsable dans le déroulé |
| 09 | `20261001_09_checklist.sql` | Notes, personne en charge, date de réalisation |
| 10 | `20261001_10_date_reception.sql` | Date de la réception |
| 11 | `20261001_11_modele_invitation.sql` | Modèle d'invitation (Classique, Enveloppe, Story) |
| 12 | `20261001_12_ceremonie_dot.sql` | Cérémonie de dot et présence des invités |
| 13 | `20261002_13_mode_souvenir.sql` | Mode souvenir, lecture seule, prolongation |
| 14 | `20261002_14_album_par_mariage.sql` | Album photo rattaché à chaque mariage |
| 15 | `20261005_15_lecture_album_maries.sql` | Lecture de l'album par le couple connecté |
| 16 | `20261007_16_police_prenoms.sql` | Police d'écriture des prénoms |
| 17 | `20261008_17_paliers_invites.sql` | Paliers selon le nombre d'invités + **correctif de sécurité** |
| 18 | `20261009_18_journal_admin.sql` | Journal de l'administration, paiements conservés |

> **Urgent :** la migration 17 corrige une faille qui permettait à un couple de se mettre lui-même en Premium (voir section 5).

### 1.2 Variables d'environnement sur Vercel

À déclarer dans Settings → Environment Variables, puis redéployer.

| Variable | Rôle | Obligatoire |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Connexion à Supabase | Oui (déjà en place) |
| `SUPABASE_SERVICE_ROLE_KEY` | Administration, suppression de comptes, album sécurisé, suppression automatique | Oui |
| `ADMIN_EMAILS` | Adresses autorisées sur `/admin`, séparées par des virgules | Oui pour l'administration |
| `CRON_SECRET` | Protège la suppression automatique nocturne | Oui pour le mode souvenir |
| `GALLERY_PASSWORD` / `GALLERY_SECRET` | Ancienne galerie à mot de passe (`/galerie`) | Si la galerie est utilisée |
| `GENIUSPAY_*` | Paiement en ligne (désactivé pour l'instant) | Non |

> Ne jamais préfixer une clé secrète par `NEXT_PUBLIC_` : elle serait visible dans le navigateur.

### 1.3 Réglages Supabase

- **Authentication → URL Configuration**
  - Site URL : `https://wedding-five-rho-78.vercel.app`
  - Redirect URLs : `https://wedding-five-rho-78.vercel.app/**` et `http://localhost:3000/**`
- **Email Templates → Reset Password** : modèle français avec le lien `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/nouveau-mot-de-passe`.
- **SMTP Settings** : envoi par Brevo, expéditeur « WeddingStudio ». Configuré, mais il faut valider l'adresse d'expédition dans Brevo.
- **Providers** : Google est actif. Facebook reste à configurer (voir section 6).

### 1.4 Réglages Vercel

- **Deployment Protection** : le domaine public ne doit pas être protégé, sinon les invités tombent sur une page de connexion Vercel.
- **Cron** : `vercel.json` lance `/api/cron/purge` chaque nuit à 3 h.

---

## 2. Fonctionnalités développées

### 2.1 Fondations et design

- **Design** : identité visuelle haut de gamme.
  - Palette ivoire, bordeaux et or champagne.
  - Polices Fraunces pour les titres et Manrope pour le texte.
  - Tailwind v4 avec des couleurs redéfinies : `rose` correspond à la couleur principale, `amber` à l'accent.
- **Responsive** : toutes les pages sont pensées d'abord pour le mobile et testées jusqu'à 320 px de large. Les formulaires s'ouvrent en panneau depuis le bas sur mobile, et un bouton « + » flottant permet d'ajouter.
- **Sécurité des données** :
  - règles d'accès (RLS) : chaque couple ne lit et n'écrit que ses données ;
  - fonctions publiques sécurisées pour les invités ;
  - protection de la formule, de la limite d'invités et du mode souvenir directement dans la base.
- **Fenêtre de confirmation commune** pour toutes les suppressions (`components/ui/ConfirmDialog.tsx`), accompagnée d'une notification de résultat.

### 2.2 Compte, connexion et légal

- **Inscription** : cases CGU et confidentialité à cocher, accord facultatif pour les messages promotionnels, et preuve du consentement enregistrée (version des documents et date).
- **Connexion** : e-mail et mot de passe, ou Google.
  - Facebook est prévu : le bouton affiche un message clair tant qu'il n'est pas activé dans Supabase.
- **Mot de passe oublié** (`/mot-de-passe-oublie`, `/nouveau-mot-de-passe`, `/auth/confirm`) :
  - lien valable 1 heure, qui fonctionne même ouvert sur un autre appareil ;
  - renvoi possible après 60 secondes ;
  - message identique que l'adresse soit inscrite ou non ;
  - règles du nouveau mot de passe vérifiées en direct.
- **Pages légales** : conditions d'utilisation et de vente (`/conditions`) et politique de confidentialité (`/confidentialite`), à jour des paliers, du mode souvenir et de la suppression. Version actuelle : 8 octobre 2026.

### 2.3 Invités

- **Liste** : tableau sur ordinateur, cartes sur mobile, filtres repliables, statistiques par cérémonie et pagination.
- **Ajout d'invités** :
  - fiche individuelle ;
  - import CSV ;
  - **import depuis le répertoire du téléphone** : directement sur Android (Chrome), par fichier `.vcf` sur iPhone et sur ordinateur. Un écran de vérification repère les doublons, permet de choisir le numéro et de régler le côté et la catégorie.
- **Invitations WhatsApp** : message personnalisable, envoi par `api.whatsapp.com`, qui conserve les emojis.
- **Présence par cérémonie** : dot, mairie, église et réception.
- **Listes à imprimer** : 11 listes, dont une liste « dot » affichée seulement si la dot est au programme.

### 2.4 Faire-part, invitation et page RSVP

- **Studio** (`/dashboard/studio`), avec aperçu en direct de la vraie page de l'invité :
  - palettes de couleurs adaptées automatiquement à l'invitation ;
  - photo de couverture, avec compression et cadrage ;
  - musique au choix ou chanson du couple ;
  - rubriques pratiques ;
  - dates et heures saisies par des sélecteurs ;
  - choix des cérémonies affichées : **dot**, mairie, église, réception avec sa date ;
  - **police des prénoms** : Classique, Great Vibes, Alex Brush, Monsieur La Doulaise, Parisienne, Pinyon Script.
- **Modèles d'invitation** :
  - **Classique** ;
  - **L'Enveloppe** : cachet de cire aux initiales du couple, ouverture animée, la musique démarre à l'ouverture ;
  - **La Story** : écrans en plein écran, toucher pour avancer, appui long pour mettre en pause.
- **Page de l'invité** : programme avec un bouton Plan pour chaque lieu, réponse par cérémonie, confettis à la confirmation. Les titres longs passent sur deux lignes.
- **Partage** : QR codes et liens prêts à partager, avec un aperçu enrichi dans WhatsApp (image Open Graph).

### 2.5 Plan de table

- **Fonctionnement** : glisser-déposer à la souris, au doigt et au clavier, sélection multiple, placement automatique, plan de salle zoomable avec dispositions toutes faites (en U, en cercle, en rangées).
- **Exports** :
  - impression pour le traiteur ;
  - document Word ;
  - **impression du plan de salle** en A4 paysage, avec une page « Qui est à quelle table ? ».

### 2.6 Organisation

- **Budget** : un seul formulaire pour l'ajout et la modification (montants estimé, facturé et réglé, bouton « Tout réglé », échéance, prestataire, notes). Le statut se met à jour selon les montants.
- **Checklist** :
  - liste type de 37 tâches adaptée à la Côte d'Ivoire ;
  - regroupement par période, avec une vraie date limite et les statuts « En retard » et « Ce mois-ci » ;
  - filtres, recherche, priorité, personne en charge, notes ;
  - raccourcis vers les pages concernées.
- **Jour J** :
  - moments avec heure de fin, responsable et contact ;
  - modèle de journée type calé sur les heures du Studio ;
  - compte à rebours avant le mariage, et moment en cours le jour même ;
  - **feuille de route imprimable** en deux versions, équipe et invités, et partage par WhatsApp.

### 2.7 Photos et souvenirs

- **Album photos par mariage** : envoi par le lien du couple (`/photos?id=…`). La page **Album photos** du couple permet de voir les photos en grand et de **tout télécharger en .zip**.
- **Livre d'or** rattaché à chaque mariage.
- **Mode souvenir** :
  - jusqu'à **J+1 mois** : espace complet ;
  - **ensuite** : lecture seule, avec un pop-up et un menu verrouillé, la page « Mes souvenirs » (dates clés, téléchargements CSV, impressions, prolongation, suppression), et les réponses, l'envoi de photos et le livre d'or fermés côté invités ;
  - à **J+12 mois** : suppression automatique la nuit.
  - Prolongation : **5 000 F pour 6 mois**.
- **Suppression définitive** à la demande, depuis le pop-up, « Mes souvenirs » ou les Paramètres, en tapant « SUPPRIMER ». Elle efface les données, les fichiers et le compte de connexion.

### 2.8 Offre et paiement

| Formule | Invités, accompagnants compris | Prix |
|---|---|---|
| Gratuit | 30 (30 fiches pour les comptes créés avant le 8 octobre 2026) | 0 F |
| Intime | 1 à 100 | 50 000 F |
| Famille | 101 à 150 | 75 000 F |
| Grande Fête | 151 à 200 | 100 000 F |
| Prestige | 201 à 250 | 125 000 F |
| Royal | 251 à 300 | 150 000 F |
| Sur mesure | plus de 300 | sur devis |

- **Fonctionnement** :
  - paiement unique, accès jusqu'à J+1 mois après le mariage ;
  - pour monter de palier, le couple paie seulement la différence ;
  - les anciens Premium gardent leurs invités illimités.
- **Activation par contact** : appel ou WhatsApp au **01 01 54 06 87**, avec un message prérempli contenant le palier et la référence du couple. Le paiement en ligne GeniusPay est développé mais désactivé (`ONLINE_PAYMENT_ENABLED = false`).
- **La limite est appliquée par la base**, y compris pour les imports et les hausses du nombre d'accompagnants.

### 2.9 Administration (`/admin`)

- **Accès** réservé aux adresses de `ADMIN_EMAILS`, vérifié par le serveur à chaque demande.
- **Vue d'ensemble** :
  - nombre de couples, paliers payants, montant encaissé, invités gérés ;
  - inscriptions sur 8 semaines et répartition par formule ;
  - couples proches de leur limite, mariages à venir, derniers inscrits.
- **Couples** : recherche, filtres et tri, puis une **fiche** par couple :
  - contact, et ses invités par rapport à sa limite ;
  - activer ou changer de palier, avec le montant et une note ;
  - revenir au gratuit, prolonger, enregistrer un paiement ;
  - désactiver ou réactiver le compte, supprimer le couple.
- **Paiements** et **journal** de toutes les actions.

### 2.11 Logo « Les Alliances »

- **Symbole** : deux alliances entrelacées, bordeaux et or, avec un petit diamant (`components/brand/AlliancesMark.tsx`). Couleurs fixes de la marque, indépendantes de la palette du couple.
- **Où** : en-têtes de l'accueil, de l'espace des mariés, des pages de compte, des pages légales, de l'administration et du guide.
- **Icônes** : onglet du navigateur (`app/icon.svg`), écran d'accueil iPhone (`app/apple-icon.tsx`), image de partage WhatsApp (`lib/og-card.tsx`).

### 2.10 Guide d'utilisation (`/guide`)

- **Page statique** `public/guide/index.html` et 35 captures (`public/guide/img/`), servie sur `/guide` (réécriture dans `next.config.ts`).
- Une seule page pour **ordinateur et téléphone** : sommaire fixe à gauche ou repliable en haut, recherche, captures agrandissables, bouton WhatsApp.
- **Accès** :
  - menu de l'espace : « Aide & guide », aussi disponible en mode souvenir ;
  - bouton « ? » dans la barre du haut sur téléphone ;
  - pied de page de l'accueil ;
  - page de connexion.
- **Rubrique contextuelle** : le lien ouvre la section de la page en cours (`lib/guide.ts`, par exemple `/guide#invites`).
- Les captures montrent un mariage de démonstration. **À refaire** quand une page change beaucoup.

---

## 3. Fonctionnalités modifiées

| Date | Avant | Après |
|---|---|---|
| 30/09 | Premium débloqué à 15 invités, sans explication | Limite gratuite claire de 30, appliquée par la base |
| 30/09 | Prix Premium 25 000 F, accès 6 mois après le mariage | 50 000 F, puis **paliers** (8/10) ; accès réduit à J+1 mois |
| 30/09 | Paiement en ligne GeniusPay | Désactivé, activation par appel ou WhatsApp |
| 30/09 | Bouton « Imprimer » sur la page Invités | Retiré ; bouton « + » flottant sur mobile, cartes au lieu d'un tableau |
| 30/09 | Plan de table peu fluide sur mobile | Reconstruit : glisser-déposer tactile, sélection, plan de salle |
| 01/10 | Budget : formulaires d'ajout et de modification différents | Un seul formulaire complet |
| 01/10 | Jour J : ajout et suppression seulement, faux « rappel intelligent » | Modification, responsables, compte à rebours, impression |
| 01/10 | Checklist : étiquette « Urgent » sur presque tout | Vraies échéances, statut « En retard », liste type |
| 01/10 | Réception sans date | Champ date ajouté |
| 01/10 | Programme sans dot | Cérémonie de dot avant la mairie |
| 02/10 | Compte jamais fermé | Mode souvenir à J+1 mois, suppression à J+12 mois |
| 02/10 | Album photo commun à toute la plateforme | Album rattaché à chaque mariage |
| 05/10 | Menu « ⋯ » caché derrière le plan de salle | Affiché au premier plan |
| 07/10 | Confirmations de suppression grises du navigateur | Fenêtre de confirmation soignée et notification |
| 08/10 | Limite comptée en fiches | Comptée en personnes, accompagnants compris (comptes anciens inchangés) |
| 08/10 | Messages d'erreur bruts (Facebook) | Message clair si le service n'est pas activé |

---

## 4. Erreurs rencontrées et corrections

| Problème constaté | Cause | Correction |
|---|---|---|
| Lien WhatsApp « Ce lien n'a pas pu être ouvert » | Numéro sans indicatif international | Numéros normalisés en +225 |
| Emojis cassés (« � ») dans WhatsApp | Redirection de `wa.me` | Liens `api.whatsapp.com/send` |
| Polices affichées en Times | Variables de police posées sur `body` au lieu de `html` | Déplacées sur `<html>` |
| Envoi de photos refusé pour un couple connecté | La base n'autorise l'envoi qu'aux visiteurs anonymes | Client « invité » sans session (`lib/supabase-guest.ts`) |
| Champs date et heure qui débordaient sur iPhone | Largeur minimale imposée par Safari iOS | Règle CSS propre à iOS et `min-w-0` |
| « La galerie n'est pas encore configurée » | `GALLERY_PASSWORD` absent sur Vercel | Variable à ajouter |
| Couple bloqué ou non selon les cas | Migration 7 non lancée | Migration lancée, page tolérante à son absence |
| Album photos vide | Lecture des photos interdite au couple connecté | Migration 15 |
| Lien de réinitialisation vers `localhost:3000` | Site URL Supabase restée sur l'adresse locale | Site URL et Redirect URLs corrigées |
| Lien de réinitialisation bloqué par une connexion Vercel | Domaine protégé par Vercel (mauvais domaine utilisé) | Domaine public `wedding-five-rho-78` |
| E-mails envoyés par « Supabase Auth » | Service d'envoi par défaut | SMTP Brevo, expéditeur « WeddingStudio » |
| « Unsupported provider » (Facebook) | Facebook non activé dans Supabase | Message clair dans l'application ; configuration à faire |
| Titres des cérémonies coupés (« La Cérémoni… ») | Une seule ligne de texte | Retour à la ligne autorisé, bouton Plan plus compact |
| Story trop haute sur iPhone SE avec 4 cérémonies | Contenu plus haut que l'écran | Affichage resserré sur petits écrans |
| **Faille : un couple pouvait se mettre en Premium** | Protection fondée sur `current_user`, qui vaut toujours `postgres` dans une fonction `security definer` | Vérification sur le rôle réel de l'appelant (migration 17) |
| Paiements effacés avec le couple | Suppression en cascade | Paiements conservés (migration 18) |

---

## 5. Points de vigilance

- **Faille de sécurité, migration 17** : après l'avoir lancée, vérifiez la liste des comptes Premium et comparez-la aux paiements réels :
  ```sql
  select id, partner_1_name, partner_2_name, plan, premium_until, tier
  from public.marriages where plan = 'premium';
  ```
- **Envoi d'e-mails** : envoyer avec une adresse Gmail via Brevo augmente le risque d'arriver dans les spams. Il faudra un nom de domaine authentifié.
- **Inscription par Google ou Facebook** : les prénoms des deux mariés ne sont pas demandés. Le second s'appelle « Partenaire 2 » jusqu'à modification.
- **Compte administrateur** : il crée lui aussi un espace de mariage. Ne pas supprimer ce couple depuis l'administration.
- **Sauvegardes Supabase** : elles peuvent conserver quelques jours des données supprimées. À mentionner dans la politique de confidentialité.
- **Coordonnées de l'éditeur** : à compléter dans `lib/legal.ts`. Les pages légales sont à faire relire par un juriste.

---

## 6. Fonctionnalités restant à développer

### Priorité haute
- **Connexion Facebook** : créer l'application Meta et l'activer dans Supabase. Le code est prêt.
- **Écran d'accueil à la première connexion** : prénoms des deux mariés et date du mariage, en particulier pour les inscriptions par Google ou Facebook.
- **E-mail de rappel avant la suppression automatique**, par exemple à J+11 mois : aujourd'hui, le couple n'est prévenu que dans l'application.
- **Données de paiement** : décider de les conserver sans informations personnelles, ou adapter la politique de confidentialité.
- **Nom de domaine** pour le site et l'envoi d'e-mails.

### Priorité moyenne
- **Paiement en ligne GeniusPay** adapté aux paliers, avec la différence en cas de montée de palier. Aujourd'hui, il activerait seulement le palier Intime.
- **Modèles d'invitation** : Le Wax, Le Compte à rebours, Le Jardin, La Nuit dorée (les aperçus animés sont prêts).
- **Image de partage WhatsApp** dans la police et le modèle choisis par le couple.
- **Jour J** : bouton « On a 15 min de retard » qui décale tous les moments suivants, et déroulé sur plusieurs jours.
- **Pages des invités** : remplacer les dernières alertes du navigateur (livre d'or, enregistrement d'une réponse).
- **Galerie photos pour les invités** : consulter l'album du mariage via un lien protégé, propre à chaque couple.

### Priorité basse
- **Collaboration** : inviter un wedding planner ou un témoin dans l'espace (onglet « Équipe » des Paramètres).
- **Administration** : export comptable des paiements, envoi groupé de messages aux couples.
- **Tests automatisés** intégrés au projet : les tests actuels sont des scripts locaux avec une base simulée.

---

## 7. Méthode de test utilisée

- **Vérifications automatiques** : TypeScript (`npx tsc --noEmit`), ESLint et build de production (`npx next build`) après chaque changement.
- **Tests de bout en bout** : un **faux Supabase** local et un navigateur automatisé (Puppeteer), sur iPhone SE (320 px), iPhone (390 px), tablette et ordinateur.
- **Tests SQL** des migrations sensibles (paliers, protections) avec **PGlite**, une version de PostgreSQL qui tourne dans Node.
- **Aucun test n'est fait sur la base réelle.** Les seules opérations sur Supabase en production ont été des lectures, pour diagnostiquer.
