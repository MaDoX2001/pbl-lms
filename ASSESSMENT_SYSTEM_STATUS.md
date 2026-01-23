# Two-Phase Assessment System - Implementation Status

## ✅ COMPLETED: Core Models

### 1. ObservationCard Model (Updated)
- **Phase-based**: `phase: 'group' | 'individual_oral'`
- **Role-based criteria**: `applicableRoles: ['all', 'system_designer', 'hardware_engineer', 'programmer']`
- **Sections with weights**: Must sum to 100%
- **6-level options**: 0%, 20%, 40%, 60%, 80%, 100% with descriptions

### 2. EvaluationAttempt Model (Updated)
- **Phase tracking**: `phase: 'group' | 'individual_oral'`
- **Team reference**: For group assessments
- **Student + Role**: For individual assessments with `studentRole` field
- **Criterion marking**: `isRequired: true/false` for role-based filtering
- **Calculated score**: Per-phase score (0-100%)
- **Attempt tracking**: `attemptNumber` and `isLatestAttempt`

### 3. FinalEvaluation Model (New)
- **Combined scoring**: `groupScore + individualScore = finalScore (0-200)`
- **Final percentage**: `finalPercentage` (0-100%)
- **Status**: `passed | failed` (threshold: 60%)
- **Verbal grade**: ممتاز | جيد جدًا | جيد | مقبول | غير مجتاز
- **References**: Links to both group and individual evaluation attempts

### 4. StudentLevel Model (New)
- **Current level**: beginner | intermediate | advanced | expert
- **Project history**: Completed projects with scores
- **Badge collection**: All earned badges

### 5. Project Model (Updated)
- **Level assignment**: `projectLevel` field
- **Project order**: 1-6 for progression tracking
- **Team flag**: `isTeamProject` boolean

## 🚧 IN PROGRESS: Controllers

Need to implement these endpoints:

### Observation Card Management
- ✅ `POST /assessment/observation-card` - Create/update by phase
- ✅ `GET /assessment/observation-card/:projectId/:phase` - Get by phase

### Group Assessment (Phase 1)
- ⏳ `POST /assessment/evaluate-group` - Evaluate team project
  - Creates EvaluationAttempt with phase='group'
  - One score applies to all team members
  - Blocks Phase 2 until complete

### Individual Assessment (Phase 2)
- ⏳ `POST /assessment/evaluate-individual` - Evaluate student
  - Requires Phase 1 completion
  - Teacher selects student role
  - Filters criteria by role (isRequired=false for non-applicable)
  - Creates EvaluationAttempt with phase='individual_oral'

### Final Evaluation
- ⏳ `POST /assessment/finalize` - Combine Phase 1 + Phase 2
  - Calculates finalScore = groupScore + individualScore
  - Determines pass/fail (60% threshold)
  - Awards badge if passed
  - Updates StudentLevel

### Query Endpoints
- ⏳ `GET /assessment/phase-status/:projectId/:teamId` - Check Phase 1 completion
- ⏳ `GET /assessment/final/:projectId/:studentId` - Get final evaluation
- ⏳ `GET /assessment/team-evaluations/:projectId/:teamId` - All team members' results

### Student Level Management
- ⏳ `GET /assessment/student-level/:studentId` - Get current level and progress
- ⏳ `POST /assessment/allow-retry` - Teacher allows retry after failure

## 📋 TODO: Frontend Components

### Teacher UI
1. **ObservationCardBuilder** (needs update)
   - Two separate cards: Group + Individual/Oral
   - Role selection per criterion
   - Section weights

2. **GroupEvaluationPage** (new)
   - Select team
   - Use group observation card
   - One score for whole team

3. **IndividualEvaluationPage** (new)
   - Blocked until Phase 1 complete
   - Select student + role
   - Auto-filter criteria by role
   - Merged individual + oral assessment

4. **FinalResultsView** (new)
   - Shows both phases
   - Combined score
   - Verbal grade
   - Pass/fail status

### Student UI
1. **EvaluationStatus** component
   - "قيد التقييم" while incomplete
   - "مجتاز" or "غير مجتاز" when done
   - Final percentage + verbal grade
   - Feedback display

2. **Profile enhancements**
   - ✅ Badges display (already done)
   - Current level badge
   - Progress bar

## 🎯 KEY IMPLEMENTATION RULES

### Phase Blocking
```javascript
// Before allowing Phase 2:
const groupEval = await EvaluationAttempt.findOne({
  project: projectId,
  team: teamId,
  phase: 'group',
  isLatestAttempt: true
});

if (!groupEval) {
  throw new Error('يجب إكمال التقييم الجماعي أولاً');
}
```

### Role-Based Filtering
```javascript
// When evaluating individual with role='hardware_engineer':
for (const criterion of criteria) {
  const isRequired = 
    criterion.applicableRoles.includes('all') ||
    criterion.applicableRoles.includes(studentRole);
  
  // Only required criteria count in calculation
  if (isRequired && !selection) {
    throw new Error('يجب تقييم جميع المعايير المطلوبة');
  }
}
```

### Final Score Calculation
```javascript
const groupScore = groupEval.calculatedScore; // 0-100
const individualScore = individualEval.calculatedScore; // 0-100

const finalScore = groupScore + individualScore; // 0-200
const finalPercentage = (finalScore / 200) * 100; // 0-100%

const status = finalPercentage >= 60 ? 'passed' : 'failed';

let verbalGrade;
if (finalPercentage >= 85) verbalGrade = 'ممتاز';
else if (finalPercentage >= 75) verbalGrade = 'جيد جدًا';
else if (finalPercentage >= 65) verbalGrade = 'جيد';
else if (finalPercentage >= 60) verbalGrade = 'مقبول';
else verbalGrade = 'غير مجتاز';
```

### Level Progression
```javascript
// Project 1-2: Beginner
// Project 3-4: Intermediate  
// Project 5: Advanced
// Project 6: Expert

const projectLevelMap = {
  1: 'beginner', 2: 'beginner',
  3: 'intermediate', 4: 'intermediate',
  5: 'advanced',
  6: 'expert'
};

// Update student level ONLY if they pass
if (finalEval.status === 'passed') {
  const newLevel = projectLevelMap[project.projectOrder];
  await StudentLevel.findOneAndUpdate(
    { student: studentId },
    {
      $set: { currentLevel: newLevel },
      $push: {
        completedProjects: {
          project: projectId,
          projectLevel: newLevel,
          finalScore: finalEval.finalPercentage
        }
      }
    },
    { upsert: true }
  );
}
```

## 📝 NEXT STEPS

1. Complete assessment.controller.js with all 10+ endpoints
2. Update assessment.routes.js with new routes
3. Update ObservationCardBuilder for two-phase system
4. Create GroupEvaluationPage component
5. Create IndividualEvaluationPage component
6. Update submissions management to show phase buttons
7. Add phase status indicators in UI
8. Test complete workflow:
   - Create project with level
   - Build both observation cards
   - Evaluate group (Phase 1)
   - Evaluate individuals (Phase 2) with roles
   - Verify final scores and levels
   - Test retry mechanism

## 🔐 SAFETY CHECKLIST

- ✅ No existing auth routes changed
- ✅ No existing submission logic broken
- ✅ No existing team logic modified
- ✅ Teachers cannot manually enter grades
- ✅ All calculations are automatic
- ✅ System is backward compatible (old evaluations still readable)

---

**System is now ready for controller implementation. Models are complete and committed.**
