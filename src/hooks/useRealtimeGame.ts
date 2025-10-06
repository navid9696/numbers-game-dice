'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '~/lib/supabase'
import { questions, QuestionCategory } from '~/app/data/questions'
import { getCustomKey, getExcludedKey } from '~/lib/storage'

/** helpers */
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const getClaimedKey = (room: string) => `claimedBy:${room}`
const getPlayerNameKey = (room: string) => `playerName:${room}`

export const useRealtimeGame = () => {
	const [value, setValue] = useState<number | null>(null)
	const [rolling, setRolling] = useState(false)
	const [excluded, setExcluded] = useState<Set<number>>(new Set())
	const [customQuestions, setCustomQuestions] = useState<string[]>([])
	const [roomCode, setRoomCode] = useState('')
	const [playerName, setPlayerName] = useState('') // ⬅️ imię gracza

	const itemRefs = useRef<(HTMLLIElement | null)[]>([])
	const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

	/** kto wziął dany numer – trzymamy IMIONA */
	const [claimedBy, setClaimedBy] = useState<Record<number, string[]>>({})
	const clientId = useRef<string>(crypto.randomUUID())

	// Refs do synchronizacji
	const valueRef = useRef<number | null>(null)
	const customRef = useRef<string[]>([])
	const claimedByRef = useRef<Record<number, string[]>>({})
	useEffect(() => {
		valueRef.current = value
	}, [value])
	useEffect(() => {
		customRef.current = customQuestions
	}, [customQuestions])
	useEffect(() => {
		claimedByRef.current = claimedBy
	}, [claimedBy])

	/** dane */
	const flattenQuestions = (categories: QuestionCategory[], custom: string[]) =>
		categories.flatMap(c => c.items).concat(custom)
	const allQuestions = useMemo(() => flattenQuestions(questions, customQuestions), [customQuestions])
	const max = allQuestions.length

	/** emit */
	const emit = useCallback((event: string, payload: Record<string, unknown>) => {
		if (!channelRef.current) return
		channelRef.current.send({ type: 'broadcast', event, payload })
	}, [])

	/** join */
	const joinRoom = useCallback((room: string) => {
		if (!room) return
		if (channelRef.current) {
			supabase.removeChannel(channelRef.current)
			channelRef.current = null
		}
		const ch = supabase.channel(`number-game:${room}`, { config: { broadcast: { self: false } } })

		ch.on('broadcast', { event: 'roll' }, payload => {
			const { v, name } = payload.payload as { v: number; name: string }
			setValue(v)
			setClaimedBy(prev => {
				const set = new Set([...(prev[v] || []), name])
				return { ...prev, [v]: [...set] }
			})
			setTimeout(() => itemRefs.current[v - 1]?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60)
		})

		ch.on('broadcast', { event: 'add_question' }, payload => {
			const { text } = payload.payload as { text: string }
			setCustomQuestions(prev => [...prev, text])
		})

		ch.on('broadcast', { event: 'remove_question' }, payload => {
			const { globalIndex } = payload.payload as { globalIndex: number }
			const baseLen = questions.flatMap(c => c.items).length
			if (globalIndex < baseLen) return
			const ci = globalIndex - baseLen
			setCustomQuestions(prev => prev.filter((_, i) => i !== ci))
		})

		ch.on('broadcast', { event: 'sync_state' }, payload => {
			const { state } = payload.payload as {
				state: {
					value: number | null
					customQuestions: string[]
					claimedBy?: Record<number, string[]>
				}
			}
			setCustomQuestions(state.customQuestions || [])
			setValue(state.value ?? null)

			// MERGE claimedBy (nie nadpisuj lokalnych)
			setClaimedBy(prev => {
				const merged: Record<number, string[]> = { ...prev }
				const incoming = state.claimedBy || {}
				for (const [k, arr] of Object.entries(incoming)) {
					const idx = Number(k)
					const set = new Set([...(merged[idx] || []), ...arr])
					merged[idx] = [...set]
				}
				return merged
			})
			// excluded pozostaje lokalne – nic nie robimy
		})

		ch.subscribe(status => {
			if (status === 'SUBSCRIBED') {
				ch.send({
					type: 'broadcast',
					event: 'sync_state',
					payload: {
						state: {
							value: valueRef.current,
							customQuestions: customRef.current,
							claimedBy: claimedByRef.current,
						},
					},
				})
			}
		})

		channelRef.current = ch
	}, [])

	/** start: room z localStorage */
	useEffect(() => {
		const savedRoom = localStorage.getItem('roomCode') || ''
		if (savedRoom) setRoomCode(savedRoom)
	}, [])

	/** na zmianę room: wczytaj wszystko per room */
	useEffect(() => {
		if (!roomCode) return

		// custom
		const savedCustom = localStorage.getItem(getCustomKey(roomCode))
		setCustomQuestions(
			savedCustom
				? (() => {
						try {
							return JSON.parse(savedCustom) as string[]
						} catch {
							return []
						}
				  })()
				: []
		)

		// excluded (lokalne)
		const savedExcluded = localStorage.getItem(getExcludedKey(roomCode))
		setExcluded(
			savedExcluded
				? (() => {
						try {
							return new Set(JSON.parse(savedExcluded) as number[])
						} catch {
							return new Set<number>()
						}
				  })()
				: new Set<number>()
		)

		// claimed
		const savedClaimed = localStorage.getItem(getClaimedKey(roomCode))
		setClaimedBy(
			savedClaimed
				? (() => {
						try {
							return JSON.parse(savedClaimed) as Record<number, string[]>
						} catch {
							return {}
						}
				  })()
				: {}
		)

		// player name for this room
		const savedName = localStorage.getItem(getPlayerNameKey(roomCode)) || ''
		setPlayerName(savedName)

		localStorage.setItem('roomCode', roomCode)
		joinRoom(roomCode)
	}, [roomCode, joinRoom])

	/** persystencja */
	useEffect(() => {
		if (roomCode) localStorage.setItem(getCustomKey(roomCode), JSON.stringify(customQuestions))
	}, [roomCode, customQuestions])

	useEffect(() => {
		if (roomCode) localStorage.setItem(getExcludedKey(roomCode), JSON.stringify([...excluded]))
	}, [roomCode, excluded])

	useEffect(() => {
		if (roomCode) localStorage.setItem(getClaimedKey(roomCode), JSON.stringify(claimedBy))
	}, [roomCode, claimedBy])

	useEffect(() => {
		if (roomCode) localStorage.setItem(getPlayerNameKey(roomCode), playerName)
	}, [roomCode, playerName])

	/** pierwszy auto-scroll */
	useEffect(() => {
		if (max === 0) return
		const v = randInt(1, max)
		setValue(v)
		setTimeout(() => itemRefs.current[v - 1]?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60)
	}, [max])

	/** roll */
	const roll = useCallback(() => {
		if (rolling) return
		const available = allQuestions.map((_, i) => i + 1).filter(n => !excluded.has(n))
		if (available.length === 0) return

		setRolling(true)
		let ticks = 22
		const timer = setInterval(() => {
			setValue(available[randInt(0, available.length - 1)])
			ticks -= 1
			if (ticks <= 0) {
				clearInterval(timer)
				const v = available[randInt(0, available.length - 1)]
				setValue(v)
				setRolling(false)

				// u mnie: wyklucz (skreślenie)
				setExcluded(prev => new Set([...prev, v]))

				// u wszystkich: taken przez MOJE IMIĘ
				const myName = playerName || 'Player'
				setClaimedBy(prev => {
					const set = new Set([...(prev[v] || []), myName])
					return { ...prev, [v]: [...set] }
				})

				setTimeout(() => itemRefs.current[v - 1]?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60)

				emit('roll', { v, name: myName })
			}
		}, 70)
	}, [rolling, allQuestions, excluded, emit, playerName]) // ⬅️ playerName w deps

	/** skróty */
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.code === 'Space' || e.key.toLowerCase() === 'r') roll()
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [roll])

	/** UI helpers */
	const toggleExclude = (index: number) => {
		setExcluded(prev => {
			const copy = new Set(prev)
			copy.has(index) ? copy.delete(index) : copy.add(index)
			return copy
		})
		// exclude jest lokalne – nie broadcastujemy
	}

	const addQuestion = (text: string) => {
		if (!text.trim()) return
		setCustomQuestions(prev => [...prev, text.trim()])
		emit('add_question', { text: text.trim() })
	}

	const removeQuestion = (index: number) => {
		const baseLength = questions.flatMap(c => c.items).length
		if (index < baseLength) return
		const customIndex = index - baseLength
		setCustomQuestions(prev => prev.filter((_, i) => i !== customIndex))
		emit('remove_question', { globalIndex: index })
	}

	return {
		value,
		rolling,
		excluded,
		customQuestions,
		roomCode,
		setRoomCode,
		itemRefs,
		max,
		roll,
		toggleExclude,
		addQuestion,
		removeQuestion,

		claimedBy,
		playerId: clientId.current,
		playerName, // ⬅️ eksport
		setPlayerName, // ⬅️ eksport
	}
}
