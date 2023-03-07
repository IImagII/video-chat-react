import { useEffect, useRef, useCallback } from 'react'
import freeice from 'freeice'
import useStateWithCallback from './useStateWithCallback'
import socket from '../socket'
import ACTIONS from '../socket/actionsFront'

export const LOCAL_VIDEO = 'LOCAL_VIDEO'
//кастомнй хук с помощью которого мы будем одписываться на все events
export default function useWebRTC(roomID) {
   //хранить всех доступных клиентов но это будет кастоный хук он будет не стандартный а похож на state классовых компонентов
   const [clients, updateClients] = useStateWithCallback([]) // это для того тчобы можно было мутировать peerMediaElements

   //функцию она проверяет если пользователь соединен то второй раз он не присоединиться
   const addNewClient = useCallback(
      (newClient, cb) => {
         updateClients(list => {
            if (!list.includes(newClient)) {
               return [...list, newClient]
            }

            return list
         }, cb)
      },
      [clients, updateClients]
   )
   //нужно хранить все peer_connection которые связывает этого клиента с другими клиентами
   const peerConnections = useRef({}) // нельзя его хранить в useState
   const localMediaStream = useRef(null) //тут храним ссылку на видео элемент который будет транслироватся с моей видеокамеры

   //ссылка на все видео элементы которые будут на странице чтобы например проставлять какието атрибуты
   const peerMediaElements = useRef({
      [LOCAL_VIDEO]: null,
   })

   //логика добавления ADD_PEER
   useEffect(() => {
      async function handleNewPeer({ peerID, createOffer }) {
         //делаем проверку если peerConnections содержит peerID
         if (peerID in peerConnections.current) {
            return console.warn(`Already connected to peer ${peerID}`)
         }

         //если мы не подключены тогда мы создаем новый peerConnections
         peerConnections.current[peerID] = new RTCPeerConnection({
            iceServers: freeice(),
         })

         //проверяем что ели у нас есть кандидат то мы его должны переслать другим нашим клиентам
         peerConnections.current[peerID].onicecandidate = event => {
            if (event.candidate) {
               socket.emit(ACTIONS.RELAY_ICE, {
                  peerID,
                  iceCandidate: event.candidate,
               })
            }
         }

         // мы тут извлекаем все стримы которые получчаем и начинаем их транслировать
         let tracksNumber = 0 // это для отго чтобы добавлячть клиента если нам пришло и видео и аудио
         peerConnections.current[peerID].ontrack = ({
            streams: [remoteStream],
         }) => {
            tracksNumber++
            //вот ту мы ждем и видео и аудио
            if (tracksNumber === 2) {
               addNewClient(peerID, () => {
                  if (peerMediaElements.current[peerID]) {
                     peerMediaElements.current[peerID].srcObject = remoteStream
                  } else {
                     // FIX LONG RENDER IN CASE OF MANY CLIENTS
                     let settled = false
                     const interval = setInterval(() => {
                        if (peerMediaElements.current[peerID]) {
                           peerMediaElements.current[peerID].srcObject =
                              remoteStream
                           settled = true
                        }

                        if (settled) {
                           clearInterval(interval)
                        }
                     }, 1000)
                  }
               })
            }
         }

         //тут мы получаем наши треки и добавляем их к нашему peerConnection
         localMediaStream.current.getTracks().forEach(track => {
            peerConnections.current[peerID].addTrack(
               track,
               localMediaStream.current // указываем что за трек
            )
         })

         if (createOffer) {
            //туь мы создам оффер
            const offer = await peerConnections.current[peerID].createOffer()

            await peerConnections.current[peerID].setLocalDescription(offer)

            //отправляем эти данные
            socket.emit(ACTIONS.RELAY_SDP, {
               peerID,
               sessionDescription: offer,
            })
         }
      }

      socket.on(ACTIONS.ADD_PEER, handleNewPeer)

      return () => {
         socket.off(ACTIONS.ADD_PEER)
      }
   }, [])

   //реакция напоступление новой сессии SESSION_DESCRIPTION и если при создании мы отправляли offer а в данном случае мы отправляем ответ(answer)
   useEffect(() => {
      async function setRemoteMedia({
         peerID,
         sessionDescription: remoteDescription,
      }) {
         await peerConnections.current[peerID]?.setRemoteDescription(
            new RTCSessionDescription(remoteDescription)
         )

         if (remoteDescription.type === 'offer') {
            const answer = await peerConnections.current[peerID].createAnswer()

            await peerConnections.current[peerID].setLocalDescription(answer)

            socket.emit(ACTIONS.RELAY_SDP, {
               peerID,
               sessionDescription: answer,
            })
         }
      }

      socket.on(ACTIONS.SESSION_DESCRIPTION, setRemoteMedia)

      return () => {
         socket.off(ACTIONS.SESSION_DESCRIPTION)
      }
   }, [])

   //реакция на нового кандидата на ICE_CANDIDATE(RELAY_ICE)
   useEffect(() => {
      socket.on(ACTIONS.ICE_CANDIDATE, ({ peerID, iceCandidate }) => {
         peerConnections.current[peerID]?.addIceCandidate(
            new RTCIceCandidate(iceCandidate)
         )
      })

      return () => {
         socket.off(ACTIONS.ICE_CANDIDATE)
      }
   }, [])

   //реализация навыход с комнаты REMOVE_PEER
   useEffect(() => {
      const handleRemovePeer = ({ peerID }) => {
         if (peerConnections.current[peerID]) {
            peerConnections.current[peerID].close()
         }

         delete peerConnections.current[peerID]
         delete peerMediaElements.current[peerID]

         updateClients(list => list.filter(c => c !== peerID))
      }

      socket.on(ACTIONS.REMOVE_PEER, handleRemovePeer)

      return () => {
         socket.off(ACTIONS.REMOVE_PEER)
      }
   }, [])

   //тут мы подклбючаемсяк комнатам, мы тут будем реагировать на изменение комнаты
   useEffect(() => {
      //функция по захвату видео контента мы спросиму пользователя он хочет присоединиться к комнате
      async function startCapture() {
         localMediaStream.current = await navigator.mediaDevices.getUserMedia({
            //то есть мы будем захватывать как видео так и звук
            audio: true,
            video: {
               width: 1280,
               height: 720,
            },
         })

         //трансляция
         //если захват произошел успешно то вызываем функцию она проверяет если пользователь соединен то второй раз он не присоединиться
         addNewClient(LOCAL_VIDEO, () => {
            const localVideoElement = peerMediaElements.current[LOCAL_VIDEO]

            if (localVideoElement) {
               localVideoElement.volume = 0 //чтобы мы сами себя не слышали
               localVideoElement.srcObject = localMediaStream.current // тут передается то что мы захватили с камеры
            }
         })
      }

      startCapture()
         .then(() => socket.emit(ACTIONS.JOIN, { room: roomID })) // тут мы присоединяем пользовате
         .catch(e => console.error('Error getting userMedia:', e))

      //реализация выхода клиента
      return () => {
         localMediaStream.current.getTracks().forEach(track => track.stop())

         socket.emit(ACTIONS.LEAVE)
      }
   }, [roomID])

   const provideMediaRef = useCallback((id, node) => {
      peerMediaElements.current[id] = node
   }, [])

   return {
      clients,
      provideMediaRef,
   }
}
