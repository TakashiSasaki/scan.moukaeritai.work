import React, { useEffect, useRef } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import { Share2, Maximize, RotateCcw, Info } from 'lucide-react';
import { dataModelNodes, dataModelEdges } from '../../lib/developerDataModelGraph';

export default function DeveloperDataModelGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Graphology
    const graph = new Graph();

    // Add Nodes
    dataModelNodes.forEach(node => {
      let color = '#888888';
      let size = 10;

      switch(node.type) {
        case 'collection': color = '#3b82f6'; size = 15; break; // blue
        case 'field': color = '#10b981'; size = 8; break; // green
        case 'semanticIdentityPayload': color = '#8b5cf6'; size = 12; break; // purple
        case 'relationship': color = '#f59e0b'; size = 8; break; // amber
        case 'futureConcept': color = '#6366f1'; size = 8; break; // indigo
        case 'migrationPhase': color = '#ef4444'; size = 10; break; // red
        case 'ruleImpact': color = '#ec4899'; size = 8; break; // pink
        case 'legacyCompatibility': color = '#f97316'; size = 8; break; // orange
      }

      graph.addNode(node.id, {
        x: node.x,
        y: node.y,
        size: size,
        label: node.label,
        color: color,
        type: node.type
      });
    });

    // Add Edges
    dataModelEdges.forEach(edge => {
      let color = '#aaaaaa';
      switch(edge.type) {
        case 'hasField': color = '#10b981'; break;
        case 'references': color = '#3b82f6'; break;
        case 'legacyCompatibility': color = '#f97316'; break;
        case 'excludesFromIdentity': color = '#ef4444'; break;
      }

      if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
        graph.addEdge(edge.source, edge.target, {
          type: 'line',
          label: edge.label,
          size: 1,
          color: color,
        });
      }
    });

    // Initialize Sigma
    sigmaRef.current = new Sigma(graph, containerRef.current, {
      renderLabels: true,
      labelDensity: 0.07,
      labelGridCellSize: 60,
      labelRenderedSizeThreshold: 6,
      labelFont: "inherit",
      labelWeight: "bold"
    });

    // Fit camera on load
    const camera = sigmaRef.current.getCamera();
    camera.ratio = 1.2;

    return () => {
      if (sigmaRef.current) {
        sigmaRef.current.kill();
        sigmaRef.current = null;
      }
    };
  }, []);

  const handleReset = () => {
    if (sigmaRef.current) {
      const camera = sigmaRef.current.getCamera();
      camera.animatedGoTo({ x: 0, y: 0, ratio: 1.2 });
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 pb-24 h-full flex flex-col">
      <section className="bg-[var(--surface-container)] rounded-3xl p-6 border border-[var(--outline)] shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Share2 className="text-[var(--primary)]" size={24} />
              Data Model Graph
            </h2>
            <p className="text-[var(--on-surface-variant)] text-sm">
              Static visualization of collections, fields, and relationships.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-container-high)] hover:bg-[var(--surface-container-highest)] text-[var(--on-surface)] rounded-full text-sm font-medium transition-colors border border-[var(--outline)]"
          >
            <RotateCcw size={16} /> Reset View
          </button>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 flex gap-3 text-xs">
          <Info className="text-blue-500 shrink-0" size={16} />
          <p className="text-[var(--on-surface)] font-medium">
            This graph uses static, hand-authored coordinates. It does not connect to Firestore or inspect live data.
          </p>
        </div>
      </section>

      <div className="flex-1 bg-neutral-900 rounded-3xl border border-[var(--outline)] overflow-hidden relative min-h-[500px] shadow-inner">
        <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-white shadow-xl">
          <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-neutral-300">Legend</h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs font-medium">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div> Collection</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#10b981]"></div> Field</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#8b5cf6]"></div> Identity Payload</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div> Relationship</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ef4444]"></div> Migration Phase</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#6366f1]"></div> Future Concept</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f97316]"></div> Legacy</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ec4899]"></div> Rule Impact</div>
          </div>
        </div>
      </div>

      {/* Fallback Text */}
      <noscript>
         <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm">
           JavaScript is required to view the interactive graph. Please enable JavaScript or refer to the textual Data Model page.
         </div>
      </noscript>
    </div>
  );
}
