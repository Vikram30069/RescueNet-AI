# Task Chaining Report

**Date:** 2026-06-20  
**Phase:** B (Context Chaining) + C (Orchestrator Fix) + D (Structured Outputs) + E (Logging)  
**Tests after changes:** 16/16 ✅

---

## Old Workflow — Task Graph (Before)

Every task was **completely isolated**. Each task received only the raw incident dict fields injected as f-strings. No task had any awareness of another task's outputs.

```
Task 1: classify_incident_task(agent, incident)         # NO context
Task 2: understand_incident_task(agent, incident)       # NO context
Task 3: estimate_survivors_task(agent, incident)        # NO context
Task 4: medical_triage_task(agent, incident)            # NO context
Task 5: prioritize_incident_task(agent, incident)       # NO context
Task 6: allocate_resources_task(agent, incident)        # NO context
Task 7: coordinate_hospitals_task(agent, incident)      # NO context
Task 8: predict_risks_task(agent, incident)             # NO context
Task 9: draft_alerts_task(agent, incident)              # NO context
Task 10: assemble_rescue_plan_task(agent, incident)     # NO context ← critical gap
```

**Problems in old workflow:**
- Agent 10 (Command Orchestrator) received zero context from agents 1–9
- The orchestrator had to "invent" the entire rescue plan from raw incident data
- Risk Prediction Agent had no infrastructure assessment to base predictions on
- Medical Triage Agent had no survivor count to work with
- Alert messages could not reference real priority/resource/hospital values
- No structured output format — LLM could return any text, nothing parseable
- `_parse_or_fallback()` used naive `output.find("{")` with zero validation

---

## New Workflow — Task Graph (After)

```
Task 1  classify_incident_task       context=[]
   ↓
Task 2  understand_incident_task     context=[t1]
   ↓
Task 3  estimate_survivors_task      context=[t2]
   ↓
Task 4  medical_triage_task          context=[t3]
   ↓
Task 5  prioritize_incident_task     context=[t1, t2, t3, t4]   ← full picture
   ↓               ↓                       ↓
Task 6            Task 7                 Task 8
allocate_         coordinate_            predict_
resources_task    hospitals_task         risks_task
context=[t4,t5]   context=[t3,t4,t5]    context=[t1,t2]
   ↓               ↓                       ↓
   └───────────────┴──────────────────────┘
                   ↓
Task 9  draft_alerts_task           context=[t5, t6, t7, t8]
   ↓
Task 10 assemble_rescue_plan_task   context=[t1,t2,t3,t4,t5,t6,t7,t8,t9]
                                    ← ALL prior outputs
```

---

## Context Flow Detail

| Task | Agent | Context Received From | What It Gets |
|---|---|---|---|
| Task 1 | Disaster Intelligence | _(none — first in chain)_ | Raw incident data only |
| Task 2 | Incident Understanding | Task 1 | Verified incident type, severity, impact radius |
| Task 3 | Survivor Probability | Task 2 | Affected population estimate, infrastructure damage |
| Task 4 | Medical Triage | Task 3 | Survivor count, time-sensitivity rating |
| Task 5 | Priority Agent | Tasks 1–4 | Full situational picture for accurate ranking |
| Task 6 | Resource Allocation | Tasks 4, 5 | Medical needs + priority level → correct resource mix |
| Task 7 | Hospital Coordination | Tasks 3, 4, 5 | Survivor count + trauma types + priority → hospital routing |
| Task 8 | Risk Prediction | Tasks 1, 2 | Incident classification + impact zone for secondary risks |
| Task 9 | Communication Agent | Tasks 5, 6, 7, 8 | Priority + resources + hospitals + risks → accurate alerts |
| Task 10 | Command Orchestrator | Tasks 1–9 (ALL) | Full pipeline context → synthesize, not invent |

---

## Files Changed

| File | What Changed |
|---|---|
| `agents/tasks/tasks.py` | Full rewrite — added `context=[]` to all 10 tasks; added `build_task_chain()` factory; added structured output format to every `expected_output` |
| `agents/orchestrator.py` | Full rewrite — live pipeline now uses `build_task_chain()`; added `_extract_task_output()` for CrewAI v0.55+ API; added `_parse_rescue_plan()` with schema validation; Phase E structured logging; fixed mock field names |

**Files NOT changed (as required):**
- `backend/` — zero changes
- `frontend/` — zero changes
- `database/` — zero changes
- All tests — zero changes

---

## Phase D — Structured Output Format

Every agent is now instructed to return a JSON block:

```json
{
  "agent_name": "<role>",
  "summary": "<one-sentence summary>",
  "confidence": 0.85,
  "recommendations": [
    "<specific finding 1>",
    "<specific finding 2>"
  ]
}
```

