"use client";
import React from 'react';

const NODE_PALETTE_ITEMS = [
  {
    category: '⚡ 1. Triggers (المشغلات)',
    color: '#10B981',
    nodes: [{ type: 'trigger', icon: '⚡', name: 'On Request Submitted' }],
  },
  {
    category: '⚖️ 2. Business Rules & Criteria (الشروط والقواعد)',
    color: '#D97706',
    nodes: [
      { type: 'conditional', icon: '🔀', name: 'IF / Else Condition Gate' },
      { type: 'rule_criterion', icon: '⚖️', name: 'Business Rule Match (IF)' },
      { type: 'parallel_split', icon: '⑂', name: 'Parallel Split' },
      { type: 'parallel_merge', icon: '⑁', name: 'Merge (AND Gate)' },
    ],
  },
  {
    category: '🎯 3. Rule Actions & Routing (إجراءات التوجيه والتحكم)',
    color: '#4F46E5',
    nodes: [
      { type: 'assign_group_node', icon: '👥', name: 'Assign to Group' },
      { type: 'assign_user_node', icon: '👤', name: 'Assign to Employee' },
      { type: 'set_priority_node', icon: '🚩', name: 'Set Priority Level' },
      { type: 'set_status_node', icon: '🔄', name: 'Set Ticket Status' },
      { type: 'attach_sla_node', icon: '⏱️', name: 'Attach SLA TTO/TTR' },
      { type: 'attach_ola_node', icon: '⏱️', name: 'Attach OLA Policy Target' },
      { type: 'set_watcher_node', icon: '👁️', name: 'Set Observer / CC' },
    ],
  },
  {
    category: '👥 4. Human Approvals (الموافقات)',
    color: '#9333EA',
    nodes: [{ type: 'approval', icon: '👤', name: 'Human Approval Step' }],
  },
  {
    category: '🛡️ Validation & Controls (التحقق والسياسات والقواعد)',
    color: '#059669',
    nodes: [
      { type: 'check_budget_node', icon: '💰', name: 'Check Department Budget' },
    ],
  },
  {
    category: '⚙️ 5. System Automations & Solution (الآلية والحل)',
    color: '#EC4899',
    nodes: [
      { type: 'send_email', icon: '📧', name: 'Send Email Notification' },
      { type: 'webhook', icon: '🔗', name: 'Webhook / API Call' },
      { type: 'update_record', icon: '💾', name: 'Update DB Record' },
      { type: 'set_solution_node', icon: '✅', name: 'Record Resolution Notes' },
      { type: 'end', icon: '🏁', name: 'End Flow' },
    ],
  },
];

export function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow-node-type', nodeType);
    event.dataTransfer.setData('application/reactflow-node-label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div style={{ width: 260, minWidth: 260, flexShrink: 0, borderRight: '1px solid var(--color-border)', padding: 14, overflowY: 'auto', background: 'var(--color-surface)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        Enterprise Node Toolbox
      </div>
      {NODE_PALETTE_ITEMS.map((group) => (
        <div key={group.category} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: group.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            {group.category}
          </div>
          {group.nodes.map((node) => (
            <div
              key={node.type + node.name}
              draggable
              onDragStart={(e) => onDragStart(e, node.type, node.name)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                marginBottom: 5,
                cursor: 'grab',
                fontSize: 12,
                background: 'var(--color-bg)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = group.color;
                e.currentTarget.style.background = group.color + '15';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.background = 'var(--color-bg)';
              }}
            >
              <span>{node.icon}</span>
              <span style={{ fontWeight: 500 }}>{node.name}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
