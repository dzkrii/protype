import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Hardcoded quote for now
const QUOTES = [
  "The quick brown fox jumps over the lazy dog. Programming is thinking, not typing.",
  "To be, or not to be, that is the question: Whether 'tis nobler in the mind to suffer the slings and arrows of outrageous fortune.",
  "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.",
  "All that we see or seem is but a dream within a dream.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "In the middle of difficulty lies opportunity.",
  "Do not go gentle into that good night, Old age should burn and rave at close of day."
];

function getRandomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

export async function POST(request: Request) {
  try {
    const code = generateCode()
    
    // Ensure code uniqueness (simple retry)
    // In production, better collision handling is needed
    
    const room = await prisma.room.create({
      data: {
        code,
        text: getRandomQuote(),
        status: 'waiting'
      }
    })

    return NextResponse.json({ code: room.code })
  } catch (error) {
    console.error('Failed to create room:', error)
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
  }
}
