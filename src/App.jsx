import { Route, Routes } from 'react-router-dom'
import { Main } from './pages/Main'
import { Room } from './pages/Room'
import { NoFound404 } from './pages/NoFound404'

function App() {
   return (
      <Routes>
         <Route path='/' element={<Main />} />
         <Route path='/room/:id' element={<Room />} />
         <Route path='*' element={<NoFound404 />} />
      </Routes>
   )
}

export default App
