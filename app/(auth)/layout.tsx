export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">LifeOS</h1>
          <p className="mt-1 text-sm text-gray-400">Daily discipline, systematized.</p>
        </div>
        {children}
      </div>
    </div>
  )
}
