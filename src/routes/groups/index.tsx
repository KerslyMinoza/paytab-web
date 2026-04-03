import { useState, useEffect } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { api, auth } from '~/lib/api-client'

export const Route = createFileRoute('/groups/')({
  component: GroupsPage,
})

function GroupsPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!auth.isLoggedIn()) { router.navigate({ to: '/login' }); return }
    loadGroups()
  }, [])

  const loadGroups = () => {
    api.get('/api/groups').then((d) => setGroups(d.groups || [])).finally(() => setLoading(false))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await api.post('/api/groups', { name, memberIds: [] })
      setName('')
      setShowForm(false)
      setLoading(true)
      loadGroups()
    } catch {}
    setCreating(false)
  }

  if (loading) return <div className="loading">Loading...</div>

  return (
    <div className="container">
      <div className="page-header">
        <h1>Groups</h1>
        <button className="btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Group'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Group name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <button className="btn" type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create Group'}
            </button>
          </form>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="card"><p style={{ color: 'var(--text-muted)' }}>No groups yet. Create one to get started!</p></div>
      ) : (
        groups.map((group) => (
          <Link key={group.id} to="/groups/$id" params={{ id: group.id }} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card" style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="card-title">{group.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {group.members?.length || 0} member{group.members?.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={group.balance >= 0 ? 'positive' : 'negative'} style={{ fontWeight: 600 }}>
                    PHP {Math.abs(group.balance).toFixed(2)}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{group.balanceLabel}</div>
                </div>
              </div>
            </div>
          </Link>
        ))
      )}
    </div>
  )
}
