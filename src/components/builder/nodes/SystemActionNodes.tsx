import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';

const handleStyle = {
  width: 14,
  height: 14,
  cursor: 'crosshair',
  boxShadow: '0 0 0 3px #1E293B',
};

export const SendEmailNode = memo(({ data, selected }: NodeProps<Node<{ label: string; email_to?: string; email_subject?: string }>>) => (
  <div style={{
    background: '#1E293B',
    border: `2px solid ${selected ? '#38BDF8' : '#06B6D4'}`,
    borderRadius: 10,
    padding: '10px 14px',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    minWidth: 180,
    boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
  }}>
    <Handle type="target" position={Position.Top} id="in" style={{ ...handleStyle, background: '#06B6D4' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38BDF8' }}>
      <span>📧</span>
      <span style={{ color: '#fff' }}>{(data.label as string) || 'Send Email'}</span>
    </div>
    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, fontFamily: 'monospace' }}>
      To: {(data.email_to as string) || '{{requester.email}}'}
    </div>
    <Handle type="source" position={Position.Bottom} id="out" style={{ ...handleStyle, background: '#06B6D4' }} />
  </div>
));
SendEmailNode.displayName = 'SendEmailNode';

export const WebhookApiNode = memo(({ data, selected }: NodeProps<Node<{ label: string; webhook_url?: string; method?: string }>>) => (
  <div style={{
    background: '#1E293B',
    border: `2px solid ${selected ? '#F472B6' : '#EC4899'}`,
    borderRadius: 10,
    padding: '10px 14px',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    minWidth: 190,
    boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
  }}>
    <Handle type="target" position={Position.Top} id="in" style={{ ...handleStyle, background: '#EC4899' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#F472B6' }}>
      <span>🔗</span>
      <span style={{ color: '#fff' }}>{(data.label as string) || 'Webhook / API Call'}</span>
    </div>
    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, fontFamily: 'monospace', textOverflow: 'ellipsis', overflow: 'hidden' }}>
      {(data.method as string || 'POST')} {(data.webhook_url as string || 'https://ad.local/api/account')}
    </div>
    <Handle type="source" position={Position.Bottom} id="out" style={{ ...handleStyle, background: '#EC4899' }} />
  </div>
));
WebhookApiNode.displayName = 'WebhookApiNode';

export const UpdateRecordNode = memo(({ data, selected }: NodeProps<Node<{ label: string; table_name?: string }>>) => (
  <div style={{
    background: '#1E293B',
    border: `2px solid ${selected ? '#A7F3D0' : '#10B981'}`,
    borderRadius: 10,
    padding: '10px 14px',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    minWidth: 170,
    boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
  }}>
    <Handle type="target" position={Position.Top} id="in" style={{ ...handleStyle, background: '#10B981' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34D399' }}>
      <span>💾</span>
      <span style={{ color: '#fff' }}>{(data.label as string) || 'Update DB Record'}</span>
    </div>
    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
      Table: {(data.table_name as string || 'requests')}
    </div>
    <Handle type="source" position={Position.Bottom} id="out" style={{ ...handleStyle, background: '#10B981' }} />
  </div>
));
UpdateRecordNode.displayName = 'UpdateRecordNode';
