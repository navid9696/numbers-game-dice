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
	const clientId = useRef<string>(crypto.randomUUID())
	const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

	const flattenQuestions = (categories: QuestionCategory[], custom: string[]) =>
		categories.flatMap(c => c.items).concat(custom)

	const allQuestions = useMemo(() => flattenQuestions(questions, customQuestions), [customQuestions])
	const max = allQuestions.length

	const emit = useCallback((event: string, payload: Record<string, unknown>) => {
		if (!channelRef.current) return
		channelRef.current.send({ type: 'broadcast', event, payload: { ...payload, sender: clientId.current } })
	}, [])

	const joinRoom = useCallback(
		(room: string) => {
			if (!room) return
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current)
				channelRef.current = null
			}
			const ch = supabase.channel(`number-game:${room}`, { config: { broadcast: { self: true } } })
			ch.on('broadcast', { event: 'roll' }, payload => {
				const { v, sender } = payload.payload as { v: number; sender: string }
				if (sender === clientId.current) return
				setValue(v)
				setExcluded(prev => new Set([...prev, v]))
				setTimeout(() => {
					const el = itemRefs.current[v - 1]
					el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
				}, 100)
			})
			ch.on('broadcast', { event: 'exclude_toggle' }, payload => {
				const { index, sender } = payload.payload as { index: number; sender: string }
				if (sender === clientId.current) return
				setExcluded(prev => {
					const copy = new Set(prev)
					copy.has(index) ? copy.delete(index) : copy.add(index)
					return copy
				})
			})
			ch.on('broadcast', { event: 'add_question' }, payload => {
				const { text, sender } = payload.payload as { text: string; sender: string }
				if (sender === clientId.current) return
				setCustomQuestions(prev => [...prev, text])
			})
			ch.on('broadcast', { event: 'remove_question' }, payload => {
				const { globalIndex, sender } = payload.payload as { globalIndex: number; sender: string }
				if (sender === clientId.current) return
				const baseLen = questions.flatMap(c => c.items).length
				if (globalIndex < baseLen) return
				const ci = globalIndex - baseLen
				setCustomQuestions(prev => prev.filter((_, i) => i !== ci))
			})
			ch.on('broadcast', { event: 'sync_state' }, payload => {
				const { sender, state } = payload.payload as {
					sender: string
					state: { value: number | null; excluded: number[]; customQuestions: string[] }
				}
				if (sender === clientId.current) return
				setCustomQuestions(state.customQuestions || [])
				setExcluded(new Set(state.excluded || []))
				setValue(state.value ?? null)
			})
			ch.subscribe(status => {
				if (status === 'SUBSCRIBED') {
					ch.send({
						type: 'broadcast',
						event: 'sync_state',
						payload: { sender: clientId.current, state: { value, excluded: [...excluded], customQuestions } },
					})
				}
			})
			channelRef.current = ch
		},
		[value, excluded, customQuestions]
	)

	useEffect(() => {
		const savedRoom = localStorage.getItem('roomCode') || ''
		if (savedRoom) setRoomCode(savedRoom)
	}, [])

	useEffect(() => {
		if (!roomCode) return
		const savedCustom = localStorage.getItem(getCustomKey(roomCode))
		const savedExcluded = localStorage.getItem(getExcludedKey(roomCode))
		if (savedCustom) {
			try {
				setCustomQuestions(JSON.parse(savedCustom))
			} catch {
				setCustomQuestions([])
			}
		} else {
			setCustomQuestions([])
		}
		if (savedExcluded) {
			try {
				setExcluded(new Set(JSON.parse(savedExcluded)))
			} catch {
				setExcluded(new Set())
			}
		} else {
			setExcluded(new Set())
		}
	}, [roomCode])

	useEffect(() => {
		if (roomCode) localStorage.setItem(getCustomKey(roomCode), JSON.stringify(customQuestions))
	}, [roomCode, customQuestions])

	useEffect(() => {
		if (roomCode) localStorage.setItem(getExcludedKey(roomCode), JSON.stringify([...excluded]))
	}, [roomCode, excluded])

	useEffect(() => {
		if (roomCode) {
			localStorage.setItem('roomCode', roomCode)
			joinRoom(roomCode)
		}
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

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.code === 'Space' || e.key.toLowerCase() === 'r') roll()
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	})

	const toggleExclude = (index: number) => {
		setExcluded(prev => {
			const copy = new Set(prev)
			copy.has(index) ? copy.delete(index) : copy.add(index)
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
				setTimeout(() => {
					const el = itemRefs.current[v - 1]
					el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
				}, 100)
				emit('roll', { v })
			}
		}, 70)
	}, [rolling, excluded, allQuestions, emit])

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
	}
}
