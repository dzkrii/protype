import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { code, name } = await request.json()

    if (!code || !name) {
      return NextResponse.json({ error: 'Code and name are required' }, { status: 400 })
    }

    const room = await prisma.room.findUnique({
      where: { code }
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.status !== 'waiting') {
       return NextResponse.json({ error: 'Race already started' }, { status: 400 })
    }

    const player = await prisma.player.create({
      data: {
        name,
        roomId: room.id
      }
    })

    return NextResponse.json({ playerId: player.id })
  } catch (error) {
    console.error('Failed to join:', error)
     return NextResponse.json({ error: 'Failed to join' }, { status: 500 })
  }
}
