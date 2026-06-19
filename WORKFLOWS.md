# RescueNet AI — Incident Response Workflow

This document describes the end-to-end flow from an incident being reported to a rescue plan being dispatched and alerts sent.

---

## Full Workflow Diagram

```
╔══════════════════════════════════════════════════════════╗
║              INCIDENT REPORTED                           ║
║  (via dashboard form or POST /api/v1/incidents)          ║
╚═══════════════════════╦══════════════════════════════════╝
                        ║
                        ▼
╔══════════════════════════════════════════════════════════╗
║         STEP 1: INCIDENT CLASSIFIED                      ║
║  Agent: Disaster Intelligence                            ║
║  → Disaster type, severity band, impact radius           ║
╚═══════════════════════╦══════════════════════════════════╝
                        ║
                        ▼
╔══════════════════════════════════════════════════════════╗
║         STEP 2: INCIDENT UNDERSTOOD                      ║
║  Agent: Incident Understanding                           ║
║  → Structured data: coordinates, affected pop, damage    ║
╚═══════════════════════╦══════════════════════════════════╝
                        ║
                        ▼
╔══════════════════════════════════════════════════════════╗
║         STEP 3: SURVIVORS SCORED                         ║
║  Agent: Survivor Probability                             ║
║  → Probability (0-1), survivor count, time sensitivity   ║
╚═══════════════════════╦══════════════════════════════════╝
                        ║
                        ▼
╔══════════════════════════════════════════════════════════╗
║         STEP 4: MEDICAL TRIAGE ASSESSED                  ║
║  Agent: Medical Triage                                   ║
║  → Medical priority level, trauma types, resource needs  ║
╚═══════════════════════╦══════════════════════════════════╝
                        ║
                        ▼
╔══════════════════════════════════════════════════════════╗
║         STEP 5: INCIDENT PRIORITIZED                     ║
║  Agent: Priority Agent                                   ║
║  → P1-P5 rank, urgency score, response window            ║
╚═══════════════════════╦══════════════════════════════════╝
                        ║
              ┌─────────┴──────────┐
              ▼                    ▼
╔═════════════════╗    ╔═════════════════════════╗
║ STEP 6a:        ║    ║ STEP 6b:                ║
║ RESOURCES       ║    ║ HOSPITALS               ║
║ ALLOCATED       ║    ║ MATCHED                 ║
║                 ║    ║                         ║
║ Agent: Resource ║    ║ Agent: Hospital          ║
║ Allocation      ║    ║ Coordination            ║
║ → Units to      ║    ║ → Ranked hospitals,     ║
║   dispatch,     ║    ║   patient routing       ║
║   ETAs          ║    ╚═════════════════════════╝
╚═════════════════╝
              │
              └─────────┬──────────┘
                        ▼
╔══════════════════════════════════════════════════════════╗
║         STEP 7: RISK ASSESSED                            ║
║  Agent: Risk Prediction                                  ║
║  → Secondary risks, evolving threat flags                ║
╚═══════════════════════╦══════════════════════════════════╝
                        ║
                        ▼
╔══════════════════════════════════════════════════════════╗
║         STEP 8: ALERTS DRAFTED                           ║
║  Agent: Communication                                    ║
║  → SMS text, voice script, dashboard message             ║
╚═══════════════════════╦══════════════════════════════════╝
                        ║
                        ▼
╔══════════════════════════════════════════════════════════╗
║         STEP 9: RESCUE PLAN ASSEMBLED                    ║
║  Agent: Command Orchestrator                             ║
║  → Final RescuePlan JSON                                 ║
╚═══════════════════════╦══════════════════════════════════╝
                        ║
              ┌─────────┴──────────┐
              ▼                    ▼
╔══════════════════╗   ╔═══════════════════════════╗
║ RESCUE PLAN      ║   ║ ALERTS SENT               ║
║ STORED IN DB     ║   ║                           ║
║ (rescue_requests ║   ║ → Dashboard notification  ║
║  + agent_        ║   ║ → SMS to field team       ║
║  decisions)      ║   ║   (Twilio / SNS)          ║
║                  ║   ║ → Hospital alert          ║
╚══════════════════╝   ╚═══════════════════════════╝
```

---

## Workflow Steps Summary

| Step | Agent | Input | Output |
|---|---|---|---|
| 1 | Disaster Intelligence | Raw incident | Type, severity, radius |
| 2 | Incident Understanding | Classified incident | Structured data object |
| 3 | Survivor Probability | Structured incident | Risk score, survivor count |
| 4 | Medical Triage | Survivor data | Medical priority, resource needs |
| 5 | Priority | Triage output | P1-P5 rank, urgency |
| 6a | Resource Allocation | Priority + inventory | Units to dispatch |
| 6b | Hospital Coordination | Casualty estimate | Ranked hospitals |
| 7 | Risk Prediction | Incident + history | Secondary risk flags |
| 8 | Communication | Full plan | Alert messages |
| 9 | Command Orchestrator | All outputs | Final rescue plan JSON |

---

## Timing Expectations

| Mode | Expected Time |
|---|---|
| Mock (no LLM) | < 1 second |
| Ollama (local LLM) | 5–30 seconds depending on model |
| OpenAI GPT-4o | 10–45 seconds |
| Gemini Pro | 10–40 seconds |

---

## Data Stored at Each Step

Every agent decision is written to `agent_decisions` table with:
- `agent_name`
- `input_data` (JSONB)
- `output_data` (JSONB)
- `duration_ms`
- `status` (success / error / mock)

The final rescue plan is stored in `rescue_requests` as `rescue_plan` (JSONB).

Alert messages are stored in `alert_logs` with channel, recipient, and status.
