'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '~/lib/supabase'
import { questions, QuestionCategory } from '~/app/data/questions'
import { getCustomKey, getExcludedKey } from '~/lib/storage'

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

export const useRealtimeGame = () => {
	const [value, setValue] = useState<number | null>(null)
	const [rolling, setRolling] = useState(false)
	const [excluded, setExcluded] = useState<Set<number>>(new Set())
	const [customQuestions, setCustomQuestions] = useState<string[]>([])
	const [roomCode, setRoomCode] = useState('')
	const itemRefs = useRef<(HTMLLIElement | null)[]>([])
	const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
	const [taken, setTaken] = useState<Set<number>>(new Set())
	const [claimedBy, setClaimedBy] = useState<Record<number, string[]>>({})
	const clientId = useRef<string>(crypto.randomUUID())

	const valueRef = useRef<number | null>(null)
	const excludedRef = useRef<Set<number>>(new Set())
	const customRef = useRef<string[]>([])
	const claimedRef = useRef<Record<number, string[]>>({})

	useEffect(() => {
		valueRef.current = value
	}, [value])
	useEffect(() => {
		excludedRef.current = excluded
	}, [excluded])
	useEffect(() => {
		customRef.current = customQuestions
	}, [customQuestions])
	useEffect(() => {
		claimedRef.current = claimedBy
	}, [claimedBy])

	const getClaimedKey = (room: string) => `claimedBy:${room}`

	const flattenQuestions = (categories: QuestionCategory[], custom: string[]) =>
		categories.flatMap(c => c.items).concat(custom)

	const allQuestions = useMemo(() => flattenQuestions(questions, customQuestions), [customQuestions])
	const max = allQuestions.length

	const emit = useCallback((event: string, payload: Record<string, unknown>) => {
		if (!channelRef.current) return
		channelRef.current.send({ type: 'broadcast', event, payload })
	}, [])

	const joinRoom = useCallback((room: string) => {
		if (!room) return
		if (channelRef.current) {
			supabase.removeChannel(channelRef.current)
			channelRef.current = null
		}
		const ch = supabase.channel(`number-game:${room}`, { config: { broadcast: { self: false } } })

		ch.on('broadcast', { event: 'roll' }, payload => {
			const { v, playerId } = payload.payload as { v: number; playerId: string }
			setValue(v)
			setClaimedBy(prev => {
				const players = new Set([...(prev[v] || []), playerId])
				return { ...prev, [v]: [...players] }
			})
			setTimeout(() => {
				itemRefs.current[v - 1]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
			}, 100)
		})

		ch.on('broadcast', { event: 'exclude_toggle' }, payload => {
			const { index } = payload.payload as { index: number }
			setExcluded(prev => {
				const copy = new Set(prev)
				copy.has(index) ? copy.delete(index) : copy.add(index)
				return copy
			})
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
					excluded: number[]
					customQuestions: string[]
					claimedBy: Record<number, string[]>
				}
			}
			setCustomQuestions(state.customQuestions || [])
			setExcluded(new Set(state.excluded || []))
			setClaimedBy(state.claimedBy || {})
			setValue(state.value ?? null)
		})

		ch.subscribe(status => {
			if (status === 'SUBSCRIBED') {
				ch.send({
					type: 'broadcast',
					event: 'sync_state',
					payload: {
						state: {
							value: valueRef.current,
							excluded: [...excludedRef.current],
							customQuestions: customRef.current,
							claimedBy: claimedRef.current,
						},
					},
				})
			}
		})

		channelRef.current = ch
	}, [])

	useEffect(() => {
		const savedRoom = localStorage.getItem('roomCode') || ''
		if (savedRoom) setRoomCode(savedRoom)
	}, [])

	useEffect(() => {
		if (!roomCode) return
		const savedCustom = localStorage.getItem(getCustomKey(roomCode))
		const savedExcluded = localStorage.getItem(getExcludedKey(roomCode))
		const savedClaimed = localStorage.getItem(getClaimedKey(roomCode))

		if (savedCustom) {
			try {
				setCustomQuestions(JSON.parse(savedCustom))
			} catch {
				setCustomQuestions([])
			}
		} else setCustomQuestions([])

		if (savedExcluded) {
			try {
				setExcluded(new Set(JSON.parse(savedExcluded)))
			} catch {
				setExcluded(new Set())
			}
		} else setExcluded(new Set())

		if (savedClaimed) {
			try {
				setClaimedBy(JSON.parse(savedClaimed))
			} catch {
				setClaimedBy({})
			}
		} else setClaimedBy({})
	}, [roomCode])

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
		if (!roomCode) return
		localStorage.setItem('roomCode', roomCode)
		setClaimedBy({}) 
		joinRoom(roomCode)
	}, [roomCode, joinRoom])

	useEffect(() => {
		if (max === 0) return
		const v = randInt(1, max)
		setValue(v)
		setTimeout(() => {
			const el = itemRefs.current[v - 1]
			el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
		}, 100)
	}, [max])

	const roll = useCallback(() => {
		if (rolling) return
		const available = allQuestions.map((_, i) => i + 1).filter(n => !excluded.has(n))
		if (available.length === 0) return
		setRolling(true)
		let ticks = 22
		const id = setInterval(() => {
			setValue(available[randInt(0, available.length - 1)])
			ticks -= 1
			if (ticks <= 0) {
				clearInterval(id)
				const v = available[randInt(0, available.length - 1)]
				setValue(v)
				setRolling(false)

		
				setExcluded(prev => new Set([...prev, v]))

			
				setClaimedBy(prev => {
					const players = new Set([...(prev[v] || []), clientId.current])
					return { ...prev, [v]: [...players] }
				})

				setTimeout(() => {
					itemRefs.current[v - 1]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
				}, 100)

				emit('roll', { v, playerId: clientId.current })
			}
		}, 70)
	}, [rolling, allQuestions, excluded, emit])

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.code === 'Space' || e.key.toLowerCase() === 'r') roll()
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [roll]) 

	const toggleExclude = (index: number) => {
		setExcluded(prev => {
			const copy = new Set(prev)
			if (copy.has(index)) {
				copy.delete(index)
			} else {
				copy.add(index)
			}
			return copy
		})
		emit('exclude_toggle', { index })
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
		playerId: clientId.current,
		claimedBy,
	}
}
