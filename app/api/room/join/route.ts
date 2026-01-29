import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Room } from '@prisma/client'

export async function POST(request: Request) {
  try {
    const { code, name } = await request.json()

    if (!code || !name) {
      return NextResponse.json({ error: 'Code and name are required' }, { status: 400 })
    }

    const room = await prisma.room.findUnique({
      where: { code }
    }) as Room | null

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

    // If room has no host, this player is the host
    if (!room.hostId) {
      await prisma.room.update({
        where: { id: room.id },
        data: { hostId: player.id }
      })
    }

    return NextResponse.json({ playerId: player.id })
  } catch (error) {
    console.error('Failed to join:', error)
    return NextResponse.json({ error: 'Failed to join' }, { status: 500 })
  }
}
