# Agent Dependency Graph — RescueNet AI

**Date:** 2026-06-20  
**Status:** Context chaining implemented. Mock mode fully functional. Live mode ready for CrewAI installation.

---

## Full Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INCIDENT INPUT                                       │
│   {id, title, type, location, lat, lon, severity, description}              │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              ▼
          ┌───────────────────────────────────────┐
          │  TASK 1 — Disaster Intelligence Agent  │
          │  classify_incident_task                │
          │  context: []  (first in chain)         │
          │                                        │
          │  Output:                               │
          │  • Confirmed disaster type             │
          │  • Validated severity (1-5)            │
          │  • Impact radius (km)                  │
          │  • Threat category                     │
          └───────────────────┬───────────────────┘
                              │ t1
                              ▼
          ┌───────────────────────────────────────┐
          │  TASK 2 — Incident Understanding Agent │
          │  understand_incident_task              │
          │  context: [t1]                         │
          │                                        │
          │  Output:                               │
          │  • Verified coordinates                │
          │  • Affected population count           │
          │  • Infrastructure damage level         │
          │  • Administrative area                 │
          └───────────────────┬───────────────────┘
                              │ t2
                              ▼
          ┌───────────────────────────────────────┐
          │  TASK 3 — Survivor Probability Agent   │
          │  estimate_survivors_task               │
          │  context: [t2]                         │
          │                                        │
          │  Output:                               │
          │  • Survivor probability (0.0-1.0)      │
          │  • Estimated survivor count            │
          │  • Time-sensitivity rating             │
          │  • Rescue window (hours)               │
          └───────────────────┬───────────────────┘
                              │ t3
                              ▼
          ┌───────────────────────────────────────┐
          │  TASK 4 — Medical Triage Agent         │
          │  medical_triage_task                   │
          │  context: [t3]                         │
          │                                        │
          │  Output:                               │
          │  • Medical priority level              │
          │  • Trauma type list                    │
          │  • Recommended medical resources       │
          │  • Critical vs. walking-wounded ratio  │
          └───────────────────┬───────────────────┘
                              │ t4 + t1 + t2 + t3
                              ▼
          ┌───────────────────────────────────────┐
          │  TASK 5 — Priority Agent               │
          │  prioritize_incident_task              │
          │  context: [t1, t2, t3, t4]             │
          │                                        │
          │  Output:                               │
          │  • Priority rank (P1-P5)               │
          │  • Dispatch urgency                    │
          │  • Response window (minutes)           │
          │  • Priority score (0.0-1.0)            │
          └──────────┬────────────────┬────────────┘
                     │                │
          t4,t5      │                │  t3,t4,t5        t1,t2
                     ▼                ▼                    ▼
     ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
     │  TASK 6           │  │  TASK 7           │  │  TASK 8           │
     │  Resource         │  │  Hospital         │  │  Risk Prediction  │
     │  Allocation       │  │  Coordination     │  │  Agent            │
     │  allocate_        │  │  coordinate_      │  │  predict_risks_   │
     │  resources_task   │  │  hospitals_task   │  │  task             │
     │  context:[t4,t5]  │  │  context:[t3,t4,  │  │  context:[t1,t2]  │
     │                   │  │           t5]     │  │                   │
     │  Output:          │  │  Output:          │  │  Output:          │
     │  • Resource types │  │  • Primary hosp.  │  │  • Secondary risk │
     │  • Unit counts    │  │  • Secondary hosp.│  │  • Risk score     │
     │  • ETAs           │  │  • Patient routing│  │  • Time window    │
     │                   │  │  • Distances      │  │  • Precautions    │
     └────────┬─────────┘  └────────┬──────────┘  └────────┬─────────┘
              │                     │                        │
              │ t6                  │ t7                     │ t8
              └────────────┬────────┘                        │
                           │ + t5                            │
                           └─────────────┬───────────────────┘
                                         │ t5,t6,t7,t8
                                         ▼
                   ┌─────────────────────────────────────────┐
                   │  TASK 9 — Communication Agent            │
                   │  draft_alerts_task                       │
                   │  context: [t5, t6, t7, t8]              │
                   │                                          │
                   │  Output:                                 │
                   │  • Field team SMS alert                  │
                   │  • Hospital preparation notice           │
                   │  • Public safety announcement            │
                   └─────────────────────┬───────────────────┘
                                         │ t9
                                         │
                    t1,t2,t3,t4,t5,t6,t7,t8,t9 (ALL)
                                         │
                                         ▼
                   ┌─────────────────────────────────────────┐
                   │  TASK 10 — Command Orchestrator Agent    │
                   │  assemble_rescue_plan_task               │
                   │  context: [t1,t2,t3,t4,t5,t6,t7,t8,t9] │
                   │                                          │
                   │  Job: SYNTHESIZE, not invent             │
                   │  Collects all prior outputs and builds:  │
                   │                                          │
                   │  Output (RescuePlan JSON):               │
                   │  • priority ← from t5                    │
                   │  • severity ← from incident              │
                   │  • affected_area ← from t2               │
                   │  • estimated_survivors ← from t3         │
                   │  • survivor_probability ← from t3        │
                   │  • priority_score ← from t5              │
                   │  • confidence_score ← avg(all t1-t9)     │
                   │  • medical_priority ← from t4            │
                   │  • dispatch_urgency ← from t5            │
                   │  • recommended_hospital ← from t7        │
                   │  • recommended_resources ← from t6       │
                   │  • hospitals ← from t7                   │
                   │  • alert_actions ← from t9               │
                   │  • risk_warnings ← from t8               │
                   └─────────────────────────────────────────┘
                                         │
                                         ▼
                   ┌─────────────────────────────────────────┐
                   │            RESCUE PLAN JSON              │
                   │   → saved to mock_db.rescue_requests     │
                   │   → returned in API response             │
                   │   → displayed in frontend dashboard      │
                   └─────────────────────────────────────────┘
