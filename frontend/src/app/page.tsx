"use client";

/**
 * RescueNet AI — Disaster Response Command Center Dashboard
 * Redesigned for maximum visual impact, simulation control, and Telangana datasets.
 */

import { useEffect, useState, useRef } from "react";
import demoScenarios from "@/data/demo_scenarios.json";
import telanganaEmergencyData from "@/data/telangana_emergency_dataset.json";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── TypeScript Types ────────────────────────────────────────────────────────

type Incident = {
  id: string;
  title: string;
  type: string;
  location: string;
  description?: string;
  latitude: number;
  longitude: number;
  severity: number;
  status: string;
  created_at: string;
};

type ResourceDispatch = {
  type: string;
  count: number;
  eta_minutes: number;
};

type HospitalRouting = {
  name: string;
  distance_km: number;
  available_beds: number;
  patient_routing: number;
};

type AlertActions = {
  field_team: string;
  hospital: string;
  public: string;
};

type RescuePlan = {
  priority: string;
  severity: number;
  affected_area: string;
  estimated_survivors: number;
  survivor_probability: number;
  priority_score: number;
  confidence_score: number;
  medical_priority: string;
  dispatch_urgency: string;
  recommended_hospital: string;
  recommended_resources: ResourceDispatch[];
  hospitals: HospitalRouting[];
  alert_actions: AlertActions;
  risk_warnings: string[];
};

type AgentDecision = {
  agent: string;
  output: string;
  step: number;
};

type AgentExecuteResponse = {
  incident_id: string;
  status: string;
  rescue_plan: RescuePlan;
  agent_decisions: AgentDecision[];
};

// ─── Styling Constants ──────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<number, string> = {
  1: "#10b981", // Emerald
  2: "#34d399", // Light Emerald
  3: "#fbbf24", // Amber
  4: "#f97316", // Orange
  5: "#ef4444", // Red
};

const SEVERITY_LABELS: Record<number, string> = {
  1: "S1 LOW",
  2: "S2 MINOR",
  3: "S3 MODERATE",
  4: "S4 HIGH",
  5: "S5 CRITICAL",
};

const PRIORITY_COLORS: Record<string, string> = {
  P1: "#ef4444",
  P2: "#f97316",
  P3: "#fbbf24",
  P4: "#34d399",
  P5: "#10b981",
};

const MEDICAL_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#fbbf24",
  low: "#10b981",
};

const AGENT_ICONS: Record<string, string> = {
  disaster_intelligence: "🔍",
  incident_understanding: "📊",
  survivor_probability: "👥",
  medical_triage: "🏥",
  priority_agent: "⚡",
  resource_allocation: "🚑",
  hospital_coordination: "🏨",
  risk_prediction: "⚠️",
  communication_agent: "📡",
  command_orchestrator: "🎯",
};

const RESOURCE_ICONS: Record<string, string> = {
  ambulance: "🚑",
  helicopter: "🚁",
  rescue_team: "👷",
  fire_truck: "🚒",
  water_rescue: "🚤",
  medical_unit: "💊",
};

const INCIDENT_ICONS: Record<string, string> = {
  flood: "🌊",
  fire: "🔥",
  collapse: "🏚️",
  cyclone: "🌀",
  landslide: "⛰️",
  earthquake: "🌋",
  other: "🚨",
};

