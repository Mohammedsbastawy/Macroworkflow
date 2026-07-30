"use client";
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  Connection,
  Edge,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from './nodeTypes';
import { NodePalette } from './NodePalette';
import { NodeConfigPanel } from './NodeConfigPanel';
import { isValidConnection } from '@/lib/builder/connectionValidator';
import { graphToWorkflowSteps } from '@/lib/builder/graphToSchema';

const INITIAL_NODES: Node[] = [
  { id: 'node-trigger', type: 'trigger', position: { x: 100, y: 180 }, data: { label: 'On Request Submitted', trigger_type: 'on_request_submitted' } },
  { id: 'node-cond', type: 'conditional', position: { x: 380, y: 160 }, data: { label: 'IF Amount > 5000 EGP', condition_field: '{{form.amount}}', condition_operator: 'gt', condition_value: '5000' } },
  { id: 'node-appr-hr', type: 'approval', position: { x: 680, y: 50 }, data: { label: 'HR Manager Review', assignee_type: 'role', assignee_value: 'HR Manager', ola_hours: 4 } },
  { id: 'node-appr-cfo', type: 'approval', position: { x: 680, y: 280 }, data: { label: 'CFO Final Approval', assignee_type: 'role', assignee_value: 'CFO Role', ola_hours: 24 } },
  { id: 'node-email', type: 'send_email', position: { x: 1020, y: 50 }, data: { label: 'Notify Requester', email_to: '{{requester.email}}', email_subject: 'Request Approved' } },
  { id: 'node-ad-webhook', type: 'webhook', position: { x: 1020, y: 280 }, data: { label: 'Provision Account (API)', method: 'POST', webhook_url: 'https://ad.local/api/v1/user/create' } },
  { id: 'node-end', type: 'end', position: { x: 1300, y: 180 }, data: { label: 'Workflow End' } },
];

