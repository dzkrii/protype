import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

const FALLBACK_QUOTES = [
  "Pendidikan adalah senjata paling ampuh yang bisa kamu gunakan untuk mengubah dunia.",
  "Keberhasilan bukanlah kunci kebahagiaan. Kebahagiaanlah kunci keberhasilan.",
  "Jangan tanyakan apa yang negara berikan kepadamu, tanyakan apa yang kamu berikan kepada negaramu.",
  "Hidup itu seperti bersepeda. Untuk menjaga keseimbangan, Anda harus terus bergerak.",
  "Ilmu adalah harta yang tidak akan pernah habis meskipun terus dibagikan kepada orang lain."
];

async function getRandomIndonesianText(): Promise<string> {
  try {
    // Fetch a random summary from Indonesian Wikipedia
    const res = await fetch('https://id.wikipedia.org/api/rest_v1/page/random/summary', {
      next: { revalidate: 0 } // Ensure we don't cache the random result
    });
    
    if (!res.ok) throw new Error('Wikipedia API failed');
    
    const data = await res.json();
    let text = data.extract || '';
    
    // Clean up text: only take the first 1-2 sentences and remove parentheticals
    text = text.replace(/\s\([^)]*\)/g, ""); // Remove (anything inside)
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    // Join first 2 sentences if short, or just use 1
    const result = (sentences.length > 1 && sentences[0].length < 100) 
      ? sentences.slice(0, 2).join(' ').trim()
      : sentences[0].trim();

    return result || FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
  } catch (error) {
    console.error('Text fetch error:', error);
    return FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
  }
}

export async function POST(request: Request) {
  try {
    const code = generateCode()
    const text = await getRandomIndonesianText()
    
    const room = await prisma.room.create({
      data: {
        code,
        text: text,
        status: 'waiting'
      }
    })

    return NextResponse.json({ code: room.code })
  } catch (error) {
    console.error('Failed to create room:', error)
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
  }
}
