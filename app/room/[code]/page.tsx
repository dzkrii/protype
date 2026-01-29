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
          <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
              {/* Subtle background decoration */}
              <div className="absolute top-0 -left-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 -right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

              <Card className="w-full max-w-md border-border/50 shadow-2xl backdrop-blur-sm bg-card/80 relative z-10">
                  <CardHeader className="text-center space-y-2">
                       <div className="mx-auto bg-primary/10 p-3 rounded-2xl w-fit mb-2">
                          <Users className="h-8 w-8 text-primary"/>
                       </div>
                      <CardTitle className="text-3xl font-black tracking-tighter">
                        ROOM LOBBY
                      </CardTitle>
                      <p className="font-mono text-primary font-bold tracking-[0.3em] bg-primary/5 py-1 rounded">
                        {room.code}
                      </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                      {!playerId ? (
                          <div className="space-y-4">
                              <div className="space-y-2">
                                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Your Alias</label>
                                  <Input 
                                    placeholder="Enter Name" 
                                    value={inputName} 
                                    onChange={e => setInputName(e.target.value)}
                                    className="h-12 text-lg border-border/50 focus:ring-primary/20 transition-all"
                                  />
                              </div>
                              <Button onClick={() => joinRoom()} className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20">Join Race</Button>
                          </div>
                      ) : (
                          <div className="text-center py-2 px-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 font-bold mb-4 flex items-center justify-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
                              Ready as {playerName}
                          </div>
                      )}
                      
                      <div className="space-y-3">
                          <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground/60 flex justify-between items-center">
                            <span>Racers ({room.players.length})</span>
                            <span className="h-1 flex-1 mx-4 bg-muted/30 rounded-full" />
                          </h3>
                          <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                              {room.players.map((p, idx) => (
                                  <motion.div 
                                    initial={{ opacity: 0, x: -10 }} 
                                    animate={{ opacity: 1, x: 0 }}
                                    key={p.id} 
                                    className={cn(
                                        "flex items-center gap-3 text-sm p-3 rounded-lg border transition-all",
                                        p.id === playerId ? "bg-primary/5 border-primary/20 font-bold" : "bg-muted/30 border-transparent"
                                    )}
                                  >
                                      <div className={cn(
                                          "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold",
                                          p.id === playerId ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                      )}>
                                          {p.name[0].toUpperCase()}
                                      </div>
                                      <span className="flex-1">{p.name}</span>
                                      {p.id === playerId && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-tighter">Host</span>}
                                  </motion.div>
                              ))}
                          </div>
                      </div>

                      {playerId && (
                          <Button onClick={startGame} className="w-full h-14 text-xl font-black italic tracking-tight group" size="lg">
                            START RACE
                            <Flag className="ml-2 h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                          </Button>
                      )}
                  </CardContent>
              </Card>
          </div>
      )
  }

  // RACE & RESULTS
  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-5xl mx-auto space-y-8 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 -left-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
             <div className="space-y-1">
                <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3">
                    <span className="bg-primary text-primary-foreground px-3 py-1 rounded-lg">PRO</span>
                    ROOM {room.code}
                </h2>
                <p className="text-muted-foreground font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" /> {room.players.length} racers in lobby
                </p>
             </div>
             <div className={cn(
                 "px-6 py-2 rounded-full font-mono font-bold text-sm tracking-widest shadow-lg transition-all border",
                 room.status === 'finished' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                 room.status === 'in-progress' ? 'bg-primary/10 text-primary border-primary/20 animate-pulse' : 
                 'bg-amber-500/10 text-amber-500 border-amber-500/20'
             )}>
                {room.status === 'finished' ? 'RACE FINISHED' : room.status === 'in-progress' ? 'RACE ACTIVE' : 'PREPARING...'}
             </div>
        </div>

        {/* PROGRESS TRACK */}
        <Card className="border-border/50 shadow-xl bg-card/50 backdrop-blur-md relative z-10 overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
            <CardContent className="p-6 md:p-8 space-y-6">
                <h3 className="text-sm uppercase tracking-[0.2em] font-bold text-muted-foreground/60 flex items-center gap-2">
                    <Flag className="h-4 w-4" /> Progress Track
                </h3>
                <div className="space-y-6">
                    {room.players.slice().sort((a, b) => b.progress - a.progress).map((p, idx) => (
                        <div key={p.id} className="relative group">
                            <div className="flex justify-between items-end text-sm mb-2">
                                <span className={cn(
                                    "font-bold transition-all flex items-center gap-2", 
                                    p.id === playerId ? "text-primary text-base" : "text-muted-foreground group-hover:text-foreground"
                                )}>
                                    {idx + 1}. {p.name} {p.id === playerId && "(You)"}
                                    {p.finishedAt && <Trophy className="h-4 w-4 text-yellow-500" />}
                                </span>
                                <div className="flex items-center gap-3 font-mono">
                                    <span className="text-muted-foreground/60">{p.progress}%</span>
                                    <span className="font-black text-primary bg-primary/5 px-2 py-0.5 rounded">{p.wpm} WPM</span>
                                </div>
                            </div>
                            <div className="h-4 w-full bg-muted/50 rounded-full overflow-hidden border border-border/50 p-0.5">
                                <motion.div 
                                    className={cn(
                                        "h-full rounded-full transition-all duration-300", 
                                        p.finishedAt ? "bg-gradient-to-r from-green-500 to-emerald-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "bg-gradient-to-r from-primary to-cyan-400"
                                    )}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${p.progress}%` }}
                                    transition={{ type: "spring", stiffness: 40, damping: 15 }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>

        {/* TYPING AREA */}
        {room.status === 'in-progress' && playerId && !room.players.find(p => p.id === playerId)?.finishedAt && (() => {
            // Find the first mismatch
            let firstMismatch = 0;
            while (
                firstMismatch < inputBuffer.length && 
                firstMismatch < room.text.length && 
                inputBuffer[firstMismatch] === room.text[firstMismatch]
            ) {
                firstMismatch++;
            }
            const isTypo = inputBuffer.length > firstMismatch;

            return (
                <Card className={cn(
                    "border-border/50 shadow-2xl bg-card border-2 relative z-10 transition-all duration-300",
                    isTypo && "border-destructive/50 ring-4 ring-destructive/10"
                )}>
                    <CardContent className="p-8 md:p-12 space-y-8">
                        {/* Visual Text Rendering with User Input Highlight */}
                        <div className="text-2xl md:text-3xl font-mono leading-relaxed select-none relative transition-all">
                            {/* Base text (remaining) */}
                            <div className="text-muted-foreground/30 whitespace-pre-wrap break-words">
                               <span className="invisible">{room.text.substring(0, inputBuffer.length)}</span>
                               {room.text.substring(inputBuffer.length)}
                            </div>
                            
                            {/* Highlight overlay */}
                             <div className="absolute top-0 left-0 pointer-events-none whitespace-pre-wrap break-words w-full">
                                {/* Correct characters */}
                                <span className="text-primary border-b-2 border-primary bg-primary/5">
                                  {room.text.substring(0, firstMismatch)}
                                </span>
                                
                                {/* Typos (Incorrect characters) */}
                                {isTypo && (
                                    <span className="text-destructive border-b-2 border-destructive bg-destructive/10">
                                      {room.text.substring(firstMismatch, inputBuffer.length)}
                                    </span>
                                )}
                                
                                {/* Blinking cursor */}
                                <motion.span 
                                    className={cn("inline-block w-0.5 h-[1.2em] align-middle ml-0.5", isTypo ? "bg-destructive" : "bg-primary")}
                                    animate={{ opacity: [1, 0, 1] }}
                                    transition={{ duration: 0.8, repeat: Infinity }}
                                />
                            </div>
                        </div>

                        <div className="relative pt-4">
                            <Input 
                                value={inputBuffer}
                                onChange={handleTyping}
                                className={cn(
                                    "font-mono text-xl p-8 bg-muted/20 border-2 transition-all rounded-xl",
                                    isTypo ? "border-destructive focus-visible:ring-destructive/20" : "focus-visible:ring-primary/10"
                                )}
                                placeholder="Type the text above as fast as you can..."
                                autoFocus
                                onPaste={(e) => e.preventDefault()}
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck="false"
                            />
                            {isTypo && (
                                <motion.div 
                                    initial={{ x: -2 }}
                                    animate={{ x: 2 }}
                                    transition={{ repeat: 5, duration: 0.05, repeatType: "reverse" }}
                                    className="absolute -top-1 left-4 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded shadow-sm"
                                >
                                    TYPO DETECTED
                                </motion.div>
                            )}
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                 <div className="flex flex-col items-end">
                                    <span className={cn("text-2xl font-black transition-colors", isTypo ? "text-destructive" : "text-primary")}>
                                        {wpm}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">WPM</span>
                                 </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-center text-xs font-bold text-muted-foreground/40 uppercase tracking-widest">
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Time: Live</span>
                                <span className={cn(isTypo && "text-destructive/60 animate-pulse")}>
                                    Chars: {inputBuffer.length} / {room.text.length}
                                </span>
                            </div>
                            <div>ProType Engine v1.0</div>
                        </div>
                    </CardContent>
                </Card>
            );
        })()}

        {/* FINISHED STATE FOR USER */}
        {playerId && room.players.find(p => p.id === playerId)?.finishedAt && (
             <Card className="bg-green-500/5 dark:bg-green-500/10 border-green-500/20 shadow-2xl relative z-10 overflow-hidden border-2">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-400" />
                <CardContent className="p-12 text-center space-y-6">
                    <div className="relative inline-block">
                        <Trophy className="h-20 w-20 mx-auto text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                        <motion.div 
                            className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-black px-2 py-1 rounded-full shadow-lg"
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                        >
                            FINISH!
                        </motion.div>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-4xl font-black tracking-tighter italic">RACE COMPLETE</h3>
                        <p className="text-muted-foreground font-medium text-lg italic">Impressive speed, racer!</p>
                    </div>
                    <div className="flex justify-center gap-8 pt-4">
                        <div className="text-center">
                            <div className="text-4xl font-black text-primary">{wpm}</div>
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Words Per Min</div>
                        </div>
                        <div className="w-px h-12 bg-border" />
                        <div className="text-center">
                            <div className="text-4xl font-black text-primary">100%</div>
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Accuracy</div>
                        </div>
                    </div>
                    <div className="pt-6">
                        <Button onClick={() => router.push('/')} variant="outline" className="px-8 border-2 font-bold hover:bg-primary hover:text-primary-foreground transition-all">
                            Back to Lobby
                        </Button>
                    </div>
                </CardContent>
             </Card>
        )}
    </div>
  )
}
