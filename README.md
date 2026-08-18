# Discord Alternatif — V2

Un Discord alternatif complet : comptes, serveurs, salons textuels **et vocaux**, chat en temps réel, **messages privés**, fils de discussion, réactions, rôles & modération, uploads d'images/fichiers, recherche, notifications, **interface 100 % personnalisable** (déplacer, redimensionner, opacité, ombre…). Tout en français. Budget : 0 €.

## 🚀 Mise en route (tout se fait dans le navigateur)

### 1. Base de données (Supabase)

1. Va sur [supabase.com](https://supabase.com) → ton projet existant
2. Menu de gauche → **SQL Editor** → **New query**
3. Ouvre `supabase/schema.sql` du repo, **copie tout**, colle, **Run**

> ℹ️ **Il n'y a qu'UN SEUL fichier SQL** (`schema.sql`), il contient tout (comptes, serveurs, salons, messages, DM, fils, réactions, modération, uploads, push). Il est **sûr à relancer** : si tu le ré-exécutes plus tard après une mise à jour, rien ne casse.

### 2. Clés Supabase

**Project Settings** ⚙️ → **API** :
- **Project URL** → variable `VITE_SUPABASE_URL`
- **anon public key** → variable `VITE_SUPABASE_ANON_KEY`

### 3. Déploiement (Vercel)

1. Le repo est déjà lié à Vercel : **chaque push sur `main` déploie automatiquement**
2. Dans Vercel → projet → **Settings → Environment Variables**, ajoute :

| Variable | Où la trouver |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` (secrète !) — **requis pour les push** |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Générées à l'étape 5 (push) |
| `WEBHOOK_SECRET` | Un mot de passe de ton choix (ex: `mon-secret-2026`) |
| `LIVEKIT_URL` | LiveKit Cloud (étape 6) — ex: `wss://xxx.livekit.cloud` |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | LiveKit Cloud → Settings |

> Sans ces variables, l'app fonctionne quand même : seuls le vocal et les push restent inactifs (message d'info en français affiché).
> ℹ️ Plus besoin de `VITE_LIVEKIT_URL` : le navigateur récupère l'URL LiveKit depuis l'API (`/api/livekit-token`).

### 4. Auth email

Supabase → **Authentication → Providers** → **Email** activé (défaut). Optionnel : désactive « Confirm email » pour un petit groupe.

### 5. Notifications push (facultatif, 5 min)

1. Génère tes clés VAPID :
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Mets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` dans les variables Vercel (étape 3), puis redéploie
3. Ajoute `VITE_VAPID_PUBLIC_KEY` = la clé publique VAPID (celle avec `VITE_` est publique et va dans le bundle)
4. Supabase → **Database → Webhooks** → **Create a webhook** (×2) :
   - Table `messages`, event **INSERT**, URL `https://TON-SITE.vercel.app/api/push`, header `x-webhook-secret: TON-SECRET`
   - Table `dm_messages`, event **INSERT**, même URL, même header
5. Dans l'app : Paramètres ⚙️ → Notifications → « Activer les notifications »

### 6. Salons vocaux + partage d'écran (facultatif, 10 min, gratuit)

1. Va sur [livekit.io](https://livekit.io) → **LiveKit Cloud** → crée un projet gratuit (10 000 min/mois)
2. Settings → copie `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` → variables Vercel (étape 3)
3. Redéploie. Les salons vocaux (type `voice`) deviennent actifs avec micro, caméra et partage d'écran

## ✅ Fonctionnalités V2

- Inscription / connexion par email, pseudo, photo de profil, statut (en ligne/absent/ne pas déranger/hors ligne)
- Serveurs + codes d'invitation, salons textuels (créer/renommer/supprimer par les admins)
- Chat temps réel : mentions `@pseudo`, édition, suppression, pièces jointes (images + fichiers)
- Messages privés (DM) avec badge de non-lus, accessibles depuis les membres
- Fils de discussion (threads) + réactions aux emojis
- Rôles : propriétaire 👑 / admin 🛡️ / membre ; modération : bannir, rendre muet, expulser, supprimer les messages d'un membre
- Recherche dans le salon
- Salons vocaux + caméra + partage d'écran (LiveKit)
- Notifications : cloche 🔔 en temps réel (mentions + DM) + push navigateur
- **Éditeur d'interface** 🎨 : bouton en bas à gauche → mode édition → clique sur un élément, déplace-le, redimensionne-le (poignée), règle opacité, ombre, coins arrondis, fond, échelle, taille du texte… Sauvegardé automatiquement par utilisateur
- Thèmes sombre/clair + couleur d'accent personnalisable

## 🔜 Idées V3

- Invitations avec expiration, salons privés par rôle
- Statut « en train d'écrire… », accusés de lecture
- App mobile (PWA installable)

## 🛠 Dev local

```bash
npm install
cp .env.example .env   # remplis avec tes clés Supabase
npm run dev            # http://localhost:5173
npm run build          # build de prod
npm run lint           # oxlint
```

## 🔒 Sécurité

- Toutes les données passent par Supabase avec **Row Level Security** : chacun ne voit que ce qu'il doit voir
- Les clés `service_role`, VAPID privées et LiveKit secrets ne doivent **jamais** être commitées (`.gitignore` les protège)
- Le webhook `/api/push` vérifie un secret (`WEBHOOK_SECRET`) avant d'envoyer quoi que ce soit
