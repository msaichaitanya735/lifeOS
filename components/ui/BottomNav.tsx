'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, ClipboardList, BarChart2, Settings } from 'lucide-react'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { href: '/',         label: 'Focus',    Icon: Home },
  { href: '/plan',     label: 'Plan',     Icon: CalendarDays },
  { href: '/log',      label: 'Log',      Icon: ClipboardList },
  { href: '/stats',    label: 'Stats',    Icon: BarChart2 },
  { href: '/settings', label: 'Settings', Icon: Settings },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch bg-gray-900 border-t border-gray-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            aria-label={label}
            className={clsx(
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset',
              active ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'
            )}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.5} aria-hidden="true" />
            <span className="font-medium">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
