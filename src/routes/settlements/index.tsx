import { useState, useEffect } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { api, auth } from '~/lib/api-client'

export const Route = createFileRoute('/settlements/')({
  component: SettlementsPage,
})

function SettlementsPage() {
  const router = useRouter()
  const [settlements, setSettlements] = useState<any[]>([])
  const [friends, setFriends] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [payeeId, setPayeeId] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!auth.isLoggedIn()) { router.navigate({ to: '/login' }); return }
    loadData()
  }, [])

  const loadData = () => {
    Promise.all([
      api.get('/api/settlements'),
      api.get('/api/friends'),
    ]).then(([s, f]) => {
      setSettlements(s.settlements || [])
      setFriends(f.friends || [])
      if (f.friends?.length && !payeeId) setPayeeId(f.friends[0].id)
    }).finally(() => setLoading(false))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/api/settlements', {
        payeeId,
        amount: parseFloat(amount),
        note: note || undefined,
      })
      setAmount('')
      setNote('')
      setShowForm(false)
      setLoading(true)
      loadData()
    } catch {}
    setSubmitting(false)
  }

  const user = auth.getUser()

  if (loading) return <div className="loading">Loading...</div>

  return (
    <div className="container">
      <div className="page-header">
        <h1>Settlements</h1>
        <button className="btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Record Payment'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-title">Record a Payment</div>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Pay to</label>
              <select value={payeeId} onChange={(e) => setPayeeId(e.target.value)}>
                {friends.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.name || 'Unknown'}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Amount (PHP)</label>
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Note (optional)</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. GCash transfer" />
            </div>
            <button className="btn" type="submit" disabled={submitting || !payeeId}>
              {submitting ? 'Recording...' : 'Record Payment'}
            </button>
          </form>
        </div>
      )}

      {settlements.length === 0 ? (
        <div className="card"><p style={{ color: 'var(--text-muted)' }}>No settlements yet</p></div>
      ) : (
        <div className="card">
          {settlements.map((s: any) => {
            const isPayer = s.payer?.id === user?.id
            return (
              <div key={s.id} className="list-item">
                <div>
                  <div style={{ fontWeight: 500 }}>
                    {isPayer ? `You paid ${s.payee?.name || 'Unknown'}` : `${s.payer?.name || 'Unknown'} paid you`}
                  </div>
                  <div className="expense-meta">
                    {s.note && <>{s.note} &middot; </>}
                    {new Date(s.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className={isPayer ? 'negative' : 'positive'} style={{ fontWeight: 600 }}>
                  PHP {parseFloat(s.amount).toFixed(2)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
