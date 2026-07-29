import { io } from 'socket.io-client'
import { SOCKET_URL } from './config'

export function createSocket() {
  return io(SOCKET_URL, {
    withCredentials: true,
    transports: ['websocket'],
  })
}
