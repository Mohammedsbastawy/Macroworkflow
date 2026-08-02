import { dbGetOne, dbCreate, dbGet } from './store';
import { WorkflowStep, WorkflowFormField } from '@/types/workflow';

export interface SimulationRule {
  field: string;
  operator: '==' | '!=' | '>' | '<' | 'contains';
  value: string;
  targetField: string;
  targetValue: string;
}

export interface SimulationStepLog {
  nodeId: string;
  nodeName: string;
  stepType: string;
  status: 'success' | 'warning' | 'error' | 'pending';
  message: string;
  timestamp: string;
  variablesSnapshot: Record<string, any>;
}

export interface SimulationResult {
  success: boolean;
  executionPath: SimulationStepLog[];
  finalFormData: Record<string, any>;
  durationHours: number;
}

function evaluateCondition(val: any, op: string, compareVal: any): boolean {
  const strVal = String(val).trim().toLowerCase();
  const strCompare = String(compareVal).trim().toLowerCase();

  switch (op) {
    case '==':
    case 'equals':
      return strVal === strCompare;
    case '!=':
    case 'notequals':
      return strVal !== strCompare;
    case '>':
      return Number(val) > Number(compareVal);
    case '<':
      return Number(val) < Number(compareVal);
    case 'contains':
      return strVal.includes(strCompare);
    default:
      return false;
  }
}

export async function runWorkflowSimulation(
  workflowId: string,
  initialFormData: Record<string, any>,
  triggerRules: SimulationRule[]
): Promise<SimulationResult> {
  const logs: SimulationStepLog[] = [];
  const now = new Date().toISOString();
  
  // 1. Fetch Workflow Template
  const workflow = await dbGetOne<any>('Workflows', workflowId);
  if (!workflow) {
    return {
      success: false,
      executionPath: [{
        nodeId: 'error',
        nodeName: 'System Error',
        stepType: 'end',
        status: 'error',
        message: `Workflow ${workflowId} not found in database.`,
        timestamp: now,
        variablesSnapshot: initialFormData
      }],
      finalFormData: initialFormData,
      durationHours: 0
    };
  }

  const formData = { ...initialFormData };
  let duration = 0;

  // 2. Phase 1: Apply Trigger Rules (RFA Automated Value Settings)
  logs.push({
    nodeId: 'start',
    nodeName: 'بداية المحاكاة',
    stepType: 'trigger',
    status: 'success',
    message: 'تم بدء المحاكاة وتجهيز الحقول المبدئية للطلب.',
    timestamp: now,
    variablesSnapshot: { ...formData }
  });

  if (triggerRules && triggerRules.length > 0) {
    for (const rule of triggerRules) {
      if (!rule.field || !rule.targetField) continue;
      const val = formData[rule.field];
      const match = evaluateCondition(val, rule.operator, rule.value);
      if (match) {
        formData[rule.targetField] = rule.targetValue;
        logs.push({
          nodeId: `rule-${rule.field}`,
          nodeName: 'تحديث مؤتمت للحقل',
          stepType: 'trigger',
          status: 'warning',
          message: `تم تحقق الشرط (${rule.field} ${rule.operator} ${rule.value}): تم تعيين الحقل "${rule.targetField}" إلى "${rule.targetValue}" تلقائياً.`,
          timestamp: new Date().toISOString(),
          variablesSnapshot: { ...formData }
        });
      }
    }
  }

  // 3. Phase 2: Traverse Steps
  const steps: WorkflowStep[] = (workflow.StepsJson ?? workflow.steps_json) || [];
  const sortedSteps = [...steps].sort((a, b) => a.step_order - b.step_order);

  if (sortedSteps.length === 0) {
    logs.push({
      nodeId: 'end',
      nodeName: 'نهاية المسار',
      stepType: 'end',
      status: 'warning',
      message: 'تنبيه: لا توجد خطوات معرفة في مسار هذا النموذج بعد.',
      timestamp: new Date().toISOString(),
      variablesSnapshot: { ...formData }
    });
    return {
      success: true,
      executionPath: logs,
      finalFormData: formData,
      durationHours: 0
    };
  }

  let currentStepIdx = 0;
  while (currentStepIdx < sortedSteps.length) {
    const step = sortedSteps[currentStepIdx];
    
    if (step.step_type === 'conditional') {
      const condField = step.condition_field || '';
      const condOp = step.condition_operator || '==';
      const condVal = step.condition_value || '';
      
      const isMatch = evaluateCondition(formData[condField], condOp, condVal);
      
      logs.push({
        nodeId: step.react_flow_node_id,
        nodeName: step.name,
        stepType: 'conditional',
        status: 'success',
        message: `تم تقييم الشرط على الحقل "${condField}": النتيجة (${isMatch ? 'متحقق' : 'غير متسق'}).`,
        timestamp: new Date().toISOString(),
        variablesSnapshot: { ...formData }
      });

      if (isMatch) {
        if (step.on_true_node_id) {
          const targetIdx = sortedSteps.findIndex(s => s.react_flow_node_id === step.on_true_node_id);
          if (targetIdx !== -1) {
            currentStepIdx = targetIdx;
            continue;
          }
        }
      } else {
        if (step.on_false_node_id) {
          const targetIdx = sortedSteps.findIndex(s => s.react_flow_node_id === step.on_false_node_id);
          if (targetIdx !== -1) {
            currentStepIdx = targetIdx;
            continue;
          }
        }
      }
    } else if (step.step_type === 'approval') {
      const stepDuration = step.ola_hours || 0;
      duration += stepDuration;
      
      logs.push({
        nodeId: step.react_flow_node_id,
        nodeName: step.name,
        stepType: 'approval',
        status: 'pending',
        message: `مرحلة اعتماد معلقة بواسطة المسمى: (${step.assignee_value || 'مدير القسم'}). حد زمن الاستجابة (SLA): ${stepDuration} ساعة.`,
        timestamp: new Date().toISOString(),
        variablesSnapshot: { ...formData }
      });
    } else if (step.step_type === 'notification') {
      logs.push({
        nodeId: step.react_flow_node_id,
        nodeName: step.name,
        stepType: 'notification',
        status: 'success',
        message: `تم إرسال إشعار تلقائي إلى: ${step.assignee_value || 'الموظفين المعنيين'}.`,
        timestamp: new Date().toISOString(),
        variablesSnapshot: { ...formData }
      });
    } else if (step.step_type === 'webhook' || step.step_type === 'api_call') {
      logs.push({
        nodeId: step.react_flow_node_id,
        nodeName: step.name,
        stepType: 'webhook',
        status: 'success',
        message: `تم استدعاء الرابط الخارجي (Webhook): ${step.webhook_url || 'https://api.system.local'} عبر منفذ ${step.webhook_method || 'POST'}.`,
        timestamp: new Date().toISOString(),
        variablesSnapshot: { ...formData }
      });
    }

    currentStepIdx++;
  }

  logs.push({
    nodeId: 'end',
    nodeName: 'اكتمال الطلب',
    stepType: 'end',
    status: 'success',
    message: 'تم محاكاة كامل المسار بنجاح واكتملت التذكرة.',
    timestamp: new Date().toISOString(),
    variablesSnapshot: { ...formData }
  });

  return {
    success: true,
    executionPath: logs,
    finalFormData: formData,
    durationHours: duration
  };
}
