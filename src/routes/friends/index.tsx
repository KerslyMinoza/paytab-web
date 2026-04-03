import { useState, useEffect } from 'react';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { api, auth } from '~/lib/api-client';

export const Route = createFileRoute('/friends/')({
  component: FriendsPage,
});

function FriendsPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [localName, setLocalName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');

  useEffect(() => {
    if (!auth.isLoggedIn()) {
      router.navigate({ to: '/login' });
      return;
    }
    loadData();
  }, []);

  const loadData = () => {
    Promise.all([api.get('/api/friends'), api.get('/api/friends/pending')])
      .then(([f, p]) => {
        setFriends(f.friends || []);
        setPendingInvites(f.pendingInvites || []);
        setPendingRequests(p.requests || []);
      })
      .finally(() => setLoading(false));
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteMsg('');
    try {
      await api.post('/api/friends/invite', { email, localName: localName || undefined });
      setEmail('');
      setLocalName('');
      setInviteMsg('Invite sent!');
      setLoading(true);
      loadData();
    } catch (err: any) {
      setInviteMsg(err.message);
    }
    setInviting(false);
  };

  const handleAccept = async (friendshipId: string) => {
    try {
      await api.post('/api/friends/accept', { friendshipId });
      setLoading(true);
      loadData();
    } catch {}
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="container">
      <div className="page-header">
        <h1>Friends</h1>
      </div>

      <div className="card">
        <div className="card-title">Invite a friend</div>
        <form onSubmit={handleInvite} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@email.com"
            required
            style={{
              flex: 2,
              minWidth: 180,
              padding: '8px 12px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
            }}
          />
          <input
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            placeholder="Nickname (optional)"
            style={{
              flex: 1,
              minWidth: 120,
              padding: '8px 12px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
            }}
          />
          <button className="btn" type="submit" disabled={inviting}>
            {inviting ? '...' : 'Invite'}
          </button>
        </form>
        {inviteMsg && <p style={{ marginTop: 8, fontSize: 13 }}>{inviteMsg}</p>}
      </div>

      {pendingRequests.length > 0 && (
        <>
          <div className="section-title">Pending Requests</div>
          <div className="card">
            {pendingRequests.map((req: any) => (
              <div key={req.friendshipId} className="list-item">
                <div>
                  <div style={{ fontWeight: 500 }}>
                    {req.inviter?.name || 'Unknown'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Wants to be your friend
                  </div>
                </div>
                <button
                  className="btn btn-sm"
                  onClick={() => handleAccept(req.friendshipId)}
                >
                  Accept
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {pendingInvites.length > 0 && (
        <>
          <div className="section-title">Sent Invites</div>
          <div className="card">
            {pendingInvites.map((inv: any) => (
              <div key={inv.friendshipId} className="list-item">
                <div>
                  <div style={{ fontWeight: 500 }}>
                    {inv.localName || inv.friendEmail || 'Unknown'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Pending
                  </div>
                </div>
                <span className="chip">Invited</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-title">Your Friends</div>
      {friends.length === 0 ? (
        <div className="card">
          <p style={{ color: 'var(--text-muted)' }}>
            No friends yet. Invite someone above!
          </p>
        </div>
      ) : (
        <div className="card">
          {friends.map((friend: any) => (
            <div key={friend.id} className="list-item">
              <div>
                <div style={{ fontWeight: 500 }}>
                  {friend.localName || friend.friend.name || 'Unknown'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  className={friend.balance >= 0 ? 'positive' : 'negative'}
                  style={{ fontWeight: 600 }}
                >
                  PHP {Math.abs(friend.balance).toFixed(2)}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {friend.balanceLabel}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
