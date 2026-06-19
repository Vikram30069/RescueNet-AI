# RescueNet AI — Agent Specifications

RescueNet uses **10 specialized CrewAI agents** that collaborate in sequence to transform a raw incident report into a complete rescue plan.

All agents are defined in `agents/definitions/` and orchestrated in `agents/orchestrator.py`.

---

## LLM Configuration

Agents are **provider-agnostic**. The LLM is selected via the `LLM_PROVIDER` environment variable:

| Value | Provider | Requires |
|---|---|---|
| `openai` | OpenAI GPT-4o | `OPENAI_API_KEY` |
| `gemini` | Google Gemini Pro | `GEMINI_API_KEY` |
| `ollama` | Local Ollama server | Ollama running on port 11434 |
| `litellm` | LiteLLM proxy | LiteLLM server running |
| `mock` | No LLM (returns mock data) | Nothing |

See `agents/config/llm_config.py` for implementation.

---

## Agent 1: Disaster Intelligence Agent

**File**: `agents/definitions/disaster_intelligence.py`

| Field | Value |
|---|---|
| **Role** | Disaster Intelligence Analyst |
| **Goal** | Classify the incident type, assess initial severity, and identify the geographic impact zone |
| **Backstory** | A seasoned emergency analyst trained on thousands of disaster reports worldwide. Specializes in rapid situation classification and threat mapping. |
| **Input** | Raw incident report (title, description, location, type) |
| **Output** | Classified disaster type, severity band (1-5), estimated impact radius |
| **Responsibility** | First responder in the pipeline — sets the context for all other agents |

---

## Agent 2: Incident Understanding Agent

**File**: `agents/definitions/incident_understanding.py`

| Field | Value |
|---|---|
| **Role** | Incident Comprehension Specialist |
| **Goal** | Parse and structure the incident report into a normalized data object |
| **Backstory** | An expert at turning ambiguous, fragmented emergency reports into clean structured data. Works under extreme time pressure without losing detail. |
| **Input** | Classified incident from Agent 1 |
| **Output** | Structured incident object: location coordinates, affected population estimate, infrastructure damage assessment |
| **Responsibility** | Normalize the incident before downstream agents process it |

---

## Agent 3: Survivor Probability Agent

**File**: `agents/definitions/survivor_probability.py`

| Field | Value |
|---|---|
| **Role** | Survivor Risk Estimation Specialist |
| **Goal** | Calculate probability of survivors and estimate the number of people requiring immediate rescue |
| **Backstory** | A data scientist specializing in disaster survival models. Uses historical disaster data, structural collapse patterns, and population density to estimate survivor likelihood. |
| **Input** | Structured incident object, severity score |
| **Output** | Survivor probability score (0-1), estimated survivor count, time-sensitivity rating |
| **Responsibility** | Provide the quantitative basis for rescue priority decisions |

---

## Agent 4: Medical Triage Agent

**File**: `agents/definitions/medical_triage.py`

| Field | Value |
|---|---|
| **Role** | Medical Emergency Triage Coordinator |
| **Goal** | Assess likely medical needs, prioritize casualty types, and recommend medical response level |
| **Backstory** | A field medic with 20 years of disaster response experience. Expert at estimating medical resource needs before teams arrive on-site. |
| **Input** | Survivor probability data, incident type |
| **Output** | Medical priority level (critical/high/medium/low), recommended medical resources, trauma type estimates |
| **Responsibility** | Bridge survivor probability into actionable medical response |

---

## Agent 5: Priority Agent

**File**: `agents/definitions/priority_agent.py`

| Field | Value |
|---|---|
| **Role** | Emergency Response Prioritization Officer |
| **Goal** | Rank the incident among all active incidents and determine dispatch urgency |
| **Backstory** | A crisis command center veteran who has coordinated multi-incident response during major national disasters. Balances urgency, resource availability, and political factors. |
| **Input** | Medical triage output, survivor probability, current active incident queue |
| **Output** | Priority rank (P1-P5), dispatch urgency score, estimated response window |
| **Responsibility** | Assign a clear priority that drives all downstream resource decisions |

