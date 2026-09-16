import axios from 'axios'
import { API_URL } from './config'

const api = axios.create({ baseURL: API_URL, withCredentials: true })

export const getProblem = async (id) => (await api.get(`/problems/${encodeURIComponent(id.trim())}`)).data
