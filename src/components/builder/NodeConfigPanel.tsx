"use client";
import React, { useState, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';
import { fetchBusinessRulesAction, fetchApiIntegrationsAction } from '@/app/actions/workflowActions';

interface NodeConfigPanelProps {
  node: Node | null;
  edge?: Edge | null;
  onUpdateNodeData: (id: string, data: Record<string, unknown>) => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge?: (edgeId: string) => void;
}

const MAGIC_VARIABLES = [
  { group: 'Ticket Classification', vars: ['{{ticket.type}}', '{{ticket.category_id}}', '{{ticket.subcategory_id}}', '{{ticket.priority}}', '{{ticket.impact}}', '{{ticket.urgency}}', '{{ticket.location_id}}'] },
  { group: 'Actors & Roles', vars: ['{{requester.email}}', '{{requester.manager}}', '{{requester.department}}', '{{ticket.assigned_group}}', '{{ticket.assigned_user}}', '{{ticket.observer_id}}'] },
  { group: 'Lifecycle & State', vars: ['{{ticket.status}}', '{{ticket.pending_reason}}', '{{ticket.approval_status}}'] },
  { group: 'SLA / OLA Timers', vars: ['{{ticket.sla_tto_deadline}}', '{{ticket.sla_ttr_deadline}}', '{{ticket.time_spent}}'] },
  { group: 'Resolution & Solution', vars: ['{{ticket.solution_type}}', '{{ticket.solution_description}}', '{{ticket.solved_date}}'] },
  { group: 'Form Data (EAV)', vars: ['{{form.amount}}', '{{form.start_date}}', '{{form.reason}}', '{{form.vendor_id}}'] },
];

export function NodeConfigPanel({ node, edge, onUpdateNodeData, onDeleteNode, onDeleteEdge }: NodeConfigPanelProps) {
  const [showVarPicker, setShowVarPicker] = useState<string | null>(null);
  const [businessRules, setBusinessRules] = useState<any[]>([]);
  const [apiIntegrations, setApiIntegrations] = useState<any[]>([]);

  useEffect(() => {
    fetchBusinessRulesAction().then((rules) => {
      setBusinessRules(rules || []);
    }).catch(console.error);

    fetchApiIntegrationsAction().then((integrations) => {
      setApiIntegrations(integrations || []);
    }).catch(console.error);
  }, []);

  if (edge) {
    return (
      <div style={{ width: 320, borderLeft: '1px solid var(--color-border)', padding: 16, background: 'var(--color-surface)', fontSize: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            🔗 Connection Wire (رابط المسار)
          </div>
          <span className="tag info" style={{ fontSize: 9 }}>Selected Line</span>
        </div>

        <div style={{ background: 'var(--color-bg)', padding: 12, borderRadius: 8, border: '1px solid var(--color-border)', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
            Wire Properties:
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 4 }}>
            Wire ID: <code style={{ color: 'var(--color-primary)' }}>{edge.id}</code>
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 4 }}>
            Source Node: <strong style={{ color: 'var(--color-text-primary)' }}>{edge.source}</strong> {edge.sourceHandle ? `(${edge.sourceHandle})` : ''}
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
            Target Node: <strong style={{ color: 'var(--color-text-primary)' }}>{edge.target}</strong>
          </div>
        </div>

        <button
          className="btn btn-danger btn-block"
          style={{ fontSize: 11, fontWeight: 700, padding: '10px 0', marginBottom: 12 }}
          onClick={() => onDeleteEdge && onDeleteEdge(edge.id)}
        >
          🗑 Delete Wire Line Only (حذف خط الرابط فقط)
        </button>

        <div style={{ background: '#FEF3C7', padding: 10, borderRadius: 6, border: '1px solid #FCD34D', fontSize: 10, color: '#B45309', lineHeight: 1.4 }}>
          💡 <strong>Tip:</strong> يمكنك أيضاً النقر بزر الماوس الأيمن (Right-Click) على أي خط رابط أو اختياره والضغط على زر <code>Delete</code> أو <code>Backspace</code> لحذفه فوراً دون حذف العقد الكبيرة!
        </div>
      </div>
    );
  }

  if (!node) {
    return (
      <div style={{ width: 300, borderLeft: '1px solid var(--color-border)', padding: 16, background: 'var(--color-surface)', fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>👆</div>
        <div style={{ fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>No Element Selected</div>
        Click any node box or connection line to inspect, edit properties, or delete lines.
      </div>
    );
  }

  const data = node.data || {};

  const handleChange = (key: string, value: unknown) => {
    onUpdateNodeData(node.id, { [key]: value });
  };

  const insertVariable = (fieldKey: string, varString: string) => {
    const current = (data[fieldKey] as string) || '';
    handleChange(fieldKey, current + varString);
    setShowVarPicker(null);
  };

  return (
    <div style={{ width: 320, borderLeft: '1px solid var(--color-border)', padding: 16, background: 'var(--color-surface)', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Properties Panel ({node.type})
        </div>
        <button
          onClick={() => onDeleteNode(node.id)}
          style={{ fontSize: 11, color: 'var(--color-danger)', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}
        >
          🗑 Delete Node
        </button>
      </div>

      {/* Node Label */}
      <div className="form-group" style={{ marginBottom: 12 }}>
        <label className="form-label">Node Title</label>
        <input
          className="form-control"
          value={(data.label as string) || ''}
          onChange={(e) => handleChange('label', e.target.value)}
        />
      </div>

      {/* Magic Variables Global Helper Banner */}
      <div style={{ padding: 10, background: 'var(--color-primary-light)', borderRadius: 'var(--radius-md)', border: '1px solid #BFDBFE', marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 4 }}>
          ✨ Magic Variables Engine
        </div>
        <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
          Use <code>{`{{form.field}}`}</code> or <code>{`{{requester.manager}}`}</code> in any input field to bind dynamic values.
        </div>
      </div>

      {/* Trigger & Form Nodes: Form Fields & API Integrations Manager */}
      {Boolean(node.type && ['trigger', 'start', 'form'].includes(node.type)) && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--color-border)', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🎨 Form Fields & API Integrations</span>
            <span className="badge primary" style={{ fontSize: 9 }}>Form Builder</span>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm btn-block"
            style={{ fontSize: 11, fontWeight: 700, marginBottom: 12 }}
            onClick={() => {
              const currentFields = (data.fields as any[]) || [];
              const newField = {
                id: `field_${Date.now()}`,
                key: `item_code_${currentFields.length + 1}`,
                label: `New Field ${currentFields.length + 1}`,
                type: 'text',
                ticketZone: 'main',
                required: false,
              };
              handleChange('fields', [...currentFields, newField]);
            }}
          >
            ＋ Add Form Field / API Widget
          </button>

          {((data.fields as any[]) || []).length === 0 ? (
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textAlign: 'center', padding: 10, background: 'var(--color-bg)', borderRadius: 6 }}>
              No custom fields added yet. Click &apos; Add Form Field &apos; to build form inputs & API widgets.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {((data.fields as any[]) || []).map((field: any, idx: number) => (
                <div key={field.id || idx} style={{ background: 'var(--color-bg)', padding: 10, borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-primary)' }}>Field #{idx + 1}</span>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}
                      onClick={() => {
                        const currentFields = (data.fields as any[]) || [];
                        const updated = currentFields.filter((_, i) => i !== idx);
                        handleChange('fields', updated);
                      }}
                    >
                      🗑 Delete
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div>
                      <label style={{ fontSize: 9, color: 'var(--color-text-muted)', fontWeight: 700 }}>Label (اسم الخانة)</label>
                      <input
                        className="form-control"
                        style={{ fontSize: 11, padding: '4px 8px' }}
                        value={field.label || ''}
                        onChange={(e) => {
                          const currentFields = [...((data.fields as any[]) || [])];
                          currentFields[idx] = { ...currentFields[idx], label: e.target.value };
                          handleChange('fields', currentFields);
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <div>
                        <label style={{ fontSize: 9, color: 'var(--color-text-muted)', fontWeight: 700 }}>Key (مفتاح الخانة)</label>
                        <input
                          className="form-control"
                          style={{ fontSize: 11, padding: '4px 8px', fontFamily: 'monospace' }}
                          value={field.key || ''}
                          onChange={(e) => {
                            const currentFields = [...((data.fields as any[]) || [])];
                            currentFields[idx] = { ...currentFields[idx], key: e.target.value };
                            handleChange('fields', currentFields);
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 9, color: 'var(--color-text-muted)', fontWeight: 700 }}>Type (نوع الخانة)</label>
                        <select
                          className="form-control"
                          style={{ fontSize: 10, padding: '4px 6px', fontWeight: 700 }}
                          value={field.type || 'text'}
                          onChange={(e) => {
                            const currentFields = [...((data.fields as any[]) || [])];
                            currentFields[idx] = { ...currentFields[idx], type: e.target.value };
                            handleChange('fields', currentFields);
                          }}
                        >
                          <option value="text">✏️ Text Input</option>
                          <option value="number">🔢 Number</option>
                          <option value="select">▼ Dropdown</option>
                          <option value="textarea">📝 Textarea</option>
                          <option value="date">📅 Date</option>
                          <option value="api_panel">🔗 Live API Display Widget</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: 9, color: 'var(--color-primary)', fontWeight: 800 }}>
                        📍 Placement Zone (مكان الظهور في التذكرة)
                      </label>
                      <select
                        className="form-control"
                        style={{ fontSize: 10, padding: '4px 6px', fontWeight: 800, borderColor: 'var(--color-primary)' }}
                        value={field.ticketZone || 'main'}
                        onChange={(e) => {
                          const currentFields = [...((data.fields as any[]) || [])];
                          currentFields[idx] = { ...currentFields[idx], ticketZone: e.target.value };
                          handleChange('fields', currentFields);
                        }}
                      >
                        <option value="main">🎨 Main Form Details (تفاصيل النموذج)</option>
                        <option value="sidebar">📊 Ticket Info Panel (القائمة الجانبية)</option>
                        <option value="header">📌 Header Banner (أعلى التذكرة)</option>
                        <option value="hidden">🔒 Hidden (مخفي)</option>
                      </select>
                    </div>

                    {/* API Integration binding settings */}
                    {(field.type === 'api_panel' || field.api_integration_id) && (
                      <div style={{ background: '#EFF6FF', padding: 8, borderRadius: 6, border: '1px solid #BFDBFE', marginTop: 4 }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: '#1E40AF', marginBottom: 4 }}>
                          🔗 API Integration Binding (ربط بالـ API)
                        </div>

                        <div style={{ marginBottom: 4 }}>
                          <label style={{ fontSize: 8, color: '#1E40AF', fontWeight: 700 }}>Select Target API</label>
                          <select
                            className="form-control"
                            style={{ fontSize: 10, padding: '3px 6px' }}
                            value={field.api_integration_id || ''}
                            onChange={(e) => {
                              const currentFields = [...((data.fields as any[]) || [])];
                              currentFields[idx] = { ...currentFields[idx], api_integration_id: e.target.value };
                              handleChange('fields', currentFields);
                            }}
                          >
                            <option value="">-- Select Active API --</option>
                            {apiIntegrations.map((api) => (
                              <option key={api.id} value={api.id}>
                                🔌 {api.name} ({api.provider})
                              </option>
                            ))}
                          </select>
                        </div>

                        {field.type === 'api_panel' && (
                          <div>
                            <label style={{ fontSize: 8, color: '#1E40AF', fontWeight: 700 }}>Bound Source Field Key</label>
                            <input
                              className="form-control"
                              style={{ fontSize: 10, padding: '3px 6px', fontFamily: 'monospace' }}
                              placeholder="e.g. item_code"
                              value={field.bound_field_key || ''}
                              onChange={(e) => {
                                const currentFields = [...((data.fields as any[]) || [])];
                                currentFields[idx] = { ...currentFields[idx], bound_field_key: e.target.value };
                                handleChange('fields', currentFields);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Human Approval Settings */}
      {node.type === 'approval' && (
        <>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Assignee Type (نوع جهة الاعتماد)</label>
            <select
              className="form-control"
              style={{ fontSize: 12, fontWeight: 600, padding: '6px 10px', borderColor: 'var(--color-primary)', marginBottom: 8 }}
              value={
                data.assignee_type === 'SPECIFIC_USER'
                  ? 'SPECIFIC_USER'
                  : data.assignee_type === 'CUSTOM_TEXT'
                  ? 'CUSTOM_TEXT'
                  : (data.assignee_value === 'Direct Manager' ? '{{requester.manager}}' : (data.assignee_value as string)) || '{{requester.manager}}'
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'SPECIFIC_USER') {
                  handleChange('assignee_type', 'SPECIFIC_USER');
                  handleChange('assignee_value', 'Ahmed Mohamed');
                } else if (val === 'CUSTOM_TEXT') {
                  handleChange('assignee_type', 'CUSTOM_TEXT');
                } else {
                  handleChange('assignee_type', 'ROLE_HIERARCHY');
                  handleChange('assignee_value', val);
                }
              }}
            >
              <optgroup label="📌 الهيكل الإداري والتسلسلي (Dynamic Hierarchy)">
                <option value="{{requester.manager}}">👤 المدير المباشر لمقدم الطلب (Direct Manager)</option>
                <option value="{{ticket.assigned_owner}}">🎯 المسؤول الحالي عن التذكرة (Ticket Owner)</option>
              </optgroup>

              <optgroup label="🛡️ الأدوار الوظيفية للنظام (System Roles)">
                <option value="Finance Manager">💰 المدير المالي (CFO / Finance Manager)</option>
                <option value="IT Manager">💻 مدير تكنولوجيا المعلومات (IT Manager)</option>
                <option value="HR Manager">👥 مدير الموارد البشرية (HR Director)</option>
                <option value="System Admin">⚙️ مدير النظام العام (System Admin)</option>
              </optgroup>

              <optgroup label="🔍 موظف محدد بالاسم (Specific User Search)">
                <option value="SPECIFIC_USER">👤 اختيار موظف معين من الدليل (Select Specific User)...</option>
              </optgroup>

              <optgroup label="✏ معادلة مخصصة (Custom Formula)">
                <option value="CUSTOM_TEXT">✏ كتابة معادلة / نص مخصص (Custom Text)...</option>
              </optgroup>
            </select>

            {/* Second Conditional Field: ONLY shown if SPECIFIC_USER is chosen */}
            {data.assignee_type === 'SPECIFIC_USER' && (
              <div style={{ background: 'var(--color-background)', padding: 10, borderRadius: 8, border: '1px solid var(--color-primary)' }}>
                <label className="form-label" style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 4 }}>
                  🔍 اختر الموظف المسؤول (Select Specific User):
                </label>
                <select
                  className="form-control"
                  style={{ fontSize: 12, fontWeight: 700 }}
                  value={(data.assignee_value as string) || 'Ahmed Mohamed'}
                  onChange={(e) => {
                    handleChange('assignee_type', 'SPECIFIC_USER');
                    handleChange('assignee_value', e.target.value);
                  }}
                >
                  <option value="Ahmed Mohamed">👨‍💻 Ahmed Mohamed (IT Staff · ahmed@company.com)</option>
                  <option value="Sara Hassan">👩‍💼 Sara Hassan (HR Head · sara@company.com)</option>
                  <option value="Khaled Samir">👨‍💼 Khaled Samir (IT Manager · khaled@company.com)</option>
                  <option value="Mona Omar">👩‍💼 Mona Omar (CFO · mona@company.com)</option>
                  <option value="System Admin">👑 System Admin (System Administrator)</option>
                </select>
              </div>
            )}

            {/* Second Conditional Field: Custom Expression Text Input */}
            {data.assignee_type === 'CUSTOM_TEXT' && (
              <div style={{ background: 'var(--color-background)', padding: 10, borderRadius: 8, border: '1px solid var(--color-border)' }}>
                <label className="form-label" style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                  ✏ المعادلة أو المسمى المخصص:
                </label>
                <input
                  className="form-control"
                  placeholder="e.g. {{form.custom_approver}} or Tier-2 Support"
                  value={(data.assignee_value as string) || ''}
                  onChange={(e) => handleChange('assignee_value', e.target.value)}
                  style={{ fontSize: 12, fontFamily: 'monospace' }}
                />
              </div>
            )}
          </div>

          {/* OLA Target & Escalation Settings (إعدادات اتفاقية مهلة الاعتماد) */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed var(--color-border)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⏱️</span> OLA Target & Escalation Settings (اتفاقية مهلة الاعتماد)
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>⏱️ OLA Target Time (مهلة الاعتماد)</label>
                
                {/* Unit Selector: Hours vs Minutes */}
                <div style={{ display: 'flex', background: 'var(--color-bg)', padding: 2, borderRadius: 6, border: '1px solid var(--color-border)' }}>
                  <button
                    type="button"
                    style={{
                      fontSize: 10,
                      fontWeight: (data.ola_unit || 'hours') === 'hours' ? 800 : 500,
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: 'none',
                      background: (data.ola_unit || 'hours') === 'hours' ? 'var(--color-primary)' : 'transparent',
                      color: (data.ola_unit || 'hours') === 'hours' ? '#fff' : 'var(--color-text-muted)',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      handleChange('ola_unit', 'hours');
                      if (data.ola_unit === 'minutes') {
                        handleChange('ola_hours', Math.max(1, Math.round(Number(data.ola_minutes || 15) / 60)));
                      }
                    }}
                  >
                    Hours (ساعات)
                  </button>
                  <button
                    type="button"
                    style={{
                      fontSize: 10,
                      fontWeight: data.ola_unit === 'minutes' ? 800 : 500,
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: 'none',
                      background: data.ola_unit === 'minutes' ? 'var(--color-primary)' : 'transparent',
                      color: data.ola_unit === 'minutes' ? '#fff' : 'var(--color-text-muted)',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      handleChange('ola_unit', 'minutes');
                      handleChange('ola_minutes', Number(data.ola_minutes || 15));
                    }}
                  >
                    Minutes (دقائق)
                  </button>
                </div>
              </div>

              {/* Select Preset Dropdown according to active unit */}
              {data.ola_unit === 'minutes' ? (
                <select
                  className="form-control"
                  style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}
                  value={
                    data.ola_is_custom === true || !([15, 30, 45, 60, 90, 120].includes(Number(data.ola_minutes)))
                      ? 'custom'
                      : String(data.ola_minutes ?? 15)
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      handleChange('ola_is_custom', true);
                      if (!data.ola_minutes || [15, 30, 45, 60, 90, 120].includes(Number(data.ola_minutes))) {
                        handleChange('ola_minutes', 20);
                        handleChange('ola_hours', 0.33);
                      }
                    } else {
                      handleChange('ola_is_custom', false);
                      handleChange('ola_minutes', Number(val));
                      handleChange('ola_hours', Number(val) / 60);
                    }
                  }}
                >
                  <option value="15">⏱️ 15 Minutes (15 دقيقة - سريع)</option>
                  <option value="30">⏱️ 30 Minutes (30 دقيقة - نصف ساعة)</option>
                  <option value="45">⏱️ 45 Minutes (45 دقيقة)</option>
                  <option value="60">⏱️ 60 Minutes (60 دقيقة - ساعة)</option>
                  <option value="90">⏱️ 90 Minutes (90 دقيقة - ساعة ونصف)</option>
                  <option value="120">⏱️ 120 Minutes (120 دقيقة - ساعتان)</option>
                  <option value="custom">✏️ Custom Minutes (دقائق مخصصة...)</option>
                </select>
              ) : (
                <select
                  className="form-control"
                  style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}
                  value={
                    data.ola_is_custom === true || !([1, 2, 4, 8, 12, 24, 48, 72].includes(Number(data.ola_hours)))
                      ? 'custom'
                      : String(data.ola_hours ?? 4)
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      handleChange('ola_is_custom', true);
                      if (!data.ola_hours || [1, 2, 4, 8, 12, 24, 48, 72].includes(Number(data.ola_hours))) {
                        handleChange('ola_hours', 5);
                      }
                    } else {
                      handleChange('ola_is_custom', false);
                      handleChange('ola_hours', Number(val));
                    }
                  }}
                >
                  <option value="1">⏱️ 1 Hour (ساعة واحدة)</option>
                  <option value="2">⏱️ 2 Hours (ساعتان)</option>
                  <option value="4">⏱️ 4 Hours (4 ساعات - افتراضي)</option>
                  <option value="8">⏱️ 8 Hours (8 ساعات)</option>
                  <option value="12">⏱️ 12 Hours (12 ساعة)</option>
                  <option value="24">⏱️ 24 Hours (يوم واحد - 24 ساعة)</option>
                  <option value="48">⏱️ 48 Hours (يومان - 48 ساعة)</option>
                  <option value="72">⏱️ 72 Hours (3 أيام - 72 ساعة)</option>
                  <option value="custom">✏️ Custom Hours (ساعات مخصصة...)</option>
                </select>
              )}

              {/* Custom Input Field for Minutes or Hours */}
              {(data.ola_is_custom === true ||
                (data.ola_unit === 'minutes' && !([15, 30, 45, 60, 90, 120].includes(Number(data.ola_minutes)))) ||
                ((data.ola_unit || 'hours') === 'hours' && !([1, 2, 4, 8, 12, 24, 48, 72].includes(Number(data.ola_hours))))) && (
                <div style={{ background: 'var(--color-bg)', padding: 10, borderRadius: 8, border: '1px solid var(--color-primary)' }}>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 4 }}>
                    ✏️ {data.ola_unit === 'minutes' ? 'اكتب عدد الدقائق المخصصة (Custom Minutes):' : 'اكتب عدد الساعات المخصصة (Custom Hours):'}
                  </label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {data.ola_unit === 'minutes' ? (
                      <input
                        type="number"
                        className="form-control"
                        style={{ fontSize: 12, fontWeight: 700 }}
                        placeholder="e.g. 10 or 25 or 90"
                        min={1}
                        value={data.ola_minutes !== undefined ? Number(data.ola_minutes) : 15}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 1 : Number(e.target.value);
                          handleChange('ola_minutes', val);
                          handleChange('ola_hours', val / 60);
                          handleChange('ola_is_custom', true);
                        }}
                      />
                    ) : (
                      <input
                        type="number"
                        className="form-control"
                        style={{ fontSize: 12, fontWeight: 700 }}
                        placeholder="e.g. 5 or 36 or 120"
                        min={1}
                        value={data.ola_hours !== undefined ? Number(data.ola_hours) : 5}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 1 : Number(e.target.value);
                          handleChange('ola_hours', val);
                          handleChange('ola_is_custom', true);
                        }}
                      />
                    )}
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)' }}>
                      {data.ola_unit === 'minutes' ? 'Minutes (دقائق)' : 'Hours (ساعات)'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>🚨 Action on OLA Breach (إجراء عند تجاوز الوقت)</label>
              <select
                className="form-control"
                style={{ fontSize: 11, fontWeight: 700 }}
                value={(data.ola_breach_action as string) || 'auto_escalate'}
                onChange={(e) => handleChange('ola_breach_action', e.target.value)}
              >
                <option value="auto_escalate">⚡ التصعيد التلقائي للمدير الأعلى (Auto-Escalate to Manager's Manager)</option>
                <option value="notify_reminder">🔔 إرسال تنبيه تصعيد عاجل (Send Urgent Breach Notification)</option>
                <option value="auto_approve">✅ الموافقة التلقائية عند انتهاء الوقت (Auto-Approve Step)</option>
                <option value="auto_reject">❌ الرفض التلقائي عند انتهاء الوقت (Auto-Reject Request)</option>
                <option value="reassign_group">👥 إعادة التوجيه لمجموعة الطوارئ (Reassign to Backup Group)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--color-bg)', padding: 10, borderRadius: 8, border: '1px solid var(--color-border)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={data.notify_on_assign !== false}
                  onChange={(e) => handleChange('notify_on_assign', e.target.checked)}
                />
                🔔 تنبيه جهة الاعتماد فور الإسناد (Notify Assignee)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={Boolean(data.notify_on_complete)}
                  onChange={(e) => handleChange('notify_on_complete', e.target.checked)}
                />
                ✉️ تنبيه صاحب الطلب فور اتخاذ القرار (Notify Requester)
              </label>
            </div>
          </div>
        </>
      )}

      {/* Logic Conditional & Business Rules Settings */}
      {node.type === 'conditional' && (
        <>
          {/* Integrated Business Rules Engine Header */}
          <div style={{ padding: 12, background: 'rgba(79, 70, 229, 0.05)', borderRadius: 8, border: '1px solid rgba(79, 70, 229, 0.2)', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>⚖️</span> Visual Rules & Criteria Engine
              </span>
              <span className="badge primary" style={{ fontSize: 9 }}>Unified</span>
            </div>
            
            <select
              className="form-control"
              style={{ fontSize: 11, fontWeight: 700, borderColor: 'var(--color-primary)', background: 'var(--color-surface)', marginBottom: 6 }}
              value={(data.bound_rule_id as string) || ''}
              onChange={(e) => {
                const ruleId = e.target.value;
                const foundRule = businessRules.find((r) => r.id === ruleId);
                if (foundRule) {
                  const firstCriteria = foundRule.criteria?.[0];
                  handleChange('bound_rule_id', ruleId);
                  handleChange('label', `IF ${foundRule.name}`);
                  if (firstCriteria) {
                    handleChange('condition_field', `{{ticket.${firstCriteria.field}}}`);
                    handleChange('condition_operator', firstCriteria.operator);
                    handleChange('condition_value', firstCriteria.value);
                  }
                } else {
                  handleChange('bound_rule_id', '');
                }
              }}
            >
              <option value="">-- Load Saved System Rule --</option>
              {businessRules.map((rule) => (
                <option key={rule.id} value={rule.id}>
                  ⚖️ {rule.name} ({rule.match_type})
                </option>
              ))}
            </select>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
              Select a rule to auto-populate logic or define inline Criteria (IF) & Actions (THEN) below.
            </div>
          </div>

          {/* SECTION 1: IF Match Criteria */}
          <div style={{ background: 'var(--color-background)', padding: 12, borderRadius: 8, border: '1px solid var(--color-border)', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="badge primary" style={{ fontSize: 9 }}>IF</span>
              <span>Criteria Conditions (شروط التطابق)</span>
            </div>

            <div className="form-group" style={{ marginBottom: 10 }}>
              <label className="form-label" style={{ fontSize: 10 }}>Target Ticket Field</label>
              <select
                className="form-control"
                style={{ fontSize: 11, fontWeight: 600 }}
                value={(data.condition_field as string) || '{{ticket.category_id}}'}
                onChange={(e) => handleChange('condition_field', e.target.value)}
              >
                <optgroup label="🏷️ Ticket & Form Classification">
                  <option value="{{ticket.category_id}}">📂 Main Category (فئة الطلب)</option>
                  <option value="{{ticket.subcategory_id}}">📁 Subcategory (التصنيف الفرعي)</option>
                  <option value="{{ticket.type}}">🏷️ Ticket Type (Incident vs Request)</option>
                  <option value="{{ticket.priority}}">🚩 Priority Level (الأولوية)</option>
                  <option value="{{ticket.impact}}">💥 Impact Level (المأثير)</option>
                  <option value="{{ticket.urgency}}">⚡ Urgency Level (الاستعجال)</option>
                  <option value="{{ticket.location_id}}">📍 Location / Branch (الفرع)</option>
                </optgroup>
                <optgroup label="👤 Actors & Departments">
                  <option value="{{requester.department}}">🏢 Requester Department (الإدارة)</option>
                  <option value="{{ticket.assigned_group}}">🛠️ Assigned Technical Group</option>
                </optgroup>
                <optgroup label="📝 Custom Form Values (EAV)">
                  <option value="{{form.amount}}">💰 Form Amount / Cost</option>
                  <option value="{{form.reason}}">📝 Request Reason</option>
                </optgroup>
              </select>
            </div>

            <div className="form-grid-2" style={{ gap: 8 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 10 }}>Operator</label>
                <select
                  className="form-control"
                  style={{ fontSize: 11 }}
                  value={(data.condition_operator as string) || 'equals'}
                  onChange={(e) => handleChange('condition_operator', e.target.value)}
                >
                  <option value="equals">Equals (=)</option>
                  <option value="not_equals">Not Equal (≠)</option>
                  <option value="contains">Contains</option>
                  <option value="gt">Greater Than (&gt;)</option>
                  <option value="gte">Greater or Equal (&gt;=)</option>
                  <option value="lt">Less Than (&lt;)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 10 }}>Match Value</label>
                <input
                  className="form-control"
                  style={{ fontSize: 11 }}
                  placeholder="e.g. Hardware or 5000"
                  value={(data.condition_value as string) || ''}
                  onChange={(e) => handleChange('condition_value', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: THEN Trigger Actions for True Branch */}
          <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: 12, borderRadius: 8, border: '1px solid rgba(16, 185, 129, 0.3)', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#10B981', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="badge success" style={{ fontSize: 9 }}>THEN (🟢 True)</span>
              <span>Trigger Actions (الإجراءات الذكية)</span>
            </div>

            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label" style={{ fontSize: 10 }}>Action on Criteria Match</label>
              <select
                className="form-control"
                style={{ fontSize: 11, fontWeight: 600 }}
                value={(data.then_action_type as string) || 'assign_group'}
                onChange={(e) => handleChange('then_action_type', e.target.value)}
              >
                <option value="assign_group">👥 Assign to Group (توجيه لمجموعة)</option>
                <option value="assign_user">👤 Assign to Employee (توجيه لموظف)</option>
                <option value="set_priority">🚩 Set Priority Level (تغيير الأولوية)</option>
                <option value="set_status">🔄 Set Ticket Status (تغيير الحالة)</option>
                <option value="attach_sla_tto">⏱️ Attach SLA TTO (زمن الاستلام)</option>
                <option value="attach_sla_ttr">⏱️ Attach SLA TTR (زمن الحل)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 10 }}>Action Target Value</label>
              <input
                className="form-control"
                style={{ fontSize: 11 }}
                placeholder="e.g. IT_MANAGERS or HIGH"
                value={(data.then_action_target as string) || ''}
                onChange={(e) => handleChange('then_action_target', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Operator</label>
            <select
              className="form-control"
              value={(data.condition_operator as string) || 'gt'}
              onChange={(e) => handleChange('condition_operator', e.target.value)}
            >
              <option value="gt">Greater Than ({'>'})</option>
              <option value="gte">Greater Than or Equal ({'>='})</option>
              <option value="lt">Less Than ({'<'})</option>
              <option value="lte">Less Than or Equal ({'<='})</option>
              <option value="eq">Equals (==)</option>
              <option value="equals">Equals (==)</option>
              <option value="neq">Not Equal (!=)</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Target Value</label>
            <input
              className="form-control"
              placeholder="e.g. 5000 or Hardware"
              value={(data.condition_value as string) || ''}
              onChange={(e) => handleChange('condition_value', e.target.value)}
            />
          </div>
        </>
      )}

      {/* Send Email Settings */}
      {node.type === 'send_email' && (
        <>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Recipient Email</label>
            <input
              className="form-control"
              placeholder="e.g. {{requester.email}}"
              value={(data.email_to as string) || ''}
              onChange={(e) => handleChange('email_to', e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Email Subject</label>
            <input
              className="form-control"
              placeholder="Request {{form.request_number}} Approved"
              value={(data.email_subject as string) || ''}
              onChange={(e) => handleChange('email_subject', e.target.value)}
            />
          </div>
        </>
      )}

      {/* Webhook / REST API Settings */}
      {node.type === 'webhook' && (
        <>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">HTTP Method</label>
            <select
              className="form-control"
              value={(data.method as string) || 'POST'}
              onChange={(e) => handleChange('method', e.target.value)}
            >
              <option value="POST">POST</option>
              <option value="GET">GET</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">API Endpoint URL</label>
            <input
              className="form-control"
              placeholder="https://ad.local/api/v1/user/create"
              value={(data.webhook_url as string) || ''}
              onChange={(e) => handleChange('webhook_url', e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: 11 }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">JSON Body Template</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder={`{\n  "user": "{{requester.email}}",\n  "amount": "{{form.amount}}"\n}`}
              value={(data.webhook_body as string) || ''}
              onChange={(e) => handleChange('webhook_body', e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: 11 }}
            />
          </div>
        </>
      )}

      {/* Assign User Node Properties (Assign to Employee) */}
      {node.type === 'assign_user_node' && (
        <>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Assignee Type (نوع تحديد الموظف)</label>
            <select
              className="form-control"
              value={(data.assignee_type as string) || 'user'}
              onChange={(e) => {
                const val = e.target.value;
                handleChange('assignee_type', val);
                if (val === 'manager_of_requester') {
                  handleChange('user_name', 'Direct Manager of Requester');
                  handleChange('assignee_value', '{{requester.manager}}');
                } else if (val === 'requester_dept_head') {
                  handleChange('user_name', 'Requester Department Head');
                  handleChange('assignee_value', '{{requester.department_head}}');
                } else if (val === 'specific_dept_head') {
                  handleChange('user_name', 'IT Department Head');
                  handleChange('assignee_value', 'dept-it-head');
                }
              }}
            >
              <option value="user">👤 Specific Employee Search (موظف محدد بالاسم)</option>
              <option value="manager_of_requester">👔 Direct Manager of Requester (المدير المباشر لمقدم الطلب)</option>
              <option value="requester_dept_head">🏢 Requester Department Head (رئيس قسم/إدارة مقدم الطلب)</option>
              <option value="specific_dept_head">🎯 Specific Department Head (رئيس قسم/إدارة معينة)</option>
              <option value="role">🛡️ System Role (دور وظيفي في النظام)</option>
            </select>
          </div>

          {/* Conditional Field 1: ONLY shown when Specific User is chosen */}
          {((data.assignee_type as string) || 'user') === 'user' && (
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>🔍 Select Employee (اختر الموظف)</label>
              <select
                className="form-control"
                style={{ fontSize: 11, fontWeight: 700 }}
                value={(data.user_name as string) || (data.assignee_value as string) || 'Ahmed Mohamed (IT Staff)'}
                onChange={(e) => {
                  handleChange('user_name', e.target.value);
                  handleChange('assignee_value', e.target.value);
                }}
              >
                <option value="Ahmed Mohamed (IT Staff)">👤 Ahmed Mohamed (IT Technical Specialist)</option>
                <option value="Khaled Samir (IT Manager)">👨‍💼 Khaled Samir (IT Department Director)</option>
                <option value="Tarek Hassan (Procurement Staff)">👤 Tarek Hassan (Senior Purchasing Officer)</option>
                <option value="Yasser Mahmoud (Procurement Manager)">👨‍💼 Yasser Mahmoud (Head of Procurement)</option>
                <option value="Huda Adel (Accounts Staff)">👩‍💼 Huda Adel (Senior Accountant)</option>
                <option value="Mona Omar (Finance Manager / CFO)">👩‍💼 Mona Omar (Chief Financial Officer - CFO)</option>
                <option value="Sara Hassan (HR Director)">👩‍💼 Sara Hassan (HR Director)</option>
                <option value="Karim Fathy (Operations Manager)">👨‍💼 Karim Fathy (Operations Manager)</option>
                <option value="System Admin">👑 System Admin (Super Administrator)</option>
              </select>
            </div>
          )}

          {/* Conditional Field 2: ONLY shown when Specific Department Head is chosen */}
          {(data.assignee_type as string) === 'specific_dept_head' && (
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>🏢 Select Department (اختر القسم/الإدارة المعنية)</label>
              <select
                className="form-control"
                style={{ fontSize: 11, fontWeight: 700 }}
                value={(data.assignee_value as string) || 'dept-it-head'}
                onChange={(e) => {
                  const label = e.target.options[e.target.selectedIndex].text;
                  handleChange('user_name', label);
                  handleChange('assignee_value', e.target.value);
                }}
              >
                <option value="dept-it-head">👨‍💼 IT Department Head (Khaled Samir)</option>
                <option value="dept-hr-head">👩‍💼 HR Department Head (Sara Hassan)</option>
                <option value="dept-finance-head">👩‍💼 Finance Department Head (Mona Omar)</option>
                <option value="dept-procurement-head">👨‍💼 Procurement Department Head (Yasser Mahmoud)</option>
                <option value="dept-ops-head">👨‍💼 Operations Department Head (Karim Fathy)</option>
              </select>
            </div>
          )}

          {/* Conditional Field 3: ONLY shown when System Role is chosen */}
          {(data.assignee_type as string) === 'role' && (
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>🛡️ Target System Role (اختر الدور الوظيفي)</label>
              <select
                className="form-control"
                style={{ fontSize: 11, fontWeight: 700 }}
                value={(data.assignee_value as string) || 'Finance Manager'}
                onChange={(e) => {
                  handleChange('user_name', e.target.value);
                  handleChange('assignee_value', e.target.value);
                }}
              >
                <option value="Finance Manager">💰 Finance Manager / CFO</option>
                <option value="IT Manager">💻 IT Manager</option>
                <option value="HR Manager">👥 HR Manager</option>
                <option value="Procurement Manager">🛍️ Procurement Manager</option>
                <option value="System Admin">👑 System Admin</option>
              </select>
            </div>
          )}
        </>
      )}

      {/* Assign Group Node Properties */}
      {node.type === 'assign_group_node' && (
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label" style={{ fontWeight: 700 }}>👥 Target Group / Department (اختر المجموعة أو الإدارة)</label>
          <select
            className="form-control"
            style={{ fontSize: 11, fontWeight: 700 }}
            value={(data.group_name as string) || 'IT Technical Support Group'}
            onChange={(e) => handleChange('group_name', e.target.value)}
          >
            <optgroup label="👥 مجموعات العمل واللجان (Business Groups & Committees)">
              <option value="IT Technical Support Group">IT Technical Support Group</option>
              <option value="Procurement Committee">Procurement Committee</option>
              <option value="Finance & Payroll Team">Finance & Payroll Team</option>
              <option value="Department Managers">Department Managers</option>
              <option value="Executive Board">Executive Board</option>
            </optgroup>

            <optgroup label="🏢 الإدارات والقطاعات (Departments)">
              <option value="IT & Technology Department">IT & Technology Department</option>
              <option value="Human Resources (HR)">Human Resources (HR)</option>
              <option value="Finance & Accounts Department">Finance & Accounts Department</option>
              <option value="Procurement Department">Procurement Department</option>
              <option value="Operations & Facilities">Operations & Facilities</option>
            </optgroup>
          </select>
        </div>
      )}

      {/* Set Priority Node Properties */}
      {node.type === 'set_priority_node' && (
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label" style={{ fontWeight: 700 }}>Target Priority</label>
          <select
            className="form-control"
            value={(data.priority as string) || 'high'}
            onChange={(e) => handleChange('priority', e.target.value)}
          >
            <option value="low">🟢 Low</option>
            <option value="normal">🔵 Normal</option>
            <option value="high">🟠 High</option>
            <option value="urgent">🔴 Urgent</option>
            <option value="critical">⚡ Critical</option>
          </select>
        </div>
      )}

      {/* Set Status Node Properties */}
      {node.type === 'set_status_node' && (
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label" style={{ fontWeight: 700 }}>Target Status</label>
          <select
            className="form-control"
            value={(data.status as string) || 'assigned'}
            onChange={(e) => handleChange('status', e.target.value)}
          >
            <option value="new">🆕 New</option>
            <option value="assigned">🛠️ Assigned</option>
            <option value="pending">⏳ Pending Approval</option>
            <option value="processing">⚙️ Processing (قيد المعالجة والتنفيذ)</option>
            <option value="solved">✅ Solved</option>
            <option value="closed">🔒 Closed</option>
          </select>
        </div>
      )}

      {/* Attach SLA Node Properties */}
      {node.type === 'attach_sla_node' && (
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label" style={{ fontWeight: 700 }}>Target SLA Policy</label>
          <select
            className="form-control"
            value={(data.sla_policy_name as string) || 'Standard SLA (48h)'}
            onChange={(e) => handleChange('sla_policy_name', e.target.value)}
          >
            <option value="Standard SLA (48h)">Standard SLA (48h Target)</option>
            <option value="Urgent SLA (4h)">Urgent SLA (4h Target)</option>
            <option value="Critical Incident SLA (1h)">Critical Incident SLA (1h Target)</option>
          </select>
        </div>
      )}

      {/* Attach OLA Node Properties */}
      {node.type === 'attach_ola_node' && (
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label" style={{ fontWeight: 700 }}>Target OLA Policy</label>
          <select
            className="form-control"
            value={(data.ola_policy_name as string) || 'Standard OLA (4h)'}
            onChange={(e) => handleChange('ola_policy_name', e.target.value)}
          >
            <option value="Standard OLA (4h)">Standard OLA (4h Target)</option>
            <option value="Department OLA (2h)">Department OLA (2h Target)</option>
            <option value="Emergency OLA (30m)">Emergency OLA (30m Target)</option>
          </select>
        </div>
      )}

      {/* Set Watcher Node Properties (Set Observer / CC) */}
      {node.type === 'set_watcher_node' && (
        <>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Watcher Type (نوع الملاحظ/المراقب)</label>
            <select
              className="form-control"
              value={(data.watcher_type as string) || 'manager_of_requester'}
              onChange={(e) => {
                const val = e.target.value;
                handleChange('watcher_type', val);
                if (val === 'manager_of_requester') {
                  handleChange('watcher_name', 'Requester Direct Manager');
                }
              }}
            >
              <option value="manager_of_requester">👔 Requester Direct Manager (المدير المباشر لمقدم الطلب)</option>
              <option value="specific_user">👤 Specific Employee (موظف محدد بالاسم)</option>
              <option value="group_members">👥 All Group Members (جميع أعضاء مجموعة)</option>
            </select>
          </div>

          {/* Conditional Field: ONLY shown when specific_user is chosen */}
          {(data.watcher_type as string) === 'specific_user' && (
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>🔍 Select Observer Employee (اختر الموظف المراقب)</label>
              <select
                className="form-control"
                style={{ fontSize: 11, fontWeight: 700 }}
                value={(data.watcher_name as string) || 'Mona Omar (Finance Manager / CFO)'}
                onChange={(e) => handleChange('watcher_name', e.target.value)}
              >
                <option value="Mona Omar (Finance Manager / CFO)">👩‍💼 Mona Omar (CFO)</option>
                <option value="Khaled Samir (IT Manager)">👨‍💼 Khaled Samir (IT Manager)</option>
                <option value="Sara Hassan (HR Director)">👩‍💼 Sara Hassan (HR Director)</option>
                <option value="Yasser Mahmoud (Procurement Manager)">👨‍💼 Yasser Mahmoud (Procurement Manager)</option>
                <option value="Ahmed Mohamed (IT Staff)">👤 Ahmed Mohamed (IT Staff)</option>
              </select>
            </div>
          )}

          {/* Conditional Field: ONLY shown when group_members is chosen */}
          {(data.watcher_type as string) === 'group_members' && (
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>👥 Select Group (اختر المجموعة المراقبة)</label>
              <select
                className="form-control"
                style={{ fontSize: 11, fontWeight: 700 }}
                value={(data.watcher_name as string) || 'IT Technical Support Group'}
                onChange={(e) => handleChange('watcher_name', e.target.value)}
              >
                <option value="IT Technical Support Group">IT Technical Support Group</option>
                <option value="Procurement Committee">Procurement Committee</option>
                <option value="Finance & Payroll Team">Finance & Payroll Team</option>
                <option value="Department Managers">Department Managers</option>
              </select>
            </div>
          )}
        </>
      )}

      {/* Check Budget Node Properties */}
      {node.type === 'check_budget_node' && (
        <>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>💰 Target Budget Scope (نطاق ميزانية القسم)</label>
            <select
              className="form-control"
              value={(data.department as string) || 'requester_dept'}
              onChange={(e) => handleChange('department', e.target.value)}
            >
              <option value="requester_dept">🏢 Requester Department Budget (ميزانية قسم مقدم الطلب)</option>
              <option value="dept-it">💻 IT & Technology Department</option>
              <option value="dept-hr">👥 Human Resources (HR)</option>
              <option value="dept-finance">💰 Finance & Accounts Department</option>
              <option value="dept-procurement">🛍️ Procurement Department</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>🚨 Action on Insufficient Budget (عند تجاوز الميزانية)</label>
            <select
              className="form-control"
              value={(data.action_on_breach as string) || 'require_cfo_approval'}
              onChange={(e) => handleChange('action_on_breach', e.target.value)}
            >
              <option value="require_cfo_approval">🛡️ Route to CFO Approval (تحويل لاعتماد المدير المالي)</option>
              <option value="block_request">🚫 Block Request (إيقاف الطلب مع رسالة خطأ)</option>
              <option value="flag_warning">⚠️ Flag Warning & Continue (تحذير ومتابعة)</option>
            </select>
          </div>
        </>
      )}


    </div>
  );
}
