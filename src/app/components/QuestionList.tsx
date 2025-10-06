'use client'

import { forwardRef } from 'react'
import { List, ListItem, ListItemText, Checkbox, IconButton, Typography } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { questions, QuestionCategory } from '../data/questions'

type QuestionListProps = {
	value: number | null
	itemRefs: React.MutableRefObject<(HTMLLIElement | null)[]>
	excluded: Set<number>
	toggleExclude: (index: number) => void
	customQuestions?: string[]
	removeQuestion?: (index: number) => void
}


export const QuestionList = forwardRef<HTMLUListElement, QuestionListProps>(
	({ value, itemRefs, excluded, toggleExclude, customQuestions = [], removeQuestion }, ref) => {
		let counter = 0
		const allCategories: QuestionCategory[] = [...questions, { category: 'Custom Questions', items: customQuestions }]

		return (
			<List ref={ref}>
				{allCategories.map((cat, ci) => (
					<div key={ci}>
						{/* 🔹 Nagłówek kategorii */}
						<Typography variant='subtitle2' className='text-gray-400 font-bold mt-2 mb-1'>
							{cat.category}
						</Typography>

						{cat.items.map((q, i) => {
							counter++
							const isSelected = value === counter
							const isExcluded = excluded.has(counter)
							const isCustom = ci === allCategories.length - 1 // ostatnia kategoria = custom

							return (
								<ListItem
									key={`${ci}-${i}`}
									ref={el => {
										itemRefs.current[counter - 1] = el
									}}
									className={`
                    flex items-center gap-2 rounded-md group
                    ${isSelected ? 'bg-blue-500/20 text-blue-400' : ''}
                  `}
									sx={{ py: 0 }}
									secondaryAction={
										isCustom ? (
											<IconButton
												edge='end'
												aria-label='delete'
												onClick={() => removeQuestion && removeQuestion(counter - 1)}
												className='opacity-0 group-hover:opacity-100 transition'>
												<DeleteIcon className='text-red-400 hover:text-red-600' />
											</IconButton>
										) : undefined
									}>
									<Checkbox
										edge='start'
										checked={isExcluded}
										onChange={() => toggleExclude(counter)}
										sx={{ p: 0, mr: 1 }}
									/>
									<ListItemText
										primary={`${counter}. ${q}`}
										slotProps={{
											primary: {
												className: `
                          text-sm
                          ${isExcluded ? 'text-gray-600 line-through' : 'text-gray-300'}
                          ${isSelected ? 'font-bold' : ''}
                        `,
											},
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
