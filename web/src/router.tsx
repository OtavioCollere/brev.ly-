import { createBrowserRouter } from 'react-router-dom'
import { RootPage } from './pages/RootPage/RootPage'
import { RedirectOrNotFoundPage } from './pages/RedirectOrNotFoundPage/RedirectOrNotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootPage />,
  },
  {
    path: '*',
    element: <RedirectOrNotFoundPage />,
  },
])
