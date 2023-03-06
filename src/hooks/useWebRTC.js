import { useCallback, useEffect, useRef } from 'react'
import useStateWithCallback from './useStateWithCallback'
import socket from '../socket'
import ACTIONS from '../socket/actionsFront'

export const LOCAL_VIDEO = 'LOCAL_VIDEO'
//кастомнй хук с помощью которого мы будем одписываться на все events
export default function useWebRTC(roomID) {
   //хранить всех доступных клиентов но это будет кастоный хук он будет не стандартный а похож на state классовых компонентов
   const [clients, setClients] = useStateWithCallback([]) // это для того тчобы можно было мутировать peerMediaElements

   //нужно хранить все peer_connection которые связывает этого клиента с другими клиентами
   const peerConnections = useRef({}) // нельзя его хранить в useState

   //тут храним ссылку на видео элемент который будет транслироватся с моей видеокамеры
   const localMediaStream = useRef(null)

   //ссылка на все видео элементы которые будут на странице чтобы например проставлять какието атрибуты
   const peerMediaElements = useRef({
      [LOCAL_VIDEO]: null,
   })

   //функцию она проверяет если пользователь соединен то второй раз он не присоединиться
   const addNewClient = useCallback(
      (newClient, cb) => {
         //вот этой строкой мы проверяем что у нас не т нового клиента
         if (!clients.includes(newClient)) {
            setClients(list => [...list, newClient], cb)
         }
      },
      [clients, setClients]
   )

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
         .then(() => socket.emit(ACTIONS.JOIN, { room: roomID })) // тут мы присоединяем пользователя
         .catch(err => console.log.error('Error getting userMedia:', err))
   }, [roomID])

   const provideMediaRef = useCallback(() => {}, [])

   return { clients }
}
