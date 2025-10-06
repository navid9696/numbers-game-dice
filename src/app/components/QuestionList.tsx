'use client'

import { forwardRef } from 'react'
import { List, ListItem, ListItemText, Checkbox, Typography } from '@mui/material'
import { questions, QuestionCategory } from '../data/questions'

type QuestionListProps = {
	value: number | null
	itemRefs: React.MutableRefObject<(HTMLLIElement | null)[]>
	excluded: Set<number>
	toggleExclude: (index: number) => void
	customQuestions?: string[]
	removeQuestion?: (index: number) => void
	claimedBy: Record<number, string[]>
	playerId: string
	playerName: string 
}

export const QuestionList = forwardRef<HTMLUListElement, QuestionListProps>(
	({ value, itemRefs, excluded, toggleExclude, customQuestions = [], claimedBy, playerId, playerName }, ref) => {
		let counter = 0
		const allCategories: QuestionCategory[] = [...questions, { category: 'Custom Questions', items: customQuestions }]

		return (
			<List ref={ref}>
				{allCategories.map((cat, ci) => (
					<div key={ci}>
						<Typography variant='subtitle2' className='text-gray-400 font-bold mt-2 mb-1'>
							{cat.category}
						</Typography>

						{cat.items.map((q, i) => {
							counter++
							const idx = counter
							const isSelected = value === idx
							const isExcluded = excluded.has(idx) 
							const takers = claimedBy[idx] || [] 
							const taken = takers.length > 0
							const isMine = takers.includes(playerName) 

							return (
								<ListItem
									key={`${ci}-${i}`}
									ref={el => {
										itemRefs.current[idx - 1] = el
									}}
									className={`flex items-center gap-2 rounded-md group ${
										isSelected ? 'bg-blue-500/20 text-blue-400' : ''
									}`}
									sx={{ py: 0 }}>
									<Checkbox
										edge='start'
										checked={isExcluded}
										onChange={() => toggleExclude(idx)}
										sx={{ p: 0, mr: 1 }}
									/>
									<ListItemText
										primary={`${idx}. ${q}`}
										secondary={taken ? `Taken by: ${takers.join(', ')}` : undefined}
										slotProps={{
											primary: {
												className: `
                          text-sm
                          ${isMine ? 'line-through text-gray-600' : 'text-gray-300'}
                          ${isSelected ? 'font-bold' : ''}
                        `,
											},
											secondary: { className: 'text-xs text-yellow-400' },
										}}
									/>
								</ListItem>
							)
						})}
					</div>
				))}
			</List>
		)
	}
)

QuestionList.displayName = 'QuestionList'
