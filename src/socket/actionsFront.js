const ACTIONS = {
   JOIN: 'join', // само подключение
   LEAVE: 'leave', // отключение от сервера
   SHARE_ROOMS: 'share-rooms', // поделиться комнатами
   ADD_PEER: 'add-peer', //будем создавать новое соединение между клиентами
   REMOVE_PEER: 'remove-peer', //удуаление соединения
   RELAY_SDP: 'relay-sdp', //когда будем передавать наши стримы смедиа данными
   RELAY_ICE: 'relay_ice', //когда будем передавать ice кандидатов (то есть наши физические подключения)
   ICE_CANDIDATE: 'ice-candidate', // это реакция на ice кандидатов
   SESSION_DESCRIPTION: 'session-description', //когда придет новая сессия нужно будет ее у себя использовать
}

export default ACTIONS
