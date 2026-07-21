import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { RouterProvider } from 'react-router-dom'
import Routes from './routes/routes.tsx'
import { GoogleOAuthProvider } from '@react-oauth/google'

const client_id = import.meta.env.VITE_GOOGLE_CLIENT_ID;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={client_id}>
      <RouterProvider router={Routes} />
    </GoogleOAuthProvider>
  </StrictMode>,
)
