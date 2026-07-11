import React from 'react';
import { PlaySquare, Brain, Image as ImageIcon, Box } from 'lucide-react';

export default function LibraryDemoScreen() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight italic">Library Demos</h1>
        <p className="text-[var(--on-surface-variant)] text-sm font-medium">Integration of heavy external libraries</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[var(--surface-container)] rounded-[32px] p-8 border border-[var(--outline)] space-y-6">
          <div className="flex items-center gap-4">
            <div className="bg-purple-500 p-4 rounded-2xl text-white">
              <Brain size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold italic">TensorFlow.js</h2>
              <p className="text-xs text-[var(--on-surface-variant)] font-bold uppercase tracking-widest">Object Detection</p>
            </div>
          </div>
          <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">
            Real-time object detection using COCO-SSD model. Identify multiple objects in a camera stream entirely in the browser.
          </p>
          <button className="w-full bg-[var(--primary)] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[var(--primary)]/20">
            Launch Detection
          </button>
        </div>

        <div className="bg-[var(--surface-container)] rounded-[32px] p-8 border border-[var(--outline)] space-y-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-500 p-4 rounded-2xl text-white">
              <Box size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold italic">MediaPipe</h2>
              <p className="text-xs text-[var(--on-surface-variant)] font-bold uppercase tracking-widest">Computer Vision</p>
            </div>
          </div>
          <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">
            High-performance object detection using EfficientDet-Lite0 via MediaPipe Tasks Vision.
          </p>
          <button className="w-full bg-blue-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/20">
            Start MediaPipe Demo
          </button>
        </div>
      </div>
    </div>
  );
}
