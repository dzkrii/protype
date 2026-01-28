'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Flag, Trophy, Clock, Users } from 'lucide-react'

// Types
type Player = {
  id: string
  name: string
  progress: number
  wpm: number
  finishedAt: string | null
}

type Room = {
  id: string
  code: string
  text: string
  status: 'waiting' | 'starting' | 'in-progress' | 'finished'
  startTime: string | null
  players: Player[]
}

export default function RoomPage() {
  const { code } = useParams()
  const router = useRouter()
  const [room, setRoom] = useState<Room | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState('')
  const [inputName, setInputName] = useState('')
  const [inputBuffer, setInputBuffer] = useState('')
  const [startTime, setStartTime] = useState<number | null>(null)
  const [wpm, setWpm] = useState(0)
  
  // Ref for polling interval to clear it
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  // 1. Join Logic
  useEffect(() => {
    // Check local storage for name if not joined
    const storedName = localStorage.getItem('typeracer_name')
    if (storedName) {
      setInputName(storedName)
    }
  }, [])

  const joinRoom = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!inputName) return

    try {
      const res = await fetch('/api/room/join', {
        method: 'POST',
        body: JSON.stringify({ code, name: inputName })
      })
      const data = await res.json()
      if (res.ok) {
        setPlayerId(data.playerId)
        setPlayerName(inputName)
        localStorage.setItem('typeracer_name', inputName)
      } else {
        alert(data.error)
      }
    } catch (error) {
      alert("Failed to join")
    }
  }

  // 2. Sync Loop (Polling)
  useEffect(() => {
    const sync = async () => {
      try {
        const res = await fetch(`/api/room/${code}/sync`)
        if (res.ok) {
          const data = await res.json()
          setRoom(data)
          
          // Check if we already joined (re-connection handling could go here, but simple memory state for now)
        }
      } catch (e) {
        console.error("Sync failed", e)
      }
    }

    sync() // Initial call
    pollRef.current = setInterval(sync, 1000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [code])

  // 3. Start Game Logic (Admin/Host) - For simplicity anyone can start for now? 
  // Let's allow anyone to start if it's 'waiting'.
  const startGame = async () => {
    await fetch(`/api/room/${code}/start`, { method: 'POST' })
  }

  // 4. Typing Logic
  useEffect(() => {
    if (!room || room.status !== 'in-progress' || !playerId) return

    // Calculate start time local reference
    if (room.startTime && !startTime) {
      setStartTime(new Date(room.startTime).getTime())
    }
  }, [room?.status, room?.startTime, playerId])

  const handleTyping = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!room || !playerId) return
    
    const val = e.target.value
    setInputBuffer(val)

    // Check correctness against room.text
    // We only care about the correct prefix
    let correctChars = 0
    for (let i = 0; i < val.length; i++) {
      if (val[i] === room.text[i]) {
        correctChars++
      } else {
        // Stop counting at first error? Or just strict matching?
        // Typeracer usually blocks input on error.
        // Let's implement strict: if prefix matches, allow. If not, don't update progress but allow typing (shown as red).
        // For simplicity: Simple prefix match count.
        break; 
      }
    }

    // Actually, let's enforce: Input must exactly match the start of text.
    // If val is NOT a substring of text starting at 0, user made a typo.
    const isCorrectSoFar = room.text.startsWith(val)
    
    // Progress %
    const progress = Math.min(100, Math.floor((correctChars / room.text.length) * 100))
    
    // WPM Calc
    // Words = chars / 5
    // Time = (now - startTime) / 60000
    if (startTime) {
       const elapsedMin = (Date.now() - startTime) / 60000
       const currentWpm = elapsedMin > 0 ? Math.round((correctChars / 5) / elapsedMin) : 0
       setWpm(currentWpm)
       
       // Send update
       // Debounce or just send every change? 
       // For 5 people, every change is prob fine. Or throttle.
       // Let's throttle via the poll loop? No, that's read-only.
       // Let's send update async fire-and-forget.
       if (isCorrectSoFar) {
         await fetch(`/api/room/${code}/sync`, {
            method: 'POST',
            body: JSON.stringify({ playerId, progress, wpm: currentWpm })
         })
       }
    }

    // Completion
    if (val === room.text) {
      // Done!
    }
  }

  // --- RENDER ---
  if (!room) return <div className="flex h-screen items-center justify-center">Loading...</div>

  // LOBBY
  if (room.status === 'waiting' || (room.status === 'starting' && !playerId)) {
      return (
          <div className="flex h-screen items-center justify-center p-4">
              <Card className="w-full max-w-md">
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-6 w-6"/> Room Lobby: {room.code}
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      {!playerId ? (
                          <div className="space-y-4">
                              <Input 
                                placeholder="Enter Name" 
                                value={inputName} 
                                onChange={e => setInputName(e.target.value)}
                              />
                              <Button onClick={() => joinRoom()} className="w-full">Join Race</Button>
                          </div>
                      ) : (
                          <div className="text-center text-green-600 font-bold mb-4">
                              You have joined as {playerName}
                          </div>
                      )}
                      
                      <div className="space-y-2">
                          <h3 className="font-semibold text-sm text-muted-foreground">Players ({room.players.length})</h3>
                          <div className="max-h-60 overflow-y-auto space-y-2 border rounded p-2">
                              {room.players.map(p => (
                                  <div key={p.id} className="flex items-center gap-2 text-sm">
                                      <div className="h-2 w-2 rounded-full bg-green-500" />
                                      {p.name}
                                  </div>
                              ))}
                          </div>
                      </div>

                      {playerId && (
                          <Button onClick={startGame} className="w-full" size="lg">Start Race</Button>
                      )}
                  </CardContent>
              </Card>
          </div>
      )
  }

  // RACE & RESULTS
  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
             <h2 className="text-2xl font-bold">Room {room.code}</h2>
             <div className="bg-primary/10 text-primary px-4 py-2 rounded-full font-mono font-bold">
                {room.status === 'finished' ? 'Race Finished' : room.status === 'in-progress' ? 'Race Active' : 'Starting...'}
             </div>
        </div>

        {/* PROGRESS TRACK */}
        <div className="space-y-4 bg-muted/30 p-6 rounded-xl border">
            {room.players.map((p, idx) => (
                <div key={p.id} className="relative">
                    <div className="flex justify-between text-xs mb-1">
                        <span className={cn("font-bold", p.id === playerId && "text-primary")}>
                            {p.name} {p.id === playerId && "(You)"}
                        </span>
                        <span>{p.wpm} WPM</span>
                    </div>
                    <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                        <motion.div 
                            className={cn("h-full bg-primary", p.finishedAt && "bg-green-500")}
                            initial={{ width: 0 }}
                            animate={{ width: `${p.progress}%` }}
                            transition={{ type: "spring", stiffness: 50 }}
                        />
                    </div>
                </div>
            ))}
        </div>

        {/* TYPING AREA */}
        {room.status === 'in-progress' && playerId && !room.players.find(p => p.id === playerId)?.finishedAt && (
            <Card>
                <CardContent className="p-8 space-y-6">
                    {/* Visual Text Rendering with User Input Highlight */}
                    <div className="text-xl font-mono leading-loose select-none relative">
                        {/* Overlay text */}
                        <div className="text-muted-foreground">
                           {room.text}
                        </div>
                        {/* Input match overlay */}
                         <div className="absolute top-0 left-0 text-primary pointer-events-none">
                            {/* Simple hack: render only matched chars. A better way requires char-by-char mapping */}
                            <span className="text-black dark:text-white bg-green-200 dark:bg-green-900/30">
                              {room.text.substring(0, inputBuffer.length)}
                            </span>
                            {/* Current Cursor logic optional */}
                        </div>
                    </div>

                    <Input 
                        value={inputBuffer}
                        onChange={handleTyping}
                        className="font-mono text-lg p-6 bg-transparent"
                        placeholder="Type here..."
                        autoFocus
                        onPaste={(e) => e.preventDefault()}
                    />
                </CardContent>
            </Card>
        )}

        {/* FINISHED STATE FOR USER */}
        {playerId && room.players.find(p => p.id === playerId)?.finishedAt && (
             <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                <CardContent className="p-8 text-center space-y-4">
                    <Trophy className="h-12 w-12 mx-auto text-yellow-500" />
                    <h3 className="text-2xl font-bold">Finished!</h3>
                    <p className="text-lg">Your speed: <span className="font-bold">{wpm} WPM</span></p>
                </CardContent>
             </Card>
        )}
    </div>
  )
}