export default function DashboardPage() {
  // Mode Selection
  const [mode, setMode] = useState<"SIMULATION" | "LIVE">("SIMULATION");

  // State Management
  const [apiStatus, setApiStatus] = useState<"loading" | "online" | "offline">("loading");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [response, setResponse] = useState<AgentExecuteResponse | null>(null);
  
  // Pipeline simulation states
  const [planLoading, setPlanLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [simulatedDecisions, setSimulatedDecisions] = useState<AgentDecision[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"plan" | "agents">("plan");

  // What-If Simulator Variables
  const [floodIntensity, setFloodIntensity] = useState<number>(0);
  const [hospitalsFull, setHospitalsFull] = useState<boolean>(false);
  const [weatherDelay, setWeatherDelay] = useState<boolean>(false);

  // Responder Registration
  const [responderName, setResponderName] = useState("");
  const [responderPhone, setResponderPhone] = useState("");
  const [responderAssets, setResponderAssets] = useState<string[]>(["ambulance"]);
  const [responderDistrict, setResponderDistrict] = useState("Hyderabad");
  const [responderStatus, setResponderStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [responderMsg, setResponderMsg] = useState("");
  const [sidebarTab, setSidebarTab] = useState<"whatif" | "responder">("responder");
  const [notificationsSent, setNotificationsSent] = useState<any[]>([]);

  // Map Integration States
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<any>(null);

  // Dynamic alert ticker message
  const [tickerMessage, setTickerMessage] = useState("COMMAND CENTER STATUS: STANDBY · WAITING FOR INCIDENT DISPATCH");

  // 1. Check Backend API Status on Mount
  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((r) => r.json())
      .then(() => setApiStatus("online"))
      .catch(() => setApiStatus("offline"));
  }, []);

  // 2. Load Incidents based on mode
  useEffect(() => {
    if (mode === "LIVE") {
      if (apiStatus !== "online") return;
      fetch(`${API_URL}/api/v1/incidents?limit=20`)
        .then((r) => r.json())
        .then((data) => {
          setIncidents(data.incidents || []);
        })
        .catch(() => {});
    } else {
      // Map demo_scenarios.json to Incident objects
      const mockIncidents: Incident[] = demoScenarios.map((s) => ({
        id: s.id,
        title: s.title,
        type: s.type,
        location: s.location,
        description: s.description,
        latitude: s.latitude,
        longitude: s.longitude,
        severity: s.severity,
        status: "active",
        created_at: new Date().toISOString(),
      }));
      setIncidents(mockIncidents);
      if (!selected && mockIncidents.length > 0) {
        setSelected(mockIncidents[0]);
      }
    }
  }, [mode, apiStatus]);

  // 3. Leaflet Script & CSS Injection
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("leaflet-js")) {
      setMapLoaded(true);
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.id = "leaflet-css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.id = "leaflet-js";
    script.async = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, []);

  // 4. Map rendering and Marker plotting
  useEffect(() => {
    if (!mapLoaded || typeof window === "undefined") return;
    const L = (window as any).L;
    if (!L) return;

    // Reset container if re-initializing
    const container = L.DomUtil.get("map-container");
    if (container) {
      (container as any)._leaflet_id = null;
    }

    const mapCenterLat = selected ? selected.latitude : 17.9;
    const mapCenterLon = selected ? selected.longitude : 79.2;
    const zoom = selected ? 11 : 8;

    const map = L.map("map-container").setView([mapCenterLat, mapCenterLon], zoom);
    mapRef.current = map;

    // Dark cartographic tiles for Command Center aesthetic
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    // Click handler to trigger custom incident trigger
    map.on("click", (e: any) => {
      handleMapClick(e.latlng.lat, e.latlng.lng);
    });

    // Plot Telangana Emergency dataset items as custom colored circle markers
    // Verified items in blue (Hospitals), orange (Fire Stations), purple (Disaster Offices), red (Blood banks)
    telanganaEmergencyData.verified_dataset.forEach((item) => {
      const color = item.type === "hospital" ? "#3b82f6" : item.type === "fire_station" ? "#f97316" : item.type === "disaster_office" ? "#a855f7" : "#ec4899";
      L.circleMarker([item.latitude, item.longitude], {
        radius: 6,
        fillColor: color,
        color: "#ffffff",
        weight: 1,
        fillOpacity: 0.8,
      })
        .addTo(map)
        .bindPopup(`<b>${item.name}</b><br/>Type: ${item.type}<br/>Capacity: ${item.capacity}`);
    });

    telanganaEmergencyData.demo_dataset.forEach((item) => {
      L.circleMarker([item.latitude, item.longitude], {
        radius: 5,
        fillColor: "#64748b", // Grey for demo dataset
        color: "#cbd5e1",
        weight: 1,
        fillOpacity: 0.6,
      })
        .addTo(map)
        .bindPopup(`<b>${item.name} (Demo)</b><br/>Type: ${item.type}`);
    });

    // If an incident is active, draw a pulsing alert marker & red warning zone radius
    if (selected) {
      // Impact Zone Overlay
      L.circle([selected.latitude, selected.longitude], {
        color: "#ef4444",
        fillColor: "#ef4444",
        fillOpacity: 0.15,
        radius: 3500, // 3.5 km simulation radius
        weight: 1,
        dashArray: "4,4",
      }).addTo(map);

      // Pulse circle
      L.circleMarker([selected.latitude, selected.longitude], {
        radius: 12,
        fillColor: "#ef4444",
        color: "#ffffff",
        weight: 2,
        fillOpacity: 0.9,
      })
        .addTo(map)
        .bindPopup(`<b>ALERT: ${selected.title}</b><br/>Severity: ${selected.severity}/5`)
        .openPopup();
    }

    return () => {
      map.remove();
    };
  }, [mapLoaded, selected]);

  // Click on map to trigger simulation at that point
  function handleMapClick(lat: number, lon: number) {
    const customIncident: Incident = {
      id: `custom-${Date.now()}`,
      title: "Interactive Triggered Incident",
      type: "flood",
      location: `Coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      description: "Emergency triggered directly by Command Center Operator clicking the tactical interface.",
      latitude: lat,
      longitude: lon,
      severity: 3,
      status: "active",
      created_at: new Date().toISOString(),
    };
    setSelected(customIncident);
    setResponse(null);
    setApiError(null);
    setTickerMessage(`TACTICAL TRIGGER: USER SPAWNED COLLAPSE WARNING AT ${lat.toFixed(3)}, ${lon.toFixed(3)}`);
  }

  // Handle Pipeline execution
  async function runAgents(incidentId: string) {
    if (!selected) return;
    setPlanLoading(true);
    setResponse(null);
    setSimulatedDecisions([]);
    setApiError(null);
    setActiveStep(1);

    setTickerMessage(`INJECTING REPORT FOR "${selected.title}"... SYSTEM PIPELINE SPINNING UP`);

    if (mode === "LIVE") {
      // LIVE MODE: Call Backend FastAPI API
      try {
        const interval = setInterval(() => {
          setActiveStep((prev) => {
            if (prev < 10) return prev + 1;
            clearInterval(interval);
            return prev;
          });
        }, 300);

        const res = await fetch(`${API_URL}/api/v1/agents/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ incident_id: incidentId }),
        });
        
        clearInterval(interval);

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setApiError(`API error ${res.status}: ${err?.detail ?? res.statusText}`);
          return;
        }
        const data: AgentExecuteResponse = await res.json();
        
        // Fast-forward animation to 10
        setActiveStep(10);
        setResponse(data);
        setNotificationsSent(data.notifications_sent || []);
        setTickerMessage(`RESCUE SYSTEM CONVERGED. PRIORITY: ${data.rescue_plan.priority}. PLAN DISPATCHED`);
        if ((data.notifications_sent || []).length > 0) {
          setTickerMessage(`RESCUE PLAN DISPATCHED · ${data.notifications_sent.length} RESPONDER(S) NOTIFIED VIA WHATSAPP`);
        }
      } catch (e) {
        setApiError("Network error — Is the backend running on " + API_URL + "?");
        console.error(e);
      } finally {
        setPlanLoading(false);
      }
    } else {
      // SIMULATION MODE: Simulate 10-Agent pipeline with timeout animations
      const scenario = demoScenarios.find((s) => s.id === incidentId) || demoScenarios[0];
      
      // Construct base simulated output
      let finalPlan = JSON.parse(JSON.stringify(scenario.rescue_plan)) as RescuePlan;
      let finalDecisions = JSON.parse(JSON.stringify(scenario.agent_decisions)) as AgentDecision[];

      // Apply WHAT-IF modifications
      if (floodIntensity === 1) {
        finalPlan.severity = 5;
        finalPlan.estimated_survivors += 75;
        finalPlan.survivor_probability = parseFloat(Math.min(0.98, finalPlan.survivor_probability + 0.05).toFixed(2));
        finalPlan.priority_score = 0.99;
        finalPlan.dispatch_urgency = "immediate";
        finalPlan.risk_warnings.push("BLEV warning upgraded to CRITICAL structural damage");
        
        // Scale resources
        finalPlan.recommended_resources = finalPlan.recommended_resources.map((r) => ({
          ...r,
          count: r.count + 4,
        }));
      }

      if (hospitalsFull) {
        finalPlan.recommended_hospital = "MGM Hospital Warangal (Emergency Overflow Route)";
        finalPlan.hospitals = finalPlan.hospitals.map((h) => ({
          ...h,
          available_beds: 0,
          patient_routing: 0,
        })).concat([
          { name: "Secondary Osmania Hub", distance_km: 14.2, available_beds: 80, patient_routing: finalPlan.estimated_survivors }
        ]);
        finalPlan.alert_actions.hospital = "HOSPITALS AT CAPACITY: Direct all MCI transports to Secondary Osmania Hub immediately.";
        finalPlan.risk_warnings.push("Primary care routing failure - Hospital Bed capacity depleted");
      }

      if (weatherDelay) {
        finalPlan.recommended_resources = finalPlan.recommended_resources.map((r) => ({
          ...r,
          eta_minutes: r.eta_minutes + 15,
        }));
        finalPlan.alert_actions.field_team += " WARNING: 15-minute weather delay transit restrictions active.";
        finalPlan.risk_warnings.push("Extreme monsoonal winds slowing rotor evac support");
      }

      // Chain of steps simulation
      let step = 1;
      const stepInterval = setInterval(() => {
        if (step <= 10) {
          const decision = finalDecisions.find((d) => d.step === step);
          if (decision) {
            setSimulatedDecisions((prev) => [...prev, decision]);
            setTickerMessage(`STEP ${step}/10: ${decision.agent.replace(/_/g, " ").toUpperCase()} IS ACTIVE...`);
          }
          setActiveStep(step);
          step++;
        } else {
          clearInterval(stepInterval);
          setResponse({
            incident_id: selected.id,
            status: "completed",
            rescue_plan: finalPlan,
            agent_decisions: finalDecisions,
          });
          setPlanLoading(false);
          setTickerMessage(`SIMULATION PIPELINE CONVERGED SUCCESSFULLY. Tactically dispatched resources.`);
        }
      }, 400);
    }
  }

  const activePlan = response?.rescue_plan ?? null;
  const decisionsToRender = mode === "LIVE" ? response?.agent_decisions : simulatedDecisions;

  return (
    <div style={{ minHeight: "100vh", background: "#060a13", color: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      
      {/* ── Dynamic Top Warning Banner / Ticker ── */}
      <div style={{
        background: "#1e1b4b", borderBottom: "1px solid #3730a3",
        padding: "8px 20px", display: "flex", gap: "10px", alignItems: "center", fontSize: "12px",
        fontFamily: "monospace", overflow: "hidden", color: "#a5b4fc",
      }}>
        <span style={{
          background: "#ef4444", color: "#fff", padding: "1px 6px", borderRadius: "3px",
          fontWeight: "bold", fontSize: "10px", animation: "pulse 1.5s infinite"
        }}>
          LIVE FEED
        </span>
        <div style={{ whiteSpace: "nowrap" }}>
          {tickerMessage}
        </div>
      </div>

      {/* ── Main Header ── */}
      <header style={{
        background: "#0b1220", borderBottom: "1px solid #1e293b",
        padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "28px" }}>🛡️</span>
          <div>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#f8fafc", letterSpacing: "0.5px", textTransform: "uppercase" }}>
              RescueNet AI <span style={{ color: "#3b82f6", fontSize: "13px", fontWeight: "normal" }}>Command Center</span>
            </h1>
            <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>
              State of Telangana Emergency Response Systems
            </p>
          </div>
        </div>

        {/* ── Live / Simulation Switcher ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div style={{
            background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", padding: "4px",
            display: "flex", gap: "4px"
          }}>
            <button
              onClick={() => { setMode("SIMULATION"); setResponse(null); }}
              style={{
                padding: "6px 14px", borderRadius: "6px", border: "none", fontSize: "11px", fontWeight: 700,
                cursor: "pointer", background: mode === "SIMULATION" ? "#3b82f6" : "transparent",
                color: mode === "SIMULATION" ? "#ffffff" : "#94a3b8", transition: "all 0.2s"
              }}
            >
              💻 SIMULATION MODE
            </button>
            <button
              onClick={() => { setMode("LIVE"); setResponse(null); }}
              style={{
                padding: "6px 14px", borderRadius: "6px", border: "none", fontSize: "11px", fontWeight: 700,
                cursor: "pointer", background: mode === "LIVE" ? "#3b82f6" : "transparent",
                color: mode === "LIVE" ? "#ffffff" : "#94a3b8", transition: "all 0.2s"
              }}
            >
              📡 LIVE MODE
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{
              width: "8px", height: "8px", borderRadius: "50%", display: "inline-block",
              background: apiStatus === "online" ? "#10b981" : apiStatus === "offline" ? "#ef4444" : "#fbbf24",
            }} />
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              {apiStatus === "loading" ? "Connecting…" : apiStatus === "online" ? "API Connected" : "Offline"}
            </span>
          </div>
        </div>
      </header>

      {/* Grid Dashboard */}
      <main style={{ padding: "24px 32px", maxWidth: "1600px", margin: "0 auto" }}>
        
        <div style={{ display: "grid", gridTemplateColumns: "350px 1fr 350px", gap: "24px", marginBottom: "24px" }}>
          
          {/* 1. Incident Live Feed */}
          <section style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: "12px", padding: "20px" }}>
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "14px" }}>
              🚨 INCIDENT FEED ({incidents.length})
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "400px", overflowY: "auto" }}>
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => { setSelected(inc); setResponse(null); setApiError(null); }}
                  style={{
                    background: selected?.id === inc.id ? "#13233f" : "#0d1527",
                    border: `1px solid ${selected?.id === inc.id ? "#3b82f6" : "#1e293b"}`,
                    borderRadius: "8px", padding: "12px", cursor: "pointer", transition: "all 0.15s"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span style={{ fontSize: "16px" }}>{INCIDENT_ICONS[inc.type] || "🚨"}</span>
                      <span style={{ fontWeight: 700, fontSize: "13px", color: "#f8fafc" }}>{inc.title}</span>
                    </div>
                    <span style={{
                      fontSize: "9px", fontWeight: 800, padding: "2px 6px", borderRadius: "4px",
                      background: (SEVERITY_COLORS[inc.severity] ?? "#64748b") + "22",
                      color: SEVERITY_COLORS[inc.severity] ?? "#64748b",
                      border: `1px solid ${SEVERITY_COLORS[inc.severity]}33`
                    }}>
                      {SEVERITY_LABELS[inc.severity]}
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    📍 {inc.location}
                  </div>
                </div>
              ))}
            </div>

            {selected && (
              <div style={{ marginTop: "16px", padding: "12px", background: "#0d1527", borderRadius: "8px", border: "1px solid #1e293b" }}>
                <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }}>
                  Active Assessment
                </div>
                <div style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: 1.4 }}>
                  {selected.description}
                </div>
                
                <button
                  id="run-agents-btn"
                  onClick={() => runAgents(selected.id)}
                  disabled={planLoading}
                  style={{
                    width: "100%", padding: "10px", borderRadius: "6px", border: "none", marginTop: "12px",
                    background: planLoading ? "#1e3a8a" : "#2563eb", color: "#fff",
                    fontSize: "12px", fontWeight: 700, cursor: planLoading ? "not-allowed" : "pointer",
                    boxShadow: "0 0 10px rgba(37, 99, 235, 0.4)", transition: "all 0.2s"
                  }}
                >
                  {planLoading ? "🧠 Orchestrating Agents..." : "⚡ RUN RESCUE PIPELINE"}
                </button>
              </div>
            )}
          </section>

          {/* 2. Tactical Command Map */}
          <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{
              flex: 1, height: "450px", background: "#0b1220", border: "1px solid #1e293b",
              borderRadius: "12px", overflow: "hidden", position: "relative"
            }}>
              <div id="map-container" style={{ width: "100%", height: "100%" }} />
              
              <div style={{
                position: "absolute", bottom: "10px", left: "10px", zIndex: 1000,
                background: "rgba(11, 18, 32, 0.85)", border: "1px solid #1e293b",
                padding: "8px 12px", borderRadius: "6px", fontSize: "10px", color: "#94a3b8"
              }}>
                📌 <b>LEGEND:</b> <span style={{ color: "#ef4444" }}>● Incident</span> | <span style={{ color: "#3b82f6" }}>● Hospital</span> | <span style={{ color: "#f97316" }}>● Fire Station</span>
              </div>
            </div>
          </section>

          {/* 3. Right Sidebar — tabbed: Responder Registration + What-If Simulator */}
          <section style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", gap: "0" }}>
            {/* Tab switcher */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
              <button
                onClick={() => setSidebarTab("responder")}
                style={{
                  flex: 1, padding: "7px", borderRadius: "6px", border: "none", fontSize: "11px", fontWeight: 700,
                  cursor: "pointer", background: sidebarTab === "responder" ? "#16213e" : "transparent",
                  color: sidebarTab === "responder" ? "#3b82f6" : "#64748b",
                  borderBottom: sidebarTab === "responder" ? "2px solid #3b82f6" : "2px solid transparent"
                }}
              >📲 REGISTER</button>
              <button
                onClick={() => setSidebarTab("whatif")}
                style={{
                  flex: 1, padding: "7px", borderRadius: "6px", border: "none", fontSize: "11px", fontWeight: 700,
                  cursor: "pointer", background: sidebarTab === "whatif" ? "#16213e" : "transparent",
                  color: sidebarTab === "whatif" ? "#3b82f6" : "#64748b",
                  borderBottom: sidebarTab === "whatif" ? "2px solid #3b82f6" : "2px solid transparent"
                }}
              >🎛️ WHAT-IF</button>
            </div>

            {sidebarTab === "responder" ? (
              /* ── Responder Registration Panel ── */
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "2px" }}>
                  Register your number to receive real-time WhatsApp dispatch alerts when your asset is needed.
                </div>

                <div>
                  <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>Your Name</label>
                  <input
                    id="responder-name"
                    value={responderName}
                    onChange={e => setResponderName(e.target.value)}
                    placeholder="e.g. Ravi Kumar"
                    style={{
                      width: "100%", padding: "8px 10px", borderRadius: "6px",
                      background: "#0d1527", border: "1px solid #334155",
                      color: "#f8fafc", fontSize: "12px", boxSizing: "border-box"
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>WhatsApp Number</label>
                  <input
                    id="responder-phone"
                    value={responderPhone}
                    onChange={e => setResponderPhone(e.target.value)}
                    placeholder="e.g. 6304589007"
                    style={{
                      width: "100%", padding: "8px 10px", borderRadius: "6px",
                      background: "#0d1527", border: "1px solid #334155",
                      color: "#f8fafc", fontSize: "12px", boxSizing: "border-box"
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "6px" }}>Asset Type</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {["ambulance", "fire_truck", "rescue_team", "ndrf_unit", "police_station"].map(type => (
                      <button
                        key={type}
                        onClick={() => setResponderAssets(prev =>
                          prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                        )}
                        style={{
                          padding: "4px 10px", borderRadius: "4px", fontSize: "10px", fontWeight: 700,
                          border: "1px solid",
                          borderColor: responderAssets.includes(type) ? "#3b82f6" : "#334155",
                          background: responderAssets.includes(type) ? "#1d4ed822" : "transparent",
                          color: responderAssets.includes(type) ? "#3b82f6" : "#64748b",
                          cursor: "pointer"
                        }}
                      >
                        {type === "ambulance" ? "🚑" : type === "fire_truck" ? "🚒" : type === "rescue_team" ? "👷" : type === "ndrf_unit" ? "🪖" : "👮"}{" "}
                        {type.replace(/_/g, " ").toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>District</label>
                  <select
                    value={responderDistrict}
                    onChange={e => setResponderDistrict(e.target.value)}
                    style={{
                      width: "100%", padding: "8px 10px", borderRadius: "6px",
                      background: "#0d1527", border: "1px solid #334155",
                      color: "#f8fafc", fontSize: "12px"
                    }}
                  >
                    {["Hyderabad", "Rangareddy", "Warangal", "Karimnagar", "Nizamabad", "Khammam", "Nalgonda", "Medchal", "Sangareddy"].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <button
                  id="register-responder-btn"
                  onClick={async () => {
                    if (!responderPhone || !responderName) {
                      setResponderMsg("Please fill in your name and phone number.");
                      setResponderStatus("error");
                      return;
                    }
                    setResponderStatus("loading");
                    try {
                      const res = await fetch(`${API_URL}/api/v1/responders/register`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name: responderName,
                          phone: responderPhone,
                          asset_types: responderAssets,
                          district: responderDistrict,
                        })
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setResponderStatus("success");
                        setResponderMsg(`✅ Registered! You'll receive WhatsApp alerts on ${responderPhone}.`);
                      } else {
                        throw new Error("Registration failed");
                      }
                    } catch {
                      setResponderStatus("error");
                      setResponderMsg("❌ Registration failed. Is the backend running?");
                    }
                  }}
                  disabled={responderStatus === "loading"}
                  style={{
                    width: "100%", padding: "10px", borderRadius: "6px", border: "none",
                    background: responderStatus === "success" ? "#064e3b" : "#1d4ed8",
                    color: "#fff", fontSize: "12px", fontWeight: 700,
                    cursor: responderStatus === "loading" ? "not-allowed" : "pointer",
                    boxShadow: "0 0 10px rgba(29, 78, 216, 0.3)"
                  }}
                >
                  {responderStatus === "loading" ? "Registering..." : responderStatus === "success" ? "✅ Registered!" : "📲 REGISTER FOR DISPATCH ALERTS"}
                </button>

                {responderMsg && (
                  <div style={{
                    fontSize: "11px", padding: "8px", borderRadius: "6px",
                    background: responderStatus === "success" ? "#065f4622" : "#ef444422",
                    color: responderStatus === "success" ? "#34d399" : "#fca5a5",
                    border: `1px solid ${responderStatus === "success" ? "#065f4688" : "#ef444488"}`
                  }}>
                    {responderMsg}
                  </div>
                )}

                {notificationsSent.length > 0 && (
                  <div style={{ borderTop: "1px solid #1e293b", paddingTop: "12px", marginTop: "4px" }}>
                    <div style={{ fontSize: "11px", color: "#34d399", fontWeight: 700, marginBottom: "6px" }}>
                      📨 {notificationsSent.length} DISPATCH ALERT(S) SENT
                    </div>
                    {notificationsSent.map((n, i) => (
                      <div key={i} style={{
                        fontSize: "10px", color: "#64748b", padding: "4px 8px",
                        background: "#0d1527", borderRadius: "4px", marginBottom: "4px",
                        borderLeft: "2px solid #34d39955"
                      }}>
                        {n.status === "simulated" ? "💬 SIMULATED" : n.status === "sent" ? "✅ SENT" : "⚠️ " + n.status.toUpperCase()} → {n.responder_name} ({n.phone})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* ── What-If Simulator Panel ── */
              <div>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "14px" }}>
                  🎛️ WHAT-IF SIMULATOR
                </div>
                {mode === "LIVE" ? (
                  <div style={{ fontSize: "12px", color: "#64748b", textAlign: "center", padding: "30px 10px" }}>
                    🚫 What-If Simulator is only active in <b>Simulation Mode</b>.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 600, color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                        Flood Peak Surge Intensity
                      </label>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          onClick={() => setFloodIntensity(0)}
                          style={{
                            flex: 1, padding: "6px", borderRadius: "4px", fontSize: "11px", border: "1px solid #334155",
                            background: floodIntensity === 0 ? "#1e293b" : "transparent",
                            color: floodIntensity === 0 ? "#3b82f6" : "#94a3b8", cursor: "pointer"
                          }}
                        >Normal</button>
                        <button
                          onClick={() => setFloodIntensity(1)}
                          style={{
                            flex: 1, padding: "6px", borderRadius: "4px", fontSize: "11px", border: "1px solid #334155",
                            background: floodIntensity === 1 ? "#ef444422" : "transparent",
                            color: floodIntensity === 1 ? "#ef4444" : "#94a3b8", cursor: "pointer"
                          }}
                        >Critical Surge (+1)</button>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "#cbd5e1" }}>Gandhi Hospital Capacity Full</span>
                      <input type="checkbox" checked={hospitalsFull} onChange={e => setHospitalsFull(e.target.checked)} style={{ width: "16px", height: "16px", cursor: "pointer" }} />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "#cbd5e1" }}>Severe Monsoon Weather Delay</span>
                      <input type="checkbox" checked={weatherDelay} onChange={e => setWeatherDelay(e.target.checked)} style={{ width: "16px", height: "16px", cursor: "pointer" }} />
                    </div>

                    <div style={{ borderTop: "1px solid #1e293b", paddingTop: "14px", fontSize: "11px", color: "#64748b" }}>
                      💡 Changing parameters automatically modifies resource allocations, ETAs, and hospital routing.
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

        </div>

        {/* Bottom panels */}
        {planLoading || activePlan ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr", gap: "24px" }}>
            
            {/* A. AI Rescue Brain Execution Timelines */}
            <section style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: "12px", padding: "20px" }}>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "14px" }}>
                🧠 AI RESCUE BRAIN PIPELINE
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {Array.from({ length: 10 }).map((_, idx) => {
                  const stepNum = idx + 1;
                  const agentKeys = Object.keys(AGENT_ICONS);
                  const agentKey = agentKeys[idx];
                  const decision = decisionsToRender?.find((d) => d.step === stepNum);
                  const isActive = stepNum === activeStep;
                  const isDone = stepNum < activeStep || activeStep === 10;

                  return (
                    <div
                      key={stepNum}
                      style={{
                        display: "flex", gap: "10px", alignItems: "flex-start",
                        opacity: isActive ? 1 : isDone ? 0.85 : 0.4,
                        padding: "8px", borderRadius: "6px",
                        background: isActive ? "#132547" : "transparent",
                        border: `1px solid ${isActive ? "#3b82f6" : "transparent"}`,
                        transition: "all 0.25s"
                      }}
                    >
                      <span style={{
                        width: "18px", height: "18px", borderRadius: "50%",
                        background: isDone ? "#10b981" : isActive ? "#3b82f6" : "#1e293b",
                        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "9px", fontWeight: "bold", flexShrink: 0
                      }}>
                        {isDone ? "✓" : stepNum}
                      </span>

                      <div style={{ fontSize: "12px" }}>
                        <span style={{ fontWeight: 700, color: isActive ? "#3b82f6" : "#cbd5e1" }}>
                          {AGENT_ICONS[agentKey]} {agentKey.replace(/_/g, " ").toUpperCase()}
                        </span>
                        {isActive && (
                          <div style={{ fontSize: "10px", color: "#60a5fa", marginTop: "2px", fontStyle: "italic" }}>
                            Agent reasoning in progress...
                          </div>
                        )}
                        {decision && (
                          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                            {decision.output}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* B. Core Rescue Plan Details */}
            <section style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: "12px", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>
                  📋 ACTIONABLE RESCUE PLAN
                </div>
                
                {activePlan && (
                  <span style={{
                    fontSize: "10px", fontWeight: 800, padding: "2px 8px", borderRadius: "4px",
                    background: PRIORITY_COLORS[activePlan.priority] + "22",
                    color: PRIORITY_COLORS[activePlan.priority],
                    border: `1px solid ${PRIORITY_COLORS[activePlan.priority]}`
                  }}>
                    PRIORITY {activePlan.priority}
                  </span>
                )}
              </div>

              {activePlan ? (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                    <div style={{ background: "#0d1527", padding: "12px", borderRadius: "8px", border: "1px solid #1e293b" }}>
                      <div style={{ fontSize: "18px" }}>👥</div>
                      <div style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc" }}>{activePlan.estimated_survivors}</div>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>Survivors Count</div>
                    </div>
                    <div style={{ background: "#0d1527", padding: "12px", borderRadius: "8px", border: "1px solid #1e293b" }}>
                      <div style={{ fontSize: "18px" }}>📈</div>
                      <div style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc" }}>{(activePlan.survivor_probability * 100).toFixed(0)}%</div>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>Survivor Prob.</div>
                    </div>
                    <div style={{ background: "#0d1527", padding: "12px", borderRadius: "8px", border: "1px solid #1e293b" }}>
                      <div style={{ fontSize: "18px" }}>🎯</div>
                      <div style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc" }}>{(activePlan.confidence_score * 100).toFixed(0)}%</div>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>Plan Confidence</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    {/* Resources */}
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "8px" }}>
                        🚒 RESOURCE DEPLOYMENT
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {activePlan.recommended_resources.map((res, i) => (
                          <div key={i} style={{
                            display: "flex", justifyContent: "space-between", padding: "8px",
                            background: "#0d1527", borderRadius: "6px", fontSize: "12px", border: "1px solid #1e293b"
                          }}>
                            <span>{RESOURCE_ICONS[res.type] || "🔧"} {res.type.replace(/_/g, " ").toUpperCase()}</span>
                            <span style={{ fontWeight: "bold" }}>{res.count} Units (ETA {res.eta_minutes}m)</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Hospitals */}
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "8px" }}>
                        🏥 HOSPITAL ROUTING
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {activePlan.hospitals.map((hosp, i) => (
                          <div key={i} style={{
                            padding: "8px", background: "#0d1527", borderRadius: "6px", fontSize: "12px", border: "1px solid #1e293b"
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                              <span>🏥 {hosp.name}</span>
                              <span style={{ color: "#3b82f6" }}>{hosp.patient_routing} patients</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#64748b", marginTop: "2px" }}>
                              <span>Dist: {hosp.distance_km} km</span>
                              <span>Beds Available: {hosp.available_beds}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Alert Actions */}
                  <div style={{ marginTop: "20px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "8px" }}>
                      📡 PREPARED ALERTS DISPATCH
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ padding: "8px 12px", background: "#0d1527", borderLeft: "3px solid #3b82f6", borderRadius: "4px", fontSize: "11px" }}>
                        <b>👷 FIELD TEAM:</b> {activePlan.alert_actions.field_team}
                      </div>
                      <div style={{ padding: "8px 12px", background: "#0d1527", borderLeft: "3px solid #a855f7", borderRadius: "4px", fontSize: "11px" }}>
                        <b>🏥 HOSPITAL:</b> {activePlan.alert_actions.hospital}
                      </div>
                      <div style={{ padding: "8px 12px", background: "#0d1527", borderLeft: "3px solid #10b981", borderRadius: "4px", fontSize: "11px" }}>
                        <b>📢 PUBLIC:</b> {activePlan.alert_actions.public}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "#64748b" }}>
                  <span>⏳ Waiting for pipeline execution to complete...</span>
                </div>
              )}
            </section>

            {/* C. Risk Forecast Heatmap */}
            <section style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: "12px", padding: "20px" }}>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "14px" }}>
                ⚠️ RISK PLOTS & FORECAST
              </div>

              {activePlan ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                      <span>Secondary Collapse Risk</span>
                      <span style={{ color: "#ef4444", fontWeight: "bold" }}>85%</span>
                    </div>
                    <div style={{ height: "6px", background: "#1e293b", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ width: "85%", height: "100%", background: "linear-gradient(90deg, #10b981, #ef4444)" }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                      <span>Water Contamination</span>
                      <span style={{ color: "#fbbf24", fontWeight: "bold" }}>60%</span>
                    </div>
                    <div style={{ height: "6px", background: "#1e293b", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ width: "60%", height: "100%", background: "linear-gradient(90deg, #10b981, #fbbf24)" }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                      <span>Plume Dispersion Risk</span>
                      <span style={{ color: "#10b981", fontWeight: "bold" }}>15%</span>
                    </div>
                    <div style={{ height: "6px", background: "#1e293b", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ width: "15%", height: "100%", background: "#10b981" }} />
                    </div>
                  </div>

                  <div style={{ marginTop: "10px", borderTop: "1px solid #1e293b", paddingTop: "14px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#cbd5e1", marginBottom: "6px" }}>
                      SECONDARY WARNINGS:
                    </div>
                    {activePlan.risk_warnings.map((warn, i) => (
                      <div key={i} style={{
                        background: "#ef444411", color: "#fca5a5", border: "1px solid #ef444433",
                        padding: "8px", borderRadius: "4px", fontSize: "11px", marginBottom: "6px"
                      }}>
                        • {warn}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "#64748b" }}>
                  <span>⏳ Waiting for risk evaluations...</span>
                </div>
              )}
            </section>

          </div>
        ) : (
          <div style={{
            background: "#0b1220", border: "1px solid #1e293b", borderRadius: "12px", padding: "60px",
            textAlign: "center", color: "#64748b"
          }}>
            👉 Select an incident from the Live Feed on the left, then click <b>Run Rescue Pipeline</b> to initialize the tactical response center.
          </div>
        )}

      </main>

      <footer style={{ background: "#070c16", borderTop: "1px solid #1e293b", padding: "20px", textAlign: "center", fontSize: "11px", color: "#475569" }}>
        RescueNet AI v0.1.0 · Telangana State Emergency Command Center Demo · API: <a href={`${API_URL}/docs`} target="_blank" rel="noreferrer" style={{ color: "#3b82f6", textDecoration: "none" }}>{API_URL}/docs ↗</a>
      </footer>

    </div>
  );
}
