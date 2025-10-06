'use client'

import { Container, Box, Typography, Paper } from '@mui/material'
import { QuestionList } from './components/QuestionList'
import { DiceCard } from './components/DiceCard'
import { Controls } from './components/Controls'
import { useRealtimeGame } from '~/hooks/useRealtimeGame'

const Page = () => {
	const {
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
		playerId, 
	} = useRealtimeGame()

	return (
		<Container maxWidth='lg' className='min-h-screen flex flex-col md:flex-row items-center justify-center gap-6 py-6'>
			<Box className='flex flex-col items-center gap-3 w-full md:w-auto'>
				<Typography variant='h4' fontWeight='bold'>
					Number Dice 1–{max}
				</Typography>
				<DiceCard value={value} rolling={rolling} />
				<Controls
					rolling={rolling}
					roll={roll}
					roomCode={roomCode}
					setRoomCode={setRoomCode}
					addQuestion={addQuestion}
					playerName={''} 
					setPlayerName={() => {}} 
				/>
			</Box>

			<Paper className='flex-1 max-h-[80vh] overflow-auto p-2 bg-neutral-900 text-white w-full md:w-auto flex flex-col gap-2'>
				<QuestionList
					value={value}
					itemRefs={itemRefs}
					excluded={excluded}
					toggleExclude={toggleExclude}
					removeQuestion={removeQuestion}
					customQuestions={customQuestions}
					claimedBy={claimedBy}
					playerId={playerId}
				/>
			</Paper>
		</Container>
	)
}

export default Page
