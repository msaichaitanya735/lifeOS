import { clsx } from 'clsx'
import { Category, BlockStatus } from '@/lib/types'

type BadgeColor = 'indigo' | 'green' | 'yellow' | 'red' | 'gray' | 'blue' | 'purple' | 'orange'

const COLOR_MAP: Record<BadgeColor, string> = {
  indigo: 'bg-indigo-500/20 text-indigo-300 ring-indigo-500/30',
  green:  'bg-green-500/20 text-green-300 ring-green-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-300 ring-yellow-500/30',
  red:    'bg-red-500/20 text-red-300 ring-red-500/30',
  gray:   'bg-gray-500/20 text-gray-300 ring-gray-500/30',
  blue:   'bg-blue-500/20 text-blue-300 ring-blue-500/30',
  purple: 'bg-purple-500/20 text-purple-300 ring-purple-500/30',
  orange: 'bg-orange-500/20 text-orange-300 ring-orange-500/30',
}

export const CATEGORY_COLOR: Record<Category, BadgeColor> = {
  job:      'blue',
  leetcode: 'indigo',
  skills:   'purple',
  gym:      'green',
  admin:    'gray',
  personal: 'orange',
}

export const STATUS_COLOR: Record<BlockStatus, BadgeColor> = {
  planned: 'gray',
  active:  'yellow',
  done:    'green',
  skipped: 'red',
}

interface BadgeProps {
  label: string
  color?: BadgeColor
  category?: Category
  status?: BlockStatus
  className?: string
}

export default function Badge({ label, color, category, status, className }: BadgeProps) {
  const resolvedColor =
    color ?? (category ? CATEGORY_COLOR[category] : status ? STATUS_COLOR[status] : 'gray')

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        COLOR_MAP[resolvedColor],
        className
      )}
    >
      {label}
    </span>
  )
}
