import { useState, useEffect } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { api, auth } from '~/lib/api-client'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const router = useRouter()
  const [summary, setSummary] = useState<any>(null)
  const [activity, setActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auth.isLoggedIn()) {
      router.navigate({ to: '/login' })
      return
    }
    Promise.all([
      api.get('/api/balances/summary'),
      api.get('/api/activity?limit=10'),
    ]).then(([s, a]) => {
      setSummary(s)
      setActivity(a.activity || [])
    }).catch(() => {
      router.navigate({ to: '/login' })
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Loading...</div>

  const user = auth.getUser()

  return (
    <div className="container">
      <div className="page-header">
        <h1>Hi, {user?.name || 'there'}</h1>
      </div>

      {summary && (
        <div className="stats-grid">
          <div className="card">
            <div className="card-title">You are owed</div>
            <div className="positive" style={{ fontSize: 24, fontWeight: 700 }}>
              {summary.currency} {summary.totalOwedToYou?.toFixed(2) || '0.00'}
            </div>
          </div>
          <div className="card">
            <div className="card-title">You owe</div>
            <div className="negative" style={{ fontSize: 24, fontWeight: 700 }}>
              {summary.currency} {summary.totalYouOwe?.toFixed(2) || '0.00'}
            </div>
          </div>
          <div className="card">
            <div className="card-title">Net balance</div>
            <div className={summary.netBalance >= 0 ? 'positive' : 'negative'} style={{ fontSize: 24, fontWeight: 700 }}>
              {summary.currency} {Math.abs(summary.netBalance)?.toFixed(2) || '0.00'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{summary.label}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 16 }}>
        <Link to="/groups" className="btn btn-outline">Groups</Link>
        <Link to="/friends" className="btn btn-outline">Friends</Link>
        <Link to="/settlements" className="btn btn-outline">Settlements</Link>
      </div>

      <div className="section-title">Recent Activity</div>
      {activity.length === 0 ? (
        <div className="card"><p style={{ color: 'var(--text-muted)' }}>No recent activity</p></div>
      ) : (
        <div className="card">
          {activity.map((item: any) => (
            <div key={item.id} className="expense-item">
              <div className="expense-desc">{item.description}</div>
              <div className="expense-meta">
                {item.paidBy?.name || 'Someone'} paid {item.amount} &middot; {item.group?.name || ''}
                {item.summary?.type === 'you_paid' && (
                  <span className="positive"> &middot; You get back {item.summary.youGet?.toFixed(2)}</span>
                )}
                {item.summary?.type === 'you_owe' && (
                  <span className="negative"> &middot; You owe {item.summary.youOwe?.toFixed(2)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
