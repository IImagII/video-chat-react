import React, { useEffect, useState } from 'react'
import socket from '../socket'

import { useNavigate } from 'react-router'
import { v4 } from 'uuid' // для генерации id комнаты

import ACTIONS from '../socket/actionsFront'

export const Main = () => {
   const navigate = useNavigate()
   const [rooms, setRooms] = useState([]) //создадим состояние комнат

   //при входе на страницу мы будем подписываться на событие сокета
   useEffect(() => {
      //будем получать все комнаты которые у нас есть
      socket.on(ACTIONS.SHARE_ROOMS, ({ rooms = [] } = {}) => {
         //будем обновлять этими комнатами каждый раз когда они приходят
         setRooms(rooms)
      })
   }, [])

   return (
      <div>
         <h1>Список комнат</h1>

         <ul>
            {rooms.map(roomID => (
               <li key={roomID}>
                  {roomID}
                  <button
                     onClick={() => {
                        navigate(`/room/${roomID}`)
                     }}
                  >
                     Присоединится к комнате
                  </button>
               </li>
            ))}
         </ul>
         <button
            //тут мы отрпавляем в комнату при єтом с помощью функции v4 генерируем id комнаты
            onClick={() => {
               navigate(`/room/${v4()}`)
            }}
         >
            Создать комнату
         </button>
      </div>
   )
}
