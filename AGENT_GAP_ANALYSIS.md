# RescueNet AI — Agent Gap Analysis

**Date:** 2026-06-20  
**Scope:** All 10 CrewAI agent definitions in `agents/definitions/` and `agents/tasks/tasks.py`  
**Status legend:** ✅ Exists | ⚠️ Partial | ❌ Missing

> **Key finding across all agents:** Every agent definition is a **role+goal shell**. No agent has tools, memory, output schema, or context from prior agents. The agents are correctly named and described but cannot do anything beyond what the LLM produces from a text prompt alone.

---

## Agent 1 — Disaster Intelligence Agent

**File:** [`agents/definitions/disaster_intelligence.py`](file:///c:/Users/Lenovo/OneDrive/RescueNet-AI/agents/definitions/disaster_intelligence.py)  
**Task:** [`classify_incident_task`](file:///c:/Users/Lenovo/OneDrive/RescueNet-AI/agents/tasks/tasks.py#L10-L23)

### Current Implementation
```python
Agent(
    role="Disaster Intelligence Analyst",
    goal="Classify incident type, assess severity 1-5, identify geographic impact zone.",
    backstory="FEMA/NDMA analyst...",
    verbose=True,
    allow_delegation=False,
    llm=llm,   # ← None in mock mode
)
```
Task prompt injects: `title`, `type`, `location`, `description`, `severity` as f-strings.  
Expected output: plain text description of "type, severity, radius".

### Missing Functionality
- ❌ No `tools=[]` — agent cannot query any external data source
- ❌ No structured output schema enforcement (output is free text)
- ❌ Cannot override or correct a wrong `type` field reported by the user
- ❌ No access to historical incidents to benchmark severity calibration
- ❌ No real-time weather or geospatial context
- ❌ Task has no `context=[]` — is the only first-in-chain agent, so this is acceptable here

### Required Tools (to reach production quality)
| Tool | Purpose | Source |
|---|---|---|
| `SerperDevTool` | Search live news about the incident | CrewAI built-in |
| `WeatherAPITool` | Get current conditions at `latitude, longitude` | OpenWeatherMap API |
| `GeocodingTool` | Validate and normalize location to coordinates | Google Maps Geocoding API |
| Custom `NDMAClassifierTool` | Cross-reference incident against NDMA disaster taxonomy | NDMA database |

### Required Datasets
- NDMA India disaster classification taxonomy
- Historical disaster severity benchmarks by type and region
- Real-time weather feeds (OpenWeatherMap or IMD API)

### Dependencies
- First agent in chain — no upstream dependencies
- Output feeds into Agent 2 (Incident Understanding) and Agent 5 (Priority)

---

## Agent 2 — Incident Understanding Agent

**File:** [`agents/definitions/incident_understanding.py`](file:///c:/Users/Lenovo/OneDrive/RescueNet-AI/agents/definitions/incident_understanding.py)  
**Task:** [`understand_incident_task`](file:///c:/Users/Lenovo/OneDrive/RescueNet-AI/agents/tasks/tasks.py#L26-L38)

### Current Implementation
```python
Agent(
    role="Incident Comprehension Specialist",
    goal="Parse and normalize incident report into structured data object.",
    backstory="UN OCHA data standardization expert...",
    llm=llm,
)
```
Task prompt injects: `location`, `latitude`, `longitude`, `type`, `severity`.  
Expected output: text summary with "coordinates, population, damage assessment".

### Missing Functionality
- ❌ No `context=[classify_incident_task]` — does not receive Agent 1's output
- ❌ No population density lookup tool — estimated population is hallucinated by LLM
- ❌ No infrastructure database access — damage assessment is speculative
- ❌ Cannot geocode or validate coordinates
- ❌ No structured output — downstream agents can't reliably parse its output

### Required Tools
| Tool | Purpose | Source |
|---|---|---|
| `WorldPopAPITool` | Look up actual population density at coordinates | WorldPop / OpenData |
| `OpenStreetMapTool` | Get infrastructure layer (roads, buildings) near coordinates | OSM Overpass API |
| `GeocodingTool` | Reverse geocode coordinates to administrative boundaries | Google Maps / Nominatim |

### Required Datasets
- India census population grid (district-level density)
- Infrastructure vulnerability index by region
- Administrative boundary shapefiles (district/tehsil level)

### Dependencies
- Should receive: Agent 1 output (classification + severity validation)
- Output feeds: Agent 3 (survivor probability), Agent 7 (hospital coordination)

---

## Agent 3 — Survivor Probability Agent

**File:** [`agents/definitions/survivor_probability.py`](file:///c:/Users/Lenovo/OneDrive/RescueNet-AI/agents/definitions/survivor_probability.py)  
**Task:** [`estimate_survivors_task`](file:///c:/Users/Lenovo/OneDrive/RescueNet-AI/agents/tasks/tasks.py#L41-L52)

### Current Implementation
```python
Agent(
    role="Survivor Risk Estimation Specialist",
    goal="Calculate survivor probability 0-1 and estimate rescue-needed count.",
    backstory="Data scientist — earthquake response Turkey/Japan/Nepal...",
    llm=llm,
)
```
Task prompt injects: `type`, `location`, `severity`.  
**Mock formula:** `probability = 0.45 + severity × 0.10`, `survivors = severity × 55`

### Missing Functionality
- ❌ No statistical model — the mock formula is linear and oversimplified
- ❌ No `context=[understand_incident_task]` — doesn't receive population estimate from Agent 2
- ❌ No access to historical disaster survival rates by incident type
- ❌ No structural vulnerability data (building age, material, earthquake resistance)
- ❌ Time-of-day not factored (nighttime incidents have higher casualties)
- ❌ No confidence interval on the estimate

### Required Tools
| Tool | Purpose | Source |
|---|---|---|
| `HistoricalDisasterDBTool` | Query historical survival rates by type + severity | `historical_disasters` table in DB |
| `StructuralVulnerabilityTool` | Get building stock vulnerability at location | HAZUS / India NDMA |
| `PopulationDensityTool` | Get affected population from Agent 2 | Internal DB query |

### Required Datasets
- Historical disaster mortality/survivor data (EM-DAT, CRED database)
- India building stock inventory by district
- Time-of-day occupancy patterns for different building types
- Disaster-type-specific survival rate tables

### Dependencies
- Should receive: Agent 1 (incident type + classification), Agent 2 (affected population)
- Output feeds: Agent 4 (medical triage), Agent 5 (priority), Agent 6 (resources)

---

## Agent 4 — Medical Triage Agent

**File:** [`agents/definitions/medical_triage.py`](file:///c:/Users/Lenovo/OneDrive/RescueNet-AI/agents/definitions/medical_triage.py)  
**Task:** [`medical_triage_task`](file:///c:/Users/Lenovo/OneDrive/RescueNet-AI/agents/tasks/tasks.py#L55-L64)

### Current Implementation
```python
Agent(
    role="Medical Emergency Triage Coordinator",
    goal="Assess medical needs, categorize casualties, recommend medical resources.",
    backstory="Field medic 20 years, MCI/START triage certified...",
    llm=llm,
)
```
Task prompt injects: `type` (incident type), `severity`, `location`.  
**Mock output:** static trauma types ("blunt force, respiratory"), `severity × 2` medical units.

### Missing Functionality
- ❌ No `context=[estimate_survivors_task]` — does not know actual survivor count
- ❌ No START/SALT triage protocol implementation as a tool
- ❌ Trauma type prediction is a static map, not incident-specific
  - A cyclone and a building collapse are both mapped to "blunt force" — incorrect
- ❌ No medical resource inventory query (how many ambulances actually exist?)
- ❌ No hospital capacity awareness at triage stage

### Required Tools
| Tool | Purpose | Source |
|---|---|---|
| `TriageProtocolTool` | Apply START/SALT triage to estimate casualty distribution | Built-in logic |
| `TraumaTypeMappingTool` | Map incident type to evidence-based injury patterns | Medical literature |
| `MedicalInventoryTool` | Query available medical resources from DB | `resources` table |

### Required Datasets
- WHO/PAHO injury pattern data by disaster type
- START triage casualty distribution tables
- India NDRF medical unit deployment protocols
- Field hospital setup time tables

### Dependencies
- Should receive: Agent 3 (survivor count, time-sensitivity)
- Output feeds: Agent 5 (priority), Agent 6 (resource allocation), Agent 7 (hospital routing)

---

## Agent 5 — Priority Agent

**File:** [`agents/definitions/priority_agent.py`](file:///c:/Users/Lenovo/OneDrive/RescueNet-AI/agents/definitions/priority_agent.py)  
**Task:** [`prioritize_incident_task`](file:///c:/Users/Lenovo/OneDrive/RescueNet-AI/agents/tasks/tasks.py#L67-L77)

### Current Implementation
```python
Agent(
    role="Emergency Response Prioritization Officer",
    goal="Rank incident P1-P5, determine dispatch urgency and response window.",
    backstory="Crisis command center veteran, Pakistan floods + Nepal earthquake...",
    llm=llm,
)
```
**Mock formula:** `priority = {1:'P5', 2:'P4', 3:'P3', 4:'P2', 5:'P1'}[severity]`

### Missing Functionality
- ❌ No multi-incident context — cannot compare against other **active** incidents
- ❌ Simple severity→priority mapping ignores: survivor count, resource availability, political urgency, time elapsed since report
- ❌ No `context=[]` from Agents 1–4 (all relevant data is re-injected from raw incident only)
- ❌ Priority score (`priority_score`) is just `severity / 5` — not a real scoring model
- ❌ No feedback loop when resources are already depleted

### Required Tools
| Tool | Purpose | Source |
|---|---|---|
| `ActiveIncidentsTool` | Query all currently active incidents from DB for comparative ranking | `incidents` table |
| `ResourceAvailabilityTool` | Check if P1-level resources are actually available | `resources` table |

### Required Datasets
- Active incident queue at time of query
- Available resource inventory
- Priority escalation rules (e.g., time-elapsed multiplier)

### Dependencies
- Should receive: Agents 1–4 outputs (all upstream context)
- Output feeds: Agent 6 (resource allocation), Agent 8 (risk prediction), Agent 10 (final plan)

---

## Agent 6 — Resource Allocation Agent

**File:** [`agents/definitions/resource_allocation.py`](file:///c:/Users/Lenovo/OneDrive/RescueNet-AI/agents/definitions/resource_allocation.py)  
**Task:** [`allocate_resources_task`](file:///c:/Users/Lenovo/OneDrive/RescueNet-AI/agents/tasks/tasks.py#L80-L90)

### Current Implementation
```python
Agent(
    role="Emergency Resource Coordinator",
    goal="Allocate optimal mix of rescue units based on priority and medical needs.",
    backstory="Hurricane Katrina + Indian Ocean tsunami logistics...",
    llm=llm,
)
```
**Mock allocation:** `severity × 2` ambulances, `severity × 1` rescue teams, 1 helicopter if severity ≥ 3.

### Missing Functionality (Most Critical Agent Gap)
- ❌ **No database query** — agent doesn't know what resources actually exist or are available
- ❌ Mock allocation ignores real inventory (e.g., allocates 8 ambulances when only 3 are available)
- ❌ No proximity calculation (nearest available unit to incident location)
- ❌ No resource conflict resolution (same unit dispatched to two incidents)
- ❌ No ETA calculation based on actual distance (mocked as `10 + severity` minutes)
- ❌ Incident-type specific resources not considered (water rescue for floods, hazmat for chemical)
- ❌ No resource status update after dispatch

### Required Tools
| Tool | Purpose | Source |
|---|---|---|
| `ResourceInventoryTool` | Query `resources` table for available units by type | Internal DB |
| `DistanceCalculationTool` | Calculate actual distance/ETA from resource location to incident | Haversine / Google Maps Directions API |
| `ResourceDispatchTool` | Update resource status to "deployed" after allocation | Internal DB write |

### Required Datasets
- Real-time `resources` table from PostgreSQL
- Geographic coordinates of all resource depots
- Resource-type dispatch protocols (e.g., water rescue only for flood/cyclone)

### Dependencies
- Should receive: Agent 5 (priority level), Agent 4 (medical needs), Agent 2 (incident location)
- Output feeds: Agent 10 (final plan), must also **write** to `resources` table

---

## Agent 7 — Hospital Coordination Agent

**File:** [`agents/definitions/hospital_coordination.py`](file:///c:/Users/Lenovo/OneDrive/RescueNet-AI/agents/definitions/hospital_coordination.py)  
**Task:** [`coordinate_hospitals_task`](file:///c:/Users/Lenovo/OneDrive/RescueNet-AI/agents/tasks/tasks.py#L93-L103)

### Current Implementation
```python
Agent(
    role="Hospital Liaison and Bed Capacity Coordinator",
    goal="Identify best hospitals by proximity, capacity, ICU, and specialization.",
    backstory="50+ hospitals mass-casualty coordination (Boston Marathon, Las Vegas)...",
    llm=llm,
)
```
**Mock routing:** Always returns same 2 hardcoded hospitals with hardcoded distances and capacities.

### Missing Functionality (Second Most Critical Gap)
- ❌ **No database query** — hardcoded hospitals bear no relation to real hospital data in `mock_db` (5 real hospitals seeded but never queried)
- ❌ No geospatial distance calculation from incident to hospital
- ❌ No specialization matching (burn center for fire, toxicology for chemical)
- ❌ No real-time bed availability (beds are static in mock, depleted by concurrent incidents not tracked)
- ❌ No hospital contact/notification mechanism
- ❌ Mock output uses "City General Hospital" which doesn't exist in the seeded data

### Required Tools
| Tool | Purpose | Source |
|---|---|---|
| `HospitalSearchTool` | Query hospitals DB filtered by city, min_beds, specialization | Internal DB |
| `GeoDistanceTool` | Sort hospitals by actual distance from incident coordinates | Haversine formula |
| `HospitalNotifyTool` | Send preparation notice to hospital contact phone | Twilio / Email |

### Required Datasets
- Real `hospitals` table with live bed counts
- Hospital specialization registry
- Inter-hospital patient transfer capacity

### Dependencies
- Should receive: Agent 4 (casualty count + trauma types), Agent 2 (incident coordinates)
- Output feeds: Agent 9 (hospital alerts), Agent 10 (final plan)

---

## Agent 8 — Communication Agent

**File:** [`agents/definitions/communication_agent.py`](file:///c:/Users/Lenovo/OneDrive/RescueNet-AI/agents/definitions/communication_agent.py)  
**Task:** [`draft_alerts_task`](file:///c:/Users/Lenovo/OneDrive/RescueNet-AI/agents/tasks/tasks.py#L118-L130)

### Current Implementation
```python
Agent(
    role="Emergency Communications Officer",
    goal="Draft alerts for field teams, hospitals, and public — three messages.",
    backstory="Crisis communications, mass notification protocols...",
    llm=llm,
)
```
**Mock output:** 3 f-string templates substituting location, priority, survivor count.

### Missing Functionality
- ❌ No actual message dispatch (SMS, push notification, email)
- ❌ Messages are not context-aware (same template regardless of incident nuances)
- ❌ No Twilio/SNS tool integration (`.env.example` has keys but no code uses them)
- ❌ No message delivery confirmation
- ❌ No `alert_logs` table write (schema has `alert_logs` table — never used)
- ❌ No multilingual support (India has 22 official languages)
- ❌ Character count / SMS format not enforced

### Required Tools
| Tool | Purpose | Source |
|---|---|---|
| `TwilioSMSTool` | Send SMS to field teams and hospital contacts | Twilio API |
| `AWSSNSTool` | Publish mass notification to subscribers | AWS SNS |
| `AlertLogTool` | Write sent alerts to `alert_logs` table | Internal DB |

### Required Datasets
- Contact registry for field teams and hospitals (phone numbers)
- Message templates by incident type (pre-approved by comms team)
- Language preferences by region

### Dependencies (Note: Listed as Agent 8 in spec, file is Agent 8)
- Should receive: Agent 5 (priority), Agent 6 (resources dispatched), Agent 7 (hospitals assigned)
- Output feeds: Agent 10 (final plan alert section)

---

## Agent 9 — Risk Prediction Agent

**File:** [`agents/definitions/risk_prediction.py`](file:///c:/Users/Lenovo/OneDrive/RescueNet-AI/agents/definitions/risk_prediction.py)  
**Task:** [`predict_risks_task`](file:///c:/Users/Lenovo/OneDrive/RescueNet-AI/agents/tasks/tasks.py#L106-L115)

### Current Implementation
```python
Agent(
    role="Disaster Risk Forecasting Analyst",
    goal="Assess secondary risks — aftershocks, flood escalation, fire spread.",
    backstory="WMO + geological survey early warning systems...",
    llm=llm,
)
```
**Mock risk engine:** Static Python dict lookup:
```python
base = {
    "flood":      ["Secondary flooding in next 6h", "Waterborne disease risk"],
    "earthquake": ["Aftershock >60% in 24h", "Structural collapse risk"],
    ...
}
```

### Missing Functionality
- ❌ No real-time weather data query (wind speed, rainfall forecast)
- ❌ No seismic data (USGS aftershock probability API)
- ❌ No `disaster_risk_forecasts` table write (schema has it, never used)
- ❌ Risk scores are boolean (exists/not exists), not probabilistic
- ❌ No time-window forecasting ("risk in next 1h vs 24h")
- ❌ No geospatial risk zone mapping

### Required Tools
| Tool | Purpose | Source |
|---|---|---|
| `OpenWeatherMapTool` | Fetch 24h weather forecast at incident coordinates | OpenWeatherMap API |
| `USGSAftershockTool` | Get aftershock probability for earthquakes | USGS Earthquake Hazards API |
| `IMDWeatherTool` | India Meteorological Department cyclone/flood data | IMD API |
| `RiskForecastWriteTool` | Write risk scores to `disaster_risk_forecasts` table | Internal DB |

### Required Datasets
- Real-time weather feeds at incident location
- Historical secondary disaster occurrence rates
- India geological hazard maps

### Dependencies
- Should receive: Agent 1 (incident type + location), Agent 2 (impact zone size)
- Output feeds: Agent 10 (final plan risk section)

---

## Agent 10 — Command Orchestrator Agent

**File:** [`agents/definitions/command_orchestrator.py`](file:///c:/Users/Lenovo/OneDrive/RescueNet-AI/agents/definitions/command_orchestrator.py)  
**Task:** [`assemble_rescue_plan_task`](file:///c:/Users/Lenovo/OneDrive/RescueNet-AI/agents/tasks/tasks.py#L133-L150)

### Current Implementation
```python
Agent(
    role="Rescue Command Orchestrator",
    goal="Synthesize all agent outputs into a single, complete, actionable rescue plan JSON.",
    backstory="National Disaster Management team lead, 15 major disasters...",
    llm=llm,
)
```
Task prompt: asks LLM to "assemble a final rescue plan" with all fields listed.  
**Critical problem:** Task description mentions "using all analysis from the previous agents" but NO context is passed in `context=[]`. The LLM has access only to the raw incident fields injected into the task prompt.

### Missing Functionality (Most Critical — This is the Output Agent)
- ❌ **No `context=[]` passed** — the orchestrator has no actual access to the outputs of agents 1–9. It must regenerate everything from scratch from the raw incident data alone.
- ❌ No `output_json=RescuePlan` enforced — output format is not guaranteed
- ❌ JSON parsing is done by naive `_parse_or_fallback()` in orchestrator — fragile
- ❌ The `assemble_rescue_plan_task` prompt lists desired output fields but they don't match the `RescuePlan` Pydantic schema exactly
- ❌ No validation that dispatched resources match what Agent 6 actually allocated
- ❌ No plan version/history tracking

### Required Changes
| Change | Priority | Effort |
|---|---|---|
| Add `context=[task1, task2, ..., task9]` to assemble task | 🔴 CRITICAL | Low |
| Add `output_pydantic=RescuePlan` to enforce JSON schema | 🔴 CRITICAL | Low |
| Update orchestrator output parsing to use `task.output.pydantic` | 🔴 CRITICAL | Medium |
| Write final plan to `rescue_requests` table | 🟠 HIGH | Low |

### Dependencies
- Must receive: ALL 9 prior agent outputs via `context=[]`
- Output is the **final deliverable** — consumed by FastAPI response and frontend

---

## Cross-Cutting Gaps Summary

| Gap | Affects | Fix Required In |
|---|---|---|
| No `context=[]` chaining between tasks | ALL agents | `agents/tasks/tasks.py` |
| No `output_pydantic` schema enforcement | Agent 10 critical, all agents ideal | `agents/tasks/tasks.py` |
| No tool definitions in any agent | ALL agents | `agents/definitions/*.py` |
| No database write-back from agents | Agents 6, 7, 8, 9 | New DB tool wrappers |
| LLM output parsing fragile | Orchestrator | `agents/orchestrator.py` |
| Frontend reads wrong schema keys | N/A (frontend bug) | `frontend/src/app/page.tsx` |
| CrewAI not installed | Entire live path | `pip install -r requirements.txt` (stable network) |
| No real-time data feeds | Agents 1, 9 | External API integrations |

---

## Priority Fix Order

```
Priority 1 (Hours):  Fix frontend schema key mismatch  
Priority 2 (Hours):  Install crewai + verify live path loads without error  
Priority 3 (Day 1):  Add context=[] chaining to all 10 tasks  
Priority 4 (Day 1):  Add output_pydantic to final assemble task  
Priority 5 (Day 2):  Fix orchestrator output parsing  
Priority 6 (Day 3):  Add DB query tools to Agents 6 & 7 (most impactful)  
Priority 7 (Day 4):  Add external data tools to Agents 1 & 9  
Priority 8 (Day 5):  Add dispatch tools to Agent 8  
Priority 9 (Week 2): Full PostgreSQL integration  
Priority 10 (Week 3): Real-time weather + seismic data feeds  
```
