import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Zap, Check, AlertCircle, RefreshCw, Cpu, Play, HelpCircle, Activity, Maximize2 } from "lucide-react";

interface Task {
  id: string;
  goal_id: string;
  description: string;
  type: string;
  parameters: Record<string, any>;
  assigned_agent?: string;
  status: "pending" | "assigned" | "executing" | "completed" | "failed";
  dependencies?: string[];
  completed_at?: string;
}

interface TaskDependencyTreeProps {
  tasks: Task[];
  onExecuteTask: (taskId: string) => Promise<void>;
  isExecutingTask: Record<string, boolean>;
}

export const TaskDependencyTree: React.FC<TaskDependencyTreeProps> = ({
  tasks,
  onExecuteTask,
  isExecutingTask,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef<any>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 350 });
  const [layoutMode, setLayoutMode] = useState<"ranked" | "force">("ranked");
  const [reLayoutNonce, setReLayoutNonce] = useState(0);

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    svg.transition()
      .duration(400)
      .call(zoomRef.current.transform, d3.zoomIdentity);
    localStorage.removeItem("task_dependency_tree_zoom");
  };

  const handleScaleToFit = () => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    const zoomContainer = svg.select(".zoom-container");
    if (zoomContainer.empty()) return;

    const node = zoomContainer.node() as any;
    if (node && typeof node.getBBox === "function") {
      const bbox = node.getBBox();
      const svgWidth = dimensions.width;
      const svgHeight = dimensions.height;
      const bboxWidth = bbox.width;
      const bboxHeight = bbox.height;

      if (bboxWidth === 0 || bboxHeight === 0) return;

      const padding = 45;
      const scale = Math.min(
        (svgWidth - padding * 2) / bboxWidth,
        (svgHeight - padding * 2) / bboxHeight
      );

      // Keep scale within sensible zoom limits [0.4, 2]
      const boundedScale = Math.max(0.4, Math.min(2, scale));

      const centerX = bbox.x + bboxWidth / 2;
      const centerY = bbox.y + bboxHeight / 2;

      const tx = svgWidth / 2 - centerX * boundedScale;
      const ty = svgHeight / 2 - centerY * boundedScale;

      const transform = d3.zoomIdentity.translate(tx, ty).scale(boundedScale);

      svg.transition()
        .duration(500)
        .ease(d3.easeCubicOut)
        .call(zoomRef.current.transform, transform);
    }
  };

  // Maintain active selected task reference on task updates
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      if (!selectedTask) {
        setSelectedTask(tasks[0]);
      } else {
        const updated = tasks.find(t => t.id === selectedTask.id);
        if (updated) {
          setSelectedTask(updated);
        }
      }
    } else {
      setSelectedTask(null);
    }
  }, [tasks]);

  // Handle ResizeObserver to maintain fluid container sizes
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        // Keep a neat aspect ratio or bounded size
        const innerW = Math.max(500, width);
        setDimensions({
          width: innerW,
          height: 320,
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Primary rendering cycle using D3
  useEffect(() => {
    if (!svgRef.current || !tasks || tasks.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous layouts

    // Create the master zoom-container first within SVG
    const zoomContainer = svg.append("g").attr("class", "zoom-container");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on("zoom", (event) => {
        zoomContainer.attr("transform", event.transform);
        const transform = {
          x: event.transform.x,
          y: event.transform.y,
          k: event.transform.k,
        };
        localStorage.setItem("task_dependency_tree_zoom", JSON.stringify(transform));
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // Apply saved zoom level from localStorage if it exists
    const savedZoom = localStorage.getItem("task_dependency_tree_zoom");
    if (savedZoom) {
      try {
        const { x, y, k } = JSON.parse(savedZoom);
        if (typeof x === "number" && typeof y === "number" && typeof k === "number") {
          svg.call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(k));
        }
      } catch (e) {
        console.error("Failed to restore saved zoom from localStorage", e);
      }
    }

    const { width, height } = dimensions;
    const margin = { top: 40, right: 120, bottom: 40, left: 60 };

    // Deep clone tasks so we don't mutate react state directly
    const nodesData = tasks.map((t, index) => ({
      ...t,
      dependencies: t.dependencies ? [...t.dependencies] : [],
      rank: 0,
      index,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
    }));

    // Fallback: if there are no explicit cross-dependencies, chain them sequentially for neat visual flow
    const hasAnyDeps = nodesData.some((n) => n.dependencies && n.dependencies.length > 0);
    if (!hasAnyDeps) {
      nodesData.forEach((n, idx) => {
        n.rank = idx;
        if (idx > 0) {
          n.dependencies = [nodesData[idx - 1].id];
        }
      });
    } else {
      // Calculate topological depth using an iterative relaxation technique
      let changed = true;
      let iterations = 0;
      while (changed && iterations < 50) {
        changed = false;
        iterations++;
        for (const node of nodesData) {
          let maxDepRank = -1;
          for (const depId of node.dependencies) {
            const depNode = nodesData.find((n) => n.id === depId);
            if (depNode) {
              maxDepRank = Math.max(maxDepRank, depNode.rank);
            }
          }
          if (maxDepRank + 1 > node.rank) {
            node.rank = maxDepRank + 1;
            changed = true;
          }
        }
      }
    }

    const maxRank = (d3.max(nodesData, (d: any) => d.rank) || 0) as number;

    // Distribute nodes coordinates deterministically
    const rankGroups: Record<number, typeof nodesData> = {};
    nodesData.forEach((node) => {
      if (!rankGroups[node.rank]) {
        rankGroups[node.rank] = [];
      }
      rankGroups[node.rank].push(node);
    });

    Object.entries(rankGroups).forEach(([rank, group]) => {
      const rNum = Number(rank);
      const numInGroup = group.length;

      group.forEach((node, idx) => {
        // Space columns evenly horizontally
        if (maxRank === 0) {
          node.x = width / 2;
        } else {
          node.x = margin.left + (rNum * (width - margin.left - margin.right)) / maxRank;
        }

        // Space nodes vertically inside their columns
        if (numInGroup === 1) {
          node.y = height / 2;
        } else {
          const verticalRange = height - margin.top - margin.bottom;
          const step = verticalRange / (numInGroup - 1);
          node.y = margin.top + idx * step;
        }
      });
    });

    // Create link paths
    const linksData: Array<{ source: typeof nodesData[0]; target: typeof nodesData[0]; id: string }> = [];
    nodesData.forEach((node) => {
      node.dependencies.forEach((depId) => {
        const parentNode = nodesData.find((n) => n.id === depId);
        if (parentNode) {
          linksData.push({ 
            source: parentNode, 
            target: node, 
            id: `${parentNode.id}-${node.id}`
          });
        }
      });
    });

    // Add filters for cool dropshadow glows
    const defs = svg.append("defs");
    
    // Status glows
    const createShadowFilter = (id: string, color: string) => {
      const filter = defs.append("filter").attr("id", id).attr("x", "-20%").attr("y", "-20%").attr("width", "140%").attr("height", "140%");
      filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "blur");
      filter.append("feComponentTransfer").append("feFuncA").attr("type", "linear").attr("slope", "0.4");
      filter.append("feMerge").append("feMergeNode");
      filter.select("feMerge").append("feMergeNode").attr("in", "SourceGraphic");
    };
    
    createShadowFilter("glow-completed", "#10b981");
    createShadowFilter("glow-executing", "#f59e0b");

    const pathwaysGroup = zoomContainer.append("g").attr("class", "paths");
    const nodesGroup = zoomContainer.append("g").attr("class", "nodes");

    let simulation: d3.Simulation<any, undefined> | null = null;

    if (layoutMode === "force") {
      // Add slight jitter so simulation springs dynamically
      nodesData.forEach((n) => {
        n.x = n.x + (Math.random() - 0.5) * 30;
        n.y = n.y + (Math.random() - 0.5) * 30;
      });

      simulation = d3.forceSimulation<any>(nodesData)
        .force("link", d3.forceLink<any, any>(linksData).id((d: any) => d.id).distance(110).strength(0.85))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(32))
        .force("y", d3.forceY(height / 2).strength(0.12))
        .force("x", d3.forceX(width / 2).strength(0.08));

      simulation.alpha(1).restart();
    }

    // Render connection pathways backplanes
    const linkPath = pathwaysGroup
      .selectAll("path")
      .data(linksData)
      .enter()
      .append("path")
      .attr("fill", "none")
      .attr("stroke", "#141414")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", (d) => (d.target.status === "pending" ? "5,5" : "none"))
      .attr("opacity", (d) => (d.target.status === "pending" ? 0.35 : 0.85));

    // Arrow markers for line direction
    defs
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 18) // position relative to node center
      .attr("refY", 5)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto-start-reverse")
      .append("path")
      .attr("d", "M 0 1 L 10 5 L 0 9 z")
      .attr("fill", "#141414");
      
    zoomContainer.selectAll("path").attr("marker-end", "url(#arrow)");

    // Render Task nodes
    const nodeG = nodesGroup
      .selectAll("g")
      .data(nodesData)
      .enter()
      .append("g")
      .attr("transform", (d: any) => `translate(${d.x}, ${d.y})`)
      .style("cursor", "pointer")
      .on("click", (event, d: any) => {
        // Strip out the coordinate attributes before placing back into React State
        const { x, y, vx, vy, fx, fy, index, rank, ...rest } = d;
        setSelectedTask(rest as Task);
      });

    // Outer interactive outline node circle
    nodeG
      .append("circle")
      .attr("r", (d: any) => (selectedTask && selectedTask.id === d.id ? 15 : 12))
      .attr("fill", (d: any) => {
        switch (d.status) {
          case "completed":
            return "#EBFDF5"; // Emerald light
          case "executing":
            return "#FFFCE8"; // Amber light
          case "failed":
            return "#FEF2F2"; // Red light
          default:
            return "#FFFFFF";
        }
      })
      .attr("stroke", (d: any) => {
        if (selectedTask && selectedTask.id === d.id) {
          return "#F27D26"; // Vibrant orange core
        }
        switch (d.status) {
          case "completed":
            return "#10B981";
          case "executing":
            return "#F59E0B";
          case "failed":
            return "#EF4444";
          default:
            return "#141414";
        }
      })
      .attr("stroke-width", (d: any) => (selectedTask && selectedTask.id === d.id ? 3 : 2))
      .attr("filter", (d: any) => {
        if (d.status === "completed") return "url(#glow-completed)";
        if (d.status === "executing") return "url(#glow-executing)";
        return null;
      });

    // Sleek Status center indicators
    nodeG
      .append("circle")
      .attr("r", 4)
      .attr("fill", (d: any) => {
        switch (d.status) {
          case "completed":
            return "#10B981";
          case "executing":
            return "#F59E0B";
          case "failed":
            return "#EF4444";
          default:
            return "#D6D5D1";
        }
      });

    // Dynamic scale/pulsate outer rings for executing jobs
    const pulsatingNodes = nodeG.filter((d: any) => d.status === "executing");
    pulsatingNodes
      .append("circle")
      .attr("r", 12)
      .attr("fill", "none")
      .attr("stroke", "#F59E0B")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.8)
      .append("animate")
      .attr("attributeName", "r")
      .attr("values", "12;24")
      .attr("dur", "1.5s")
      .attr("repeatCount", "indefinite");

    pulsatingNodes
      .select("animate")
      .clone()
      .attr("attributeName", "opacity")
      .attr("values", "0.8;0");

    // Display Name label above/side
    nodeG
      .append("text")
      .attr("dy", -20)
      .attr("text-anchor", "middle")
      .attr("font-family", "JetBrains Mono, ui-monospace, SFMono-Regular, monospace")
      .attr("font-size", "10px")
      .attr("font-weight", "800")
      .attr("fill", "#141414")
      .text((d: any) => {
        const types: Record<string, string> = {
          "planning": "Plan",
          "research": "Research",
          "copywriting": "Copy",
          "content": "Compose",
          "deployment": "Deploy",
          "validate": "Audit"
        };
        return `${types[d.type.toLowerCase()] || d.type.toUpperCase()}`;
      });

    // Display status pill under node
    nodeG
      .append("text")
      .attr("dy", 24)
      .attr("text-anchor", "middle")
      .attr("font-family", "Inter, system-ui, sans-serif")
      .attr("font-size", "8px")
      .attr("font-weight", "600")
      .attr("fill", "#141414")
      .attr("opacity", 0.65)
      .text((d: any) => d.assigned_agent ? `@${d.assigned_agent.split("-")[0]}` : "agent");

    // Add dragging handling in force mode
    if (layoutMode === "force" && simulation) {
      const dragBehavior = d3.drag<any, any>()
        .on("start", (event, d) => {
          if (!event.active) simulation?.alphaTarget(0.2).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation?.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        });

      nodeG.call(dragBehavior as any);
    }

    // Connect tick update loop
    if (layoutMode === "force" && simulation) {
      simulation.on("tick", () => {
        linkPath.attr("d", (d: any) => {
          return `M ${d.source.x} ${d.source.y} L ${d.target.x} ${d.target.y}`;
        });
        nodeG.attr("transform", (d: any) => `translate(${d.x}, ${d.y})`);
      });
    } else {
      const linkGenerator = d3
        .linkHorizontal<any, any>()
        .x((d: any) => d.x)
        .y((d: any) => d.y);

      linkPath.attr("d", linkGenerator as any);
    }

    return () => {
      if (simulation) simulation.stop();
    };

  }, [dimensions, tasks, selectedTask, layoutMode, reLayoutNonce]);

  return (
    <div className="bg-white border-2 border-[#141414] p-5 brutalist-shadow-xs flex flex-col gap-4">
      
      {/* Title Panel */}
      <div className="border-b-2 border-[#141414] pb-3 flex justify-between items-center bg-[#F5F4F0] p-3 -m-5 mb-1.5 border-t-0 border-x-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#F27D26]" />
          <span className="text-[10px] font-mono font-extrabold text-[#141414] uppercase tracking-wider block">
            D3 Live Dependency Graph Flow
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[8px] text-[#141414]/60 uppercase font-black">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Completed
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Running
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" /> Pending
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch mt-2">
        {/* SVG Drawing Canvas on Left */}
        <div ref={containerRef} className="lg:col-span-8 bg-[#F5F4F0] border-2 border-[#141414] relative h-[320px] flex items-center justify-center overflow-hidden">
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            className="w-full h-full select-none cursor-grab active:cursor-grabbing"
          />
          <div className="absolute top-2.5 left-2.5 bg-white border border-[#141414] px-2 py-0.5 text-[8px] font-mono text-[#141414]/65 uppercase font-bold">
            Interactive Canvas • Drag to Pan, Scroll to Zoom • Drag nodes in Force flow
          </div>
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10 scale-90 sm:scale-100 origin-right">
            {/* Mode selection toggle */}
            <div className="flex bg-white border-2 border-[#141414] rounded-none">
              <button
                type="button"
                onClick={() => setLayoutMode("ranked")}
                className={`px-2 py-0.5 font-mono text-[8.5px] font-extrabold uppercase transition-all tracking-wider border-r border-[#141414] cursor-pointer ${
                  layoutMode === "ranked"
                    ? "bg-[#141414] text-[#E4E3E0]"
                    : "bg-white text-[#141414] hover:bg-[#F27D26]/20"
                }`}
                title="Structured chronological pipeline flow"
              >
                Ranked
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("force")}
                className={`px-2 py-0.5 font-mono text-[8.5px] font-extrabold uppercase transition-all tracking-wider cursor-pointer ${
                  layoutMode === "force"
                    ? "bg-[#141414] text-[#E4E3E0]"
                    : "bg-white text-[#141414] hover:bg-[#F27D26]/20"
                }`}
                title="Force-directed organic simulation flow"
              >
                Force
              </button>
            </div>

            <button
              onClick={() => {
                setReLayoutNonce(prev => prev + 1);
                handleResetZoom();
              }}
              className="bg-white hover:bg-[#F27D26] hover:text-[#141414] transition-all border-2 border-[#141414] px-2 py-0.5 font-mono text-[8.5px] font-black uppercase tracking-wider brutalist-shadow-xs cursor-pointer flex items-center gap-1"
              title="Trigger a force-directed simulation layout reset to automatically unclutter"
            >
              <Zap className="w-3 h-3 text-[#F27D26]" />
              Re-layout
            </button>

            <button
              onClick={handleScaleToFit}
              className="bg-white hover:bg-[#F27D26] hover:text-[#141414] transition-all border-2 border-[#141414] px-2 py-0.5 font-mono text-[8.5px] font-black uppercase tracking-wider brutalist-shadow-xs cursor-pointer flex items-center gap-1"
              title="Scale and reposition view to fit all nodes cleanly"
            >
              <Maximize2 className="w-3 h-3 text-[#141414]" />
              Scale to Fit
            </button>

            <button
              onClick={handleResetZoom}
              className="bg-white hover:bg-[#F27D26] hover:text-[#141414] transition-all border-2 border-[#141414] px-2 py-0.5 font-mono text-[8.5px] font-black uppercase tracking-wider brutalist-shadow-xs cursor-pointer flex items-center gap-1"
              title="Reset Zoom to natural defaults"
            >
              <RefreshCw className="w-3 h-3 text-[#141414]" />
              Reset Zoom
            </button>
          </div>
        </div>

        {/* Selected Task Inspection details panel */}
        <div className="lg:col-span-4 bg-[#D6D5D1]/30 border-2 border-[#141414] p-4 flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-mono text-cyan-950 uppercase font-bold block mb-1">
              Active Inspector Panel
            </span>
            
            {selectedTask ? (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-start gap-2 border-b border-[#141414]/10 pb-2">
                  <h4 className="font-mono font-black text-xs uppercase text-[#141414] break-all">
                    {selectedTask.id}
                  </h4>
                  <span className={`inline-block px-1.5 py-0.2 text-[8px] font-mono font-black border uppercase shrink-0 ${
                    selectedTask.status === "completed"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-500"
                      : selectedTask.status === "executing"
                      ? "bg-amber-100 text-amber-800 border-amber-500 animate-pulse"
                      : selectedTask.status === "failed"
                      ? "bg-red-100 text-red-800 border-red-500"
                      : "bg-white text-gray-700 border-gray-400"
                  }`}>
                    {selectedTask.status}
                  </span>
                </div>

                <div>
                  <span className="text-[8px] font-mono uppercase text-[#141414]/60 block font-bold">Description</span>
                  <p className="text-xs font-serif italic text-[#141414] mt-0.5 font-bold capitalize">
                    "{selectedTask.description}"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-[8px] font-mono uppercase text-[#141414]/60 block font-bold">Type Code</span>
                    <span className="font-mono font-bold uppercase text-stone-800 bg-white/60 px-1 border border-stone-200">{selectedTask.type}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-mono uppercase text-[#141414]/60 block font-bold">Primary Owner</span>
                    <span className="font-mono font-extrabold uppercase text-[#141414]">@{selectedTask.assigned_agent || "system-core"}</span>
                  </div>
                </div>

                {selectedTask.parameters && Object.keys(selectedTask.parameters).length > 0 && (
                  <div>
                    <span className="text-[8px] font-mono uppercase text-[#141414]/60 block font-bold mb-1">Worker Input Parameters</span>
                    <pre className="text-[8px] font-mono bg-white p-2 border border-[#141414]/10 max-h-24 overflow-y-auto select-all break-words leading-tight text-[#141414]/85">
                      {JSON.stringify(selectedTask.parameters, null, 1)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-[10px] font-mono text-[#141414]/40 mt-12">
                <HelpCircle className="w-8 h-8 mx-auto stroke-[1.5] mb-2 text-[#141414]/25" />
                Select a pathway node relative to your goal to inspect metadata specs & trigger manually!
              </div>
            )}
          </div>

          {selectedTask && (
            <div className="border-t border-[#141414]/15 pt-3 mt-4">
              <button
                onClick={() => onExecuteTask(selectedTask.id)}
                disabled={isExecutingTask[selectedTask.id] || selectedTask.status === "completed"}
                className={`w-full py-2 px-3 font-mono text-[10px] font-bold uppercase tracking-wider border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  selectedTask.status === "completed"
                    ? "bg-emerald-100 border-emerald-500 text-emerald-900 opacity-60 pointer-events-none"
                    : isExecutingTask[selectedTask.id]
                    ? "bg-[#141414] text-white border-[#141414]"
                    : "bg-[#141414] text-white hover:bg-[#F27D26] hover:text-[#141414] border-[#141414] brutalist-shadow-xs"
                }`}
              >
                {isExecutingTask[selectedTask.id] ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Executing Job...
                  </>
                ) : selectedTask.status === "completed" ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Completed Successfully
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    Manually Dispatch Job
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};
