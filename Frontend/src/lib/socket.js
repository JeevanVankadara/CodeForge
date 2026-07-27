import { io } from 'socket.io-client'

const SOCKET_URL = 'http://localhost:3000'

export function createSocket() {
  return io(SOCKET_URL, {
    withCredentials: true,
    transports: ['websocket'],
  })
}
