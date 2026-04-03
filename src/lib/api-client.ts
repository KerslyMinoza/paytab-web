const API_BASE = ''

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('accessToken')
}

async function refreshToken(): Promise<string | null> {
  const rt = localStorage.getItem('refreshToken')
  if (!rt) return null

  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  })

  if (!res.ok) {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    return null
  }

  const data = await res.json()
  localStorage.setItem('accessToken', data.accessToken)
  localStorage.setItem('refreshToken', data.refreshToken)
  return data.accessToken
}

async function request<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (res.status === 401 && token) {
    const newToken = await refreshToken()
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(`${API_BASE}${path}`, { ...options, headers })
    }
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || 'Request failed')
  return data as T
}

export const api = {
  get: <T = any>(path: string) => request<T>(path),
  post: <T = any>(path: string, body?: any) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T = any>(path: string, body?: any) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T = any>(path: string, body?: any) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T = any>(path: string) => request<T>(path, { method: 'DELETE' }),
}

export const auth = {
  async login(email: string, password: string) {
    const data = await api.post('/api/auth/login', { email, password })
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    localStorage.setItem('user', JSON.stringify(data.user))
    return data
  },

  async register(email: string, password: string, name?: string) {
    return api.post('/api/auth/register', { email, password, name })
  },

  async logout() {
    const rt = localStorage.getItem('refreshToken')
    try {
      await api.post('/api/auth/logout', { refreshToken: rt })
    } catch {}
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
  },

  isLoggedIn(): boolean {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem('accessToken')
  },

  getUser(): { id: string; name: string | null; email: string; avatarUrl: string | null } | null {
    if (typeof window === 'undefined') return null
    const u = localStorage.getItem('user')
    return u ? JSON.parse(u) : null
  },
}
