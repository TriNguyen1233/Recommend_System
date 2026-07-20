
import { Outlet } from 'react-router-dom';
import MainPage from './pages/HomePage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import SignUpPage from './pages/SignUpPage.tsx';
import { Toaster } from 'react-hot-toast';

function App() {

  return (
    <div className="App">
      <Toaster position="top-right" reverseOrder={false} toastOptions={{
        duration: 3000,
      }} />

      <div style={{ backgroundColor: '#f8f9fa', color: '#212529', minHeight: '100vh', fontFamily: 'sans-serif' }}>

        {/* <MainPage/> */}
        {/* <LoginPage /> */}
        {/* <SignUpPage/> */}
        <Outlet />
      </div>
    </div>
  )
}

export default App