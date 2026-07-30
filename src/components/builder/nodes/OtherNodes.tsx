import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';

const handleStyle = {
  width: 14,
  height: 14,
  cursor: 'crosshair',
  boxShadow: '0 0 0 3px #1E293B',
};

export const ParallelSplitNode = memo(({ data }: NodeProps<Node<{ label: string }>>) => (
  <div style={{ background: '#1E293B', border: '2px solid #8B5CF6', borderRadius: 10, padding: '10px 16px', color: '#fff', fontSize: 13, fontWeight: 600, minWidth: 170 }}>
    <Handle type="target" position={Position.Top} id="in" style={{ ...handleStyle, background: '#8B5CF6' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span>⑂</span>
      <span>{data.label || 'Parallel Split'}</span>
    </div>
    <Handle type="source" position={Position.Bottom} id="out1" style={{ ...handleStyle, left: '30%', background: '#8B5CF6' }} />
    <Handle type="source" position={Position.Bottom} id="out2" style={{ ...handleStyle, left: '70%', background: '#8B5CF6' }} />
  </div>
));
ParallelSplitNode.displayName = 'ParallelSplitNode';

export const ParallelMergeNode = memo(({ data }: NodeProps<Node<{ label: string }>>) => (
  <div style={{ background: '#1E293B', border: '2px solid #8B5CF6', borderRadius: 10, padding: '10px 16px', color: '#fff', fontSize: 13, fontWeight: 600, minWidth: 170 }}>
    <Handle type="target" position={Position.Top} id="in1" style={{ ...handleStyle, left: '30%', background: '#8B5CF6' }} />
    <Handle type="target" position={Position.Top} id="in2" style={{ ...handleStyle, left: '70%', background: '#8B5CF6' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span>⑁</span>
      <span>{data.label || 'Merge Gate'}</span>
    </div>
    <Handle type="source" position={Position.Bottom} id="out" style={{ ...handleStyle, background: '#8B5CF6' }} />
  </div>
));
ParallelMergeNode.displayName = 'ParallelMergeNode';

export const WebhookNode = memo(({ data }: NodeProps<Node<{ label: string; webhook_url?: string }>>) => (
  <div style={{ background: '#1E293B', border: '2px solid #EC4899', borderRadius: 10, padding: '10px 16px', color: '#fff', fontSize: 13, fontWeight: 600, minWidth: 170 }}>
    <Handle type="target" position={Position.Top} id="in" style={{ ...handleStyle, background: '#EC4899' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span>🔗</span>
      <span>{data.label || 'Webhook Action'}</span>
    </div>
    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, textOverflow: 'ellipsis', overflow: 'hidden' }}>
      {data.webhook_url || 'https://api.external.com'}
    </div>
    <Handle type="source" position={Position.Bottom} id="out" style={{ ...handleStyle, background: '#EC4899' }} />
  </div>
));
WebhookNode.displayName = 'WebhookNode';

export const EndNode = memo(({ data }: NodeProps<Node<{ label: string }>>) => (
  <div style={{ background: '#1E293B', border: '2px solid #64748B', borderRadius: 10, padding: '10px 16px', color: '#fff', fontSize: 13, fontWeight: 600, minWidth: 140 }}>
    <Handle type="target" position={Position.Top} id="in" style={{ ...handleStyle, background: '#64748B' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
      <span>🏁</span>
      <span>{data.label || 'End'}</span>
    </div>
  </div>
));
EndNode.displayName = 'EndNode';
