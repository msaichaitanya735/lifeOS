'use client'

import { useEffect, useState } from 'react'
import { Bell, LogOut, Target, Smartphone } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Profile, NotificationPrefs, DailyTargets } from '@/lib/types'

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [targets, setTargets] = useState<DailyTargets>({ job_apps: 25, leetcode: 2, gym_days_per_week: 5, skills_blocks: 1 })
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    job: true, leetcode: true, skills: true, gym: true, end_of_day: true, end_of_day_time: '21:00', block_reminder_minutes: 5,
  })
  const [saving, setSaving] = useState(false)
  const [pushStatus, setPushStatus] = useState<'idle' | 'requesting' | 'subscribed' | 'error'>('idle')
  const [testStatus, setTestStatus] = useState('')

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setTargets(data.daily_targets)
        setNotifPrefs(data.notification_prefs)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').update({ daily_targets: targets, notification_prefs: notifPrefs, updated_at: new Date().toISOString() }).eq('id', user.id)
    setSaving(false)
  }

  async function subscribePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('error')
      return
    }
    setPushStatus('requesting')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      })
      setPushStatus(res.ok ? 'subscribed' : 'error')
    } catch {
      setPushStatus('error')
    }
  }

  async function testPush() {
    setTestStatus('sending…')
    const res = await fetch('/api/push/test', { method: 'POST' })
    const d = await res.json()
    setTestStatus(res.ok ? `Sent to ${d.sent} endpoint(s)` : `Error: ${d.error}`)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="px-4 pt-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        {profile && <p className="text-xs text-gray-500 mt-0.5">Timezone: {profile.timezone}</p>}
      </div>

      {/* Daily targets */}
      <Card>
        <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Target size={16} className="text-indigo-400" /> Daily Targets
        </h2>
        <div className="space-y-3">
          {[
            { key: 'job_apps', label: 'Job apps / day' },
            { key: 'leetcode', label: 'LeetCode problems / day' },
            { key: 'gym_days_per_week', label: 'Gym days / week' },
            { key: 'skills_blocks', label: 'Skills blocks / day' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <label className="text-sm text-gray-300">{label}</label>
              <input
                type="number"
                min={0}
                max={100}
                value={targets[key as keyof DailyTargets]}
                onChange={(e) => setTargets({ ...targets, [key]: Number(e.target.value) })}
                className="w-20 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1 text-white text-sm text-right focus:outline-none"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Notifications */}
      <Card>
        <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Bell size={16} className="text-yellow-400" /> Notifications
        </h2>
        <div className="space-y-3">
          {(['job', 'leetcode', 'skills', 'gym', 'end_of_day'] as const).map((key) => (
            <div key={key} className="flex items-center justify-between">
              <label className="text-sm text-gray-300 capitalize">{key.replace('_', ' ')}</label>
              <button
                onClick={() => setNotifPrefs({ ...notifPrefs, [key]: !notifPrefs[key] })}
                className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${notifPrefs[key] ? 'bg-indigo-600' : 'bg-gray-700'}`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${notifPrefs[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">EOD time</label>
            <input
              type="time"
              value={notifPrefs.end_of_day_time}
              onChange={(e) => setNotifPrefs({ ...notifPrefs, end_of_day_time: e.target.value })}
              className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1 text-white text-sm focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">Block reminder (min)</label>
            <input
              type="number"
              min={0}
              max={30}
              value={notifPrefs.block_reminder_minutes}
              onChange={(e) => setNotifPrefs({ ...notifPrefs, block_reminder_minutes: Number(e.target.value) })}
              className="w-16 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1 text-white text-sm text-right focus:outline-none"
            />
          </div>
        </div>
        <Button size="md" loading={saving} onClick={saveProfile} className="w-full mt-4">Save Settings</Button>
      </Card>

      {/* Push */}
      <Card>
        <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Smartphone size={16} className="text-green-400" /> Push Notifications
        </h2>
        <div className="space-y-2">
          {pushStatus === 'subscribed' ? (
            <p className="text-sm text-green-400">Device subscribed!</p>
          ) : (
            <Button size="md" variant="secondary" loading={pushStatus === 'requesting'} onClick={subscribePush} className="w-full">
              Enable Push on This Device
            </Button>
          )}
          {pushStatus === 'error' && <p className="text-xs text-red-400">Push not supported or permission denied.</p>}
          <Button size="sm" variant="ghost" onClick={testPush} className="w-full">Send Test Notification</Button>
          {testStatus && <p className="text-xs text-gray-400 text-center">{testStatus}</p>}
        </div>
      </Card>

      {/* Logout */}
      <Card>
        <Button variant="danger" size="md" onClick={logout} className="w-full">
          <LogOut size={16} /> Sign Out
        </Button>
      </Card>
    </div>
  )
}
