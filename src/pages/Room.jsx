import React from 'react'
import { useParams } from 'react-router'
import useWebRTC, { LOCAL_VIDEO } from '../hooks/useWebRTC'

//функция чтобы на экране появлялся попорядку наши персонажи для более номальной разметки при появлении несольких персонажей
function layout(clientsNumber = 1) {
   const pairs = Array.from({ length: clientsNumber }).reduce(
      (acc, next, index, arr) => {
         if (index % 2 === 0) {
            acc.push(arr.slice(index, index + 2))
         }
         return acc
      },
      []
   )
   //узнаем количество пар
   const rowsNumber = pairs.length
   const height = `${100 / rowsNumber}% `
   return pairs
      .map((row, index, arr) => {
         if (index === arr.length - 1 && row.length === 1) {
            //если один элемент то он занимаем всю ширину
            return [
               {
                  width: '100%',
                  height,
               },
            ]
         }
         //если два элемента до делиться ширина
         return row.map(() => ({
            width: '50%',
            height,
         }))
      })
      .flat()
}

export const Room = () => {
   //получаем из URL то id которое приходит
   const { id: roomID } = useParams()
   const { clients, provideMediaRef } = useWebRTC(roomID) // берем из нашего хука по рисоединению
   const videoLayout = layout(clients.length) //вызываем ту функцию которая написали тут же выше

   return (
      <div
         style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            height: '100vh',
         }}
      >
         {clients.map((clientID, index) => {
            return (
               <div key={clientID} style={videoLayout[index]}>
                  <video
                     width='100%'
                     height='100%'
                     ref={instance => {
                        provideMediaRef(clientID, instance)
                     }}
                     autoPlay
                     playsInline
                     muted={clientID === LOCAL_VIDEO} // если мы себя видем то не хотимсами себя слышать
                  />
               </div>
            )
         })}
      </div>
   )
}
