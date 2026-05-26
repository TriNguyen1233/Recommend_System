import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import './css/App.css'
import Discount_Box from './3d_animations/discount_box';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import Asus_Model from './3d_animations/asus_animation'
import { OrbitControls, Stage } from '@react-three/drei'
import { Link, NavLink } from 'react-router-dom';
import CategoryTabs from "./components/CategoryTabs.tsx"
// --- BƯỚC 2: App chỉ đóng vai trò là khung chứa Canvas ---
function App() {
  const container = useRef<HTMLDivElement | null>(null);
  useGSAP(() => {
    // Viết code animation ở đây
    const tl = gsap.timeline();

    tl.from(".charD", { x: 100, opacity: 0, duration: 0.1 })
      .from(".charE1", { y: -100, opacity: 0, duration: 0.1 })
      .from(".charF", { x: 100, opacity: 0, duration: 0.1 })
      .from(".charI", { y: -100, opacity: 0, duration: 0.1 })
      .from(".charN", { x: -100, opacity: 0, duration: 0.1 })
      .from(".charE2", { y: 100, opacity: 0, duration: 0.1 })
      .from(".charY1", { x: -100, opacity: 0, duration: 0.1 })
      .from(".charO", { y: 100, opacity: 0, duration: 0.1 })
      .from(".charU", { x: -100, opacity: 0, duration: 0.1 })
      .from(".charR", { y: 100, opacity: 0, duration: 0.1 })
      .from(".charS", { x: -100, opacity: 0, duration: 0.1 })
      .from(".charT", { y: 100, opacity: 0, duration: 0.1 })
      .from(".charY2", { x: -100, opacity: 0, duration: 0.1 })
      .from(".charL", { y: 100, opacity: 0, duration: 0.1 })
      .from(".charE3", { x: 100, opacity: 0, duration: 0.1 })

  }, { scope: container });

  return (
    <>
      <div className="navbar">
        <div className='logo'>
          TechStore
        </div>

        <div className='navheader'>
          <NavLink to="/">Home</NavLink>
          <NavLink to="/products">Products</NavLink>
          <NavLink to="/specifications">Specifications</NavLink>
          <NavLink to="/contact">About Us</NavLink>
          <NavLink to="/contact">Contact Us</NavLink>
        </div>
        <div>
          <button className='loginbutton'>Login</button>
        </div>
      </div>


      <div className='herobar'>

        <div ref={container} className='herotext'>
          <div className="style-text">
            <div className='char'>
              <span className="charD">D</span>
              <span className="charE1">E</span>
              <span className="charF">F</span>
              <span className="charI">I</span>
              <span className="charN">N</span>
              <span className="charE2">E</span>
              <span className="char">&nbsp;</span>
            </div>
            <div className='char'>
              <span className="charY1">Y</span>
              <span className="charO">O</span>
              <span className="charU">U</span>
              <span className="charR">R</span>
              <span className="char">&nbsp;</span>
              <span className="charS">S</span>
              <span className="charT">T</span>
              <span className="charY2">Y</span>
              <span className="charL">L</span>
              <span className="charE3">E</span>
            </div>


          </div>
        </div>
        <div className="canvas-container" style={{ width: '50%', height: '60vh', paddingTop: '100px' }}>
          <Canvas camera={{ position: [5, 1, 5], fov: 20 }}>
            <Suspense fallback={null}>
              <Stage environment="city" intensity={0.6}>
                {/* Hook useGLTF bây giờ đã nằm TRONG Canas thông qua cvomponent Model */}
                <Asus_Model />
              </Stage>
            </Suspense>
            <OrbitControls makeDefault />
          </Canvas>
        </div>

      </div >
      <div className='category-section'>
        <h2>Shop by Category</h2>
        <CategoryTabs />
      </div>
      <div className='discountbox'>
        <Discount_Box />
      </div>
      

    </>

  )
}

export default App