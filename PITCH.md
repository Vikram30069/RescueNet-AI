# RescueNet AI — Hackathon Pitch Deck & Technical Architecture

> **Transforming Disaster Response: A Multi-Agent AI Orchestrator for Real-Time Dispatch and Resource Synchronization**

---

## 🌋 The Problem Statement

During major disaster events (floods, earthquakes, fires), emergency command centers are flooded with unstructured, fragmented, and conflicting information from emergency lines, social media, and on-site responders. 

### Why Existing Disaster Systems Fail:
1. **Siloed Communication:** Fire departments, medical triage teams, and municipal hospitals operate on separate channels, leading to delayed resource allocation.
2. **Cognitive Overload:** human commanders must process thousands of incoming reports, leading to delayed decisions when minutes cost lives.
3. **Capacity Blindness:** Rescue teams are dispatched to sites without real-time coordination with surrounding hospital bed availability, leading to transport bottlenecks and hospital overload.

---

## ⚡ The Solution: RescueNet AI

RescueNet AI is a **Multi-Agent Orchestrator** powered by 10 specialized CrewAI agents working sequentially to ingest, classify, triage, prioritize, allocate, route, and coordinate disaster response.

### 🌟 Key Pillars:
- **Instant Structured Ingestion:** Normalizes chaotic incident reports into clean, queryable JSON data within seconds.
- **Dynamic Resource Synchronization:** Queries available local inventory (ambulances, helicopters, fire engines) to assign the optimal unit mix.
- **Geospatial Load-Balanced Routing:** Routes casualties to hospitals based on proximity, specialization (trauma vs. burns), and bed availability.
- **Command Synthesis:** Emits copy-pasteable, formatted SMS alerts tailored for field responders, hospital MCI directors, and the general public.

---

## 🧠 Agent Architecture

```
                                    [Chaotic Report Input]
                                              │
                                              ▼
                             1. Disaster Intelligence Agent (Classify & Score)
                                              │
                                              ▼
                             2. Incident Understanding Agent (Geolocate & Assess)
                                              │
                                              ▼
                             3. Survivor Probability Agent (Statistical Forecast)
                                              │
                                              ▼
                             4. Medical Triage Agent (Assess trauma & needs)
                                              │
                                              ▼
                             5. Priority Agent (Urgency dispatch ranking P1-P5)
                                              │
                       ┌──────────────────────┴──────────────────────┐
                       ▼                                             ▼
        6. Resource Allocation Agent                  7. Hospital Coordination Agent
      (Match available local inventory)             (Distance & bed capacity routing)
                       │                                             │
                       └──────────────────────┬──────────────────────┘
                                              ▼
                             8. Risk Prediction Agent (Meteorological/Seismic hazards)
                                              │
                                              ▼
                             9. Communication Agent (SMS, MCI, Public alerts)
                                              │
                                              ▼
                            10. Command Orchestrator Agent (Synthesize Rescue Plan JSON)
                                              │
                                              ▼
                                    [RESCUE PLAN DISPATCH]
```

---

## 🗺️ Telangana Focus & Scaling

RescueNet AI is designed for localized implementation first, with the ability to scale seamlessly:
- **First Phase (Telangana Command Center):** Powered by the **Telangana Emergency Dataset** covering verified hospitals (Gandhi, Osmania, MGM Warangal), local fire tenders, Red Cross bases, and 108 GVK EMRI ambulance dispatch hubs.
- **Scaling to India:** Standardized JSON schemas map directly to national emergency registries (like NDMA, national hospital lists, and local police control networks).

---

## 🎙️ Demo Scenario Flow Script (2-Minute Pitch Walkthrough)

### 1. The Hook (0:00 - 0:30)
> *"Imagine 350mm of rain falling over Hyderabad in just 12 hours. Streets are rivers. Thousands are stranded. Command center operators are drowning in calls. How do we dispatch help efficiently?"*

### 2. The Simulation (0:30 - 1:15)
> *"Let's trigger our simulation in Begumpet, Hyderabad. In Simulation Mode, we activate the flood scenario. Watch the timeline: 10 specialized AI agents start running. The Disaster Intelligence Agent rates severity as 5/5. The Medical Triage Agent alerts Gandhi and Osmania Hospitals. The Resource Allocation Agent allocates 12 ambulances and 2 rescue choppers from our local Telangana dataset."*

### 3. The What-If Simulator (1:15 - 1:45)
> *"But what if Gandhi Hospital is suddenly full? With one click, we toggle the 'Gandhi Hospital Capacity Full' What-If simulation. Watch: the routing instantly balances, shifting patient routing to Secondary Osmania Hub and alerting field teams. If monsoons worsen, we simulate weather delays, automatically recalculating ETAs."*

### 4. The Value Proposition (1:45 - 2:00)
> *"RescueNet AI replaces chaos with structured, automated, and synchronized intelligence. It's the future of disaster command center software. Built for Telangana, ready for India. Thank you."*
