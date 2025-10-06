'use client'

import { Card, CardContent, Typography } from '@mui/material'

type DiceCardProps = {
	value: number | null
	rolling: boolean
}

export const DiceCard = ({ value, rolling }: DiceCardProps) => (
	<Card
		className={`w-56 h-56 grid place-items-center rounded-xl shadow-lg transition-transform duration-150 ${
			rolling ? 'scale-105 bg-neutral-900 text-white' : 'scale-100 bg-neutral-800 text-white'
		}`}>
		<CardContent className='p-0'>
			<Typography variant='h1' fontWeight='bold' textAlign='center'>
				{value ?? '--'}
			</Typography>
		</CardContent>
	</Card>
)
