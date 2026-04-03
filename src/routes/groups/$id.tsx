import { useState, useEffect } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { api, auth } from '~/lib/api-client'

export const Route = createFileRoute('/groups/$id')({
  component: GroupDetailPage,
})

function GroupDetailPage() {
  const { id } = Route.useParams()
  const router = useRouter()
  const [group, setGroup] = useState<any>(null)
  const [expenses, setExpenses] = useState<any[]>([])
  const [balances, setBalances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [paidById, setPaidById] = useState('')
  const [splitWith, setSplitWith] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [allFriends, setAllFriends] = useState<any[]>([])
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [addingMembers, setAddingMembers] = useState(false)

  useEffect(() => {
    if (!auth.isLoggedIn()) { router.navigate({ to: '/login' }); return }
    loadData()
  }, [id])

  const loadData = () => {
    Promise.all([
      api.get(`/api/groups/${id}`),
      api.get(`/api/groups/${id}/expenses`),
      api.get(`/api/groups/${id}/balances`),
      api.get('/api/friends'),
    ]).then(([g, e, b, f]) => {
      setGroup(g.group)
      setExpenses(e.expenses || [])
      setBalances(b.balances || [])
      setAllFriends(f.friends || [])
      if (g.group?.members?.length && !paidById) {
        const user = auth.getUser()
        setPaidById(user?.id || g.group.members[0].user?.id || g.group.members[0].id)
        setSplitWith(g.group.members.map((m: any) => m.user?.id || m.id))
      }
    }).finally(() => setLoading(false))
  }

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post(`/api/groups/${id}/expenses`, {
        description: desc,
        amount: parseFloat(amount),
        paidById,
        splitWith,
        splitType: 'EQUAL',
      })
      setDesc('')
      setAmount('')
      setShowExpenseForm(false)
      setLoading(true)
      loadData()
    } catch {}
    setSubmitting(false)
  }

  const toggleSplit = (userId: string) => {
    setSplitWith((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  const toggleSelectedFriend = (userId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  const handleAddMembers = async () => {
    if (selectedFriends.length === 0) return
    setAddingMembers(true)
    try {
      await api.post(`/api/groups/${id}/members`, { userIds: selectedFriends })
      setSelectedFriends([])
      setShowAddMembers(false)
      setLoading(true)
      loadData()
    } catch {}
    setAddingMembers(false)
  }

  const memberIds = new Set((group?.members || []).map((m: any) => m.user?.id || m.id))
  const availableFriends = allFriends.filter((f: any) => f.friend?.id && !memberIds.has(f.friend.id))

  if (loading) return <div className="loading">Loading...</div>
  if (!group) return <div className="container"><p>Group not found</p></div>

  const members = group.members || []

  return (
    <div className="container">
      <div className="page-header">
        <h1>{group.name}</h1>
        <button className="btn" onClick={() => setShowExpenseForm(!showExpenseForm)}>
          {showExpenseForm ? 'Cancel' : '+ Add Expense'}
        </button>
      </div>

      {showExpenseForm && (
        <div className="card">
          <div className="card-title">New Expense</div>
          <form onSubmit={handleAddExpense}>
            <div className="form-group">
              <label>Description</label>
              <input value={desc} onChange={(e) => setDesc(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Amount (PHP)</label>
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Paid by</label>
              <select value={paidById} onChange={(e) => setPaidById(e.target.value)}>
                {members.map((m: any) => (
                  <option key={m.user?.id || m.id} value={m.user?.id || m.id}>
                    {m.user?.name || m.name || 'Unknown'}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Split with</label>
              <div className="checkbox-list">
                {members.map((m: any) => {
                  const uid = m.user?.id || m.id
                  return (
                    <label key={uid}>
                      <input
                        type="checkbox"
                        checked={splitWith.includes(uid)}
                        onChange={() => toggleSplit(uid)}
                      />
                      {m.user?.name || m.name || 'Unknown'}
                    </label>
                  )
                })}
              </div>
            </div>
            <button className="btn" type="submit" disabled={submitting || splitWith.length === 0}>
              {submitting ? 'Adding...' : 'Add Expense'}
            </button>
          </form>
        </div>
      )}

      <div className="section-title">Members</div>
      <div className="card">
        <div className="member-chips">
          {members.map((m: any) => (
            <span key={m.user?.id || m.id} className="chip">
              {m.user?.name || m.name || 'Unknown'} {m.role === 'ADMIN' ? '(admin)' : ''}
            </span>
          ))}
        </div>
        {availableFriends.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {!showAddMembers ? (
              <button className="btn btn-sm" onClick={() => setShowAddMembers(true)}>
                + Add Members
              </button>
            ) : (
              <div>
                <div className="checkbox-list">
                  {availableFriends.map((f: any) => (
                    <label key={f.friend.id}>
                      <input
                        type="checkbox"
                        checked={selectedFriends.includes(f.friend.id)}
                        onChange={() => toggleSelectedFriend(f.friend.id)}
                      />
                      {f.localName || f.friend.name || f.friend.email}
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    className="btn btn-sm"
                    onClick={handleAddMembers}
                    disabled={addingMembers || selectedFriends.length === 0}
                  >
                    {addingMembers ? 'Adding...' : `Add ${selectedFriends.length} friend${selectedFriends.length !== 1 ? 's' : ''}`}
                  </button>
                  <button className="btn btn-sm btn-outline" onClick={() => { setShowAddMembers(false); setSelectedFriends([]) }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="section-title">Balances</div>
      <div className="card">
        {balances.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No balances yet</p>
        ) : (
          balances.map((b: any) => (
            <div key={b.user?.id} className="list-item">
              <span>{b.user?.name || 'Unknown'}</span>
              <span className={b.balance >= 0 ? 'positive' : 'negative'} style={{ fontWeight: 600 }}>
                PHP {Math.abs(b.balance).toFixed(2)}
                <span style={{ fontWeight: 400, fontSize: 13 }}>
                  {' '}{b.balance >= 0 ? 'gets back' : 'owes'}
                </span>
              </span>
            </div>
          ))
        )}
      </div>

      <div className="section-title">Expenses</div>
      {expenses.length === 0 ? (
        <div className="card"><p style={{ color: 'var(--text-muted)' }}>No expenses yet</p></div>
      ) : (
        <div className="card">
          {expenses.map((exp: any) => (
            <div key={exp.id} className="expense-item">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div className="expense-desc">{exp.description}</div>
                  <div className="expense-meta">
                    Paid by {exp.paidBy?.name || 'Unknown'} &middot;{' '}
                    Split {exp.splits?.length || 0} way{exp.splits?.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                  PHP {parseFloat(exp.amount).toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
