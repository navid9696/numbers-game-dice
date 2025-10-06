'use client'

import { forwardRef, Fragment } from 'react'
import { List, ListItem, ListItemText, Checkbox, IconButton, ListSubheader } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { questions } from '../data/questions'

type QuestionListProps = {
	value: number | null
	itemRefs: React.MutableRefObject<(HTMLLIElement | null)[]>
	excluded: Set<number>
	toggleExclude: (index: number) => void
	customQuestions?: string[]
	removeQuestion?: (index: number) => void
	claimedBy: Record<number, string[]>
	playerId: string
}

export const QuestionList = forwardRef<HTMLUListElement, QuestionListProps>(
	({ value, itemRefs, excluded, toggleExclude, customQuestions = [], removeQuestion, claimedBy, playerId }, ref) => {
		const baseLen = questions.flatMap(c => c.items).length

	
		let offset = 0
		const groups: Array<{ title: string; items: Array<{ idx: number; text: string; isCustom: boolean }> }> = [
			...questions.map(cat => {
				const start = offset
				const items = cat.items.map((text, i) => ({
					idx: start + i + 1,
					text,
					isCustom: false,
				}))
				offset += cat.items.length
				return { title: cat.category, items }
			}),
			{
				title: 'Custom Questions',
				items: customQuestions.map((text, i) => ({
					idx: baseLen + i + 1,
					text,
					isCustom: true,
				})),
			},
		]

		return (
			<List ref={ref}>
				{groups.map(g => (
					<Fragment key={`grp-${g.title}`}>
						<ListSubheader disableSticky className='!bg-transparent !text-gray-400 !font-bold'>
							{g.title}
						</ListSubheader>

						{g.items.map(({ idx, text, isCustom }) => {
							const isSelected = value === idx
							const isExcluded = excluded.has(idx)
							const players = claimedBy[idx] || []
							const taken = players.length > 0
							const isMine = players.includes(playerId)

							return (
								<ListItem
									key={`item-${idx}`}
									ref={el => {
										itemRefs.current[idx - 1] = el
									}}
									className={`flex items-center gap-2 rounded-md group ${
										isSelected ? 'bg-blue-500/20 text-blue-400' : ''
									}`}
									sx={{ py: 0 }}
									secondaryAction={
										<div className='flex items-center gap-2'>
											{taken && <span className='text-xs opacity-80'>{players.length} taken</span>}
											{isCustom && removeQuestion && (
												<IconButton
													edge='end'
													aria-label='delete'
													onClick={() => removeQuestion(idx - 1)}
													className='opacity-0 group-hover:opacity-100 transition'>
													<DeleteIcon className='text-red-400 hover:text-red-600' />
												</IconButton>
											)}
										</div>
									}>
									<Checkbox
										edge='start'
										checked={isExcluded}
										onChange={() => toggleExclude(idx)} 
										sx={{ p: 0, mr: 1 }}
									/>
									<ListItemText
										primary={`${idx}. ${text}`}
										secondary={taken ? 'taken' : undefined}
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
								</ListItem>
							)
						})}
					</Fragment>
				))}
			</List>
		)
	}
)

QuestionList.displayName = 'QuestionList'
