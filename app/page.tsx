'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function Home() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const createRoom = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/room/create', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        // Auto-join the creator as a player? Or just redirect?
        // Let's redirect to room, where they will be prompted to join/enter name if not handled here.
        // Actually, better flow: Creator enters name -> Create Room -> Join Room automatically.
        // But for simplicity, let's just create room and show code, then join.
        // Or better: Create Room -> Redirect to /room/CODE -> Prompt Name there.
        router.push(`/room/${data.code}`)
      } else {
        alert(data.error)
      }
    } catch (error) {
      console.error(error)
      alert("Failed to create room")
    } finally {
      setIsLoading(false)
    }
  }

  const joinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !roomCode) return
    
    setIsLoading(true)
    // Validate room exists first? Or just redirect and let the room page handle it?
    // Let's redirect. The room page will handle "Join" step.
    // Actually, preserving the name would be nice. We can pass it in query param or just simple localStorage.
    localStorage.setItem('typeracer_name', name)
    router.push(`/room/${roomCode}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="grid gap-8 w-full max-w-lg">
        <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-primary">ProType</h1>
            <p className="text-muted-foreground">Unlimited multiplayer typing races.</p>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Join a Race</CardTitle>
                <CardDescription>Enter a room code to join an existing race.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={joinRoom} className="space-y-4">
                    <Input 
                        placeholder="Your Name" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        required 
                    />
                    <Input 
                        placeholder="Room Code" 
                        value={roomCode} 
                        onChange={e => setRoomCode(e.target.value)} 
                        required 
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Joining...' : 'Join Room'}
                    </Button>
                </form>
            </CardContent>
        </Card>

        <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-50 px-2 text-muted-foreground">Or</span>
            </div>
        </div>

        <Button variant="outline" size="lg" onClick={createRoom} disabled={isLoading}>
             Create New Room
        </Button>
      </div>
    </div>
  )
}
