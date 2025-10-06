'use client'

import { Box, TextField, IconButton, Button, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useState } from 'react'

type ControlsProps = {
	rolling: boolean
	roll: () => void
	roomCode: string
	setRoomCode: (code: string) => void
	addQuestion: (q: string) => void
}

export const Controls = ({ rolling, roll, roomCode, setRoomCode, addQuestion }: ControlsProps) => {
	const [newQuestion, setNewQuestion] = useState('')

	const handleAdd = () => {
		addQuestion(newQuestion)
		setNewQuestion('')
	}

	return (
		<Box className='flex flex-col items-center gap-3 w-full md:w-auto'>
			<Button variant='contained' size='large' onClick={roll} disabled={rolling} className='rounded-xl px-6 py-3'>
				{rolling ? 'Rolling…' : 'Roll'}
			</Button>
			<Typography variant='body2' className='text-gray-400'>
				Press Space or R to roll
			</Typography>

			<Box className='flex items-center gap-2 w-full'>
				<TextField
					variant='outlined'
					size='small'
					placeholder='Room code (same on all devices)'
					fullWidth
					value={roomCode}
					onChange={e => setRoomCode(e.target.value.trim())}
					className='bg-white rounded'
				/>
			</Box>

			<Box className='flex items-center gap-2 w-full'>
				<TextField
					variant='outlined'
					size='small'
					placeholder='Add new question...'
					fullWidth
					value={newQuestion}
					onChange={e => setNewQuestion(e.target.value)}
					onKeyDown={e => {
						if (e.key === 'Enter') handleAdd()
					}}
					className='bg-white rounded'
				/>
				<IconButton color='primary' onClick={handleAdd}>
					<AddIcon />
				</IconButton>
			</Box>
		</Box>
	)
}
