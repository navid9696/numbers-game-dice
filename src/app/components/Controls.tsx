'use client'

import { memo, useEffect, useMemo, useState, useCallback } from 'react'
import { Stack, Button, TextField, Typography } from '@mui/material'

type ControlsProps = {
	rolling: boolean
	roll: () => void
	roomCode: string
	setRoomCode: (code: string) => void
	addQuestion: (q: string) => void
	playerName: string
	setPlayerName: (n: string) => void
	resetGame: () => void
}

const ControlsComponent = ({
	rolling,
	roll,
	roomCode,
	setRoomCode,
	addQuestion,
	playerName,
	setPlayerName,
	resetGame,
}: ControlsProps) => {
	const [newQuestion, setNewQuestion] = useState('')
	const [roomDraft, setRoomDraft] = useState(roomCode)
	const [nameDraft, setNameDraft] = useState(playerName)

	useEffect(() => {
		setRoomDraft(roomCode)
	}, [roomCode])

	useEffect(() => {
		setNameDraft(playerName)
	}, [playerName])

	const canAdd = useMemo(() => newQuestion.trim().length > 0, [newQuestion])

	const handleAdd = useCallback(() => {
		if (!canAdd) return
		addQuestion(newQuestion.trim())
		setNewQuestion('')
	}, [canAdd, addQuestion, newQuestion])

	const stopHotkeys = useCallback((e: React.KeyboardEvent<Element>) => {
		const k = e.key
		if (k === ' ' || k === 'Spacebar' || k === 'r' || k === 'R' || k === 'Enter') {
			e.stopPropagation()
			if (k === ' ') e.preventDefault()
		}
	}, [])

	return (
		<Stack spacing={2} alignItems='center' sx={{ width: '100%', maxWidth: 560 }}>
			<Button
				type='button'
				onClick={roll}
				disabled={rolling}
				variant='contained'
				color='primary'
				sx={{ px: 4, py: 1.25, borderRadius: 2 }}>
				{rolling ? 'Rolling…' : 'Roll'}
			</Button>

			<Typography variant='body2' color='text.secondary'>
				Press Space or R to roll
			</Typography>

			<TextField
				fullWidth
				label='Room code'
				value={roomDraft}
				onChange={e => setRoomDraft(e.target.value)}
				onBlur={() => setRoomCode(roomDraft.trim())}
				onKeyDown={e => {
					stopHotkeys(e)
					if (e.key === 'Enter') setRoomCode(roomDraft.trim())
				}}
				onKeyUp={stopHotkeys}
				size='medium'
			/>

			<TextField
				fullWidth
				label='Your name'
				value={nameDraft}
				onChange={e => setNameDraft(e.target.value)}
				onBlur={() => setPlayerName(nameDraft)}
				onKeyDown={e => {
					stopHotkeys(e)
					if (e.key === 'Enter') setPlayerName(nameDraft)
				}}
				onKeyUp={stopHotkeys}
				size='medium'
			/>

			<Stack direction='row' spacing={1} sx={{ width: '100%' }}>
				<TextField
					fullWidth
					label='Add new question...'
					value={newQuestion}
					onChange={e => setNewQuestion(e.target.value)}
					onKeyDown={e => {
						stopHotkeys(e)
						if (e.key === 'Enter') handleAdd()
					}}
					onKeyUp={stopHotkeys}
					size='medium'
				/>
				<Button
					type='button'
					onClick={handleAdd}
					disabled={!canAdd}
					variant='contained'
					color='primary'
					sx={{ px: 2.5, borderRadius: 2 }}>
					+
				</Button>
			</Stack>

			<Button onClick={resetGame} variant='contained' color='error' sx={{ px: 4, py: 1.25, borderRadius: 2 }}>
				Reset Game
			</Button>
		</Stack>
	)
}

ControlsComponent.displayName = 'Controls'
export const Controls = memo(ControlsComponent)
