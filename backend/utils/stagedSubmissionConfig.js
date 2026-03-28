const FIXED_STAGE_TEMPLATE = [
  {
    stageKey: 'design',
    order: 1,
    title: 'تسليم التصميم (Designer Lead)',
    description: 'وصف فكرة النظام، تحديد المدخلات والمخرجات، ورسم مخطط مبدئي للدائرة.'
  },
  {
    stageKey: 'wiring',
    order: 2,
    title: 'تسليم الموصل (Builder Lead)',
    description: 'تنفيذ التوصيلات على Wokwi والتأكد من صحة التوصيل وتقديم رابط المحاكاة.'
  },
  {
    stageKey: 'programming',
    order: 3,
    title: 'تسليم الكود (Programmer - إلزامي لكل طالب)',
    description: 'كل طالب في الفريق يسلّم نسخة كود خاصة به لتطبيق منطق النظام.'
  },
  {
    stageKey: 'testing',
    order: 4,
    title: 'تسليم المختبر (Tester Lead)',
    description: 'اختبار النظام في حالات مختلفة وتوثيق النتائج والأخطاء والتحسينات.'
  },
  {
    stageKey: 'final_delivery',
    order: 5,
    title: 'التسليم النهائي (Final Delivery)',
    description: 'تسليم النسخة النهائية بعد استلام الفيدباك ومعالجة الملاحظات.'
  }
];

const STAGE_TO_REQUIRED_ROLE = {
  design: 'system_designer',
  wiring: 'hardware_engineer',
  programming: null,
  testing: 'tester',
  final_delivery: 'tester'
};

// Team project workflow is now unified on Wokwi for all stages.
// Keep FILE_ALLOWED_STAGES empty to prevent new file submissions while preserving legacy records.
const FILE_ALLOWED_STAGES = new Set([]);
const WOKWI_ALLOWED_STAGES = new Set(['design', 'wiring', 'programming', 'testing', 'final_delivery']);

const STAGE_ORDER = FIXED_STAGE_TEMPLATE.map((s) => s.stageKey);

const normalizeProjectMilestones = (incomingMilestones = []) => {
  return FIXED_STAGE_TEMPLATE.map((stage, index) => {
    const fromIncoming = incomingMilestones[index] || {};
    return {
      stageKey: stage.stageKey,
      order: stage.order,
      title: stage.title,
      description: stage.description,
      dueDate: fromIncoming.dueDate || null,
      points: Number.isFinite(fromIncoming.points) ? fromIncoming.points : 0,
      tasks: []
    };
  });
};

module.exports = {
  FIXED_STAGE_TEMPLATE,
  STAGE_TO_REQUIRED_ROLE,
  FILE_ALLOWED_STAGES,
  WOKWI_ALLOWED_STAGES,
  STAGE_ORDER,
  normalizeProjectMilestones
};
