import { useEffect, useState } from 'react'

let cached = null

// Détecte si le schema_v2.sql a été exécuté dans Supabase.
// Marqueur : existence de la table dm_conversations (+ colonne thread_id).
export function useSchemaProbe() {
  const [v2, setV2] = useState(cached)

  useEffect(() => {
    if (cached !== null) {
      setV2(cached)
      return
    }
    let active = true
    ;(async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/dm_conversations?select=id&limit=1`,
          { headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` } }
        )
        const ok = res.ok || res.status === 401
        cached = ok
        if (active) setV2(ok)
      } catch {
        if (active) setV2(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  return v2
}

// Utilitaire silencieux pour les appels qui peuvent échouer (schéma absent)
export async function safeQuery(promise) {
  try {
    const { data, error } = await promise
    if (error) return { data: null, error }
    return { data, error: null }
  } catch {
    return { data: null, error: { message: 'Fonctionnalité indisponible : base à mettre à jour (schema_v2.sql)' } }
  }
}
