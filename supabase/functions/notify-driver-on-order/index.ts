import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

console.log('Fungsi notify-driver-on-order siap menerima permintaan.')

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const payload = await req.json()
    const newOrder = payload.record

    if (!newOrder.driver_id || !newOrder.user_id) {
      console.log('Pesanan baru tanpa driver_id, notifikasi tidak dikirim.')
      return new Response('OK: No driver assigned', { status: 200 })
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const groupChatId = Deno.env.get('TELEGRAM_GROUP_CHAT_ID')

    if (!botToken || !groupChatId) {
      throw new Error('TELEGRAM_BOT_TOKEN atau TELEGRAM_GROUP_CHAT_ID tidak ditemukan di secrets!')
    }

    // PERBAIKAN: Hapus header Authorization agar fungsi berjalan sebagai admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Query ini sekarang akan berjalan dengan hak akses penuh dan berhasil
    const [driverRes, userRes] = await Promise.all([
      supabaseAdmin.from('drivers').select('users(name)').eq('id', newOrder.driver_id).single(),
      supabaseAdmin.from('users').select('wa_number').eq('id', newOrder.user_id).single()
    ])

    if (driverRes.error) throw new Error(`Gagal mengambil data driver: ${driverRes.error.message}`)
    if (userRes.error) throw new Error(`Gagal mengambil data pemesan: ${userRes.error.message}`)

    const driverName = driverRes.data.users.name
    const userWaNumber = userRes.data.wa_number

    const message = `🔔 **Pesanan Baru Masuk!**

• **Driver:** ${driverName}
• **Pemesan:** ${userWaNumber}

Driver yang ditugaskan harap segera memeriksa dasbor.`;

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: groupChatId,
        text: message,
        parse_mode: 'Markdown'
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Gagal mengirim notifikasi Telegram: ${errorData.description}`)
    }

    console.log(`Notifikasi grup berhasil dikirim untuk pesanan driver ${driverName}`)
    return new Response('Notifikasi berhasil dikirim.', { status: 200 })

  } catch (error) {
    console.error('Error di Edge Function:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})