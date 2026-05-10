import React, { useEffect, useRef } from 'react';

export default function PipesDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width;
    let height = canvas.height;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        width = parent.clientWidth;
        height = parent.clientHeight;
        canvas.width = width;
        canvas.height = height;
        // black background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
      }
    };
    window.addEventListener('resize', resize);
    resize();

    // Simple 3D-ish pipes logic in 2D
    const gridSize = 30;
    const colors = ['#f44336', '#4caf50', '#2196f3', '#ffeb3b', '#9c27b0', '#ff9800'];
    
    interface Pipe {
      x: number;
      y: number;
      dirX: number;
      dirY: number;
      color: string;
      length: number;
      maxLength: number;
    }

    let pipes: Pipe[] = [];
    
    const startNode = () => {
      const startX = Math.floor(Math.random() * (width / gridSize)) * gridSize;
      const startY = Math.floor(Math.random() * (height / gridSize)) * gridSize;
      const dirs = [[1,0], [-1,0], [0,1], [0,-1]];
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      
      pipes.push({
        x: startX,
        y: startY,
        dirX: dir[0],
        dirY: dir[1],
        color: colors[Math.floor(Math.random() * colors.length)],
        length: 0,
        maxLength: Math.floor(Math.random() * 20) + 5
      });
    };

    // Initialize with a few pipes
    for (let i = 0; i < 5; i++) startNode();

    let animationId: number;

    const draw = () => {
      pipes.forEach(pipe => {
        if (pipe.length > pipe.maxLength) {
          // Change direction
          const dirs = [[1,0], [-1,0], [0,1], [0,-1]];
          // remove opposite of current dir
          const validDirs = dirs.filter(d => !(d[0] === -pipe.dirX && d[1] === -pipe.dirY));
          const dir = validDirs[Math.floor(Math.random() * validDirs.length)];
          
          // Draw joint
          ctx.fillStyle = '#aaa';
          ctx.beginPath();
          ctx.arc(pipe.x + gridSize/2, pipe.y + gridSize/2, gridSize/2 * 1.2, 0, Math.PI * 2);
          ctx.fill();

          pipe.dirX = dir[0];
          pipe.dirY = dir[1];
          pipe.length = 0;
          pipe.maxLength = Math.floor(Math.random() * 15) + 3;
        }

        // Draw segment
        ctx.fillStyle = pipe.color;
        
        // rudimentary 3D shading effect via gradient
        const grd = ctx.createLinearGradient(
          pipe.x, pipe.y, 
          pipe.x + (pipe.dirY !== 0 ? gridSize : 0), 
          pipe.y + (pipe.dirX !== 0 ? gridSize : 0)
        );
        grd.addColorStop(0, pipe.color);
        grd.addColorStop(0.5, '#fff'); // highlight
        grd.addColorStop(1, pipe.color);
        
        ctx.fillStyle = grd;

        ctx.fillRect(pipe.x, pipe.y, gridSize, gridSize);
        
        // Add borders for depth
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(pipe.x, pipe.y, gridSize, gridSize);

        pipe.x += pipe.dirX * gridSize;
        pipe.y += pipe.dirY * gridSize;
        pipe.length++;

        // Wrap around bounds
        if (pipe.x < 0) pipe.x = width;
        if (pipe.x > width) pipe.x = 0;
        if (pipe.y < 0) pipe.y = height;
        if (pipe.y > height) pipe.y = 0;
      });

      // Randomly start new pipes to keep screen busy, but don't overwhelm
      if (Math.random() < 0.02 && pipes.length < 20) {
        startNode();
      }
      
      // Randomly kill pipes
      if (Math.random() < 0.05 && pipes.length > 5) {
        pipes.shift();
      }

      // Add a slight fade to black over time
      ctx.fillStyle = 'rgba(0, 0, 0, 0.01)';
      ctx.fillRect(0, 0, width, height);

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="w-full h-[60vh] rounded-3xl overflow-hidden border-4 border-gray-800 shadow-2xl relative bg-black">
      <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-mono font-bold tracking-widest uppercase border border-white/20 backdrop-blur-md">
        Test Rendering Active
      </div>
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
