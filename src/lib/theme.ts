'use client'

import { createTheme } from '@mui/material/styles'

export const darkTheme = createTheme({
	palette: {
		mode: 'dark',
		background: {
			default: '#0a0a0a', // tło strony
			paper: '#171717', // tło np. Paper, Card
		},
		text: {
			primary: '#ededed',
			secondary: '#9ca3af',
		},
		primary: {
			main: '#3b82f6', // niebieski (tailwind blue-500)
		},
	},
})
