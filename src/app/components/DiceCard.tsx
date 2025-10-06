'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, Box, Typography } from '@mui/material'
import { keyframes } from '@mui/system'

type DiceCardProps = {
	value: number | null
	rolling: boolean
	max: number
}

const shake = keyframes`
  0% { transform: translate3d(0,0,0) rotate(0deg) }
  25% { transform: translate3d(1px,-2px,0) rotate(-.3deg) }
  50% { transform: translate3d(-1px,1px,0) rotate(.3deg) }
  75% { transform: translate3d(1px,2px,0) rotate(-.2deg) }
  100% { transform: translate3d(0,0,0) rotate(0deg) }
`

const spin = keyframes`
  0% { transform: translateY(0) }
  100% { transform: translateY(-640px) }
`

export const DiceCard = ({ value, rolling, max }: DiceCardProps) => {
	const [preview, setPreview] = useState<number | null>(value)
	const [digits, setDigits] = useState<string[]>([])
	const intervalRef = useRef<number | null>(null)
	const pad = useMemo(() => String(Math.max(1, max)).length, [max])

	useEffect(() => {
		if (rolling) {
			if (intervalRef.current) clearInterval(intervalRef.current)
			intervalRef.current = window.setInterval(() => {
				const n = Math.floor(Math.random() * max) + 1
				setPreview(n)
			}, 260) as unknown as number
		} else {
			if (intervalRef.current) {
				clearInterval(intervalRef.current)
				intervalRef.current = null
			}
			setPreview(value)
		}
	}, [rolling, value, max])

	useEffect(() => {
		const s = preview == null ? ''.padStart(pad, '-') : String(preview).padStart(pad, '0')
		setDigits(s.split(''))
	}, [preview, pad])

	return (
		<Card
			elevation={8}
			sx={{
				width: 224,
				height: 224,
				borderRadius: 3,
				overflow: 'hidden',
				transform: rolling ? 'scale(1.05)' : 'scale(1)',
				transition: 'transform .3s',
				bgcolor: 'grey.900',
				position: 'relative',
			}}>
			<Box
				sx={{
					position: 'absolute',
					inset: 0,
					borderRadius: 3,
					background: 'radial-gradient(120% 120% at 20% 15%, rgba(255,255,255,.08), rgba(17,24,39,1))',
				}}
			/>
			<Box
				sx={{ position: 'absolute', inset: 0, borderRadius: 3, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}
			/>
			<Box
				sx={{
					position: 'absolute',
					inset: -24,
					borderRadius: 5,
					filter: 'blur(24px)',
					opacity: rolling ? 0.8 : 0.4,
					background: 'radial-gradient(60% 60% at 30% 20%, rgba(59,130,246,.25), transparent)',
				}}
			/>
			<CardContent sx={{ p: 0, width: 1, height: 1, display: 'grid', placeItems: 'center' }}>
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						gap: 1,
						animation: rolling ? `${shake} 900ms cubic-bezier(.2,.8,.2,1) infinite` : 'none',
					}}>
					{digits.length === 0 ? (
						<Typography variant='h3' fontWeight={800} color='rgba(255,255,255,.6)'>
							--
						</Typography>
					) : (
						<DigitReels digits={digits} rolling={rolling} />
					)}
				</Box>
			</CardContent>
		</Card>
	)
}

const DigitReels = ({ digits, rolling }: { digits: string[]; rolling: boolean }) => {
	const cell = 64
	return (
		<Box sx={{ display: 'flex' }}>
			{digits.map((d, i) => (
				<DigitColumn
					key={`${i}-${d}-${rolling ? 'r' : 's'}`}
					digit={d}
					cell={cell}
					speed={600 + i * 120}
					rolling={rolling}
				/>
			))}
		</Box>
	)
}

const DigitColumn = ({
	digit,
	cell,
	speed,
	rolling,
}: {
	digit: string
	cell: number
	speed: number
	rolling: boolean
}) => {
	const list = useMemo(() => Array.from({ length: 20 }, (_, i) => String(i % 10)), [])
	const target = /^\d$/.test(digit) ? Number(digit) : 0
	const offset = -(target * cell)
	return (
		<Box
			sx={{
				position: 'relative',
				overflow: 'hidden',
				borderRadius: 1.25,
				bgcolor: 'rgba(255,255,255,.06)',
				boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)',
				width: 44,
				height: cell + 8,
				p: 0.5,
			}}>
			<Box
				sx={{
					willChange: 'transform',
					animation: rolling ? `${spin} var(--spd) linear infinite` : 'none',
					transform: rolling ? undefined : `translateY(${offset}px)`,
					transition: rolling ? undefined : 'transform 420ms cubic-bezier(.2,.8,.2,1)',
				}}
				style={{ ['--spd' as const]: `${speed}ms` } as React.CSSProperties}>
				{list.map((n, i) => (
					<Box key={i} sx={{ height: cell, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
						<Typography sx={{ fontSize: 40, fontWeight: 800, lineHeight: 1, color: '#fff' }}>{n}</Typography>
					</Box>
				))}
			</Box>
			{!rolling && (
				<Box
					sx={{
						pointerEvents: 'none',
						position: 'absolute',
						inset: 0,
						borderRadius: 1.25,
						boxShadow: 'inset 0 18px 24px -18px rgba(0,0,0,.5), inset 0 -18px 24px -18px rgba(0,0,0,.5)',
					}}
				/>
			)}
		</Box>
	)
}
