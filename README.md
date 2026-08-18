# Discord Alternatif — V1

Une V1 fonctionnelle : comptes, serveurs, salons textuels, chat en temps réel, mentions/notifications.

## 🚀 Mise en route (tout se fait dans le navigateur, aucune install nécessaire)

### 1. Configurer Supabase (la base de données)

1. Va sur [supabase.com](https://supabase.com) → connecte-toi à ton projet existant (ou crée-en un nouveau, c'est gratuit)
2. Dans le menu de gauche, clique sur **SQL Editor**
3. Clique sur **New query**
4. Ouvre le fichier `supabase/schema.sql` de ce repo, copie **tout** son contenu
5. Colle-le dans l'éditeur SQL de Supabase, puis clique sur **Run**
6. Ça va créer toutes les tables (profils, serveurs, salons, messages, notifications) avec la sécurité (RLS) déjà configurée

### 2. Récupérer tes clés Supabase

1. Dans Supabase, va dans **Project Settings** (icône engrenage) → **API**
2. Note deux valeurs :
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon public key** (une longue chaîne de caractères)

### 3. Déployer sur Vercel

1. Va sur [vercel.com](https://vercel.com), connecte-toi avec ton compte GitHub
2. Clique sur **Add New → Project**
3. Choisis le repo `discord-alternatif`
4. Avant de cliquer sur Deploy, ouvre **Environment Variables** et ajoute :
   - `VITE_SUPABASE_URL` = ton Project URL Supabase
   - `VITE_SUPABASE_ANON_KEY` = ta clé anon public
5. Clique sur **Deploy**
6. Au bout de 1-2 minutes, Vercel te donne un lien (ex: `discord-alternatif.vercel.app`) — c'est ton app, en ligne, utilisable par tes potes !

### 4. Activer l'auth email dans Supabase

1. Dans Supabase, va dans **Authentication → Providers**
2. Vérifie que **Email** est activé (c'est le cas par défaut)
3. Optionnel : dans **Authentication → Settings**, tu peux désactiver "Confirm email" si tu veux que les comptes soient utilisables sans cliquer sur un lien de confirmation (plus simple pour un petit groupe entre potes)

## ✅ Ce qui fonctionne dans cette V1

- Inscription / connexion par email
- Créer un serveur, inviter des amis via code
- Rejoindre un serveur avec un code d'invitation
- Créer des salons textuels
- Chat en temps réel (les messages apparaissent instantanément chez tout le monde)
- Mentions `@pseudo` avec notification (visuel highlight du message pour l'instant)
- Liste des membres par serveur

## 🔜 Prochaines étapes (V1.5 et V2)

- V1.5 : éditeur d'interface personnalisable (déplacer/redimensionner/régler l'opacité des éléments UI)
- V2 : salons vocaux (via LiveKit), partage d'écran, upload d'images, rôles/permissions

## 🛠 Dev local (si un jour tu as un PC sous la main)

```bash
npm install
cp .env.example .env   # puis remplis avec tes clés Supabase
npm run dev
```
