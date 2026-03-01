import { clsx } from 'clsx'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  glass?: boolean
}

export default function Card({ children, className, glass, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl border p-4',
        glass
          ? 'bg-white/5 border-white/10 backdrop-blur-sm'
          : 'bg-gray-900 border-gray-800',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
