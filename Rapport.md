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
| 19 | `20261009_19_codes_promo_parrainage.sql` | Codes promo, codes de parrainage, réduction à l'activation |
| 20 | `20261012_20_securite_trouver_ma_table.sql` | Sécurité : « Trouver ma table » ne renvoie plus l'identifiant des invités (audit, constat 1) |
| 21 | `20261012_21_securite_photos_livre_or.sql` | Sécurité : fiches photo, livre d'or et liste des fichiers ne sont plus lisibles par tous (audit, constat 2) |
| 22 | `20261012_22_securite_acces_admin.sql` | Sécurité : l'administration exige le marqueur `admin` (app_metadata), donné par `select public.set_admin('…')` (audit, constat 3) |
| 23 | `20261012_23_securite_limite_essais.sql` | Sécurité : limite d'essais sur les codes promo (10 refus / heure / compte) et « Trouver ma table » (60 / 10 min / IP / mariage) (audit, constat 8) |
| 24 | `20261012_24_securite_points_info.sql` | Sécurité : limite d'invités d'un mariage plus lisible de l'extérieur ; prénoms du parrain limités à 30 vérifications / heure / IP (audit, points 10.1 et 10.2) |
| 25 | `20261012_25_securite_envois_fichiers.sql` | Sécurité : taille et types des fichiers limités par espace (photos 5 Mo, faire-part 10 Mo) ; envoi seulement dans le dossier d'un mariage existant (audit, point 10.4) |
| 26 | `20261013_26_ecran_bienvenue.sql` | Écran de bienvenue affiché une seule fois (colonne `onboarded_at`) ; les couples qui ont déjà des invités sont marqués comme accueillis |
| 27 | `20261013_27_modele_avant_premiere.sql` | Nouveau modèle d'invitation « L'Avant-première » ajouté à la liste des modèles autorisés |
| 28 | `20261016_28_parrainage_sur_invitation.sql` | Code de parrainage du couple ajouté aux informations publiques de l'invitation (bloc WeddingStudio après le mariage) |
| 29 | `20261016_29_securite_envois_invites.sql` | Sécurité : livre d'or limité aux photos de notre stockage ; limites d'envoi (messages, photos, place par mariage) ; photos d'invités de 3 Mo au plus (revue du 16 octobre, points 1 et 2) |
| 30 | `20261019_30_fiche_mariage_automatique.sql` | Fiche mariage créée automatiquement : déclencheur à l'inscription remis en place, filet de sécurité `ensure_my_marriage()` à la première ouverture de l'espace, rattrapage des comptes sans fiche (hors administrateurs), consentement de nouveau enregistré |

> **Urgent :** la migration 17 corrige une faille qui permettait à un couple de se mettre lui-même en Premium (voir section 5).

### 1.2 Variables d'environnement sur Vercel

À déclarer dans Settings → Environment Variables, puis redéployer.

| Variable | Rôle | Obligatoire |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Connexion à Supabase | Oui (déjà en place) |
| `SUPABASE_SERVICE_ROLE_KEY` | Administration, suppression de comptes, album sécurisé, suppression automatique | Oui |
| `ADMIN_EMAILS` | Adresses autorisées sur `/admin`, séparées par des virgules | Oui pour l'administration |
| `CRON_SECRET` | Protège la suppression automatique nocturne | Oui pour le mode souvenir |
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
  - **L'Avant-première** : façon plateforme de séries (`components/rsvp/PremiereIntro.tsx`). Générique aux initiales du couple, écran « Choisissez votre profil » avec la photo de couverture en grand et le profil au nom de l'invité, affiche, cérémonies présentées en épisodes, infos pratiques (« À ne pas manquer »), compte à rebours, réponse dans un tiroir (présence, cérémonies, petit mot) enregistrée par la même fonction que le formulaire classique. Textes au nom des mariés ; pas de choix du nombre de personnes (fixé par les mariés). Aucun nom, logo ni couleur de marque existante : les couleurs suivent la palette du couple. Demande la migration 27.
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

### 2.12 Codes promo et parrainage

