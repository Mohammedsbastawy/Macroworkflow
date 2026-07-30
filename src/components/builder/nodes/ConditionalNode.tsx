import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';

export interface ConditionalNodeData extends Record<string, unknown> {
  label: string;
  condition_field?: string;
  condition_operator?: string;
  condition_value?: string;
}

export const ConditionalNode = memo(({ data, selected }: NodeProps<Node<ConditionalNodeData>>) => {
  return (
    <div style={{
      background: '#1E293B',
      border: `2px solid ${selected ? '#FCD34D' : '#F59E0B'}`,
      borderRadius: 10,
      padding: '12px 16px',
      color: '#fff',
      fontSize: 13,
      fontWeight: 600,
      minWidth: 190,
      boxShadow: selected ? '0 0 0 4px rgba(245, 158, 11, 0.3)' : '0 4px 14px rgba(0,0,0,0.3)'
    }}>
      <Handle type="target" position={Position.Top} id="in" style={{ background: '#F59E0B', width: 14, height: 14, cursor: 'crosshair', boxShadow: '0 0 0 3px #1E293B' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#F59E0B' }}>
        <span>🔀</span>
        <span style={{ color: '#fff' }}>{(data.label as string) || 'IF Condition'}</span>
      </div>
      <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 6, fontFamily: 'monospace' }}>
        IF {(data.condition_field as string) || 'amount'} {(data.condition_operator as string) || '>'} {(data.condition_value as string) || '50000'}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 10, fontWeight: 700 }}>
        <span style={{ color: '#10B981' }}>✔ TRUE</span>
        <span style={{ color: '#EF4444' }}>✖ FALSE</span>
      </div>

      <Handle type="source" position={Position.Bottom} id="true" style={{ left: '30%', background: '#10B981', width: 14, height: 14, cursor: 'crosshair', boxShadow: '0 0 0 2px #1E293B' }} />
      <Handle type="source" position={Position.Bottom} id="false" style={{ left: '70%', background: '#EF4444', width: 14, height: 14, cursor: 'crosshair', boxShadow: '0 0 0 2px #1E293B' }} />
    </div>
  );
});
ConditionalNode.displayName = 'ConditionalNode';