```

---

## Context Dependency Matrix

| | **t1** | **t2** | **t3** | **t4** | **t5** | **t6** | **t7** | **t8** | **t9** |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Task 2** | ✅ | | | | | | | | |
| **Task 3** | | ✅ | | | | | | | |
| **Task 4** | | | ✅ | | | | | | |
| **Task 5** | ✅ | ✅ | ✅ | ✅ | | | | | |
| **Task 6** | | | | ✅ | ✅ | | | | |
| **Task 7** | | | ✅ | ✅ | ✅ | | | | |
| **Task 8** | ✅ | ✅ | | | | | | | |
| **Task 9** | | | | | ✅ | ✅ | ✅ | ✅ | |
| **Task 10**| ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Before vs After — Side-by-Side

### Before (broken)
```python
# tasks.py — old
def classify_incident_task(agent, incident):
    return Task(description=f"...", agent=agent)
    # No context parameter — isolated

def understand_incident_task(agent, incident):
    return Task(description=f"...", agent=agent)
    # No context=[task_1] — doesn't know what task_1 found

# orchestrator.py — old (broken live pipeline)
tasks = [
    classify_incident_task(agents["disaster_intelligence"], incident),
    understand_incident_task(agents["incident_understanding"], incident),
    ...
    assemble_rescue_plan_task(agents["command_orchestrator"], incident),
    # ↑ Task 10 had ZERO context from tasks 1-9
]
```

### After (fixed)
```python
# tasks.py — new (context chaining)
def classify_incident_task(agent, incident, context=None):
    return Task(description=f"...", agent=agent, context=context or [])
    # Task 1 = no context (first in chain)

def understand_incident_task(agent, incident, context=None):
    return Task(description=f"...", agent=agent, context=context or [])
    # Receives context=[t1] from build_task_chain()

# tasks.py — new (build_task_chain factory)
def build_task_chain(agents, incident):
    t1  = classify_incident_task(agents["disaster_intelligence"], incident)
    t2  = understand_incident_task(agents["incident_understanding"], incident, context=[t1])
    t3  = estimate_survivors_task(agents["survivor_probability"], incident, context=[t2])
    t4  = medical_triage_task(agents["medical_triage"], incident, context=[t3])
    t5  = prioritize_incident_task(agents["priority_agent"], incident, context=[t1,t2,t3,t4])
    t6  = allocate_resources_task(agents["resource_allocation"], incident, context=[t4,t5])
    t7  = coordinate_hospitals_task(agents["hospital_coordination"], incident, context=[t3,t4,t5])
    t8  = predict_risks_task(agents["risk_prediction"], incident, context=[t1,t2])
    t9  = draft_alerts_task(agents["communication_agent"], incident, context=[t5,t6,t7,t8])
    t10 = assemble_rescue_plan_task(agents["command_orchestrator"], incident,
                                    context=[t1,t2,t3,t4,t5,t6,t7,t8,t9])
    return [t1,t2,t3,t4,t5,t6,t7,t8,t9,t10]

# orchestrator.py — new (uses build_task_chain)
tasks = build_task_chain(agents, incident)
crew = Crew(agents=list(agents.values()), tasks=tasks, process=Process.sequential)
```

---

## Files Modified Summary

| File | Change Type | Description |
|---|---|---|
| `agents/tasks/tasks.py` | **Full rewrite** | Added `context=[]` to all tasks; added `build_task_chain()` factory; added structured JSON output format |
| `agents/orchestrator.py` | **Full rewrite** | Live pipeline uses `build_task_chain()`; robust output parsing with schema validation; Phase E structured logging; corrected mock field names |

---

## Activation Checklist (before switching to live LLM)

```
☐ 1. pip install crewai (requires stable network)
☐ 2. Set LLM_PROVIDER=gemini (or openai/ollama) in .env
☐ 3. Set GEMINI_API_KEY=AIza... in .env
☐ 4. Run: python agents/orchestrator.py  (standalone test)
☐ 5. Verify logs show 10 structured agent steps
☐ 6. Verify Task 10 output contains all required RescuePlan fields
☐ 7. Run: pytest tests/ -v  (must still pass 16/16)
☐ 8. POST /api/v1/agents/execute on demo-001
☐ 9. Verify no "undefined" in frontend rescue plan panel
☐ 10. Add DB query tools to Resource Allocation + Hospital Coordination agents
```
