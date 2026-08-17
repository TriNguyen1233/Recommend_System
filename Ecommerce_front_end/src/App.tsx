
import { Outlet } from 'react-router-dom';
import MainPage from './pages/HomePage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import SignUpPage from './pages/SignUpPage.tsx';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './context/CartContext.ts';
import { AiRecProvider } from './context/AiRecContext.tsx';

function App() {

  return (
    <CartProvider>
        <div className="App">
          <Toaster
            position="top-right"
            reverseOrder={false}
            containerStyle={{
              top: 80,
            }}
            toastOptions={{
              duration: 3000,
            }}
          />

          <div style={{ backgroundColor: '#f8f9fa', color: '#212529', minHeight: '100vh', fontFamily: 'sans-serif' }}>

            {/* <MainPage/> */}
            {/* <LoginPage /> */}
            {/* <SignUpPage/> */}
            <Outlet />
          </div>
        </div>
    </CartProvider>
  )
}

export default App