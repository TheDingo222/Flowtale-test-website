import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import os from 'os'

function getLocalIP(): string {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return 'localhost'
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = getLocalIP()
  const url = `http://${ip}:3000/expenses?create=true`

  const dataUrl = await QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: { dark: '#1a3a4a', light: '#ffffff' },
  })

  return NextResponse.json({ dataUrl, url })
}
