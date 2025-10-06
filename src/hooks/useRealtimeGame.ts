'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '~/lib/supabase'
import { questions, QuestionCategory } from '~/app/data/questions'
import { getCustomKey, getExcludedKey } from '~/lib/storage'

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const getClaimedKey = (room: string) => `claimedBy:${room}`
const getExcludedByKey = (room: string) => `excludedBy:${room}`
const getNamesByIdKey = (room: string) => `namesById:${room}`
const getClientIdKey = (room: string) => `clientId:${room}`
const getPlayerNameClientKey = (room: string, id: string) => `playerName:${room}:${id}`

const isEditableTarget = (el: Element | null) => {
	if (!el) return false
	const tag = el.tagName
	if (tag === 'INPUT' || tag === 'TEXTAREA') return true
	const ce = (el as HTMLElement).getAttribute('contenteditable')
	return ce === '' || ce === 'true'
}

export const useRealtimeGame = () => {
	const [value, setValue] = useState<number | null>(null)
	const [rolling, setRolling] = useState(false)
	const [excluded, setExcluded] = useState<Set<number>>(new Set())
	const [excludedBy, setExcludedBy] = useState<Record<number, string[]>>({})
	const [customQuestions, setCustomQuestions] = useState<string[]>([])
	const [roomCode, setRoomCode] = useState('')
	const [playerName, setPlayerNameState] = useState('')
	const [namesById, setNamesById] = useState<Record<string, string>>({})
	const [claimedBy, setClaimedBy] = useState<Record<number, string[]>>({})

	const clientId = useRef<string>('')
	const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
	const itemRefs = useRef<(HTMLLIElement | null)[]>([])

	const valueRef = useRef<number | null>(null)
	const customRef = useRef<string[]>([])
	const claimedByRef = useRef<Record<number, string[]>>({})
	const excludedByRef = useRef<Record<number, string[]>>({})
	const namesByIdRef = useRef<Record<string, string>>({})
	const playerNameRef = useRef('')

	useEffect(() => {
		valueRef.current = value
	}, [value])
	useEffect(() => {
		customRef.current = customQuestions
	}, [customQuestions])
	useEffect(() => {
		claimedByRef.current = claimedBy
	}, [claimedBy])
	useEffect(() => {
		excludedByRef.current = excludedBy
	}, [excludedBy])
	useEffect(() => {
		namesByIdRef.current = namesById
	}, [namesById])
	useEffect(() => {
		playerNameRef.current = playerName
	}, [playerName])

	const flattenQuestions = (categories: QuestionCategory[], custom: string[]) =>
		categories.flatMap(c => c.items).concat(custom)
	const allQuestions = useMemo(() => flattenQuestions(questions, customQuestions), [customQuestions])
	const max = allQuestions.length

	const emit = useCallback((event: string, payload: Record<string, unknown>) => {
		if (!channelRef.current) return
		channelRef.current.send({ type: 'broadcast', event, payload })
	}, [])

	const updatePlayerName = useCallback(
		(n: string) => {
			if (!clientId.current || !roomCode) return
			setPlayerNameState(n)
			setNamesById(m => ({ ...m, [clientId.current]: n }))
			const key = getPlayerNameClientKey(roomCode, clientId.current)
			sessionStorage.setItem(key, n)
			setTimeout(() => emit('set_name', { id: clientId.current, name: n }), 0)
		},
		[emit, roomCode]
	)

	const joinRoom = useCallback((room: string) => {
		if (!room) return
		if (channelRef.current) {
			supabase.removeChannel(channelRef.current)
			channelRef.current = null
		}
		const ch = supabase.channel(`number-game:${room}`, { config: { broadcast: { self: false } } })

		ch.on('broadcast', { event: 'set_name' }, payload => {
			const { id, name } = payload.payload as { id: string; name: string }
			setNamesById(m => ({ ...m, [id]: name }))
		})

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

		ch.on('broadcast', { event: 'toggle_exclude' }, payload => {
			const { index, isExcluded, name } = payload.payload as { index: number; isExcluded: boolean; name: string }
			if (isExcluded) {
				setExcludedBy(m => {
					const set = new Set([...(m[index] || []), name])
					return { ...m, [index]: [...set] }
				})
			} else {
				setExcludedBy(m => {
					const list = new Set(m[index] || [])
					list.delete(name)
					const n = { ...m }
					const arr = [...list]
					if (arr.length) n[index] = arr
					else delete n[index]
					return n
				})
			}
		})

		ch.on('broadcast', { event: 'sync_state' }, payload => {
			const { state } = payload.payload as {
				state: {
					value: number | null
					customQuestions: string[]
					claimedBy?: Record<number, string[]>
					excludedBy?: Record<number, string[]>
					namesById?: Record<string, string>
				}
			}
			setCustomQuestions(state.customQuestions || [])
			setValue(state.value ?? null)
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
			setExcludedBy(state.excludedBy || {})
			setNamesById(prev => ({ ...prev, ...(state.namesById || {}) }))
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
							excludedBy: excludedByRef.current,
							namesById: namesByIdRef.current,
						},
					},
				})
				const n = playerNameRef.current
				if (n) ch.send({ type: 'broadcast', event: 'set_name', payload: { id: clientId.current, name: n } })
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
		let id = sessionStorage.getItem(getClientIdKey(roomCode))
		if (!id) {
			id = crypto.randomUUID()
			sessionStorage.setItem(getClientIdKey(roomCode), id)
		}
		clientId.current = id

		const savedNamesById = localStorage.getItem(getNamesByIdKey(roomCode))
		const baseMap = savedNamesById
			? (() => {
					try {
						return JSON.parse(savedNamesById) as Record<string, string>
					} catch {
						return {}
					}
			  })()
			: {}

		const savedName = sessionStorage.getItem(getPlayerNameClientKey(roomCode, id)) || ''
		if (savedName) baseMap[id] = savedName
		setNamesById(baseMap)
		setPlayerNameState(savedName)

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

		const savedExcludedBy = localStorage.getItem(getExcludedByKey(roomCode))
		setExcludedBy(
			savedExcludedBy
				? (() => {
						try {
							return JSON.parse(savedExcludedBy) as Record<number, string[]>
						} catch {
							return {}
						}
				  })()
				: {}
		)

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

		localStorage.setItem('roomCode', roomCode)
		joinRoom(roomCode)
	}, [roomCode, joinRoom])

	useEffect(() => {
		if (roomCode) localStorage.setItem(getNamesByIdKey(roomCode), JSON.stringify(namesById))
	}, [roomCode, namesById])
	useEffect(() => {
		if (roomCode) localStorage.setItem(getCustomKey(roomCode), JSON.stringify(customQuestions))
	}, [roomCode, customQuestions])
	useEffect(() => {
		if (roomCode) localStorage.setItem(getExcludedKey(roomCode), JSON.stringify([...excluded]))
	}, [roomCode, excluded])
	useEffect(() => {
		if (roomCode) localStorage.setItem(getExcludedByKey(roomCode), JSON.stringify(excludedBy))
	}, [roomCode, excludedBy])
	useEffect(() => {
		if (roomCode) localStorage.setItem(getClaimedKey(roomCode), JSON.stringify(claimedBy))
	}, [roomCode, claimedBy])

	const didInitAutoScroll = useRef(false)
	useEffect(() => {
		if (didInitAutoScroll.current) return
		if (max === 0) return
		didInitAutoScroll.current = true
		const v = randInt(1, max)
		setValue(v)
		setTimeout(() => itemRefs.current[v - 1]?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60)
	}, [max])

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
				setExcluded(prev => new Set([...prev, v]))
				const myName = playerNameRef.current || 'Player'
				setClaimedBy(prev => {
					const set = new Set([...(prev[v] || []), myName])
					return { ...prev, [v]: [...set] }
				})
				setTimeout(() => itemRefs.current[v - 1]?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60)
				emit('roll', { v, name: myName })
			}
		}, 70)
	}, [rolling, allQuestions, excluded, emit])

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (isEditableTarget(document.activeElement)) return
			const k = e.key.toLowerCase()
			if (e.code === 'Space' || k === 'r') roll()
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [roll])

	const toggleExclude = (index: number) => {
		const me = playerNameRef.current || 'Player'
		if (excluded.has(index)) {
			setExcluded(s => {
				const n = new Set(s)
				n.delete(index)
				return n
			})
			setExcludedBy(m => {
				const list = new Set(m[index] || [])
				list.delete(me)
				const n = { ...m }
				const arr = [...list]
				if (arr.length) n[index] = arr
				else delete n[index]
				return n
			})
			emit('toggle_exclude', { index, isExcluded: false, name: me })
		} else {
			setExcluded(s => new Set([...s, index]))
			setExcludedBy(m => {
				const set = new Set([...(m[index] || []), me])
				return { ...m, [index]: [...set] }
			})
			emit('toggle_exclude', { index, isExcluded: true, name: me })
		}
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

	const resetGame = useCallback(() => {
		setValue(null)
		setExcluded(new Set())
		setClaimedBy({})
		setExcludedBy({})
	}, [])

	return {
		value,
		rolling,
		excluded,
		excludedBy,
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
		playerName,
		setPlayerName: updatePlayerName,
		namesById,
		resetGame,
	}
}