- **Codes promo** (onglet « Promos & parrainage » de `/admin`) : réduction en montant ou en %, date limite, nombre d'utilisations, partenaire et commission par vente. Un code déjà saisi n'est jamais supprimé, seulement désactivé.
- **Parrainage** : chaque couple a son code (ex. `AWAYAO27`) et un lien `/register?parrain=CODE`. Le filleul a **5 000 F de réduction** ; le parrain reçoit **5 000 F** quand le filleul paie (versement à la main, noté dans la fiche du filleul). Montants dans `lib/promo.ts` et la fonction SQL `my_code()`.
- **Couple** : champ « Code promo ou de parrainage » et carte « Parrainez un couple » sur la page Premium ; prix barrés et message WhatsApp avec le code et le montant à payer.
- **Inscription** : bandeau « X vous invitent », code gardé dans le navigateur pour une inscription avec Google, puis rattaché à la première visite de l'espace.
- **Administration** : la fiche du couple propose le montant réduit (case « Appliquer le code »), le code est marqué utilisé et noté sur le paiement.
- **Sécurité** : les champs du code ne peuvent être changés que par le serveur ou par les fonctions de la base ; un code ne sert qu'une fois par couple ; le parrainage est refusé à un couple qui a déjà payé.

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

- **Carte du menu « Votre liste d'invités » (19 octobre 2026)** : remplace « Recevez tous vos proches, dès 50 000 F » pour les couples en version gratuite (`GuestAllowanceCard` dans `components/dashboard/DashboardShell.tsx`). Barre « n / 30 invités offerts » (fiches pour les anciens comptes) et message selon la liste : 0 invité « 30 invités offerts pour bien démarrer » (bouton vers la page Invités), en cours « Votre liste prend forme », à partir de 80 % « Plus que n places offertes », à 30 « Votre liste est complète : invitez tout le monde » (boutons vers la fenêtre des formules). Rappel « -30 % jusqu'au 20 déc. » seulement à partir de 80 %, pendant l'offre. Mise à jour à chaque changement de page et dès qu'un invité est ajouté ou retiré (événement `ws-guests-changed` envoyé par la page Invités). Aucun prix affiché dans la carte.
- **Fiche mariage toujours créée (19 octobre 2026, migration 30)** : en production, le déclencheur de création à l'inscription était absent ; les comptes créés avec la confirmation des e-mails ou avec Google restaient sans fiche. Une seule fonction de création (`create_marriage_for_user` : prénoms, date, consentement, parrainage), le déclencheur remis en place, et un filet de sécurité : `lib/current-marriage.ts` appelle `ensure_my_marriage()` quand un couple connecté n'a pas de fiche (création immédiate, pour lui seul, sans doublon, jamais pour un compte administrateur). La migration crée aussi la fiche des comptes existants qui n'en ont pas (sauf administrateurs). La migration 19 avait cessé d'enregistrer le consentement aux conditions : c'est rétabli.
- **Offre de lancement -30 % (18 octobre 2026)** : règles dans `lib/launch-offer.ts` (30 %, fin le 20 décembre 2026 inclus, heure d'Abidjan). Première formule seulement (Intime à Royal ; pas de montée de palier, de prolongation ni de sur-mesure), sans code à saisir, non cumulable avec un code promo ou de parrainage (la réduction la plus avantageuse s'applique ; le parrain garde sa récompense). Date qui compte : l'activation dans l'administration (vérifiée par le serveur). Affichage : bandeau et encart sur l'accueil, encart à l'inscription (`components/promo/LaunchOffer.tsx`, calculé dans le navigateur pour disparaître sans redéploiement), prix barrés et message WhatsApp sur la page Formules et dans la fenêtre des formules, montant proposé et case « Offre de lancement » dans la fiche du couple, mention dans la note du paiement et le journal. Le paiement en ligne (désactivé) n'applique pas l'offre.
- **Administration : comptes sans mariage (17 octobre 2026)** : onglet « Sans mariage » (`components/admin/AccountsPanel.tsx`) listant les comptes de connexion sans fiche mariage (e-mail, prénoms et date saisis, mode d'inscription, e-mail confirmé ou non, dernière connexion) et les anciennes lignes `profiles` dont le compte n'existe plus. Actions (`/api/admin/accounts/[id]`, double authentification et même origine exigées, notées au journal) : « Créer sa fiche mariage » (comme à l'inscription), « Supprimer le compte » (compte et profil), « Effacer » l'ancien profil. Un compte administrateur est signalé et ne peut pas être supprimé d'ici. La table `profiles` vient d'un réglage Supabase antérieur aux migrations : l'application ne s'en sert pas.
- **Anti-robot sur l'inscription, la connexion et le mot de passe oublié (16 octobre 2026)** : Cloudflare Turnstile (`components/auth/Captcha.tsx`), le plus souvent invisible. Le jeton est transmis à Supabase (`captchaToken`) par `/register`, `/login` et `/mot-de-passe-oublie`, renouvelé après chaque envoi ; message en français si la vérification échoue. Sans `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, rien ne s'affiche et rien ne change. Ordre de mise en service : clé du site dans Vercel et déploiement, PUIS activation dans Supabase (Authentication > Attack Protection > Captcha, Turnstile, clé secrète) — dans l'autre ordre, plus personne ne peut s'inscrire ni se connecter par mot de passe. CSP : `challenges.cloudflare.com` autorisé (script, cadre, connexion). La connexion Google n'est pas concernée.
- **Double authentification de l'administration (16 octobre 2026)** : `requireAdmin` (`lib/admin-server.ts`) exige, en plus du mot de passe et du marqueur administrateur, une application d'authentification enregistrée (code à 6 chiffres, TOTP) et une session validée par ce code (niveau `aal2` du jeton, lu après la validation du compte par Supabase). Toutes les routes `/api/admin/*` sont concernées. Écran `components/admin/AdminMfa.tsx` : activation la première fois (QR code ou clé à saisir), puis code à chaque connexion. Les couples ne sont pas concernés. Téléphone perdu : `delete from auth.mfa_factors where user_id = (select id from auth.users where email = '…');` dans Supabase, puis nouvelle activation à la connexion suivante.
- **Sécurité des envois des invités (16 octobre 2026, migration 29)** : la photo d'un message du livre d'or doit être une photo de notre stockage Supabase (adresse exacte du projet), dans le dossier du mariage, et exister ; avant, une image d'un autre site pouvait s'afficher. Limites : livre d'or 15 messages par heure par appareil et par mariage, 400 par jour par mariage ; album 150 photos par heure par appareil, 600 par heure et 1 500 au total par mariage ; stockage 600 fichiers par heure, 1 500 fichiers et 2,5 Go par mariage pour l'album, 100 par heure et 600 au total pour les photos du livre d'or ; photo d'invité 3 Mo au plus. Messages clairs sur les pages photos et livre d'or quand une limite est atteinte. Si l'adresse du projet Supabase change, mettre à jour `guestbook_photo_ok` dans la migration 29.
- **Après le mariage, sur la page d'invitation (16 octobre 2026)** : sous « Merci · Le mariage a eu lieu », un bloc WeddingStudio (`components/rsvp/AfterWeddingPromo.tsx`), aux couleurs de la marque quelle que soit la palette du couple. (1) « Et pour votre mariage ? » : 5 000 FCFA de réduction offerts par les mariés avec leur code de parrainage, et « Créer mon faire-part » vers `/register?parrain=CODE`. (2) « Un ami, une sœur, un collègue se marie bientôt ? » : message WhatsApp tout prêt avec le lien et la réduction, « Copier le lien » (méthode de secours, puis lien affiché si le navigateur refuse la copie). (3) Coordonnées : WeddingStudio, 01 01 54 06 87, « Écrire » ouvre WhatsApp en citant le mariage. Sans code de parrainage, le bloc s'affiche sans la réduction. Demande la migration 28 (sans elle, le bloc s'affiche sans la réduction).
- **Vitesse de tout le site (14 octobre 2026)** : (1) espace des mariés : le compte connecté est lu dans la session du navigateur au lieu d'un aller-retour à Supabase, et la fiche du mariage, demandée à la fois par le menu et par la page, n'est lue qu'une fois (`lib/current-marriage.ts` : `getSessionUser`, `loadMarriage`, partage pendant 2 s, `forgetMarriage` après une modification). La sécurité ne change pas : `proxy.ts` vérifie le compte côté serveur et la base (RLS) filtre les données. (2) Tableau de bord : invités, budget et tâches lus en même temps ; page Premium : invités et codes en même temps. (3) Images par défaut (Unsplash) demandées à la taille d'un écran au lieu de la pleine résolution : 1 377 Ko → 69 Ko sur la page d'invitation. (4) Photo de couverture envoyée par le couple : 1 600 px et 500 Ko au plus (au lieu de 2 000 px et 800 Ko), pour les invités en 3G. Mesure (150 ms par requête) : espace des mariés 4 à 7 requêtes en 3 à 5 vagues → 1 à 4 requêtes en 1 ou 2 vagues ; tableau de bord 1,9 s → 1,3 s ; Studio 2,6 s → 1,6 s ; page d'invitation 7,3 s → 1,5 s. À faire côté Vercel : région des fonctions sur Dublin (dub1), la même que la base Supabase (eu-west-1).
- **Chargement de l'administration (14 octobre 2026)** : `/api/admin/overview` lance désormais toutes ses lectures en même temps (couples, invités, paiements, comptes de connexion, codes promo, journal) au lieu de les enchaîner ; les grandes tables sont lues par pages de 1 000 en parallèle, 6 à la fois (`readAll` dans `lib/admin-server.ts`, total connu dès la première page, ordre stable par `id`). La page affiche tout de suite l'en-tête, les onglets et des blocs d'attente au lieu d'un écran blanc. Mesure avec 80 couples, 12 000 invités et 150 ms par requête : serveur 2,9 s → 0,7 s ; premier écran 3,1 s → 0,3 s ; données affichées en 1 s.
- **Nouveau modèle « L'Avant-première » (13 octobre 2026)** : proposé dans le Studio (avec sa vignette) et dans l'écran de bienvenue. La page d'invitation enregistre désormais la réponse par une seule fonction (`sendAnswer`), utilisée par le formulaire et par le nouveau modèle. Guide mis à jour (liste des modèles et capture).
- **Écran de bienvenue (13 octobre 2026)** : remplace l'ancienne fenêtre « Vive les mariés », la visite guidée en 3 bulles et la barre « Profil complété ». Nouveau parcours (`components/dashboard/WelcomeFlow.tsx`) : accroche « Chacun de vos invités reçoit une invitation à son nom », choix du modèle (L'Enveloppe, La Story, Classique) avec la vraie page d'invitation en aperçu, au nom d'un invité tapé par le couple, puis premier envoi WhatsApp (l'invité est créé et marqué « envoyé »). Prénoms et date demandés en plus après une inscription Google ou Facebook. Affiché une seule fois (`marriages.onboarded_at`, migration 26 ; sans elle, mémorisé dans le navigateur) ; reprend à l'étape atteinte s'il est fermé. Carte « Votre parcours » sur le tableau de bord (`components/dashboard/JourneyCard.tsx`) : modèle, premier envoi, 10 invités, première réponse, photo de couverture ; elle disparaît à 5 / 5. La page d'invitation affiche maintenant « {invité}, cette invitation est pour vous » sous les prénoms (modèle Classique) et accepte un nom d'invité d'essai en aperçu. Fichier inutilisé `app/dashboard/WelcomeModal.tsx` supprimé.
- **Référencement (12 octobre 2026)** : `robots.txt` (`app/robots.ts`) et plan du site (`app/sitemap.ts`) ; titre de l'accueil avec les mots recherchés (« Faire-part en ligne et organisation de mariage en Côte d'Ivoire ») ; un titre et une adresse officielle (canonical) par page publique (`lib/seo.ts`) ; `noindex` sur les pages personnelles (photos, livre d'or, Trouver ma table, invitations, connexion, espace des mariés, administration) ; données structurées schema.org sur l'accueil (marque, site, application) et questions fréquentes dans le guide ; page 404 en français (`app/not-found.tsx`). La page d'accueil vit maintenant dans `components/landing/LandingPage.tsx`, `app/page.tsx` déclare ses métadonnées. Avec un nom de domaine, définir `NEXT_PUBLIC_SITE_URL` sur Vercel et mettre à jour l'image d'aperçu en tête de `public/guide/index.html`.
- **Paiement en ligne (12 octobre 2026, audit point 10.5)** : `confirmAndActivate` active le palier couvert par le montant payé, sans jamais rétrograder une formule active supérieure (Famille, illimitée, sur mesure) ni raccourcir l'accès ; un paiement de test (sandbox) est toujours refusé sur le site en production, même si `GENIUSPAY_ALLOW_SANDBOX` est activé. À savoir avant de réactiver le paiement en ligne : il ne vend que le premier palier (Intime) et n'applique pas encore les codes promo.
- **Envois de fichiers (12 octobre 2026, audit point 10.4)** : la photo du livre d'or est compressée avant l'envoi (JPEG, 1,5 Mo environ), comme celles de l'album ; la musique du faire-part est envoyée avec un type fixé d'après l'extension (mp3 → audio/mpeg, m4a → audio/mp4).
- **Vérification d'origine (12 octobre 2026, audit point 10.3)** : `lib/same-origin.ts` ; la suppression de compte, les actions de l'administration et le paiement en ligne refusent (403) toute demande venue d'un autre site.
- **Suppression automatique à 12 mois (12 octobre 2026, audit constat 9)** : la tâche de nuit ne demande plus que les espaces réellement arrivés au terme (prolongations en cours exclues), les plus anciens d'abord, par lots de 50 jusqu'à épuisement (45 s au plus, la suite la nuit suivante). Bilan noté dans le journal de l'administration (« Suppression automatique (12 mois) ») dès qu'un espace est supprimé ou qu'une suppression échoue.
- **Galerie à mot de passe supprimée (12 octobre 2026)** : `/galerie`, `/api/galerie/*` et `lib/gallery-auth.ts` retirés ; `/galerie` redirige vers l'Album photos de chaque couple. Les variables `GALLERY_PASSWORD` et `GALLERY_SECRET` ne servent plus. La politique de confidentialité ne mentionne plus la galerie.
- **En-têtes de sécurité (12 octobre 2026, audit constat 7)** : `next.config.ts` ajoute X-Frame-Options (SAMEORIGIN, l'aperçu du Studio reste permis), nosniff, Referrer-Policy, Permissions-Policy, HSTS et une politique de contenu (CSP) **en rapport seulement** (`CSP_ENFORCE = false`). Les écarts arrivent dans les journaux Vercel via `/api/csp-report` (lignes « [CSP] »). Passer `CSP_ENFORCE` à `true` après une à deux semaines sans alerte. Toute nouvelle source externe (images, polices, musiques, scripts) doit y être ajoutée.
- **Exports CSV (12 octobre 2026, audit constat 6)** : `lib/csv-safe.ts` neutralise les cellules qui commencent par `= + - @` (formules glissées par un invité dans sa note ou le livre d'or), sans toucher aux numéros de téléphone ni aux montants. Utilisé par les exports de « Mes souvenirs ».
- **Redirection après connexion (12 octobre 2026, audit constat 5)** : `lib/safe-redirect.ts` interprète le chemin comme le navigateur et vérifie qu'il reste sur le site ; refuse tabulations, retours à la ligne, `\`, `//`, `/.//`… (un lien `/login?next=%09/evil.com` envoyait sur un site extérieur après la connexion).
- **Dépendances (12 octobre 2026, audit constat 4)** : Next.js 16.1.6 → **16.4.0** (et eslint-config-next) ; retrait de `jspdf`, `jspdf-autotable` et `@supabase/auth-helpers-nextjs` (inutilisés) ; `shadcn` et `@types/papaparse` passés en dépendances de développement ; `npm audit fix`. Résultat : 0 faille dans les dépendances de production. Restent 9 alertes dans les outils de développement (`braces`, sans correctif publié), sans effet sur le site.

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
- **Carte « Cette semaine »** sur le tableau de bord, une fois le parcours terminé : 3 priorités et un conseil selon la date du mariage (idée de la maquette B de l'écran de bienvenue).
- **E-mail de rappel avant la suppression automatique**, par exemple à J+11 mois : aujourd'hui, le couple n'est prévenu que dans l'application.
- **Données de paiement** : décider de les conserver sans informations personnelles, ou adapter la politique de confidentialité.
- **Nom de domaine** pour le site et l'envoi d'e-mails.

### Priorité moyenne
- **Relance des invités sans réponse** (prévue pour la prochaine version) : relance « assistée » depuis le WhatsApp du couple, la plateforme n'envoyant pas de messages elle-même. Elle repère les invités à relancer (invitation envoyée depuis 7 jours, sans réponse, 2 relances au plus) ; le tableau de bord affiche une carte « X invités n'ont pas encore répondu » ; un message de relance modifiable est proposé dans le Studio ; le couple relance un par un avec un toucher par invité. Il faudra une migration pour la date d'envoi, le nombre de relances et la date de la dernière relance. À décider : les délais, une date limite de réponse, et si la fonction est gratuite ou réservée aux formules payantes. Plus tard, en option payante : envoi 100 % automatique par l'API WhatsApp Business (compte Meta vérifié, messages validés, coût par message).
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
