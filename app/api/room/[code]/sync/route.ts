import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  
  const room = await prisma.room.findUnique({
    where: { code },
    include: {
      players: {
        orderBy: {
          wpm: 'desc'
        }
      }
    }
  })

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  return NextResponse.json(room)
}

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const { playerId, progress, wpm } = await request.json()

  if (!playerId) {
    return NextResponse.json({ error: 'Player ID required' }, { status: 400 })
  }
  
  // Verify room exists (optional optimization, but good for safety)
  // We strictly update the player.
  
  try {
      const player = await prisma.player.update({
        where: { id: playerId },
        data: {
            progress,
            wpm,
            finishedAt: progress >= 100 ? new Date() : undefined
        }
      })
      
      return NextResponse.json({ success: true })
  } catch (e) {
      return NextResponse.json({ error: 'Player not found or update failed' }, { status: 404 })
  }
}
