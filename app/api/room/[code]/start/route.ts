import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  
  try {
     const { playerId } = await request.json()

     const room = await prisma.room.findUnique({
        where: { code }
     })

     if (!room || room.hostId !== playerId) {
        return NextResponse.json({ error: 'Only the host can start the race' }, { status: 403 })
     }

     const updatedRoom = await prisma.room.update({
        where: { code },
        data: {
          status: 'in-progress',
          startTime: new Date()
        }
     })
     return NextResponse.json({ success: true, startTime: updatedRoom.startTime })
  } catch (error) {
     return NextResponse.json({ error: 'Failed to start race' }, { status: 500 })
  }
}
