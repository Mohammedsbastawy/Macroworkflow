import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';

const handleStyle = {
  width: 14,
  height: 14,
  cursor: 'crosshair',
  boxShadow: '0 0 0 3px #1E293B',
};

export const RuleCriterionNode = memo(({ data, selected }: NodeProps<Node<{ label: string; field?: string; operator?: string; value?: string }>>) => (
  <div style={{
    background: '#1E293B',
    border: `2px solid ${selected ? '#F59E0B' : '#D97706'}`,
    borderRadius: 10,
    padding: '10px 14px',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    minWidth: 190,
    boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
  }}>
    <Handle type="target" position={Position.Top} id="in" style={{ ...handleStyle, background: '#D97706' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FBBF24' }}>
      <span>⚖️</span>
      <span style={{ color: '#fff' }}>{(data.label as string) || 'Business Rule IF Match'}</span>
    </div>
    <div style={{ fontSize: 10, color: '#CBD5E1', marginTop: 4, fontFamily: 'monospace' }}>
      IF {(data.field as string) || 'category'} {(data.operator as string) || '=='} {(data.value as string) || 'Hardware'}
    </div>
    <Handle type="source" position={Position.Bottom} id="true" style={{ ...handleStyle, left: '30%', background: '#10B981' }} title="On Match (True)" />
    <Handle type="source" position={Position.Bottom} id="false" style={{ ...handleStyle, left: '70%', background: '#EF4444' }} title="Else (False)" />
  </div>
));
RuleCriterionNode.displayName = 'RuleCriterionNode';

export const AssignGroupNode = memo(({ data, selected }: NodeProps<Node<{ label: string; group_name?: string }>>) => (
  <div style={{
    background: '#1E293B',
    border: `2px solid ${selected ? '#818CF8' : '#4F46E5'}`,
    borderRadius: 10,
    padding: '10px 14px',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    minWidth: 180,
    boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
  }}>
    <Handle type="target" position={Position.Top} id="in" style={{ ...handleStyle, background: '#4F46E5' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#A5B4FC' }}>
      <span>👥</span>
      <span style={{ color: '#fff' }}>{(data.label as string) || 'Assign to Group'}</span>
    </div>
    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
      Group: <strong style={{ color: '#E2E8F0' }}>{(data.group_name as string) || 'IT Managers Group'}</strong>
    </div>
    <Handle type="source" position={Position.Bottom} id="out" style={{ ...handleStyle, background: '#4F46E5' }} />
  </div>
));
AssignGroupNode.displayName = 'AssignGroupNode';

export const AssignUserNode = memo(({ data, selected }: NodeProps<Node<{ label: string; user_name?: string }>>) => (
  <div style={{
    background: '#1E293B',
    border: `2px solid ${selected ? '#C084FC' : '#9333EA'}`,
    borderRadius: 10,
    padding: '10px 14px',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    minWidth: 180,
    boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
  }}>
    <Handle type="target" position={Position.Top} id="in" style={{ ...handleStyle, background: '#9333EA' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#E9D5FF' }}>
      <span>👤</span>
      <span style={{ color: '#fff' }}>{(data.label as string) || 'Assign to Tech / User'}</span>
    </div>
    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
      User: <strong style={{ color: '#E2E8F0' }}>{(data.user_name as string) || 'Ahmed Mohamed'}</strong>
    </div>
    <Handle type="source" position={Position.Bottom} id="out" style={{ ...handleStyle, background: '#9333EA' }} />
  </div>
));
AssignUserNode.displayName = 'AssignUserNode';

export const SetPriorityNode = memo(({ data, selected }: NodeProps<Node<{ label: string; priority?: string }>>) => (
  <div style={{
    background: '#1E293B',
    border: `2px solid ${selected ? '#FCA5A5' : '#EF4444'}`,
    borderRadius: 10,
    padding: '10px 14px',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    minWidth: 170,
    boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
  }}>
    <Handle type="target" position={Position.Top} id="in" style={{ ...handleStyle, background: '#EF4444' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FCA5A5' }}>
      <span>🚩</span>
      <span style={{ color: '#fff' }}>{(data.label as string) || 'Set Priority Level'}</span>
    </div>
    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
      Priority: <strong style={{ color: '#EF4444' }}>{(data.priority as string || 'High').toUpperCase()}</strong>
    </div>
    <Handle type="source" position={Position.Bottom} id="out" style={{ ...handleStyle, background: '#EF4444' }} />
  </div>
));
SetPriorityNode.displayName = 'SetPriorityNode';

export const SetStatusNode = memo(({ data, selected }: NodeProps<Node<{ label: string; status?: string; pending_reason?: string }>>) => (
  <div style={{
    background: '#1E293B',
    border: `2px solid ${selected ? '#67E8F9' : '#0891B2'}`,
    borderRadius: 10,
    padding: '10px 14px',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    minWidth: 180,
    boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
  }}>
    <Handle type="target" position={Position.Top} id="in" style={{ ...handleStyle, background: '#0891B2' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#67E8F9' }}>
      <span>🔄</span>
      <span style={{ color: '#fff' }}>{(data.label as string) || 'Set Ticket Status'}</span>
    </div>
    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
      Status: <strong style={{ color: '#E2E8F0' }}>{(data.status as string || 'assigned').toUpperCase()}</strong>
    </div>
    <Handle type="source" position={Position.Bottom} id="out" style={{ ...handleStyle, background: '#0891B2' }} />
  </div>
));
SetStatusNode.displayName = 'SetStatusNode';

export const AttachSlaNode = memo(({ data, selected }: NodeProps<Node<{ label: string; sla_tto?: string; sla_ttr?: string }>>) => (
  <div style={{
    background: '#1E293B',
    border: `2px solid ${selected ? '#FDE047' : '#EAB308'}`,
    borderRadius: 10,
    padding: '10px 14px',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    minWidth: 180,
    boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
  }}>
    <Handle type="target" position={Position.Top} id="in" style={{ ...handleStyle, background: '#EAB308' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FDE047' }}>
      <span>⏱️</span>
      <span style={{ color: '#fff' }}>{(data.label as string) || 'Attach SLA TTO/TTR'}</span>
    </div>
    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
      TTO: {(data.sla_tto as string) || '1 Hour'} | TTR: {(data.sla_ttr as string) || '8 Hours'}
    </div>
    <Handle type="source" position={Position.Bottom} id="out" style={{ ...handleStyle, background: '#EAB308' }} />
  </div>
));
AttachSlaNode.displayName = 'AttachSlaNode';

export const SetWatcherNode = memo(({ data, selected }: NodeProps<Node<{ label: string; watcher_name?: string }>>) => (
  <div style={{
    background: '#1E293B',
    border: `2px solid ${selected ? '#F472B6' : '#DB2777'}`,
    borderRadius: 10,
    padding: '10px 14px',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    minWidth: 180,
    boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
  }}>
    <Handle type="target" position={Position.Top} id="in" style={{ ...handleStyle, background: '#DB2777' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#F472B6' }}>
      <span>👁️</span>
      <span style={{ color: '#fff' }}>{(data.label as string) || 'Set Observer / CC'}</span>
    </div>
    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
      CC: <strong style={{ color: '#E2E8F0' }}>{(data.watcher_name as string) || 'Requester Manager'}</strong>
    </div>
    <Handle type="source" position={Position.Bottom} id="out" style={{ ...handleStyle, background: '#DB2777' }} />
  </div>
));
SetWatcherNode.displayName = 'SetWatcherNode';

export const SetSolutionNode = memo(({ data, selected }: NodeProps<Node<{ label: string; solution_type?: string }>>) => (
  <div style={{
    background: '#1E293B',
    border: `2px solid ${selected ? '#34D399' : '#059669'}`,
    borderRadius: 10,
    padding: '10px 14px',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    minWidth: 180,
    boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
  }}>
    <Handle type="target" position={Position.Top} id="in" style={{ ...handleStyle, background: '#059669' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34D399' }}>
      <span>✅</span>
      <span style={{ color: '#fff' }}>{(data.label as string) || 'Record Resolution Notes'}</span>
    </div>
    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
      Solution: <strong style={{ color: '#E2E8F0' }}>{(data.solution_type as string) || 'Repaired'}</strong>
    </div>
    <Handle type="source" position={Position.Bottom} id="out" style={{ ...handleStyle, background: '#059669' }} />
  </div>
));
SetSolutionNode.displayName = 'SetSolutionNode';

export const AttachOlaNode = memo(({ data, selected }: NodeProps<Node<{ label: string; ola_policy_name?: string; ola_target_hours?: number }>>) => (
  <div style={{
    background: '#1E293B',
    border: `2px solid ${selected ? '#F472B6' : '#EC4899'}`,
    borderRadius: 10,
    padding: '10px 14px',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    minWidth: 180,
    boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
  }}>
    <Handle type="target" position={Position.Top} id="in" style={{ ...handleStyle, background: '#EC4899' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#F472B6' }}>
      <span>⏱️</span>
      <span style={{ color: '#fff' }}>{(data.label as string) || 'Attach OLA Target Policy'}</span>
    </div>
    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
      OLA: <strong style={{ color: '#E2E8F0' }}>{(data.ola_policy_name as string) || 'Standard OLA (4h Target)'}</strong>
    </div>
    <Handle type="source" position={Position.Bottom} id="out" style={{ ...handleStyle, background: '#EC4899' }} />
  </div>
));
AttachOlaNode.displayName = 'AttachOlaNode';

export const CheckBudgetNode = memo(({ data, selected }: NodeProps<Node<{ label: string; department?: string; action_on_breach?: string }>>) => (
  <div style={{
    background: '#1E293B',
    border: `2px solid ${selected ? '#10B981' : '#059669'}`,
    borderRadius: 10,
    padding: '10px 14px',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    minWidth: 190,
    boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
  }}>
    <Handle type="target" position={Position.Top} id="in" style={{ ...handleStyle, background: '#059669' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34D399' }}>
      <span>💰</span>
      <span style={{ color: '#fff' }}>{(data.label as string) || 'Check Department Budget'}</span>
    </div>
    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
      Budget: <strong style={{ color: '#E2E8F0' }}>{(data.department as string) || 'Requester Dept'}</strong>
    </div>
    <Handle type="source" position={Position.Bottom} id="true" style={{ ...handleStyle, left: '30%', background: '#10B981' }} title="Sufficient Budget (True)" />
    <Handle type="source" position={Position.Bottom} id="false" style={{ ...handleStyle, left: '70%', background: '#EF4444' }} title="Budget Exceeded (False)" />
  </div>
));
CheckBudgetNode.displayName = 'CheckBudgetNode';

export const EnforcePolicyNode = memo(({ data, selected }: NodeProps<Node<{ label: string; policy_name?: string; max_limit?: number }>>) => (
  <div style={{
    background: '#1E293B',
    border: `2px solid ${selected ? '#6366F1' : '#4F46E5'}`,
    borderRadius: 10,
    padding: '10px 14px',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    minWidth: 190,
    boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
  }}>
    <Handle type="target" position={Position.Top} id="in" style={{ ...handleStyle, background: '#4F46E5' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#A5B4FC' }}>
      <span>📜</span>
      <span style={{ color: '#fff' }}>{(data.label as string) || 'Enforce Policy Limits'}</span>
    </div>
    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
      Policy: <strong style={{ color: '#E2E8F0' }}>{(data.policy_name as string) || 'Financial Limit Check'}</strong>
    </div>
    <Handle type="source" position={Position.Bottom} id="true" style={{ ...handleStyle, left: '30%', background: '#10B981' }} title="Policy Passed (Valid)" />
    <Handle type="source" position={Position.Bottom} id="false" style={{ ...handleStyle, left: '70%', background: '#EF4444' }} title="Policy Violation (Exceeded)" />
  </div>
));
EnforcePolicyNode.displayName = 'EnforcePolicyNode';
