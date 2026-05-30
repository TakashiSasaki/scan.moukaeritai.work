import React, { useState, useEffect, useRef } from 'react';
import { PlaySquare, QrCode, ArrowLeft, BoxSelect } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';
import { ObjectDetector, FilesetResolver } from '@mediapipe/tasks-vision';

// Suppress noisy XNNPACK info logs from WebAssembly globally for this module
const origInfo = console.info;
const origLog = console.log;
const origWarn = console.warn;

const filterXNNPACK = (origFn: any) => (...args: any[]) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('XNNPACK')) return;
  origFn(...args);
};

console.info = filterXNNPACK(origInfo);
console.log = filterXNNPACK(origLog);
console.warn = filterXNNPACK(origWarn);

export default function LibraryDemoScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'qrcode' | 'object-detection' | 'mediapipe-detection'>('qrcode');

  return (
    <div className="w-full">
      <div className="sticky top-[57px] z-30 bg-[var(--surface-container-high)]/95 backdrop-blur-xl border-b border-[var(--outline)] px-4 sm:px-6 py-4 shadow-sm pb-4">
        <div className="flex flex-col gap-4 max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-purple-600 rounded-xl text-white shadow-sm">
                <PlaySquare className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black italic tracking-tight text-[var(--on-surface)]">Library API Demo</h2>
                <p className="text-[var(--on-surface-variant)] text-[10px] sm:text-xs font-medium uppercase tracking-wider">3rd Party Libraries</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/app')}
              className="px-4 py-2 bg-[var(--surface)] border border-[var(--outline)] hover:bg-[var(--surface-container-highest)] text-[var(--on-surface)] rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
            >
              🚪 Exit
            </button>
          </div>

          <div className="flex p-1 bg-[var(--surface-container)] rounded-2xl w-full overflow-x-auto no-scrollbar border border-[var(--surface-container-highest)] shadow-inner">
            <button
              onClick={() => setActiveTab('qrcode')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap scroll-ml-4 min-w-max ${
                activeTab === 'qrcode'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-highest)] hover:text-[var(--on-surface)]'
              }`}
            >
              <QrCode size={18} />
              html5-qrcode
            </button>
            <button
              onClick={() => setActiveTab('object-detection')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap min-w-max ${
                activeTab === 'object-detection'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-highest)] hover:text-[var(--on-surface)]'
              }`}
            >
              <BoxSelect size={18} />
              TensorFlow Object Detection
            </button>
            <button
              onClick={() => setActiveTab('mediapipe-detection')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap scroll-mr-4 min-w-max ${
                activeTab === 'mediapipe-detection'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-highest)] hover:text-[var(--on-surface)]'
              }`}
            >
              <BoxSelect size={18} />
              MediaPipe Object Detection
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-24">
        {activeTab === 'qrcode' && <QrCodeDemo />}
        {activeTab === 'object-detection' && <ObjectDetectionDemo />}
        {activeTab === 'mediapipe-detection' && <MediaPipeObjectDetectionDemo />}
      </div>
    </div>
  );
}

function MediaPipeObjectDetectionDemo() {
  const [detector, setDetector] = useState<ObjectDetector | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();

  const loadModel = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      
      const objectDetector = await ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
          delegate: "GPU"
        },
        scoreThreshold: 0.5,
        runningMode: 'VIDEO'
      });
      setDetector(objectDetector);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const startDetection = async () => {
    if (!detector) return;
    setError(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        videoRef.current.onloadeddata = () => {
          setIsDetecting(true);
          detectFrame();
        };
      }
    } catch (err) {
      setError(String(err));
      setIsDetecting(false);
    }
  };

  const stopDetection = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsDetecting(false);
  };

  const lastVideoTimeRef = useRef<number>(-1);
  const detectFrame = async () => {
    if (!detector || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    
    // Check if video is ready
    if (video.readyState !== 4) {
      requestRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    let startTimeMs = performance.now();
    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      try {
        const detections = detector.detectForVideo(video, startTimeMs);
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          // Sync dimensions
          canvasRef.current.width = video.videoWidth;
          canvasRef.current.height = video.videoHeight;
          
          ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          
          detections.detections.forEach(pred => {
            const bbox = pred.boundingBox;
            if (!bbox) return;
            const category = pred.categories[0];
            const score = Math.round(category.score * 100);
            const className = category.categoryName;

            const x = bbox.originX;
            const y = bbox.originY;
            const width = bbox.width;
            const height = bbox.height;
            
            // Draw bounding box
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 4;
            ctx.strokeRect(x, y, width, height);
            
            // Draw background for text
            const text = `${className} (${score}%)`;
            const textWidth = ctx.measureText(text).width;
            const textHeight = 18; // approx
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(x, y > 20 ? y - textHeight - 4 : y, textWidth + 10, textHeight + 4);
            
            // Draw text
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px Inter, sans-serif';
            ctx.fillText(
              text, 
              x + 5, 
              y > 20 ? y - 6 : y + textHeight - 2
            );
          });
        }
      } catch (e) {
        console.warn("Detection error frame dropped:", e);
      }
    }
    
    // Continue loop
    requestRef.current = requestAnimationFrame(detectFrame);
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      stopDetection();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-[var(--surface-container)] rounded-3xl p-6 border border-[var(--outline)] shadow-sm">
        <h3 className="text-lg font-bold mb-2">MediaPipe Tasks Vision (Client-side AI)</h3>
        <p className="text-sm text-[var(--on-surface-variant)] mb-6">
          This uses <code>@mediapipe/tasks-vision</code> with the EfficientDet-Lite0 model to detect objects securely within your browser. MediaPipe often provides better performance than TensorFlow.js.
        </p>
        
        <div className="flex gap-3 mb-6">
          {!detector && (
            <button
              onClick={loadModel}
              disabled={isLoading}
              className="px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <span className="animate-spin text-xl">⏳</span> : <BoxSelect size={18} />}
              {isLoading ? 'Loading Model (ca. 4MB)...' : 'Load AI Model'}
            </button>
          )}

          {detector && !isDetecting && (
            <button
              onClick={startDetection}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2"
            >
              <PlaySquare size={18} /> Start Camera
            </button>
          )}

          {isDetecting && (
            <button
              onClick={stopDetection}
              className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold flex items-center gap-2"
            >
              Stop Camera
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 mb-4 p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <div className="flex flex-col items-center">
          <div className="relative w-full max-w-[600px] overflow-hidden rounded-2xl bg-black/5 aspect-video md:aspect-auto">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />
            <canvas 
              ref={canvasRef} 
              className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ObjectDetectionDemo() {
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();

  const loadModel = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await tf.ready();
      const loadedModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      setModel(loadedModel);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const startDetection = async () => {
    if (!model) return;
    setError(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        videoRef.current.onloadeddata = () => {
          setIsDetecting(true);
          detectFrame();
        };
      }
    } catch (err) {
      setError(String(err));
      setIsDetecting(false);
    }
  };

  const stopDetection = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsDetecting(false);
  };

  const detectFrame = async () => {
    if (!model || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    
    // Check if video is ready
    if (video.readyState !== 4) {
      requestRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    try {
      const predictions = await model.detect(video);
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        // Sync dimensions
        canvasRef.current.width = video.videoWidth;
        canvasRef.current.height = video.videoHeight;
        
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        predictions.forEach(pred => {
          const [x, y, width, height] = pred.bbox;
          
          // Draw bounding box
          ctx.strokeStyle = '#00FFFF';
          ctx.lineWidth = 4;
          ctx.strokeRect(x, y, width, height);
          
          // Draw background for text
          const textWidth = ctx.measureText(`${pred.class} (${Math.round(pred.score * 100)}%)`).width;
          const textHeight = 18; // approx
          ctx.fillStyle = '#00FFFF';
          ctx.fillRect(x, y > 20 ? y - textHeight - 4 : y, textWidth + 10, textHeight + 4);
          
          // Draw text
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 16px Inter, sans-serif';
          ctx.fillText(
            `${pred.class} (${Math.round(pred.score * 100)}%)`, 
            x + 5, 
            y > 20 ? y - 6 : y + textHeight - 2
          );
        });
      }
    } catch (e) {
      console.warn("Detection error frame dropped:", e);
    }
    
    // Continue loop
    requestRef.current = requestAnimationFrame(detectFrame);
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      stopDetection();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-[var(--surface-container)] rounded-3xl p-6 border border-[var(--outline)] shadow-sm">
        <h3 className="text-lg font-bold mb-2">Real-time Object Detection (Client-side AI)</h3>
        <p className="text-sm text-[var(--on-surface-variant)] mb-6">
          This uses <code>@tensorflow/tfjs</code> and <code>@tensorflow-models/coco-ssd</code> to detect common objects completely within the browser. Data stays on your device.
        </p>
        
        <div className="flex gap-3 mb-6">
          {!model && (
            <button
              onClick={loadModel}
              disabled={isLoading}
              className="px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <span className="animate-spin text-xl">⏳</span> : <BoxSelect size={18} />}
              {isLoading ? 'Loading Model (ca. 5-10MB)...' : 'Load AI Model'}
            </button>
          )}

          {model && !isDetecting && (
            <button
              onClick={startDetection}
              className="px-6 py-3 bg-teal-600 text-white rounded-xl font-bold flex items-center gap-2"
            >
              <PlaySquare size={18} /> Start Camera
            </button>
          )}

          {isDetecting && (
            <button
              onClick={stopDetection}
              className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold flex items-center gap-2"
            >
              Stop Camera
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 mb-4 p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <div className="flex flex-col items-center">
          <div className="relative w-full max-w-[600px] overflow-hidden rounded-2xl bg-black/5 aspect-video md:aspect-auto">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />
            <canvas 
              ref={canvasRef} 
              className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function QrCodeDemo() {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startScanner = async () => {
    setIsScanning(true);
    setResult(null);
    setError(null);
    
    try {
      const html5QrCode = new Html5Qrcode("demo-reader", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: true
      });
      qrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          setResult(decodedText);
          stopScanner();
        },
        (errorMessage) => {
          // Ignore frequent error callback
        }
      );
    } catch (err) {
      setError(String(err));
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (qrCodeRef.current?.isScanning) {
      try {
        await qrCodeRef.current.stop();
      } catch (e) {
        console.error("Stop failed", e);
      }
    }
    qrCodeRef.current?.clear();
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-[var(--surface-container)] rounded-3xl p-6 border border-[var(--outline)] shadow-sm">
        <h3 className="text-lg font-bold mb-2">QR Code Reader Test</h3>
        <p className="text-sm text-[var(--on-surface-variant)] mb-6">
          This checks the raw behavior of <code>html5-qrcode</code> without strict application state mapping. Try scanning any QR code.
        </p>
        
        <div className="flex gap-3 mb-6">
          {!isScanning ? (
            <button
              onClick={startScanner}
              className="px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl font-bold flex items-center gap-2"
            >
              <QrCode size={18} /> Start Scanner
            </button>
          ) : (
            <button
              onClick={stopScanner}
              className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold flex items-center gap-2"
            >
              Stop Scanner
            </button>
          )}
        </div>

        <div className="flex flex-col items-center">
          <div 
            id="demo-reader" 
            className={`w-full max-w-[400px] overflow-hidden rounded-2xl bg-black/5 ${isScanning ? 'min-h-[300px]' : ''}`}
          ></div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
            <h4 className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              Scan Successful
            </h4>
            <div className="font-mono text-sm bg-[var(--surface-container-highest)] p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
              {result}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
