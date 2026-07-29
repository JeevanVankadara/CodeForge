import axios from 'axios'
import { API_URL } from './config'

// Room endpoints are auth-protected, so send the cookie with every request.
const api = axios.create({ baseURL: API_URL, withCredentials: true })

// Enter a room (creates it if new) -> { id, language, code }.
export const joinRoom = async (id) => (await api.post(`/rooms/${id}/join`)).data

// Persist code + language for a room.
export const saveRoom = async (id, { code, language }) =>
  (await api.put(`/rooms/${id}`, { code, language })).data
