// Fonction Vercel : envoi des notifications push.
// Appelée par un webhook Supabase (événement INSERT sur messages + dm_messages).
// Env nécessaires sur Vercel :
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, WEBHOOK_SECRET
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST uniquement' })

  const secret = process.env.WEBHOOK_SECRET
  if (secret && req.headers['x-webhook-secret'] !== secret) {
    return res.status(401).json({ error: 'Secret invalide' })
  }

  const vapidPublic = process.env.VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  if (!vapidPublic || !vapidPrivate) {
    return res.status(200).json({ skipped: 'VAPID non configuré' })
  }
  webpush.setVapidDetails('mailto:admin@discord-alternatif.vercel.app', vapidPublic, vapidPrivate)

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const { table, record } = req.body || {}
    if (!record?.id) return res.status(200).json({ skipped: 'pas de record' })

    let recipients = []

    if (table === 'messages') {
      // Membres du serveur du salon (hors auteur)
      const { data: channel } = await supabase.from('channels').select('server_id').eq('id', record.channel_id).single()
      if (channel) {
        const { data: members } = await supabase
          .from('server_members')
          .select('user_id')
          .eq('server_id', channel.server_id)
        recipients = (members || []).map((m) => m.user_id)
      }
    } else if (table === 'dm_messages') {
      // L'autre membre de la conversation
      const { data: members } = await supabase
        .from('dm_members')
        .select('user_id')
        .eq('conversation_id', record.conversation_id)
      recipients = (members || []).map((m) => m.user_id)
    } else {
      return res.status(200).json({ skipped: 'table inconnue' })
    }

    recipients = recipients.filter((id) => id !== record.author_id)

    if (!recipients.length) return res.status(200).json({ ok: true, sent: 0 })

    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', record.author_id)
      .single()

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, keys')
      .in('user_id', recipients)

    const payload = JSON.stringify({
      title: authorProfile?.username || 'Nouveau message',
      body: (record.content || '📎 Pièce jointe').slice(0, 160),
      url: '/',
    })

    let sent = 0
    const stale = []
    for (const sub of subs || []) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
        sent++
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) stale.push(sub.id)
      }
    }
    if (stale.length) {
      await supabase.from('push_subscriptions').delete().in('id', stale)
    }

    return res.status(200).json({ ok: true, sent })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
