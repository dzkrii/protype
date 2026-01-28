import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  
  try {
     const room = await prisma.room.update({
        where: { code },
        data: {
          status: 'in-progress',
          startTime: new Date()
        }
     })
     return NextResponse.json({ success: true, startTime: room.startTime })
  } catch (error) {
     return NextResponse.json({ error: 'Failed to start race' }, { status: 500 })
  }
}
