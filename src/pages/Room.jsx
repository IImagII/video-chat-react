import React from 'react'
import { useParams } from 'react-router'
import useWebRTC, { LOCAL_VIDEO } from '../hooks/useWebRTC'

export const Room = () => {
   //получаем из URL то id которое приходит
   const { id: roomID } = useParams()
   const { clients, provideMediaRef } = useWebRTC(roomID) // берем из нашего хука по рисоединению
   console.log('first', clients)
   return (
      <div>
         {clients.map(clientID => {
            return (
               <div>
                  <video
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
