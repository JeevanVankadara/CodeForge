import axios from 'axios'

// Room endpoints are auth-protected, so send the cookie with every request.
const api = axios.create({ baseURL: 'http://localhost:3000', withCredentials: true })

// Enter a room (creates it if new) -> { id, language, code }.
export const joinRoom = async (id) => (await api.post(`/rooms/${id}/join`)).data

// Persist code + language for a room.
export const saveRoom = async (id, { code, language }) =>
  (await api.put(`/rooms/${id}`, { code, language })).data
