import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';

export interface TriggerNodeData extends Record<string, unknown> {
  label: string;
  trigger_type: string;
}

export const TriggerNode = memo(({ data }: NodeProps<Node<TriggerNodeData>>) => {
  return (
    <div style={{
      background: '#1E293B',
      border: '2px solid #10B981',
      borderRadius: 10,
      padding: '10px 16px',
      color: '#fff',
      fontSize: 13,
      fontWeight: 600,
      minWidth: 160,
      boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10B981' }}>
        <span>⚡</span>
        <span style={{ color: '#fff' }}>{(data.label as string) || 'Trigger'}</span>
      </div>
      <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
        Type: {(data.trigger_type as string) || 'on_request_submitted'}
      </div>
      <Handle type="source" position={Position.Bottom} id="out" style={{ background: '#10B981', width: 14, height: 14, cursor: 'crosshair', boxShadow: '0 0 0 3px #1E293B' }} />
    </div>
  );
});
TriggerNode.displayName = 'TriggerNode';
