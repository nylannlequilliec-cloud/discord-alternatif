import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { safeQuery } from './useSchema'

// Notifications push navigateur (service worker + table push_subscriptions)
export function usePush() {
  const { session } = useAuth()
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState(null)
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY

  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window
    setSupported(ok)
    if (ok) setPermission(Notification.permission)
  }, [])

  // Vérifie si l'utilisateur a déjà un abonnement enregistré
  useEffect(() => {
    if (!session?.user || !supported) return
    safeQuery(supabase.from('push_subscriptions').select('id').eq('user_id', session.user.id).limit(1)).then(
      ({ data }) => setSubscribed(!!data?.length)
    )
  }, [session, supported])

  const subscribe = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      if (!VAPID_PUBLIC) {
        setError('Clé VAPID manquante (env VITE_VAPID_PUBLIC_KEY)')
        setBusy(false)
        return { error: true }
      }
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
        })
      }
      const { error: dbError } = await supabase.from('push_subscriptions').upsert({
        user_id: session.user.id,
        endpoint: sub.endpoint,
        keys: sub.toJSON().keys,
      })
      if (dbError) {
        // Endpoint déjà enregistré pour un autre user : on remplace proprement
        if (dbError.code === '23505') {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          await supabase.from('push_subscriptions').insert({
            user_id: session.user.id,
            endpoint: sub.endpoint,
            keys: sub.toJSON().keys,
          })
        } else {
          throw dbError
        }
      }
      setPermission(Notification.permission)
      setSubscribed(true)
      setBusy(false)
      return { error: false }
    } catch (e) {
      setError(e.message || 'Impossible d’activer les notifications')
      setBusy(false)
      return { error: true, message: e.message }
    }
  }, [VAPID_PUBLIC, session])

  const unsubscribe = useCallback(async () => {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
      if (session?.user) {
        await supabase.from('push_subscriptions').delete().eq('user_id', session.user.id)
      }
      setSubscribed(false)
    } catch {
      /* silencieux */
    }
    setBusy(false)
  }, [session])

  return { supported, permission, subscribed, busy, error, subscribe, unsubscribe, configured: !!VAPID_PUBLIC }
}

// Convertit une clé VAPID base64url en Uint8Array
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}
