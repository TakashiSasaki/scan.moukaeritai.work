import React, { useEffect, useRef, useState, useMemo } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import { Share2, RotateCcw, Info, Search, X, Filter } from 'lucide-react';
import { dataModelNodes, dataModelEdges, GraphNode, GraphEdge } from '../../lib/developerDataModelGraph';

export default function DeveloperDataModelGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtering state
  const [activeNodeTypes, setActiveNodeTypes] = useState<Set<string>>(new Set(dataModelNodes.map(n => n.type)));
  const [activeEdgeTypes, setActiveEdgeTypes] = useState<Set<string>>(new Set(dataModelEdges.map(e => e.type)));

  const allNodeTypes = useMemo(() => Array.from(new Set(dataModelNodes.map(n => n.type))), []);
  const allEdgeTypes = useMemo(() => Array.from(new Set(dataModelEdges.map(e => e.type))), []);

  const selectedNode = useMemo(() => {
    return selectedNodeId ? dataModelNodes.find(n => n.id === selectedNodeId) : null;
  }, [selectedNodeId]);

  const selectedNodeConnectedEdges = useMemo(() => {
    if (!selectedNodeId) return [];
    return dataModelEdges.filter(e => e.source === selectedNodeId || e.target === selectedNodeId);
  }, [selectedNodeId]);

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
        type: node.type,
        originalColor: color,
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
          originalColor: color,
          edgeType: edge.type,
          id: edge.id,
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

    // Event listeners
    sigmaRef.current.on("clickNode", (event) => {
      setSelectedNodeId(event.node);
    });

    sigmaRef.current.on("clickStage", () => {
      setSelectedNodeId(null);
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
  }, []); // Graph topology is static

  // Apply filters and search
  useEffect(() => {
    if (!sigmaRef.current) return;

    const graph = sigmaRef.current.getGraph();
    const q = searchQuery.toLowerCase();

    // Reset all nodes and edges first
    graph.forEachNode((node, attrs) => {
      graph.setNodeAttribute(node, 'hidden', false);
      graph.setNodeAttribute(node, 'color', attrs.originalColor);
    });

    graph.forEachEdge((edge, attrs) => {
      graph.setEdgeAttribute(edge, 'hidden', false);
      graph.setEdgeAttribute(edge, 'color', attrs.originalColor);
    });

    // 1. Apply type filters
    graph.forEachNode((node, attrs) => {
      if (!activeNodeTypes.has(attrs.type)) {
        graph.setNodeAttribute(node, 'hidden', true);
      }
    });

    graph.forEachEdge((edge, attrs) => {
      if (!activeEdgeTypes.has(attrs.edgeType)) {
        graph.setEdgeAttribute(edge, 'hidden', true);
      }
    });

    // 2. Apply search filter
    if (q) {
      graph.forEachNode((node, attrs) => {
        if (!graph.getNodeAttribute(node, 'hidden')) {
          if (!attrs.label.toLowerCase().includes(q) && !node.toLowerCase().includes(q)) {
            graph.setNodeAttribute(node, 'hidden', true);
          }
        }
      });
    }

    // 3. Highlight selected node and its neighbors
    if (selectedNodeId && graph.hasNode(selectedNodeId)) {
      const neighbors = new Set<string>();
      neighbors.add(selectedNodeId);

      graph.forEachNeighbor(selectedNodeId, (neighbor) => {
        neighbors.add(neighbor);
      });

      graph.forEachNode((node, attrs) => {
        if (!neighbors.has(node) && !graph.getNodeAttribute(node, 'hidden')) {
           graph.setNodeAttribute(node, 'color', '#333333'); // dim
        }
      });

      graph.forEachEdge((edge, attrs, source, target) => {
        if ((source !== selectedNodeId && target !== selectedNodeId) && !graph.getEdgeAttribute(edge, 'hidden')) {
          graph.setEdgeAttribute(edge, 'color', '#222222'); // dim
        }
      });
    }

  }, [searchQuery, activeNodeTypes, activeEdgeTypes, selectedNodeId]);

  const handleReset = () => {
    if (sigmaRef.current) {
      const camera = sigmaRef.current.getCamera();
      camera.animatedGoTo({ x: 0, y: 0, ratio: 1.2 });
    }
  };

  const clearFilters = () => {
    setActiveNodeTypes(new Set(allNodeTypes));
    setActiveEdgeTypes(new Set(allEdgeTypes));
    setSearchQuery('');
    setSelectedNodeId(null);
  };

  const toggleNodeType = (type: string) => {
    const newTypes = new Set(activeNodeTypes);
    if (newTypes.has(type)) newTypes.delete(type);
    else newTypes.add(type);
    setActiveNodeTypes(newTypes);
  };

  const toggleEdgeType = (type: string) => {
    const newTypes = new Set(activeEdgeTypes);
    if (newTypes.has(type)) newTypes.delete(type);
    else newTypes.add(type);
    setActiveEdgeTypes(newTypes);
  };

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto h-full flex flex-col gap-4">
      {/* Header & Controls */}
      <section className="bg-[var(--surface-container)] rounded-3xl p-4 md:p-6 border border-[var(--outline)] shrink-0 flex flex-col gap-4 z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Share2 className="text-[var(--primary)]" size={24} />
              Data Model Graph
            </h2>
            <p className="text-[var(--on-surface-variant)] text-sm">
              Interactive visualization of collections, fields, and relationships.
            </p>
          </div>
          <div className="flex gap-2">
             <button
              onClick={clearFilters}
              className="px-4 py-2 bg-[var(--surface-container-high)] hover:bg-[var(--surface-container-highest)] text-[var(--on-surface)] rounded-full text-sm font-medium transition-colors border border-[var(--outline)]"
            >
              Clear Filters
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-container-high)] hover:bg-[var(--surface-container-highest)] text-[var(--on-surface)] rounded-full text-sm font-medium transition-colors border border-[var(--outline)]"
            >
              <RotateCcw size={16} /> Reset View
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center bg-[var(--surface-container-lowest)] p-3 rounded-2xl border border-[var(--outline)]">
           <div className="relative w-full lg:w-64 shrink-0">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)]" size={16} />
             <input
               type="text"
               placeholder="Search nodes..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full bg-transparent border border-[var(--outline)] rounded-full py-1.5 pl-9 pr-8 text-sm focus:outline-none focus:border-[var(--primary)]"
             />
             {searchQuery && (
               <button
                 type="button"
                 aria-label="Clear search"
                 onClick={() => setSearchQuery('')}
                 className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
               >
                 <X size={14} />
               </button>
             )}
           </div>

           <div className="flex flex-col gap-2 flex-1">
             <div className="flex flex-wrap items-center gap-2">
               <span className="text-xs font-bold text-[var(--on-surface-variant)] flex items-center gap-1 uppercase tracking-wider mr-2 min-w-[50px]">
                 <Filter size={12} /> Nodes
               </span>
               {allNodeTypes.map(type => (
                 <button
                   key={type}
                   onClick={() => toggleNodeType(type)}
                   className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                     activeNodeTypes.has(type)
                       ? 'bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]'
                       : 'bg-transparent border-[var(--outline)] text-[var(--on-surface-variant)] hover:border-[var(--primary)]'
                   }`}
                 >
                   {type}
                 </button>
               ))}
             </div>

             <div className="flex flex-wrap items-center gap-2">
               <span className="text-xs font-bold text-[var(--on-surface-variant)] flex items-center gap-1 uppercase tracking-wider mr-2 min-w-[50px]">
                 <Filter size={12} /> Edges
               </span>
               {allEdgeTypes.map(type => (
                 <button
                   key={type}
                   onClick={() => toggleEdgeType(type)}
                   className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                     activeEdgeTypes.has(type)
                       ? 'bg-[var(--on-surface)] border-[var(--on-surface-variant)] text-[var(--surface)]'
                       : 'bg-transparent border-[var(--outline)] text-[var(--on-surface-variant)] hover:border-[var(--primary)]'
                   }`}
                 >
                   {type}
                 </button>
               ))}
             </div>
           </div>
        </div>
      </section>

      {/* Main Graph Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-[500px]">
        {/* Graph Container */}
        <div className="flex-1 bg-neutral-900 rounded-3xl border border-[var(--outline)] overflow-hidden relative shadow-inner">
          <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Legend Overlay */}
          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-white shadow-xl pointer-events-none">
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

        {/* Details Panel */}
        <div className={`w-full lg:w-80 bg-[var(--surface-container)] border border-[var(--outline)] rounded-3xl p-5 flex flex-col gap-4 overflow-y-auto transition-opacity ${selectedNode ? 'opacity-100' : 'opacity-50'}`}>
          <div className="flex items-center justify-between">
             <h3 className="text-lg font-bold text-[var(--on-surface)] flex items-center gap-2">
               Details
             </h3>
             {selectedNodeId && (
               <button
                 type="button"
                 aria-label="Close details"
                 onClick={() => setSelectedNodeId(null)}
                 className="p-1 rounded-full hover:bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] transition-colors"
               >
                 <X size={16} />
               </button>
             )}
          </div>

          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-[var(--on-surface-variant)] font-bold uppercase tracking-wider mb-1">Label</p>
                <p className="text-base font-bold text-[var(--primary)]">{selectedNode.label}</p>
                <code className="text-xs text-[var(--on-surface-variant)]">{selectedNode.id}</code>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-[var(--on-surface-variant)] font-bold uppercase tracking-wider mb-1">Type</p>
                  <span className="inline-block px-2 py-1 bg-[var(--surface-container-highest)] rounded text-xs text-[var(--on-surface)] font-medium">
                    {selectedNode.type}
                  </span>
                </div>
                {selectedNode.status && (
                  <div>
                    <p className="text-xs text-[var(--on-surface-variant)] font-bold uppercase tracking-wider mb-1">Status</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      selectedNode.status === 'current' ? 'bg-green-500/10 text-green-500' :
                      selectedNode.status === 'legacy' ? 'bg-amber-500/10 text-amber-500' :
                      selectedNode.status === 'blocked' ? 'bg-red-500/10 text-red-500' :
                      'bg-blue-500/10 text-blue-500'
                    }`}>
                      {selectedNode.status}
                    </span>
                  </div>
                )}
              </div>

              {selectedNode.description && (
                <div>
                  <p className="text-xs text-[var(--on-surface-variant)] font-bold uppercase tracking-wider mb-1">Description</p>
                  <p className="text-sm text-[var(--on-surface)] leading-relaxed">{selectedNode.description}</p>
                </div>
              )}

              {selectedNode.notes && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                  <p className="text-xs font-bold text-amber-500 mb-1">Notes</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">{selectedNode.notes}</p>
                </div>
              )}

              {selectedNodeConnectedEdges.length > 0 && (
                <div>
                   <p className="text-xs text-[var(--on-surface-variant)] font-bold uppercase tracking-wider mb-2 pt-2 border-t border-[var(--outline)]">Connected Edges</p>
                   <div className="space-y-2">
                     {selectedNodeConnectedEdges.map(edge => {
                       const isSource = edge.source === selectedNode.id;
                       const otherNodeId = isSource ? edge.target : edge.source;
                       const otherNode = dataModelNodes.find(n => n.id === otherNodeId);
                       return (
                         <div key={edge.id} className="text-xs flex gap-2 items-start p-2 rounded-lg bg-[var(--surface-container-lowest)] border border-[var(--outline)]">
                           <span className={`px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[8px] mt-0.5 shrink-0 ${isSource ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'}`}>
                             {isSource ? 'OUT' : 'IN'}
                           </span>
                           <div>
                             <p className="font-medium text-[var(--on-surface)]">
                               {edge.label} <span className="text-[var(--on-surface-variant)] font-normal ml-1">
                                 {isSource ? 'to' : 'from'} {otherNode?.label || otherNodeId}
                               </span>
                             </p>
                             {edge.description && (
                               <p className="text-[var(--on-surface-variant)] text-[10px] mt-0.5">{edge.description}</p>
                             )}
                           </div>
                         </div>
                       );
                     })}
                   </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <Info className="text-[var(--on-surface-variant)] mb-2 opacity-50" size={32} />
              <p className="text-sm text-[var(--on-surface-variant)]">Click a node on the graph to view its details.</p>
            </div>
          )}
        </div>
      </div>

      {/* Fallback Text */}
      <noscript>
         <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm shrink-0">
           JavaScript is required to view the interactive graph. Please enable JavaScript or refer to the textual Data Model page.
         </div>
      </noscript>
    </div>
  );
}
