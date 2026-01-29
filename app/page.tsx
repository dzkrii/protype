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
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 -right-4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      
      <div className="grid gap-8 w-full max-w-lg relative z-10 transition-all duration-500 ease-in-out">
        <div className="text-center space-y-3">
            <h1 className="text-6xl font-extrabold tracking-tighter text-primary drop-shadow-sm">ProType</h1>
            <p className="text-muted-foreground text-lg font-medium">Unlimited multiplayer typing races.</p>
        </div>

        <Card className="border-border/50 shadow-xl backdrop-blur-sm bg-card/80">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold">Join a Race</CardTitle>
                <CardDescription className="text-base text-muted-foreground/80">Enter a room code to join an existing race.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={joinRoom} className="space-y-5">
                    <div className="space-y-2">
                        <Input 
                            placeholder="Your Name" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            required 
                            className="h-12 text-lg border-border/50 focus:ring-primary/20 transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <Input 
                            placeholder="Room Code" 
                            value={roomCode} 
                            onChange={e => setRoomCode(e.target.value)} 
                            required 
                            className="h-12 text-lg font-mono uppercase tracking-widest border-border/50 focus:ring-primary/20 transition-all"
                        />
                    </div>
                    <Button type="submit" className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all" disabled={isLoading}>
                        {isLoading ? 'Joining...' : 'Join Race'}
                    </Button>
                </form>
            </CardContent>
        </Card>

        <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-4 text-muted-foreground font-semibold tracking-widest">Or</span>
            </div>
        </div>

        <Button 
            variant="secondary" 
            size="lg" 
            onClick={createRoom} 
            disabled={isLoading}
            className="h-14 text-lg font-bold border-2 hover:bg-secondary/80 transition-all active:scale-[0.98]"
        >
             Create New Room
        </Button>
        
        <div className="text-center text-xs text-muted-foreground/50 pt-4">
            Built for speed and performance.
        </div>
      </div>
    </div>
  )
}
