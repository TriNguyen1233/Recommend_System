import React, { useEffect, useRef } from 'react';
import Matter from 'matter-js';

const Discount_Box = () => {
    const sceneRef = useRef<HTMLDivElement | null>(null);
    const engineRef = useRef(Matter.Engine.create());

    useEffect(() => {
        if (!sceneRef.current) return;
        const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint, Body } = Matter;

        const engine = engineRef.current;
        engine.gravity.x = 0;
        engine.gravity.y = 0;

        const width = sceneRef.current.clientWidth;
        const height = 200; // Cố định 200px để khớp với CSS bên ngoài

        const render = Render.create({
            element: sceneRef.current,
            engine: engine,
            options: {
                width: width,
                height: height,
                wireframes: false,
                background: 'transparent'
            }
        });

        // Khóa chặt kích thước canvas hiển thị theo khung 200px
        if (render.canvas) {
            render.canvas.style.display = 'block';
            render.canvas.style.width = '100%';
            render.canvas.style.height = '200px';
            render.canvas.style.maxHeight = '200px';
        }

        // Tạo các bức tường bao quanh dựa trên kích thước 200px
        const thickness = 100; 
        const ground = Bodies.rectangle(width / 2, height + thickness / 2, width, thickness, { isStatic: true });
        const ceiling = Bodies.rectangle(width / 2, -thickness / 2, width, thickness, { isStatic: true });
        const leftWall = Bodies.rectangle(-thickness / 2, height / 2, thickness, height, { isStatic: true });
        const rightWall = Bodies.rectangle(width + thickness / 2, height / 2, thickness, height, { isStatic: true });

        // Tạo các hộp quà ở trong vùng nhìn thấy
        const boxes = Array.from({ length: 4 }).map(() => {
            const box = Bodies.rectangle(
                Math.random() * (width - 60) + 30,
                Math.random() * (height - 60) + 30,
                50,
                50,
                {
                    restitution: 0.8,
                    friction: 0,
                    frictionAir: 0.01,
                    render: {
                        sprite: {
                            texture: '/images/gift.png',
                            xScale: 0.05,
                            yScale: 0.05
                        }
                    }
                }
            );

            // Cú hích nhẹ ban đầu
            Body.setVelocity(box, {
                x: (Math.random() - 0.5) * 3,
                y: (Math.random() - 0.5) * 3
            });

            return box;
        });

        // Tương tác chuột
        const mouse = Mouse.create(render.canvas);
        const mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: { stiffness: 0.2, render: { visible: false } }
        });

        render.mouse = mouse;

        Composite.add(engine.world, [ground, ceiling, leftWall, rightWall, ...boxes, mouseConstraint]);

        Render.run(render);
        const runner = Runner.create();
        Runner.run(runner, engine);

        // Cleanup khi component unmount
        return () => {
            Render.stop(render);
            Engine.clear(engine);
            Runner.stop(runner);
            if (render.canvas) {
                render.canvas.remove();
            }
            render.textures = {};
        };
    }, []);

    return (
        <div
            ref={sceneRef}
            style={{
                width: '100%',
                height: '200px', // Đảm bảo đồng bộ với chiều cao mong muốn
                backgroundColor: 'wheat',
                overflow: 'hidden',
                position: 'relative',
                fontSize: '50px',
                fontWeight: 'bold',
                color: '#20e03a',
                textAlign: 'center',
            }}
        >
            {/* Chữ hiển thị ở giữa */}
            <div style={{
                position: 'absolute',
                top: "50%",
                left: "50%",
                transform: 'translate(-50%, -50%)',
                textShadow: '2px 2px 4px #000000',
                pointerEvents: 'none',
                zIndex: 10,
                whiteSpace: 'nowrap'
            }}>
                Save 40% On All Items
            </div>
        </div>
    );
};

export default Discount_Box;