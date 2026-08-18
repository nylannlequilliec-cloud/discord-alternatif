import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Variables Supabase manquantes. Crée un fichier .env avec VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (voir .env.example).'
  )
}

// Debug temporaire : affiche dans la console du navigateur l'URL réellement utilisée.
// A retirer une fois le bug résolu.
if (typeof window !== 'undefined') {
  console.log('[DEBUG] VITE_SUPABASE_URL =', JSON.stringify(supabaseUrl))
  console.log('[DEBUG] VITE_SUPABASE_ANON_KEY présente =', Boolean(supabaseAnonKey))
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