const INITIAL_EDGES: Edge[] = [
  { id: 'e1', source: 'node-trigger', target: 'node-cond', type: 'smoothstep', animated: true },
  // Conditional handles
  { id: 'e2', source: 'node-cond', sourceHandle: 'false', target: 'node-appr-hr', type: 'smoothstep', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
  { id: 'e3', source: 'node-cond', sourceHandle: 'true', target: 'node-appr-cfo', type: 'smoothstep', animated: true, style: { stroke: '#EF4444', strokeWidth: 2 } },
  // Human Approval multi-port handles
  { id: 'e4', source: 'node-appr-hr', sourceHandle: 'approve', target: 'node-email', type: 'smoothstep', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
  { id: 'e5', source: 'node-appr-cfo', sourceHandle: 'approve', target: 'node-ad-webhook', type: 'smoothstep', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
  { id: 'e6', source: 'node-email', target: 'node-end', type: 'smoothstep', animated: true },
  { id: 'e7', source: 'node-ad-webhook', target: 'node-end', type: 'smoothstep', animated: true },
];

import { 
  fetchWorkflowCanvasGraphAction, 
  saveWorkflowCanvasGraphAction,
  runWorkflowSimulationAction,
  fetchWorkflowSimulationsAction,
  deleteWorkflowSimulationAction
} from '@/app/actions/workflowActions';

import Link from 'next/link';

interface WorkflowCanvasProps {
  workflowSlug?: string;
}

function CanvasInternal({ workflowSlug = 'workflow-enterprise-procurement' }: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [versionNumber, setVersionNumber] = useState<number>(1);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [changeSummary, setChangeSummary] = useState<string>('Initial enterprise workflow setup');

  const [workflowMeta, setWorkflowMeta] = useState<any>(null);

  // Simulation Panel States
  const [showSimulationPanel, setShowSimulationPanel] = useState<boolean>(false);
  const [simFormData, setSimFormData] = useState<Record<string, any>>({});
  const [simRules, setSimRules] = useState<any[]>([]);
  const [simResult, setSimResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simHistory, setSimHistory] = useState<any[]>([]);

  // Simulator Rule form states
  const [simRuleField, setSimRuleField] = useState<string>('');
  const [simRuleOp, setSimRuleOp] = useState<'==' | '!=' | '>' | '<' | 'contains'>('==');
  const [simRuleVal, setSimRuleVal] = useState<string>('');
  const [simRuleTarget, setSimRuleTarget] = useState<string>('');
  const [simRuleTargetVal, setSimRuleTargetVal] = useState<string>('');

  const { screenToFlowPosition } = useReactFlow();

  // Undo / Redo History Stack State
  const historyRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoActionRef = useRef<boolean>(false);

  const pushHistorySnapshot = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
    if (isUndoRedoActionRef.current) {
      isUndoRedoActionRef.current = false;
      return;
    }
    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    nextHistory.push({
      nodes: JSON.parse(JSON.stringify(currentNodes)),
      edges: JSON.parse(JSON.stringify(currentEdges)),
    });
    if (nextHistory.length > 50) nextHistory.shift();
    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const target = historyRef.current[historyIndexRef.current];
      if (target) {
        isUndoRedoActionRef.current = true;
        setNodes(JSON.parse(JSON.stringify(target.nodes)));
        setEdges(JSON.parse(JSON.stringify(target.edges)));
        setSaveStatus('↩ Undo applied (Ctrl+Z)');
        setTimeout(() => setSaveStatus(null), 2000);
      }
    }
  }, [setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const target = historyRef.current[historyIndexRef.current];
      if (target) {
        isUndoRedoActionRef.current = true;
        setNodes(JSON.parse(JSON.stringify(target.nodes)));
        setEdges(JSON.parse(JSON.stringify(target.edges)));
        setSaveStatus('↪ Redo applied (Ctrl+Y)');
        setTimeout(() => setSaveStatus(null), 2000);
      }
    }
  }, [setNodes, setEdges]);

  // Global Keyboard Listener for Ctrl+Z and Ctrl+Y / Ctrl+Shift+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Load existing canvas state from database DB on mount (with local draft recovery fallback)
  useEffect(() => {
    if (!workflowSlug) return;
    setIsHydrated(false);
    fetchWorkflowCanvasGraphAction(workflowSlug)
      .then((res) => {
        let loadedNodes: Node[] = [];
        let loadedEdges: Edge[] = [];

        if (res?.workflow) {
          setWorkflowMeta(res.workflow);
          const wfVer = Number(res.workflow.version || res.workflow.published_version || 1);
          if (!isNaN(wfVer) && wfVer > 0) {
            setVersionNumber(wfVer);
          }
        }

        // Check if DB graph exists
        if (res?.graph?.nodes && res.graph.nodes.length > 0) {
          loadedNodes = res.graph.nodes;
          loadedEdges = res.graph.edges || [];
        } else {
          // Check if local draft backup exists in browser localStorage
          const localDraftRaw = localStorage.getItem(`workflow_draft_${workflowSlug}`);
          if (localDraftRaw) {
            try {
              const parsed = JSON.parse(localDraftRaw);
              if (parsed?.nodes && parsed.nodes.length > 0) {
                loadedNodes = parsed.nodes;
                loadedEdges = parsed.edges || [];
                if (parsed.version) setVersionNumber(parsed.version);
              }
            } catch (e) {}
          }
        }

        setNodes(loadedNodes);
        setEdges(loadedEdges);
        // Initial history snapshot
        historyRef.current = [{ nodes: JSON.parse(JSON.stringify(loadedNodes)), edges: JSON.parse(JSON.stringify(loadedEdges)) }];
        historyIndexRef.current = 0;
      })
      .catch((err) => {
        console.error(err);
        setNodes(INITIAL_NODES);
        setEdges(INITIAL_EDGES);
        historyRef.current = [{ nodes: JSON.parse(JSON.stringify(INITIAL_NODES)), edges: JSON.parse(JSON.stringify(INITIAL_EDGES)) }];
        historyIndexRef.current = 0;
      })
      .finally(() => {
        setIsHydrated(true);
      });
  }, [workflowSlug, setNodes, setEdges]);

  // Local Draft Persistence & Background Auto-Save Timer Effect
  useEffect(() => {
    if (!isHydrated || !workflowSlug || nodes.length === 0) return;

    // 1. Instant Local Storage Backup
    try {
      localStorage.setItem(`workflow_draft_${workflowSlug}`, JSON.stringify({
        nodes,
        edges,
        version: versionNumber,
        updatedAt: Date.now()
      }));
    } catch (e) {}

    // 2. Debounced Background Auto-Save (3s)
    const autoSaveTimer = setTimeout(() => {
      saveWorkflowCanvasGraphAction({
        workflowSlug,
        nodes,
        edges,
        version: versionNumber,
      })
        .then(() => {
          setSaveStatus('💾 Draft auto-saved');
          setTimeout(() => setSaveStatus(null), 2500);
        })
        .catch((e) => console.error('Auto-save error:', e));
    }, 3000);

    return () => clearTimeout(autoSaveTimer);
  }, [nodes, edges, isHydrated, workflowSlug, versionNumber]);

  const onConnect = useCallback(
    (params: Connection) => {
      let stroke = '#6366F1';
      if (params.sourceHandle === 'approve' || params.sourceHandle === 'true') stroke = '#10B981';
      if (params.sourceHandle === 'reject' || params.sourceHandle === 'false') stroke = '#EF4444';
      if (params.sourceHandle === 'timeout') stroke = '#F59E0B';

      setEdges((eds) => {
        const next = addEdge({ ...params, type: 'smoothstep', animated: true, style: { stroke, strokeWidth: 2 } }, eds);
        pushHistorySnapshot(nodes, next);
        return next;
      });
    },
    [setEdges, nodes, pushHistorySnapshot]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData('application/reactflow-node-type');
      const nodeLabel = event.dataTransfer.getData('application/reactflow-node-label');

      if (!nodeType) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: nodeType,
        position,
        data: { label: nodeLabel || 'New Node', ola_hours: 4 },
      };

      setNodes((nds) => {
        const next = [...nds, newNode];
        pushHistorySnapshot(next, edges);
        return next;
      });
      setSelectedNodeId(newNode.id);
      setSelectedEdgeId(null);
    },
    [screenToFlowPosition, setNodes, edges, pushHistorySnapshot]
  );

  const handleUpdateNodeData = (id: string, updatedData: Record<string, unknown>) => {
    setNodes((nds) => {
      const next = nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updatedData } } : n));
      pushHistorySnapshot(next, edges);
      return next;
    });
  };

  const handleDeleteNode = (id: string) => {
    // Push current snapshot BEFORE deletion so Ctrl+Z restores the deleted node!
    pushHistorySnapshot(nodes, edges);
    const nextNodes = nodes.filter((n) => n.id !== id);
    const nextEdges = edges.filter((e) => e.source !== id && e.target !== id);
    setNodes(nextNodes);
    setEdges(nextEdges);
    pushHistorySnapshot(nextNodes, nextEdges);
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const handleDeleteEdge = (edgeId: string) => {
    // Push current snapshot BEFORE deletion so Ctrl+Z restores the deleted wire!
    pushHistorySnapshot(nodes, edges);
    const nextEdges = edges.filter((e) => e.id !== edgeId);
    setEdges(nextEdges);
    pushHistorySnapshot(nodes, nextEdges);
    if (selectedEdgeId === edgeId) setSelectedEdgeId(null);
  };

  const onNodesDelete = useCallback((deletedNodes: Node[]) => {
    pushHistorySnapshot(nodes, edges);
  }, [nodes, edges, pushHistorySnapshot]);

  const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    pushHistorySnapshot(nodes, edges);
  }, [nodes, edges, pushHistorySnapshot]);

  const onEdgeClick = (_: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  };

  const onEdgeContextMenu = (event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    handleDeleteEdge(edge.id);
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId) || null;

  // Load simulation history when panel is shown
  useEffect(() => {
    if (showSimulationPanel && workflowMeta?.id) {
      fetchWorkflowSimulationsAction(workflowMeta.id).then((history) => {
        setSimHistory(history || []);
      });
    }
  }, [showSimulationPanel, workflowMeta?.id]);

  const handleRunSimulation = async () => {
    if (!workflowMeta?.id) return;
    setIsSimulating(true);
    try {
      const res = await runWorkflowSimulationAction(workflowMeta.id, simFormData, simRules);
      setSimResult(res);
      
      const history = await fetchWorkflowSimulationsAction(workflowMeta.id);
      setSimHistory(history || []);
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء تشغيل المحاكاة.');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleAddSimRule = () => {
    if (!simRuleField || !simRuleTarget) {
      alert('يرجى تحديد الحقل الشرطي والحقل المستهدف أولاً.');
      return;
    }
    setSimRules(prev => [...prev, {
      field: simRuleField,
      operator: simRuleOp,
      value: simRuleVal,
      targetField: simRuleTarget,
      targetValue: simRuleTargetVal
    }]);
    setSimRuleField('');
    setSimRuleVal('');
    setSimRuleTarget('');
    setSimRuleTargetVal('');
  };

  const handleDeleteSimRule = (index: number) => {
    setSimRules(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteSimulation = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السجل من تاريخ المحاكاة؟')) return;
    await deleteWorkflowSimulationAction(id);
    if (workflowMeta?.id) {
      const history = await fetchWorkflowSimulationsAction(workflowMeta.id);
      setSimHistory(history || []);
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const res = await saveWorkflowCanvasGraphAction({
        workflowSlug,
        nodes,
        edges,
        version: versionNumber,
      });
      setSaveStatus(`✅ Draft saved to database DB! (${res.stepsCount} steps serialized)`);
    } catch (err: any) {
      setSaveStatus(`❌ Save Error: ${err?.message || err}`);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  const handlePublishVersion = async () => {
    const nextVer = versionNumber + 1;
    setIsSaving(true);
    try {
      const res = await saveWorkflowCanvasGraphAction({
        workflowSlug,
        nodes,
        edges,
        version: nextVer,
      });
      setVersionNumber(nextVer);
      setSaveStatus(`🚀 Published Version v${nextVer}.0! (Persisted to database DB)`);
    } catch (err: any) {
      setSaveStatus(`❌ Publish Error: ${err?.message || err}`);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Canvas Header Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 18px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>⚡ Enterprise Visual Workflow Builder</span>
          <span className="badge info">v{versionNumber}.0 Active</span>
          {saveStatus && (
            <span style={{ fontSize: 12, fontWeight: 600 }}>
              {saveStatus}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-outline btn-sm" onClick={handleUndo} title="Undo (Ctrl+Z)">
            ↩ Undo
          </button>
          <button className="btn btn-outline btn-sm" onClick={handleRedo} title="Redo (Ctrl+Y)">
            ↪ Redo
          </button>
          <button 
            className="btn btn-outline btn-sm" 
            style={{ 
              color: 'var(--color-primary)', 
              borderColor: 'var(--color-primary)', 
              fontWeight: 700,
              background: showSimulationPanel ? 'var(--color-primary-light)' : 'transparent' 
            }} 
            onClick={() => setShowSimulationPanel(!showSimulationPanel)}
          >
            🔬 Simulator
          </button>
          <input
            className="form-control"
            style={{ fontSize: 11, width: 200, padding: '5px 8px' }}
            placeholder="Version Change Summary..."
            value={changeSummary}
            onChange={(e) => setChangeSummary(e.target.value)}
          />
          <button className="btn btn-outline btn-sm" onClick={handleSaveDraft} disabled={isSaving}>
            {isSaving ? '⏳ Saving...' : '💾 Save Draft'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={handlePublishVersion} disabled={isSaving}>
            🚀 Publish Version v{versionNumber + 1}.0
          </button>
        </div>
      </div>

      {/* Infinite Canvas Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <NodePalette />

        {!isHydrated ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B0F19', color: '#94A3B8' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 12px', border: '3px solid #1E293B', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>⚡ Hydrating Visual Canvas...</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Loading node graph & DB version snapshot for {workflowSlug}...</div>
            </div>
          </div>
        ) : (
          <div
            style={{ flex: 1, position: 'relative', background: '#0B0F19' }}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodesDelete={onNodesDelete}
              onEdgesDelete={onEdgesDelete}
              onNodeClick={(_, node) => {
                setSelectedNodeId(node.id);
                setSelectedEdgeId(null);
              }}
              onEdgeClick={onEdgeClick}
              onEdgeContextMenu={onEdgeContextMenu}
              onPaneClick={() => {
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
              }}
              edgesFocusable={true}
              edgesReconnectable={true}
              deleteKeyCode={['Backspace', 'Delete']}
              nodeTypes={nodeTypes}
              isValidConnection={(conn) => isValidConnection(conn, nodes)}
              defaultEdgeOptions={{ type: 'smoothstep', animated: true, focusable: true, style: { strokeWidth: 2.5, cursor: 'pointer' } }}
              connectionRadius={40}
              connectOnClick={true}
              connectionLineStyle={{ stroke: '#6366F1', strokeWidth: 3 }}
              snapToGrid
              snapGrid={[15, 15]}
              fitView
            >
              <Background variant={'dots' as any} gap={18} size={1.2} color="#1E293B" />
              <Controls />
              <MiniMap nodeStrokeWidth={3} zoomable pannable style={{ background: '#1E293B', borderRadius: 8 }} />
            </ReactFlow>
          </div>
        )}

        <NodeConfigPanel
          node={selectedNode}
          edge={selectedEdge}
          onUpdateNodeData={handleUpdateNodeData}
          onDeleteNode={handleDeleteNode}
          onDeleteEdge={handleDeleteEdge}
        />

        {/* Simulation Panel Drawer */}
        {showSimulationPanel && (
          <div style={{
            width: 450,
            borderLeft: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflowY: 'auto',
            padding: 20,
            boxShadow: '-4px 0 10px rgba(0,0,0,0.05)',
            direction: 'rtl',
            textAlign: 'right'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--color-border)', paddingBottom: 10 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--color-primary)' }}>🔬 محاكي مسار تدفق العمل</h3>
              <button 
                onClick={() => setShowSimulationPanel(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >✕</button>
            </div>

            {/* TAB CONTAINER: 1. Inputs & Rules | 2. History */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
              
              {/* Form Input fields */}
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--color-text-secondary)' }}>📝 الحقول المدخلة للطلب:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--color-bg)', padding: 12, borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  {workflowMeta?.fields_json && workflowMeta.fields_json.length > 0 ? (
                    workflowMeta.fields_json.map((f: any) => (
                      <div key={f.field_key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: 11, fontWeight: 700 }}>{f.label} ({f.field_key})</label>
                        {f.field_type === 'number' ? (
                          <input
                            type="number"
                            className="form-control"
                            style={{ fontSize: 12, padding: '6px 10px' }}
                            placeholder={`أدخل ${f.label}...`}
                            value={simFormData[f.field_key] || ''}
                            onChange={(e) => setSimFormData(prev => ({ ...prev, [f.field_key]: Number(e.target.value) }))}
                          />
                        ) : f.field_type === 'select' || f.field_type === 'multiselect' ? (
                          <select
                            className="form-control"
                            style={{ fontSize: 12, padding: '6px 10px' }}
                            value={simFormData[f.field_key] || ''}
                            onChange={(e) => setSimFormData(prev => ({ ...prev, [f.field_key]: e.target.value }))}
                          >
                            <option value="">-- اختر قيمة --</option>
                            {(f.options_json || []).map((o: any) => (
                              <option key={o.value || o} value={o.value || o}>{o.label || o}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            className="form-control"
                            style={{ fontSize: 12, padding: '6px 10px' }}
                            placeholder={`أدخل ${f.label}...`}
                            value={simFormData[f.field_key] || ''}
                            onChange={(e) => setSimFormData(prev => ({ ...prev, [f.field_key]: e.target.value }))}
                          />
                        )}
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center' }}>
                      لا توجد حقول معرفة في هذا النموذج. يمكنك إدخال قيم يدوية أدناه:
                    </div>
                  )}

                  {/* Add manual custom fields */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
                    <input
                      type="text"
                      id="custom-field-key"
                      placeholder="اسم الحقل (e.g. amount)"
                      className="form-control"
                      style={{ fontSize: 11, padding: '4px 8px', flex: 1 }}
                    />
                    <input
                      type="text"
                      id="custom-field-val"
                      placeholder="القيمة"
                      className="form-control"
                      style={{ fontSize: 11, padding: '4px 8px', flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline btn-xs"
                      onClick={() => {
                        const k = (document.getElementById('custom-field-key') as HTMLInputElement)?.value;
                        const v = (document.getElementById('custom-field-val') as HTMLInputElement)?.value;
                        if (k) {
                          setSimFormData(prev => ({ ...prev, [k]: isNaN(Number(v)) ? v : Number(v) }));
                          (document.getElementById('custom-field-key') as HTMLInputElement).value = '';
                          (document.getElementById('custom-field-val') as HTMLInputElement).value = '';
                        }
                      }}
                    >＋</button>
                  </div>
                  {/* List manually added keys */}
                  {Object.keys(simFormData).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {Object.entries(simFormData).map(([k, v]) => (
                        <span key={k} className="tag" style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {k}: {String(v)}
                          <span 
                            style={{ cursor: 'pointer', color: 'var(--color-danger)' }}
                            onClick={() => setSimFormData(prev => {
                              const copy = { ...prev };
                              delete copy[k];
                              return copy;
                            })}
                          >✕</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* RFA Automated Value Settings */}
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--color-text-secondary)' }}>⚡ القواعد الشرطية للمحاكاة (Automated Value Rules):</h4>
                <div style={{ background: 'var(--color-bg)', padding: 12, borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 11 }}>
                  
                  {/* Rule form */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        placeholder="إذا كان حقل (e.g. amount)"
                        className="form-control"
                        style={{ fontSize: 11, padding: '4px 8px', flex: 2 }}
                        value={simRuleField}
                        onChange={(e) => setSimRuleField(e.target.value)}
                      />
                      <select
                        className="form-control"
                        style={{ fontSize: 11, padding: '4px 6px', flex: 1 }}
                        value={simRuleOp}
                        onChange={(e) => setSimRuleOp(e.target.value as any)}
                      >
                        <option value="==">يساوي</option>
                        <option value="!=">لا يساوي</option>
                        <option value=">">أكبر من</option>
                        <option value="<">أصغر من</option>
                        <option value="contains">يحتوي على</option>
                      </select>
                      <input
                        placeholder="القيمة"
                        className="form-control"
                        style={{ fontSize: 11, padding: '4px 8px', flex: 1 }}
                        value={simRuleVal}
                        onChange={(e) => setSimRuleVal(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span>⬅ اجعل حقل:</span>
                      <input
                        placeholder="اسم الحقل المستهدف"
                        className="form-control"
                        style={{ fontSize: 11, padding: '4px 8px', flex: 1 }}
                        value={simRuleTarget}
                        onChange={(e) => setSimRuleTarget(e.target.value)}
                      />
                      <span>يساوي:</span>
                      <input
                        placeholder="القيمة الجديدة"
                        className="form-control"
                        style={{ fontSize: 11, padding: '4px 8px', flex: 1 }}
                        value={simRuleTargetVal}
                        onChange={(e) => setSimRuleTargetVal(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        style={{ padding: '6px 10px' }}
                        onClick={handleAddSimRule}
                      >أضف</button>
                    </div>
                  </div>

                  {/* List of rules */}
                  {simRules.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--color-border)', paddingTop: 8 }}>
                      {simRules.map((rule, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface)', padding: '6px 10px', borderRadius: 4, border: '1px solid var(--color-border)' }}>
                          <div>
                            إذا كان <strong>{rule.field}</strong> {rule.operator} {rule.value} ➔ عيّن <strong>{rule.targetField}</strong> = {rule.targetValue}
                          </div>
                          <button 
                            type="button"
                            style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
                            onClick={() => handleDeleteSimRule(idx)}
                          >🗑</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '6px 0' }}>
                      لا توجد قواعد آلية مضافة بعد.
                    </div>
                  )}
                </div>
              </div>

              {/* Simulation Trigger Button */}
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', padding: '10px 0', fontWeight: 800, fontSize: 13, marginTop: 12, marginBottom: 12 }}
                onClick={handleRunSimulation}
                disabled={isSimulating}
              >
                {isSimulating ? '⏳ جاري تشغيل المحاكاة...' : '▶️ تشغيل محاكاة المسار'}
              </button>

              {/* RESULTS AREA */}
              {simResult && (
                <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--color-text-primary)' }}>📊 نتيجة المسار المحاكى:</h4>
                  
                  {/* Summary card */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--color-bg)', padding: 12, borderRadius: 8, border: '1px solid var(--color-border)', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>مدة الاعتمادات الإجمالية</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-primary)' }}>{simResult.durationHours} ساعة</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>حالة اكتمال المسار</div>
                      <span className="badge success">مكتمل ✓</span>
                    </div>
                  </div>

                  {/* Step list logs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', paddingRight: 12 }}>
                    {simResult.executionPath.map((step: any, idx: number) => (
                      <div key={idx} style={{ 
                        position: 'relative', 
                        paddingRight: 18, 
                        borderRight: idx === simResult.executionPath.length - 1 ? 'none' : '2px dashed var(--color-border)',
                        paddingBottom: 12
                      }}>
                        {/* Dot indicator */}
                        <div style={{
                          position: 'absolute',
                          right: -5,
                          top: 4,
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: step.status === 'success' ? '#10B981' : step.status === 'warning' ? '#F59E0B' : step.status === 'error' ? '#EF4444' : '#3B82F6'
                        }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: 12 }}>{step.nodeName}</span>
                          <span className={`badge ${step.status === 'success' ? 'success' : step.status === 'warning' ? 'warning' : step.status === 'error' ? 'urgent' : 'info'}`} style={{ fontSize: 9 }}>
                            {step.stepType.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                          {step.message}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SIMULATION HISTORY LIST */}
              {simHistory.length > 0 && (
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, marginTop: 16 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--color-text-secondary)' }}>🕒 سجل المحاكات السابقة:</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 150, overflowY: 'auto' }}>
                    {simHistory.map((sim: any) => (
                      <div key={sim.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700 }}>{sim.name}</div>
                          <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>
                            {new Date(sim.created_at).toLocaleString('ar-EG')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-xs"
                            style={{ fontSize: 9 }}
                            onClick={() => {
                              setSimFormData(sim.initial_form_data || {});
                              setSimRules(sim.trigger_rules_json || []);
                              setSimResult({
                                success: true,
                                executionPath: sim.execution_path_json || [],
                                durationHours: (sim.execution_path_json || []).reduce((acc: number, step: any) => acc + (step.ola_hours || 0), 0)
                              });
                            }}
                          >استرجاع</button>
                          <button
                            type="button"
                            className="btn btn-outline btn-xs"
                            style={{ fontSize: 9, color: 'var(--color-danger)' }}
                            onClick={() => handleDeleteSimulation(sim.id)}
                          >حذف</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function WorkflowCanvas({ workflowSlug }: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInternal workflowSlug={workflowSlug} />
    </ReactFlowProvider>
  );
}

