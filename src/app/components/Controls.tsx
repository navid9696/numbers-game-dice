'use client'

import { memo, useEffect, useMemo, useState } from 'react'

type ControlsProps = {
	rolling: boolean
	roll: () => void
	roomCode: string
	setRoomCode: (code: string) => void
	addQuestion: (q: string) => void
	playerName: string
	setPlayerName: (n: string) => void
}

const ControlsComponent = ({
	rolling,
	roll,
	roomCode,
	setRoomCode,
	addQuestion,
	playerName,
	setPlayerName,
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

	const handleAdd = () => {
		if (!canAdd) return
		addQuestion(newQuestion.trim())
		setNewQuestion('')
	}

	return (
		<div className='flex flex-col items-center gap-3 w-full md:w-auto'>
			<button
				onClick={roll}
				disabled={rolling}
				className='rounded-xl px-6 py-3 bg-blue-600 text-white disabled:opacity-60'>
				{rolling ? 'Rolling…' : 'Roll'}
			</button>

			<p className='text-sm text-gray-400'>Press Space or R to roll</p>

			<div className='flex items-center gap-2 w-full'>
				<input
					className='w-full rounded px-3 py-2 bg-white text-black'
					placeholder='Room code'
					value={roomDraft}
					onChange={e => setRoomDraft(e.target.value)}
					onBlur={() => setRoomCode(roomDraft.trim())}
					onKeyDown={e => {
						if (e.key === 'Enter') setRoomCode(roomDraft.trim())
					}}
				/>
			</div>

			<div className='flex items-center gap-2 w-full'>
				<input
					className='w-full rounded px-3 py-2 bg-white text-black'
					placeholder='Your name'
					value={nameDraft}
					onChange={e => setNameDraft(e.target.value)}
					onBlur={() => setPlayerName(nameDraft)}
					onKeyDown={e => {
						if (e.key === 'Enter') setPlayerName(nameDraft)
					}}
				/>
			</div>

			<div className='flex items-center gap-2 w-full'>
				<input
					className='w-full rounded px-3 py-2 bg-white text-black'
					placeholder='Add new question...'
					value={newQuestion}
					onChange={e => setNewQuestion(e.target.value)}
					onKeyDown={e => {
						if (e.key === 'Enter') handleAdd()
					}}
				/>
				<button
					onClick={handleAdd}
					disabled={!canAdd}
					className='rounded-xl px-3 py-2 bg-blue-600 text-white disabled:opacity-60'>
					+
				</button>
			</div>
		</div>
	)
}

ControlsComponent.displayName = 'Controls'
export const Controls = memo(ControlsComponent)
