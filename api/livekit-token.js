// Fonction Vercel : token d'accès LiveKit (salons vocaux + partage d'écran).
// Env nécessaires sur Vercel :
//   LIVEKIT_URL (ex: wss://xxx.livekit.cloud), LIVEKIT_API_KEY, LIVEKIT_API_SECRET
import { AccessToken } from 'livekit-server-sdk'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ configured: !!(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET) })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'POST uniquement' })

  const { room, identity } = req.body || {}
  if (!room || !identity) return res.status(400).json({ error: 'room et identity requis' })

  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
    return res.status(503).json({ error: 'LiveKit non configuré sur le serveur' })
  }

  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity,
    name: identity,
  })
  at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true, canPublishData: true })

  return res.status(200).json({ token: await at.toJwt() })
}
