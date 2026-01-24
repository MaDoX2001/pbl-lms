# TWO-PHASE ASSESSMENT - QUICK START GUIDE

## 🚀 FOR TEACHERS

### Step 1: Create Observation Cards
1. Create/Edit Project
2. Add TWO observation cards:
   - **Group Card** (phase: 'group')
   - **Individual/Oral Card** (phase: 'individual_oral')
     - Tag criteria by role (all/system_designer/hardware_engineer/programmer)

### Step 2: Navigate to Evaluation Hub
- Go to: **مشروعات الطلاب** (StudentProjectsManagement)
- Expand team accordion
- You'll see all projects for that team

### Step 3: Evaluate Group (Phase 1)
- Click **"تقييم جماعي (المرحلة الأولى)"**
- Select options for each criterion
- System calculates score automatically
- Submit
- ✅ Phase 1 complete → Phase 2 unlocked

### Step 4: Evaluate Each Student (Phase 2)
- Click **"تقييم فردي"** for specific student
- Select student's **role** from dropdown
- System filters criteria automatically
- Select options for **required criteria only**
- Submit
- Repeat for all team members

### Step 5: Finalize Results
- After both phases complete, click **"احتساب النهائي"**
- System:
  - Combines scores (0-200)
  - Calculates percentage
  - Assigns verbal grade
  - Awards badge (if passed ≥60%)
  - Updates student level

### Step 6: View Results & Manage Retries
- Click **"عرض التقييم النهائي"** to see full breakdown
- If student failed: Click **"سماح بإعادة المحاولة"**

---

## 👨‍🎓 FOR STUDENTS

### View Your Status
- Use **StudentEvaluationStatus** component (integrated in dashboard)
- See:
  - Phase 1: Group score
  - Phase 2: Individual score + your role
  - Final: Percentage, verbal grade, pass/fail

### View Your Level
- **StudentLevelBadge** shows current level
- Levels: Beginner → Intermediate → Advanced → Expert
- Automatically updates when you pass projects

### View Your Badges
- **BadgeCollection** shows all earned badges
- Locked badges = projects you haven't completed yet

---

## 📊 SCORING SYSTEM

### Formula
```
Final Score = Group Score + Individual Score (0-200)
Final Percentage = (Final Score / 200) × 100
```

### Pass/Fail
- **Pass:** ≥ 60%
- **Fail:** < 60%

### Verbal Grades
- **ممتاز** (Excellent): ≥85%
- **جيد جدًا** (Very Good): 75-84%
- **جيد** (Good): 65-74%
- **مقبول** (Acceptable): 60-64%
- **غير مجتاز** (Failed): <60%

---

## 🎯 KEY RULES

1. ❌ **Teachers NEVER enter numbers manually**
2. ✅ System calculates everything from option selections
3. 🔒 Phase 2 locked until Phase 1 complete (team projects)
4. 🎭 Criteria filtered by student role
5. 🔄 Retry = Full re-evaluation (all phases)
6. 📈 Student level updates automatically

---

## 🛠️ API ENDPOINTS (Quick Reference)

### Observation Cards
- `POST /api/assessment/observation-card` - Create/update
- `GET /api/assessment/observation-card/:projectId/:phase` - Get

### Phase 1
- `POST /api/assessment/evaluate-group` - Evaluate
- `GET /api/assessment/group-status/:projectId/:teamId` - Status

### Phase 2
- `POST /api/assessment/evaluate-individual` - Evaluate
- `GET /api/assessment/individual-status/:projectId/:studentId` - Status

### Final
- `POST /api/assessment/finalize` - Combine phases
- `GET /api/assessment/final/:projectId/:studentId` - Get result

### Retry & Progress
- `POST /api/assessment/allow-retry` - Allow retry
- `GET /api/assessment/student-level/:studentId` - Level
- `GET /api/assessment/badges/:studentId` - Badges

---

## 📁 COMPONENT REFERENCE

### Teacher Components
- `StudentProjectsManagement` - Main hub
- `GroupEvaluationPage` - Phase 1 evaluation
- `IndividualEvaluationPage` - Phase 2 evaluation
- `ObservationCardBuilder` - Create cards
- `FinalEvaluationSummary` - View results

### Student Components
- `StudentEvaluationStatus` - Progress viewer
- `StudentLevelBadge` - Level display
- `BadgeCollection` - Badge gallery

---

## ⚠️ TROUBLESHOOTING

**Q: Phase 2 button is disabled**  
A: Complete Phase 1 first (group evaluation)

**Q: Some criteria are "not required"**  
A: Correct! They don't apply to this student's role

**Q: Student failed, what now?**  
A: Teacher can allow retry → full re-evaluation

**Q: Where is the manual grade entry?**  
A: There isn't one! System calculates from options

**Q: How to change observation card?**  
A: Edit project → Update observation card → Re-evaluate

---

## 🎬 COMPLETE WORKFLOW EXAMPLE

1. Teacher creates project with 2 observation cards ✅
2. Team submits project ✅
3. Teacher evaluates group → Score: 75/100 ✅
4. Teacher evaluates Student A (programmer) → Score: 80/100 ✅
5. Teacher evaluates Student B (designer) → Score: 70/100 ✅
6. Teacher evaluates Student C (hardware) → Score: 85/100 ✅
7. System finalizes:
   - Student A: 75+80=155/200 = 77.5% = **جيد جدًا** ✅
   - Student B: 75+70=145/200 = 72.5% = **جيد** ✅
   - Student C: 75+85=160/200 = 80% = **جيد جدًا** ✅
8. All passed → Badges awarded → Levels updated ✅

---

**THAT'S IT! SYSTEM IS READY TO USE.** 🎉