The Command Orchestrator (Task 10) additionally returns the full `RescuePlan` JSON structure:

```json
{
  "priority": "P2",
  "severity": 4,
  "affected_area": "South Mumbai, Maharashtra",
  "estimated_survivors": 220,
  "survivor_probability": 0.85,
  "priority_score": 0.8,
  "confidence_score": 0.86,
  "medical_priority": "critical",
  "dispatch_urgency": "immediate",
  "recommended_hospital": "KEM Hospital",
  "recommended_resources": [{"type": "ambulance", "count": 8, "eta_minutes": 14}],
  "hospitals": [{"name": "KEM Hospital", "distance_km": 2.1, "available_beds": 120, "patient_routing": 100}],
  "alert_actions": {"field_team": "...", "hospital": "...", "public": "..."},
  "risk_warnings": ["Secondary flooding escalation risk in next 6 hours"]
}
```

---

## Phase E — Structured Logging

Every agent step now emits a structured log block:

```
[2026-06-20T07:10:58Z] [rescuenet.orchestrator] INFO —
  ┌─ Agent Step 3/10 ──────────────────────────────────────
  │  Agent:      survivor_probability
  │  Task:       estimate_survivors_task
  │  Timestamp:  2026-06-20T07:10:58Z
  │  Input:      Location normalised: South Mumbai. Affected pop: ~48000. Damage: severe.
  │  Output:     Survivor probability: 0.85. Estimated 220 require rescue. Time-sensitivity: critical.
  │  Confidence: 0.85
  └────────────────────────────────────────────────────────
```

Logged for every step in both **mock mode** and **live mode**.

---

## Phase C — Command Orchestrator Fix

**Before:** Task 10 had no `context=[]`. The LLM received only the raw incident dict and had to re-derive everything from scratch.

**After:** Task 10 receives `context=[t1, t2, t3, t4, t5, t6, t7, t8, t9]` — all 9 prior task outputs — and its prompt explicitly instructs:

> "Your job is NOT to reason independently — it is to synthesize and assemble their outputs into a single, structured rescue plan."

The task prompt lists every required field with its source agent:

```
- priority:             from Priority Agent (P1-P5)
- affected_area:        from Incident Understanding Agent
- estimated_survivors:  from Survivor Probability Agent
- recommended_resources: from Resource Allocation Agent
- hospitals:            from Hospital Coordination Agent
- alert_actions:        from Communication Agent
- risk_warnings:        from Risk Prediction Agent
...
```

---

## Validation Results

### Tests
```
16 passed, 37 warnings in 1.43s
```
All 16 existing tests continue to pass. Mock mode is preserved and unaffected.

### API Smoke Test

```
POST /api/v1/agents/execute  {"incident_id": "demo-001"}
→ 200 OK
→ rescue_plan.estimated_survivors   = 220    ✅
→ rescue_plan.recommended_resources = [4 types] ✅
→ rescue_plan.alert_actions.field_team = "PRIORITY P2..." ✅
→ agent_decisions count = 10  ✅
→ Each decision has: step, agent, output  ✅
```

---

## Remaining Gaps Before Real CrewAI Activation

These gaps remain and should be addressed in order before switching `LLM_PROVIDER` from `mock`:

| Priority | Gap | File | Effort |
|---|---|---|---|
| 🔴 P1 | Install crewAI + langchain packages (requires stable network) | `requirements.txt` | Low |
| 🔴 P1 | Verify `build_task_chain()` works with installed CrewAI version | `tasks/tasks.py` | Low |
| 🔴 P1 | Verify `task.output.raw` attribute exists in installed CrewAI | `orchestrator.py` | Low |
| 🟠 P2 | Add tools to Resource Allocation agent (DB query for real inventory) | `definitions/resource_allocation.py` | High |
| 🟠 P2 | Add tools to Hospital Coordination agent (real hospital DB query) | `definitions/hospital_coordination.py` | High |
| 🟠 P2 | Add weather/news API tool to Risk Prediction agent | `definitions/risk_prediction.py` | Medium |
| 🟡 P3 | Add Twilio SMS dispatch to Communication agent | `definitions/communication_agent.py` | Medium |
| 🟡 P3 | Connect to real PostgreSQL (replaces mock_db) | `backend/app/db/` | High |
| 🟡 P3 | Add LLM API key validation before pipeline starts | `config/llm_config.py` | Low |
| 🔵 P4 | Add WebSocket streaming so frontend shows live agent progress | `backend/app/routers/` | Medium |
| 🔵 P4 | Add response time timeout (currently unbounded for 10× LLM calls) | `orchestrator.py` | Medium |
