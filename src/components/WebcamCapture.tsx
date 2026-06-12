import React, { useRef, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';

interface WebcamCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export default function WebcamCapture({ onCapture, onCancel }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError('Could not access camera. Please check permissions or connect a camera.');
        console.error(err);
      }
    }
    
    startCamera();
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleTakePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            onCapture(file);
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 z-[200] bg-black flex flex-col"
    >
      <div className="flex justify-between items-center p-4 text-white z-10 absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={onCancel} aria-label="Cancel capture" className="p-2 backdrop-blur-md rounded-full bg-white/10 hover:bg-white/20 transition-colors">
          <X size={24} />
        </button>
        <span className="font-bold tracking-widest text-sm uppercase">Take Photo</span>
        <div className="w-10"></div>
      </div>
      
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-white text-center p-4 bg-red-500/20 rounded-2xl mx-6 border border-red-500/50">
            <p className="font-bold">{error}</p>
            <p className="text-sm opacity-80 mt-2">Make sure you have granted camera permissions in your browser.</p>
          </div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      
      <div className="pb-12 pt-16 flex justify-center items-center absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent">
        <button 
          onClick={handleTakePhoto}
          disabled={!!error}
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100"
        >
          <div className="w-full h-full bg-white rounded-full"></div>
        </button>
      </div>
    </motion.div>
  );
}
