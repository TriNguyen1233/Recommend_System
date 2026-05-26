import { useGLTF, useAnimations } from '@react-three/drei'
import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';

function Asus_Model() {
  const group = useRef()
  // Đường dẫn đúng (bỏ ../public)
  const { scene, animations } = useGLTF('/3d_models/asus_tuf_a15_-_updated_with_stickers.glb');
  const { actions } = useAnimations(animations, scene);
 
  useEffect(() => {
    // In ra console để xem tên animation chính xác là gì
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    
    console.log("Các animation tìm thấy:", Object.keys(actions))

    // Chạy animation đầu tiên tìm thấy hoặc thay 'Open' bằng tên đúng
    const firstAction = Object.keys(actions)[0]
    if (actions[firstAction]) {
      actions[firstAction].setEffectiveTimeScale(0.2);
      actions[firstAction].play()
    }
  }, [actions])

  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} />
    </group>
  )
}
export default Asus_Model