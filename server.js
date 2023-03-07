const path = require('path')
const express = require('express')
const ACTIONS = require('./src/socket/actions')

const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const { version, validate } = require('uuid')

const PORT = process.env.PORT || 3001

//функция будет возвращать нам список всех комнат которые существуют
function geClientsRooms() {
   const { rooms } = io.sockets.adapter
   return Array.from(rooms.keys()).filter(
      roomID => validate(roomID) && version(roomID) === 4 // 4 потомучто мы создали на фронтенде v4 функцию по генерации id
   )
}

//будем добавлять всем комнатам чтобы все клиены узнали о ней
function shareRoomsInfo() {
   io.emit(ACTIONS.SHARE_ROOMS, {
      rooms: geClientsRooms(),
   })
}

//соединение и провверка socket
io.on('connection', socket => {
   shareRoomsInfo() //при подключении мы сразу будем отслеживать информацию о комнатах

   //присоединение к комнатам
   socket.on(ACTIONS.JOIN, config => {
      const { room: roomID } = config // достаем комнату из config
      const { rooms: joinedRooms } = socket //смотрим на те комнаты в которых есть сокет чьлбы второй раз к ним не подключиться

      //проверяем если мы подключены то возвращаем предупреждение
      if (Array.from(joinedRooms).includes(roomID)) {
         return console.warn(`Already joined to ${roomID}`)
      }
      //Иначе мы получаем всех клиентов в этой комнате которые подключены
      const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || [])

      //перебераем этих клиентов и каждому отправляем запрос
      clients.forEach(clientID => {
         //а текущему клиенту ничего не надо создавать они будут добавлять его какбы на стороне
         io.to(clientID).emit(ACTIONS.ADD_PEER, {
            peerID: socket.id,
            createOffer: false,
         })

         //будет создавать оффер та сторона коотрая подклюается в комнату
         socket.emit(ACTIONS.ADD_PEER, {
            peerID: clientID,
            createOffer: true,
         })
      })

      //мы подключаемся
      socket.join(roomID)
      //делимся информацией о комнатах всем кто подключен
      shareRoomsInfo()
   })

   function leaveRoom() {
      //получим все комнаты из текущего сокета
      const { rooms } = socket

      //проходимсяпо этим комнатам
      Array.from(rooms).forEach(roomID => {
         //получим клиентов которые в этой комнате находяться
         const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || [])

         //отправим каждому клиенту запрос на отключение того пользователякоотрый отключился
         clients.forEach(clientID => {
            //это отправляем всем клиентам которые находяться в комнате мы отправлям им свой id
            io.to(clientID).emit(ACTIONS.REMOVE_PEER, {
               peerID: socket.id,
            })

            //тут мы оптравляем id себе чтобы от них тоже отключиться
            socket.emit(ACTIONS.REMOVE_PEER, {
               peerID: clientID,
            })
         })

         //покидаем комнату
         socket.leave(roomID)
      })
      //делимся информацией о комнатах всем кто покинул комнату
      shareRoomsInfo()
   }

   //логика выхода из комнаты
   socket.on(ACTIONS.LEAVE, leaveRoom)

   //отключение от сокета
   socket.on('disconnect', leaveRoom)

   //реализация нового кандидата и стримов
   socket.on(ACTIONS.RELAY_SDP, ({ peerID, sessionDescription }) => {
      io.to(peerID).emit(ACTIONS.SESSION_DESCRIPTION, {
         peerID: socket.id,
         sessionDescription,
      })
   })
   socket.on(ACTIONS.RELAY_ICE, ({ peerID, iceCandidate }) => {
      io.to(peerID).emit(ACTIONS.ICE_CANDIDATE, {
         peerID: socket.id,
         iceCandidate,
      })
   })
})

//проверка загрузки сервера
server.listen(PORT, () => {
   console.log(`Server listening on port ${PORT}`)
})
