import axios from 'axios'

// withCredentials lets the browser send/receive the auth cookie set by the backend.
// The JWT lives in an HttpOnly cookie — there is no token to handle on the client.
const authApi = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true,
})

export const login = async ({ email, password }) => {
  const { data } = await authApi.post('/auth/login', { email, password })
  return data
}

export const signup = async ({ name, email, password }) => {
  const { data } = await authApi.post('/auth/signup', { name, email, password })
  return data
}

// Returns the current user ({ id, name, email }) or throws 401 if not logged in.
export const getMe = async () => {
  const { data } = await authApi.get('/auth/me')
  return data
}

export const logout = async () => {
  await authApi.post('/auth/logout')
}
