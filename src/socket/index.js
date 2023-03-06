import { io } from 'socket.io-client'

//настройки для нашего сервера по технологии socket
const options = {
   'force new connection': true,
   reconnectionAttempts: 'Infinite', // чтобы наш сервер переподключался
   timeout: 10000,
   transports: ['websocket'], //для того чтобы наш сокет работал раздоменно
}

const socket = io.connect('http://localhost:3001', options)

export default socket