---

## Agent 6: Resource Allocation Agent

**File**: `agents/definitions/resource_allocation.py`

| Field | Value |
|---|---|
| **Role** | Emergency Resource Coordinator |
| **Goal** | Identify and allocate the optimal mix of rescue teams, vehicles, and equipment |
| **Backstory** | A logistics specialist who managed resource allocation during Hurricane Katrina response. Masters the art of doing more with less in resource-constrained emergencies. |
| **Input** | Priority score, medical needs, incident type, available resource inventory |
| **Output** | Resource allocation plan: list of units to dispatch (type, count, ETA) |
| **Responsibility** | Match available resources to incident needs |

---

## Agent 7: Hospital Coordination Agent

**File**: `agents/definitions/hospital_coordination.py`

| Field | Value |
|---|---|
| **Role** | Hospital Liaison and Bed Capacity Coordinator |
| **Goal** | Identify the best hospitals to receive casualties based on proximity, capacity, and specialization |
| **Backstory** | A healthcare logistics coordinator with deep knowledge of hospital network capacities. Has coordinated mass-casualty event routing across 50+ hospitals. |
| **Input** | Estimated casualty count, injury types, incident location |
| **Output** | Ranked list of recommended hospitals with estimated patient routing |
| **Responsibility** | Ensure casualties reach appropriate medical facilities |

---

## Agent 8: Communication Agent

**File**: `agents/definitions/communication_agent.py`

| Field | Value |
|---|---|
| **Role** | Emergency Communications Officer |
| **Goal** | Draft alert messages for field teams, hospitals, and public communications |
| **Backstory** | A crisis communications expert trained in emergency broadcast systems and mass notification protocols. Ensures the right message reaches the right people at the right time. |
| **Input** | Final rescue plan, recipient types (field teams, hospitals, public) |
| **Output** | Alert messages formatted for SMS, voice call scripts, and dashboard notifications |
| **Responsibility** | Translate the rescue plan into human-readable, actionable alerts |

---

## Agent 9: Risk Prediction Agent

**File**: `agents/definitions/risk_prediction.py`

| Field | Value |
|---|---|
| **Role** | Disaster Risk Forecasting Analyst |
| **Goal** | Assess secondary risks (aftershocks, flooding escalation, fire spread) and flag evolving threats |
| **Backstory** | A predictive analytics specialist combining meteorological data, structural engineering models, and historical patterns to anticipate how a disaster evolves. |
| **Input** | Incident type, location, current conditions, historical disaster data |
| **Output** | Risk evolution score, secondary risk flags, recommended precautionary measures |
| **Responsibility** | Warn the command center of risks that could worsen the situation |

---

## Agent 10: Command Orchestrator Agent

**File**: `agents/definitions/command_orchestrator.py`

| Field | Value |
|---|---|
| **Role** | Rescue Command Orchestrator |
| **Goal** | Synthesize all agent outputs into a single, actionable rescue plan |
| **Backstory** | The apex coordinator who has led National Disaster Management teams. Sees the whole picture — from medical logistics to communications — and produces the definitive rescue command. |
| **Input** | Outputs from all 9 preceding agents |
| **Output** | Final `RescuePlan` JSON: incident summary, priority, resources dispatched, hospitals assigned, alerts sent, risk warnings |
| **Responsibility** | Produce the final deliverable that field teams and commanders act on |

---

## Agent Execution Flow

```
Disaster Intelligence Agent
          ↓
Incident Understanding Agent
          ↓
Survivor Probability Agent
          ↓
Medical Triage Agent
          ↓
Priority Agent
          ↓
Resource Allocation Agent ←→ Hospital Coordination Agent
          ↓
Risk Prediction Agent
          ↓
Communication Agent
          ↓
Command Orchestrator Agent
          ↓
    [RESCUE PLAN JSON]
```

---

## Mock Mode

When `LLM_PROVIDER=mock`, each agent returns a deterministic mock response without calling any LLM. This is suitable for:
- Local development without API keys
- Demo presentations without internet
- Unit testing the orchestration pipeline
