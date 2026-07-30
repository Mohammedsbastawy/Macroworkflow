import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';

export interface HumanApprovalNodeData extends Record<string, unknown> {
  label: string;
  assignee_type: string;
  assignee_value: string;
  ola_hours?: number;
  ola_minutes?: number;
  ola_breach_action?: string;
  escalation_target?: string;
}

export const HumanApprovalNode = memo(({ data, selected }: NodeProps<Node<HumanApprovalNodeData>>) => {
  return (
    <div style={{
      background: '#1E293B',
      border: `2px solid ${selected ? '#818CF8' : '#4F46E5'}`,
      borderRadius: 12,
      padding: '12px 16px',
      color: '#fff',
      fontSize: 13,
      fontWeight: 600,
      minWidth: 220,
      boxShadow: selected ? '0 0 0 4px rgba(99, 102, 241, 0.35)' : '0 4px 14px rgba(0,0,0,0.35)',
      transition: 'all 0.15s',
      position: 'relative',
    }}>
      {/* Target Input Handle */}
      <Handle type="target" position={Position.Top} id="in" style={{ background: '#6366F1', width: 14, height: 14, cursor: 'crosshair', boxShadow: '0 0 0 3px #1E293B' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>👤</span>
          <span>{(data.label as string) || 'Human Approval'}</span>
        </div>
        {data.ola_hours || data.ola_minutes ? (
          <span style={{ fontSize: 10, background: 'rgba(245,158,11,0.2)', color: '#F59E0B', padding: '2px 7px', borderRadius: 20, fontWeight: 700 }}>
            ⏱ {data.ola_unit === 'minutes' ? `${data.ola_minutes || data.ola_hours}m` : `${data.ola_hours}h`} OLA
          </span>
        ) : null}
      </div>

      {/* Assignee Details */}
      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6, fontWeight: 400 }}>
        Assignee: <strong style={{ color: '#E2E8F0' }}>{(data.assignee_value as string) || '{{requester.manager}}'}</strong>
      </div>

      {/* Multi-Port Colored Wire Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        <span style={{ color: '#10B981' }}>🟢 On Approve</span>
        <span style={{ color: '#EF4444' }}>🔴 On Reject</span>
        <span style={{ color: '#F59E0B' }}>🟠 OLA Breach</span>
      </div>

      {/* 3 Output Handles with Distinct Wire Colors */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="approve"
        style={{ left: '20%', background: '#10B981', width: 14, height: 14, border: '2px solid #064E3B', cursor: 'crosshair', boxShadow: '0 0 0 2px #1E293B' }}
        title="On Approve Wire (Green)"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="reject"
        style={{ left: '50%', background: '#EF4444', width: 14, height: 14, border: '2px solid #7F1D1D', cursor: 'crosshair', boxShadow: '0 0 0 2px #1E293B' }}
        title="On Reject Wire (Red)"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="timeout"
        style={{ left: '80%', background: '#F59E0B', width: 14, height: 14, border: '2px solid #78350F', cursor: 'crosshair', boxShadow: '0 0 0 2px #1E293B' }}
        title="On OLA Timeout / Breach Wire (Orange)"
      />
    </div>
  );
});
HumanApprovalNode.displayName = 'HumanApprovalNode';
