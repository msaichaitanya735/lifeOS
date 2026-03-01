import BottomNav from '@/components/ui/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-950">
      <main id="main-content" className="flex-1 overflow-y-auto pb-safe scrollbar-none">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
