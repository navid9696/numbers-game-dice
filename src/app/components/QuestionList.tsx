'use client'

import { forwardRef } from 'react'
import { List, ListItem, ListItemText, Checkbox, Typography, IconButton } from '@mui/material'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import { questions, QuestionCategory } from '../data/questions'

type QuestionListProps = {
	value: number | null
	itemRefs: React.RefObject<(HTMLLIElement | null)[]>
	excluded: Set<number>
	excludedBy: Record<number, string[]>
	toggleExclude: (index: number) => void
	customQuestions?: string[]
	removeQuestion?: (index: number) => void
	claimedBy: Record<number, string[]>
	playerId: string
	playerName: string
}

export const QuestionList = forwardRef<HTMLUListElement, QuestionListProps>(
	({ value, itemRefs, excluded, excludedBy, toggleExclude, customQuestions = [], removeQuestion, claimedBy }, ref) => {
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
							const excludedNames = excludedBy[idx] || []
							const infos: string[] = []
							if (takers.length) infos.push(`Taken by: ${takers.join(', ')}`)
							if (excludedNames.length) infos.push(`Excluded by: ${excludedNames.join(', ')}`)
							const secondary = infos.length ? infos.join(' · ') : undefined
							const isCustom = cat.category === 'Custom Questions'

							return (
								<ListItem
									key={`${ci}-${i}`}
									ref={el => {
										itemRefs.current[idx - 1] = el
									}}
									className={`rounded-md ${isSelected ? 'bg-blue-500/20 text-blue-400' : ''} ${
										isExcluded ? 'opacity-60' : ''
									}`}
									sx={{ py: 0, px: 3 }}>
									<div className='flex items-center gap-2 w-full'>
										<Checkbox
											edge='start'
											checked={isExcluded}
											onChange={() => toggleExclude(idx)}
											sx={{ p: 0, mr: 1 }}
										/>
										<ListItemText
											primary={`${idx}. ${q}`}
											secondary={secondary}
											slotProps={{
												primary: {
													className: `
                            text-sm
                            ${isExcluded ? 'line-through text-gray-600' : 'text-gray-300'}
                            ${isSelected ? 'font-bold' : ''}
                          `,
												},
												secondary: { className: 'text-xs text-yellow-400' },
											}}
										/>
										{isCustom && removeQuestion && (
											<IconButton
												edge='end'
												size='small'
												aria-label='remove'
												onClick={e => {
													e.stopPropagation()
													removeQuestion(idx - 1)
												}}>
												<DeleteOutline className='text-red-500' fontSize='small' />
											</IconButton>
										)}
									</div>
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
