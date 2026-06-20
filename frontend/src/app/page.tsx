"use client";

/**
 * RescueNet AI — Premium Dual-View Frontend
 * Admin Command Center + Citizen Mobile App
 * Backend: FastAPI (localhost:8000) + Twilio Voice/WhatsApp
 */

import { useEffect, useState, useRef, useCallback } from "react";
import demoScenarios from "@/data/demo_scenarios.json";
import telanganaData from "@/data/telangana_emergency_dataset.json";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────

type Incident = {
  id: string; title: string; type: string; location: string;
  description?: string; latitude: number; longitude: number;
  severity: number; status: string; created_at: string;
};
type ResourceDispatch = { type: string; count: number; eta_minutes: number; };
type HospitalRouting = { name: string; distance_km: number; available_beds: number; patient_routing: number; };
type AlertActions = { field_team: string; hospital: string; public: string; };
type RescuePlan = {
  priority: string; severity: number; affected_area: string;
  estimated_survivors: number; survivor_probability: number;
  priority_score: number; confidence_score: number; medical_priority: string;
  dispatch_urgency: string; recommended_hospital: string;
  recommended_resources: ResourceDispatch[]; hospitals: HospitalRouting[];
  alert_actions: AlertActions; risk_warnings: string[];
};
type AgentDecision = { agent: string; output: string; step: number; };
type AgentExecuteResponse = {
  incident_id: string; status: string; rescue_plan: RescuePlan;
  agent_decisions: AgentDecision[]; notifications_sent?: any[];
};
type CommLogEntry = {
  id: string; from: string; fromColor: string; message: string; time: string; icon: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SEV_COLOR: Record<number, string> = {
  1: "#10b981", 2: "#34d399", 3: "#fbbf24", 4: "#f97316", 5: "#ef4444",
};
const SEV_LABEL: Record<number, string> = {
  1: "LOW", 2: "MINOR", 3: "MODERATE", 4: "HIGH", 5: "CRITICAL",
};
const INC_ICON: Record<string, string> = {
  flood: "🌊", fire: "🔥", collapse: "🏚️", cyclone: "🌀",
  landslide: "⛰️", earthquake: "🌋", other: "🚨",
};
const AGENT_NAMES: Record<string, string> = {
  disaster_intelligence: "Disaster Intelligence Agent",
  incident_understanding: "Incident Understanding Agent",
  survivor_probability: "Survivor Probability Agent",
  medical_triage: "Medical Triage Agent",
  priority_agent: "Priority Agent",
  resource_allocation: "Resource Allocation Agent",
  hospital_coordination: "Hospital Coordination Agent",
  risk_prediction: "Risk Prediction Agent",
  communication_agent: "Communication Agent",
  command_orchestrator: "Command Orchestrator Agent",
};
const AGENT_KEYS = Object.keys(AGENT_NAMES);
const PRIORITY_COLOR: Record<string, string> = {
  P1: "#ef4444", P2: "#f97316", P3: "#fbbf24", P4: "#34d399", P5: "#10b981",
};
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "incidents", label: "Incidents", icon: "🚨" },
  { id: "map", label: "Live Map", icon: "🗺" },
  { id: "resources", label: "Resources", icon: "🚒" },
  { id: "hospitals", label: "Hospitals", icon: "🏥" },
  { id: "units", label: "Deployed Units", icon: "👷" },
  { id: "camera", label: "Live Cameras", icon: "📹" },
  { id: "weather", label: "Weather", icon: "🌤" },
  { id: "comms", label: "Comm Log", icon: "📡" },
  { id: "alerts", label: "Alerts", icon: "🔔" },
  { id: "reports", label: "Reports", icon: "📋" },
  { id: "analytics", label: "Analytics", icon: "📊" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

// Extra mock incidents for richer feed
const EXTRA_INCIDENTS: Incident[] = [
  { id: "extra-001", title: "Flood Warning in Musheerabad", type: "flood", location: "Musheerabad, Hyderabad", latitude: 17.4095, longitude: 78.4787, severity: 4, status: "active", created_at: new Date(Date.now() - 600000).toISOString() },
  { id: "extra-002", title: "Fire Incident in Kukatpally", type: "fire", location: "Kukatpally, Hyderabad", latitude: 17.4948, longitude: 78.3996, severity: 4, status: "active", created_at: new Date(Date.now() - 300000).toISOString() },
  { id: "extra-003", title: "Building Collapse, Dilsukhnagar", type: "collapse", location: "Dilsukhnagar, Hyderabad", latitude: 17.3688, longitude: 78.5261, severity: 3, status: "active", created_at: new Date(Date.now() - 780000).toISOString() },
  { id: "extra-004", title: "Road Accident on NH 44", type: "other", location: "Gadchiwall, Hyderabad", latitude: 17.3989, longitude: 78.5480, severity: 2, status: "reported", created_at: new Date(Date.now() - 1200000).toISOString() },
];

const DEPLOYED_UNITS = [
  { id: "FBU-12", name: "Fire Brigade Unit 12", status: "En Route", distance: "4.2 km away", color: "#f97316", icon: "🚒" },
  { id: "AMB-08", name: "Ambulance Unit 08", status: "On Scene", distance: "1.1 km away", color: "#10b981", icon: "🚑" },
  { id: "SDRF-A", name: "SDRF Team Alpha", status: "On Scene", distance: "2.5 km away", color: "#10b981", icon: "🪖" },
  { id: "POL-23", name: "Police Unit 23", status: "En Route", distance: "3.8 km away", color: "#f97316", icon: "🚔" },
];

const RAIN_FORECAST = [
  { time: "Now", val: 0 }, { time: "19:00", val: 10 }, { time: "22:00", val: 25 },
  { time: "01:00", val: 40 }, { time: "04:00", val: 80 }, { time: "07:00", val: 90 },
  { time: "10:00", val: 70 }, { time: "13:00", val: 40 },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  // ── View state ──
  const [view, setView] = useState<"admin" | "citizen">("admin");
  const [adminNav, setAdminNav] = useState("dashboard");

  // ── Admin state ──
  const [mode, setMode] = useState<"SIMULATION" | "LIVE">("SIMULATION");
  const [apiStatus, setApiStatus] = useState<"loading" | "online" | "offline">("loading");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [response, setResponse] = useState<AgentExecuteResponse | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [simulatedDecisions, setSimulatedDecisions] = useState<AgentDecision[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<any>(null);
  const [sidebarTab, setSidebarTab] = useState<"voice" | "responder" | "whatif">("voice");
  const [showRightPanel, setShowRightPanel] = useState(true);

  // ── Responder state ──
  const [rName, setRName] = useState("");
  const [rPhone, setRPhone] = useState("");
  const [rAssets, setRAssets] = useState<string[]>(["ambulance"]);
  const [rDistrict, setRDistrict] = useState("Hyderabad");
  const [rStatus, setRStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [rMsg, setRMsg] = useState("");
  const [notifsSent, setNotifsSent] = useState<any[]>([]);

  // ── Voice state ──
  const [vPhone, setVPhone] = useState("6304589007");
  const [voiceCalls, setVoiceCalls] = useState<any[]>([]);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [vStatus, setVStatus] = useState<"idle" | "calling" | "active" | "error">("idle");
  const [vMsg, setVMsg] = useState("");

  // ── What-if ──
  const [wFlood, setWFlood] = useState(0);
  const [wHospFull, setWHospFull] = useState(false);
  const [wWeather, setWWeather] = useState(false);

  // ── Communication log ──
  const [commLog, setCommLog] = useState<CommLogEntry[]>([
    { id: "cl1", from: "Command Center", fromColor: "#ef4444", message: "All units, severe flooding reported in Begumpet, Hyderabad. Stand by for rescue dispatch.", time: "18:40", icon: "🛡️" },
    { id: "cl2", from: "AI System", fromColor: "#3b82f6", message: "Risk assessment completed. Severity level: Critical (5/5). Confidence: 89%.", time: "18:38", icon: "🤖" },
    { id: "cl3", from: "Field Unit 08", fromColor: "#10b981", message: "En route to location, ETA 4 minutes. Boat deployment teams ready.", time: "18:35", icon: "🚒" },
  ]);
  const [ticker, setTicker] = useState("COMMAND CENTER STATUS: ALL SYSTEMS OPERATIONAL · MONITORING 18 ACTIVE INCIDENTS · NEXT BRIEFING 19:00 HRS");

  // ── Clock ──
  const [now, setNow] = useState(new Date());

  // ── Citizen App state ──
  const [cScreen, setCScreen] = useState<"login" | "home" | "help" | "report" | "success">("login");
  const [cPhone, setCPhone] = useState("+91 98765 43210");
  const [cOtp, setCOtp] = useState(false);
  const [cLoggedIn, setCLoggedIn] = useState(false);
  const [helpTab, setHelpTab] = useState<"hospitals" | "fire" | "police" | "ambulance">("hospitals");
  const [rptType, setRptType] = useState("flood");
  const [rptSev, setRptSev] = useState<"low" | "medium" | "high" | "critical">("high");
  const [rptDesc, setRptDesc] = useState("");
  const [submitted, setSubmitted] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cNavTab, setCNavTab] = useState("home");
  const [showUpload, setShowUpload] = useState(false);

  // ─── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then(r => r.json())
      .then(() => setApiStatus("online"))
      .catch(() => setApiStatus("offline"));
  }, []);

  useEffect(() => {
    if (mode === "LIVE") {
      if (apiStatus !== "online") return;
      fetch(`${API_URL}/api/v1/incidents?limit=20`)
        .then(r => r.json())
        .then(d => { setIncidents(d.incidents || []); })
        .catch(() => {});
    } else {
      const mock: Incident[] = demoScenarios.map(s => ({
        id: s.id, title: s.title, type: s.type, location: s.location,
        description: s.description, latitude: s.latitude, longitude: s.longitude,
        severity: s.severity, status: "active", created_at: new Date().toISOString(),
      }));
      const all = [...mock, ...EXTRA_INCIDENTS];
      setIncidents(all);
      if (!selected) setSelected(all[0]);
    }
  }, [mode, apiStatus]);

  // Leaflet loader
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("leaflet-js")) { setMapLoaded(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet"; link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.id = "leaflet-css"; document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.id = "leaflet-js"; script.async = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Map init
  useEffect(() => {
    if (!mapLoaded || typeof window === "undefined" || view !== "admin") return;
    const L = (window as any).L;
    if (!L) return;
    const cont = L.DomUtil.get("admin-map");
    if (cont) (cont as any)._leaflet_id = null;
    const lat = selected?.latitude ?? 17.4;
    const lng = selected?.longitude ?? 78.48;
    const map = L.map("admin-map", { zoomControl: true, attributionControl: true })
      .setView([lat, lng], selected ? 11 : 9);
    mapRef.current = map;
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap © CARTO", maxZoom: 19,
    }).addTo(map);

    // Telangana facilities
    telanganaData.verified_dataset.forEach(item => {
      const c = item.type === "hospital" ? "#3b82f6" :
        item.type === "fire_station" ? "#f97316" :
        item.type === "disaster_office" ? "#a855f7" :
        item.type === "ambulance_hub" ? "#ef4444" : "#ec4899";
      L.circleMarker([item.latitude, item.longitude], {
        radius: 7, fillColor: c, color: "#fff", weight: 1.5, fillOpacity: 0.9,
      }).addTo(map).bindPopup(`<b>${item.name}</b><br/><span style="color:#94a3b8">${item.type.replace(/_/g, " ")}</span><br/>📞 ${item.phone}`);
    });

    // Incidents
    incidents.forEach(inc => {
      const c = SEV_COLOR[inc.severity] || "#94a3b8";
      const r = inc.id === selected?.id ? 14 : 8;
      L.circleMarker([inc.latitude, inc.longitude], {
        radius: r, fillColor: c, color: "#fff", weight: 2, fillOpacity: 0.95,
      }).addTo(map)
        .bindPopup(`<b>${inc.title}</b><br/><span style="color:${c}">Severity: ${inc.severity}/5</span><br/>📍 ${inc.location}`)
        .on("click", () => { setSelected(inc); setResponse(null); setApiError(null); });
    });

    // Impact zone for selected
    if (selected) {
      L.circle([selected.latitude, selected.longitude], {
        color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.08,
        radius: 3500, weight: 1.5, dashArray: "6,4",
      }).addTo(map);
    }
    return () => { try { map.remove(); } catch {} };
  }, [mapLoaded, incidents, selected, view]);

  // Invalidate map size to ensure proper bounds recalculation
  useEffect(() => {
    if (mapRef.current) {
      const timer = setTimeout(() => {
        try {
          mapRef.current.invalidateSize();
        } catch {}
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [mapLoaded, selected, view]);

  // Voice polling
  const fetchVoiceCalls = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/v1/voice/calls`);
      if (r.ok) {
        const d = await r.json();
        setVoiceCalls(d);
        const a = d.find((c: any) => c.status === "ringing" || c.status === "connected");
        setActiveCall(a || null);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchVoiceCalls();
    const t = setInterval(fetchVoiceCalls, 3000);
    return () => clearInterval(t);
  }, [fetchVoiceCalls]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  async function runAgents(incidentId: string) {
    if (!selected) return;
    setPlanLoading(true); setResponse(null);
    setSimulatedDecisions([]); setApiError(null); setActiveStep(1);
    setTicker(`INJECTING INCIDENT REPORT: "${selected.title}" — AI MULTI-AGENT PIPELINE INITIALIZING...`);

    if (mode === "LIVE") {
      try {
        const iv = setInterval(() =>
          setActiveStep(p => { if (p < 10) return p + 1; clearInterval(iv); return p; }), 350);
        const res = await fetch(`${API_URL}/api/v1/agents/execute`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ incident_id: incidentId }),
        });
        clearInterval(iv);
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          setApiError(`API Error ${res.status}: ${e?.detail ?? res.statusText}`);
          setPlanLoading(false); return;
        }
        const data: AgentExecuteResponse = await res.json();
        setActiveStep(10); setResponse(data); setNotifsSent(data.notifications_sent || []);
        setTicker(`✅ AI PIPELINE CONVERGED · PRIORITY ${data.rescue_plan.priority} · DISPATCH ORDERS ISSUED`);
        addToComm("AI System", "#3b82f6", "🤖",
          `Rescue plan ${data.rescue_plan.priority} finalized. ${(data.notifications_sent || []).length} responders notified via WhatsApp.`);
      } catch {
        setApiError("Network error — Is backend running at " + API_URL + "?");
      } finally { setPlanLoading(false); }
    } else {
      const scen = demoScenarios.find(s => s.id === incidentId) || demoScenarios[0];
      let plan = JSON.parse(JSON.stringify(scen.rescue_plan)) as RescuePlan;
      let decs = JSON.parse(JSON.stringify(scen.agent_decisions)) as AgentDecision[];
      if (wFlood === 1) { plan.severity = 5; plan.estimated_survivors += 75; plan.risk_warnings.push("CRITICAL surge escalation applied"); plan.recommended_resources = plan.recommended_resources.map(r => ({ ...r, count: r.count + 4 })); }
      if (wHospFull) { plan.recommended_hospital = "MGM Hospital Warangal (Overflow Route)"; plan.alert_actions.hospital = "HOSPITALS AT CAPACITY — Route all to overflow facilities."; }
      if (wWeather) { plan.recommended_resources = plan.recommended_resources.map(r => ({ ...r, eta_minutes: r.eta_minutes + 15 })); plan.risk_warnings.push("15-min severe weather delay"); }

      let step = 1;
      const iv = setInterval(() => {
        if (step <= 10) {
          const dec = decs.find(d => d.step === step);
          if (dec) { setSimulatedDecisions(p => [...p, dec]); setTicker(`AGENT ${step}/10 · ${(AGENT_NAMES[dec.agent] || dec.agent).toUpperCase()} — PROCESSING...`); }
          setActiveStep(step++);
        } else {
          clearInterval(iv);
          setResponse({ incident_id: selected.id, status: "completed", rescue_plan: plan, agent_decisions: decs });
          setPlanLoading(false);
          setTicker(`✅ SIMULATION PIPELINE COMPLETE · PRIORITY ${plan.priority} · ALL FIELD UNITS DISPATCHED`);
          addToComm("Command Orchestrator", "#a855f7", "🎯",
            `Rescue plan ${plan.priority} dispatched for "${selected.title}". All units briefed.`);
        }
      }, 420);
    }
  }

  async function triggerVoiceCall() {
    if (!selected) { setVMsg("Select an incident first."); setVStatus("error"); return; }
    if (!vPhone) { setVMsg("Enter a phone number."); setVStatus("error"); return; }
    setVStatus("calling"); setVMsg("Dialing automated safety assessment call...");
    try {
      const res = await fetch(`${API_URL}/api/v1/voice/call`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: vPhone, incident_id: selected.id }),
      });
      if (res.ok) {
        const d = await res.json();
        setActiveCall(d);
        if (d.status === "failed") { setVStatus("error"); setVMsg(`Call failed: ${d.error ?? "Twilio rejected"}`); }
        else {
          setVStatus("active");
          setVMsg(`Call ${d.status.toUpperCase()}${d.twilio_sid ? ` · SID ${d.twilio_sid}` : ""}`);
          addToComm("Twilio Voice", "#f97316", "📞", `Outbound safety call initiated to +91-${vPhone} for: ${selected.title}`);
        }
        fetchVoiceCalls();
      } else {
        const e = await res.json().catch(() => ({}));
        setVStatus("error"); setVMsg(`Failed: ${e.detail ?? "API error"}`);
      }
    } catch { setVStatus("error"); setVMsg("Connection failed. Is the backend running?"); }
  }

  async function simulateKeypress(digits: string) {
    if (!activeCall) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/voice/simulate-keypress?call_id=${activeCall.id}&digits=${digits}`, { method: "POST" });
      if (res.ok) {
        const d = await res.json(); setActiveCall(d);
        const labels: Record<string, string> = { "1": "SAFE ✅", "2": "TRAPPED ⚠️", "3": "CRITICAL 🚨" };
        const colors: Record<string, string> = { "1": "#10b981", "2": "#fbbf24", "3": "#ef4444" };
        setVMsg(`Survivor pressed ${digits}: ${labels[digits] || "UNKNOWN"}`);
        addToComm("Survivor Response", colors[digits] || "#94a3b8", "📱",
          `Citizen at +91-${vPhone} reported status: ${labels[digits] || "UNKNOWN"}`);
        fetchVoiceCalls();
        if (selected) {
          const ir = await fetch(`${API_URL}/api/v1/incidents/${selected.id}`);
          if (ir.ok) setSelected(await ir.json());
        }
      }
    } catch {}
  }

  async function registerResponder() {
    if (!rPhone || !rName) { setRMsg("Fill in name and phone."); setRStatus("error"); return; }
    setRStatus("loading");
    try {
      const res = await fetch(`${API_URL}/api/v1/responders/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: rName, phone: rPhone, asset_types: rAssets, district: rDistrict }),
      });
      if (res.ok) {
        const d = await res.json(); setRStatus("success"); setRMsg(d.message || `✅ ${rName} registered for WhatsApp alerts.`);
        addToComm("System", "#10b981", "📲", `Responder ${rName} registered. WhatsApp dispatch active for ${rAssets.join(", ")}.`);
      } else { throw new Error("Registration failed"); }
    } catch { setRStatus("error"); setRMsg("❌ Registration failed. Is the backend running?"); }
  }

  async function submitCitizenReport() {
    setSubmitting(true);
    const sevMap: Record<string, number> = { low: 1, medium: 3, high: 4, critical: 5 };
    try {
      const incRes = await fetch(`${API_URL}/api/v1/incidents`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${rptType.charAt(0).toUpperCase() + rptType.slice(1)} Emergency Report`,
          type: rptType, description: rptDesc || "Emergency reported via Citizen App.",
          location: "Hyderabad, Telangana, India",
          latitude: 17.4411 + (Math.random() - 0.5) * 0.08,
          longitude: 78.4735 + (Math.random() - 0.5) * 0.08,
          severity: sevMap[rptSev],
        }),
      });
      let incidentId = demoScenarios[0].id;
      if (incRes.ok) { const id = await incRes.json(); incidentId = id.id; }
      const agRes = await fetch(`${API_URL}/api/v1/agents/execute`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_id: incidentId }),
      });
      const plan = agRes.ok ? (await agRes.json()).rescue_plan : demoScenarios[0].rescue_plan;
      setSubmitted({ type: rptType, severity: rptSev, plan, incidentId });
      setCScreen("success");
    } catch {
      setSubmitted({ type: rptType, severity: rptSev, plan: demoScenarios[0].rescue_plan, incidentId: "demo-001" });
      setCScreen("success");
    } finally { setSubmitting(false); }
  }

  function addToComm(from: string, fromColor: string, icon: string, message: string) {
    const t = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
    setCommLog(p => [{ id: Date.now().toString(), from, fromColor, icon, message, time: t }, ...p.slice(0, 11)]);
  }

  // ─── Derived state ───────────────────────────────────────────────────────────
  const activePlan = response?.rescue_plan ?? null;
  const decisionsToRender = mode === "LIVE" ? response?.agent_decisions : simulatedDecisions;
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const dateStr = now.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", weekday: "long" });
  const activeIncidentsCount = incidents.filter(i => i.status === "active").length;
  const maxRain = Math.max(...RAIN_FORECAST.map(r => r.val), 1);

  // Nearby help data
  const nearbyHospitals = telanganaData.verified_dataset.filter(d => d.type === "hospital").map((h, i) => ({
    ...h, distance: `${(1.5 + i * 1.8).toFixed(1)} km`, beds: [120, 85, 60][i] ?? 50,
  }));
  const nearbyFire = telanganaData.verified_dataset.filter(d => d.type === "fire_station").map((f, i) => ({
    ...f, distance: `${(2.0 + i * 3.0).toFixed(1)} km`,
  }));
  const nearbyPolice = [
    { name: "Begumpet Police Station", district: "Hyderabad", distance: "1.1 km", phone: "+91-40-27902422", type: "police" },
    { name: "Secunderabad Police Station", district: "Hyderabad", distance: "3.4 km", phone: "+91-40-27802155", type: "police" },
  ];
  const nearbyAmb = [
    { name: "108 Emergency (GVK EMRI)", district: "Hyderabad", distance: "0.8 km", phone: "108", type: "ambulance" },
    { name: "Nampally Emergency Hub", district: "Hyderabad", distance: "2.3 km", phone: "+91-40-23558600", type: "ambulance" },
  ];
  const helpItems: any[] = helpTab === "hospitals" ? nearbyHospitals : helpTab === "fire" ? nearbyFire : helpTab === "police" ? nearbyPolice : nearbyAmb;

  // ─── S T Y L E S (inline helpers) ───────────────────────────────────────────
  const card = (extra?: any) => ({
    background: "#0b1220", border: "1px solid #1e293b", borderRadius: "10px",
    ...extra,
  });
  const btn = (bg: string, extra?: any) => ({
    background: bg, border: "none", borderRadius: "6px", color: "#fff",
    fontWeight: 700, cursor: "pointer", transition: "all 0.18s", ...extra,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#060a13", color: "#f8fafc", fontFamily: "'Inter', system-ui, sans-serif", overflow: "hidden" }}>

      {/* ── View Toggle Bar ── */}
      <div style={{ background: "#070c18", borderBottom: "1px solid #1e293b", padding: "8px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 100, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "20px" }}>🛡️</span>
          <span style={{ fontWeight: 800, fontSize: "13px", letterSpacing: "1px", color: "#f8fafc" }}>RESCUENET AI</span>
          <span style={{ fontSize: "11px", color: "#334155", margin: "0 4px" }}>|</span>
          <span style={{ fontSize: "11px", color: "#64748b" }}>Multi-Agent Disaster Response System</span>
        </div>
        <div style={{ display: "flex", gap: "6px", background: "#0d1527", border: "1px solid #1e293b", borderRadius: "8px", padding: "4px" }}>
          <button onClick={() => setView("admin")} style={{ ...btn(view === "admin" ? "#1d4ed8" : "transparent"), padding: "6px 18px", fontSize: "12px", borderRadius: "5px", color: view === "admin" ? "#fff" : "#64748b" }}>
            🖥 Command Center
          </button>
          <button onClick={() => setView("citizen")} style={{ ...btn(view === "citizen" ? "#1d4ed8" : "transparent"), padding: "6px 18px", fontSize: "12px", borderRadius: "5px", color: view === "citizen" ? "#fff" : "#64748b" }}>
            📱 Citizen App
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", gap: "4px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: "6px", padding: "3px" }}>
            <button onClick={() => setMode("SIMULATION")} style={{ ...btn(mode === "SIMULATION" ? "#3b82f6" : "transparent"), padding: "4px 12px", fontSize: "10px", borderRadius: "4px", color: mode === "SIMULATION" ? "#fff" : "#64748b" }}>SIMULATION</button>
            <button onClick={() => { setMode("LIVE"); setResponse(null); }} style={{ ...btn(mode === "LIVE" ? "#3b82f6" : "transparent"), padding: "4px 12px", fontSize: "10px", borderRadius: "4px", color: mode === "LIVE" ? "#fff" : "#64748b" }}>LIVE</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: apiStatus === "online" ? "#10b981" : apiStatus === "offline" ? "#ef4444" : "#fbbf24", display: "inline-block" }} className={apiStatus === "online" ? "anim-glow-green" : ""} />
            <span style={{ fontSize: "11px", color: "#64748b" }}>{apiStatus === "loading" ? "Connecting…" : apiStatus === "online" ? "API Online" : "API Offline"}</span>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          ADMIN COMMAND CENTER
      ════════════════════════════════════════════════════════════════════════ */}
      {view === "admin" && (
        <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 49px)" }}>

          {/* ── Admin Header ── */}
          <header style={{ background: "#080d1a", borderBottom: "1px solid #1e293b", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "60px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} className="anim-glow-green" />
                <span style={{ fontSize: "12px", color: "#10b981", fontWeight: 700 }}>OPERATIONAL</span>
              </div>
              <div style={{ width: "1px", height: "20px", background: "#1e293b" }} />
              {/* Critical Alert Banner */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", padding: "5px 12px" }} className="anim-glow-red">
                <span style={{ fontSize: "13px" }}>⚠️</span>
                <span style={{ fontSize: "11px", color: "#ef4444", fontWeight: 700 }}>CRITICAL ALERT</span>
                <span style={{ fontSize: "11px", color: "#fca5a5" }}>{selected ? selected.title : "Monitoring Active Incidents"}</span>
                {selected && <span style={{ fontSize: "10px", color: "#64748b" }}>{selected.location}</span>}
                {selected && (
                  <button onClick={() => runAgents(selected.id)} style={{ ...btn("#ef4444"), padding: "3px 10px", fontSize: "10px", borderRadius: "4px", marginLeft: "4px" }}>
                    VIEW DETAILS
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#f8fafc", fontFamily: "monospace", letterSpacing: "1px" }}>{timeStr}</div>
                <div style={{ fontSize: "10px", color: "#64748b" }}>{dateStr}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0d1527", border: "1px solid #1e293b", borderRadius: "6px", padding: "6px 12px" }}>
                <span style={{ fontSize: "14px" }}>🌤</span>
                <span style={{ fontSize: "13px", fontWeight: 700 }}>33°C</span>
                <span style={{ fontSize: "11px", color: "#64748b" }}>Partly Sunny</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#0d1527", border: "1px solid #1e293b", borderRadius: "6px", padding: "6px 10px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px" }}>VB</div>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700 }}>Vikram Banerjee</div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>Super Administrator</div>
                </div>
              </div>
            </div>
          </header>

          {/* ── Ticker ── */}
          <div style={{ background: "#07101f", borderBottom: "1px solid #1a2740", padding: "6px 0", overflow: "hidden", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
            <div style={{ background: "#ef4444", color: "#fff", padding: "2px 10px", fontSize: "10px", fontWeight: 900, flexShrink: 0, marginLeft: "16px", borderRadius: "3px" }}>● LIVE</div>
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div className="anim-ticker" style={{ whiteSpace: "nowrap", fontSize: "11px", color: "#60a5fa", fontFamily: "monospace", letterSpacing: "0.5px" }}>{ticker}</div>
            </div>
          </div>

          {/* ── Main Layout: Sidebar + Content ── */}
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

            {/* ─── LEFT SIDEBAR ─── */}
            <aside style={{ width: "220px", background: "#08101e", borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto" }}>
              {/* Navigation */}
              <nav style={{ padding: "12px 8px", flex: 1 }}>
                {NAV_ITEMS.map(item => (
                  <button key={item.id} onClick={() => setAdminNav(item.id)} style={{
                    display: "flex", alignItems: "center", gap: "10px", width: "100%",
                    padding: "9px 12px", borderRadius: "7px", border: "none", textAlign: "left",
                    background: adminNav === item.id ? "rgba(59,130,246,0.15)" : "transparent",
                    color: adminNav === item.id ? "#60a5fa" : "#64748b",
                    fontSize: "12px", fontWeight: adminNav === item.id ? 700 : 500,
                    cursor: "pointer", marginBottom: "1px", transition: "all 0.15s",
                    borderLeft: adminNav === item.id ? "3px solid #3b82f6" : "3px solid transparent",
                  }}>
                    <span style={{ fontSize: "14px", flexShrink: 0 }}>{item.icon}</span>
                    <span>{item.label}</span>
                    {adminNav === item.id && <span style={{ marginLeft: "auto", color: "#3b82f6" }}>›</span>}
                  </button>
                ))}
              </nav>

              {/* Emergency Shortcuts */}
              <div style={{ borderTop: "1px solid #1e293b", padding: "12px 8px" }}>
                <div style={{ fontSize: "9px", color: "#334155", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px", paddingLeft: "4px" }}>Emergency Shortcuts</div>
                {[
                  { label: "SOS", sub: "Send Emergency Alert", bg: "#ef4444", icon: "🆘" },
                  { label: "Public Alert", sub: "Broadcast to Citizens", bg: "#1d4ed8", icon: "📢" },
                  { label: "Call SDRF / NDRF", sub: "Quick Coordination", bg: "#9333ea", icon: "📞" },
                  { label: "Notify Hospitals", sub: "Alert Medical Facilities", bg: "#0f766e", icon: "🏥" },
                ].map(s => (
                  <button key={s.label} style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "7px 10px", borderRadius: "7px", border: "none", background: `${s.bg}18`, marginBottom: "4px", cursor: "pointer", transition: "all 0.15s", textAlign: "left" }}
                    onMouseEnter={e => (e.currentTarget.style.background = `${s.bg}30`)}
                    onMouseLeave={e => (e.currentTarget.style.background = `${s.bg}18`)}>
                    <span style={{ fontSize: "13px" }}>{s.icon}</span>
                    <div>
                      <div style={{ fontSize: "11px", color: "#f8fafc", fontWeight: 700 }}>{s.label}</div>
                      <div style={{ fontSize: "9px", color: "#64748b" }}>{s.sub}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* System Status */}
              <div style={{ borderTop: "1px solid #1e293b", padding: "10px 12px", background: "#060d1b" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} className="anim-blink" />
                  <span style={{ fontSize: "11px", color: "#10b981", fontWeight: 700 }}>All Systems Operational</span>
                </div>
                {/* Mini heartbeat line */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "20px", marginTop: "4px" }}>
                  {[3,7,4,9,2,8,5,6,3,8,4,7,2,9,5].map((h, i) => (
                    <div key={i} style={{ width: "6px", height: `${h * 2}px`, background: "#10b98180", borderRadius: "1px", animation: `beat ${0.8 + i * 0.1}s ease-in-out infinite`, animationDelay: `${i * 0.06}s` }} />
                  ))}
                </div>
              </div>
            </aside>

            {/* ─── MAIN CONTENT AREA ─── */}
            <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* ── Stats Row ── */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "10px", padding: "10px 14px", borderBottom: "1px solid #1e293b", flexShrink: 0, background: "#07101e" }}>
                {[
                  { label: "TOTAL INCIDENTS", val: incidents.length + 120, sub: `↑${Math.max(incidents.length, 12)} Today`, icon: "📊", color: "#3b82f6" },
                  { label: "ACTIVE INCIDENTS", val: activeIncidentsCount + 16, sub: "↑4 Critical", icon: "🚨", color: "#ef4444" },
                  { label: "DEPLOYED UNITS", val: 76, sub: "On Field", icon: "🚒", color: "#f97316" },
                  { label: "PEOPLE RESCUED", val: "1,248", sub: "↑312 Today", icon: "👥", color: "#10b981" },
                  { label: "SUCCESS RATE", val: "96.4%", sub: "↑2.3%", icon: "✅", color: "#34d399" },
                  { label: "RESPONSE TIME", val: "08:45", sub: "Avg. Time", icon: "⏱", color: "#a855f7" },
                ].map(s => (
                  <div key={s.label} style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: "8px", padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                      <span style={{ fontSize: "9px", color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</span>
                      <span style={{ fontSize: "14px" }}>{s.icon}</span>
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: 800, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* ── Middle Row: Feed | Map | AI Panel ── */}
              <div style={{ display: adminNav === "dashboard" ? "grid" : "none", gridTemplateColumns: "280px 1fr 300px", gap: "0", flex: "1 1 auto", overflow: "hidden", borderBottom: "1px solid #1e293b", minHeight: 0 }}>

                {/* Incident Feed */}
                <div style={{ borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <div style={{ padding: "10px 12px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ background: "#ef4444", color: "#fff", fontSize: "9px", fontWeight: 800, padding: "2px 6px", borderRadius: "3px" }}>● LIVE</span>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Incident Feed</span>
                    </div>
                    <button style={{ background: "#0d1527", border: "1px solid #1e293b", borderRadius: "5px", color: "#64748b", fontSize: "10px", padding: "3px 8px", cursor: "pointer" }}>⊟ Filter</button>
                  </div>
                  <div style={{ overflowY: "auto", flex: 1, padding: "8px" }}>
                    {incidents.map(inc => {
                      const isSelected = selected?.id === inc.id;
                      const timeAgo = Math.floor((Date.now() - new Date(inc.created_at).getTime()) / 60000);
                      return (
                        <div key={inc.id} onClick={() => { setSelected(inc); setResponse(null); setApiError(null); }}
                          className="card-hover anim-fadeIn"
                          style={{ background: isSelected ? "#13233f" : "#0d1527", border: `1px solid ${isSelected ? "#3b82f6" : "#1e293b"}`, borderRadius: "8px", padding: "10px", marginBottom: "6px", cursor: "pointer" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontSize: "14px" }}>{INC_ICON[inc.type] || "🚨"}</span>
                              <span style={{ fontSize: "12px", fontWeight: 700, color: "#f8fafc" }}>{inc.title}</span>
                            </div>
                            <span style={{ fontSize: "9px", color: "#475569" }}>{timeAgo < 60 ? `${timeAgo} min ago` : `${Math.floor(timeAgo / 60)}h ago`}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                            <span style={{ background: SEV_COLOR[inc.severity] + "22", color: SEV_COLOR[inc.severity], border: `1px solid ${SEV_COLOR[inc.severity]}44`, fontSize: "9px", fontWeight: 800, padding: "1px 6px", borderRadius: "3px", textTransform: "uppercase" }}>
                              {SEV_LABEL[inc.severity]}
                            </span>
                            <span style={{ fontSize: "10px", color: "#64748b" }}>📍 {inc.location}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "10px", color: "#475569" }}>Severity {inc.severity}/5</span>
                            <span style={{ background: "#1d4ed822", color: "#60a5fa", fontSize: "9px", fontWeight: 700, padding: "1px 6px", borderRadius: "3px" }}>
                              AI {Math.floor(75 + inc.severity * 4)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ fontSize: "11px", color: "#3b82f6", textAlign: "center", padding: "8px", cursor: "pointer" }}>View All Incidents →</div>
                  </div>
                  {/* Run pipeline button */}
                  {selected && (
                    <div style={{ padding: "10px", borderTop: "1px solid #1e293b", flexShrink: 0 }}>
                      <button id="run-pipeline-btn" onClick={() => runAgents(selected.id)} disabled={planLoading}
                        style={{ ...btn(planLoading ? "#1e3a8a" : "#2563eb"), width: "100%", padding: "10px", fontSize: "12px", borderRadius: "7px", opacity: planLoading ? 0.8 : 1 }}
                        className={!planLoading ? "anim-glow-blue" : ""}>
                        {planLoading ? "🧠 Pipeline Running..." : "⚡ RUN AI RESCUE PIPELINE"}
                      </button>
                      {apiError && <div style={{ fontSize: "10px", color: "#fca5a5", marginTop: "6px", padding: "6px", background: "#ef444411", borderRadius: "5px", border: "1px solid #ef444433" }}>{apiError}</div>}
                    </div>
                  )}
                </div>

                {/* MAP */}
                <div className="relative overflow-hidden" style={{ height: "100%", minHeight: "300px", zIndex: 0 }}>
                  {/* Map layer controls */}
                  <div style={{ position: "absolute", top: "10px", left: "10px", right: "10px", zIndex: 900, display: "flex", gap: "6px", pointerEvents: "none" }}>
                    <div style={{ background: "rgba(8,13,26,0.85)", border: "1px solid #1e293b", borderRadius: "6px", padding: "5px 10px", display: "flex", alignItems: "center", gap: "6px", pointerEvents: "auto" }}>
                      <span style={{ fontSize: "10px", color: "#64748b" }}>All Layers ▾</span>
                    </div>
                    {["Incidents", "Hospitals", "Fire Stations", "Police", "Ambulances", "Flood Zones", "Traffic"].map(l => (
                      <div key={l} style={{ background: "rgba(8,13,26,0.75)", border: "1px solid #1e293b", borderRadius: "5px", padding: "4px 8px", fontSize: "10px", color: "#94a3b8", pointerEvents: "auto", cursor: "pointer" }}>
                        ✓ {l}
                      </div>
                    ))}
                  </div>
                  {/* Leaflet map fills the constrained container; invalidateSize is called after mount via useEffect */}
                  <div id="admin-map" style={{ width: "100%", height: "100%", background: "#060a13" }} />
                  {/* Legend */}
                  <div style={{ position: "absolute", bottom: "10px", left: "10px", zIndex: 900, background: "rgba(8,13,26,0.85)", border: "1px solid #1e293b", borderRadius: "6px", padding: "7px 12px", fontSize: "10px", color: "#94a3b8" }}>
                    <span style={{ fontWeight: 700, color: "#64748b" }}>LEGEND:</span>
                    {[["🔴", "Incident"], ["🔵", "Hospital"], ["🟠", "Fire Station"], ["🟣", "Police Station"], ["🚑", "Ambulance"], ["🟤", "NDRF"], ["💧", "Flood Zone"]].map(([sym, label]) => (
                      <span key={label} style={{ marginLeft: "8px" }}>{sym} {label}</span>
                    ))}
                  </div>
                  {/* Incident popup */}
                  {selected && (
                    <div style={{ position: "absolute", top: "50px", right: "12px", zIndex: 900, background: "rgba(11,18,32,0.92)", border: "1px solid #ef444466", borderRadius: "10px", padding: "12px 14px", maxWidth: "220px", backdropFilter: "blur(8px)" }}>
                      <div style={{ fontSize: "12px", fontWeight: 800, color: "#ef4444", marginBottom: "4px" }}>{INC_ICON[selected.type]} {selected.title}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>📍 {selected.location}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>Severity: <span style={{ color: SEV_COLOR[selected.severity], fontWeight: 700 }}>{selected.severity}/5 {SEV_LABEL[selected.severity]}</span></div>
                      <button style={{ ...btn("#ef4444"), marginTop: "8px", fontSize: "10px", padding: "4px 12px", borderRadius: "5px", width: "100%" }}>VIEW DETAILS</button>
                    </div>
                  )}
                </div>

                {/* AI Insights / Pipeline Panel */}
                <div style={{ borderLeft: "1px solid #1e293b", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <div style={{ padding: "10px 12px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>AI Insights</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "#1d4ed820", border: "1px solid #1d4ed840", borderRadius: "5px", padding: "2px 8px" }}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} className="anim-blink" />
                      <span style={{ fontSize: "10px", color: "#60a5fa", fontWeight: 700 }}>RescueNet AI</span>
                    </div>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
                    {/* Risk Assessment */}
                    {selected && (
                      <div style={{ background: "#0d1527", border: "1px solid #1e293b", borderRadius: "8px", padding: "12px", marginBottom: "10px" }}>
                        <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Risk Assessment</div>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#f8fafc", marginBottom: "4px" }}>{INC_ICON[selected.type]} {selected.title}</div>
                        <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "10px" }}>📍 {selected.location}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                          <div style={{ fontSize: "10px", color: "#94a3b8" }}>Severity: <span style={{ color: SEV_COLOR[selected.severity], fontWeight: 700 }}>{selected.severity}/5 {SEV_LABEL[selected.severity]}</span></div>
                        </div>
                        {/* Circular gauge */}
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>
                          <div style={{ position: "relative", width: "80px", height: "80px" }}>
                            <svg viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
                              <circle cx="40" cy="40" r="32" fill="none" stroke="#1e293b" strokeWidth="8" />
                              <circle cx="40" cy="40" r="32" fill="none" stroke={SEV_COLOR[selected.severity]} strokeWidth="8"
                                strokeDasharray={`${(selected.severity / 5) * 200} 200`} strokeLinecap="round" />
                            </svg>
                            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontSize: "16px", fontWeight: 800, color: SEV_COLOR[selected.severity] }}>{Math.floor(75 + selected.severity * 4)}%</span>
                              <span style={{ fontSize: "8px", color: "#64748b" }}>Risk Level</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* AI Agent Pipeline */}
                    {(planLoading || activePlan || activeStep > 0) ? (
                      <div style={{ background: "#0d1527", border: "1px solid #1e293b", borderRadius: "8px", padding: "10px", marginBottom: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                          <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>AI Agent Pipeline</span>
                          <button style={{ background: "#1e293b", border: "none", color: "#60a5fa", fontSize: "10px", padding: "2px 8px", borderRadius: "4px", cursor: "pointer" }}>View Logs</button>
                        </div>
                        {AGENT_KEYS.map((key, idx) => {
                          const stepNum = idx + 1;
                          const isDone = stepNum < activeStep || activeStep === 10;
                          const isActive = stepNum === activeStep && planLoading;
                          const dec = decisionsToRender?.find(d => d.step === stepNum);
                          return (
                            <div key={key} style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "5px 6px", borderRadius: "5px", background: isActive ? "#132547" : "transparent", marginBottom: "2px", transition: "all 0.2s" }}>
                              <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: isDone ? "#10b981" : isActive ? "#3b82f6" : "#1e293b", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", fontWeight: 800, flexShrink: 0, marginTop: "1px" }}>
                                {isDone ? "✓" : stepNum}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: "11px", fontWeight: 700, color: isDone ? "#10b981" : isActive ? "#60a5fa" : "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {AGENT_NAMES[key]}
                                </div>
                                <div style={{ fontSize: "9px", color: isDone ? "#10b981" : isActive ? "#60a5fa" : "#334155", fontWeight: 600 }}>
                                  {isDone ? "Completed" : isActive ? "In Progress" : "Pending"}
                                </div>
                                {dec && <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px", lineHeight: "1.3" }}>{dec.output.slice(0, 60)}…</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ background: "#0d1527", border: "1px solid #1e293b", borderRadius: "8px", padding: "12px", marginBottom: "10px" }}>
                        <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: "8px" }}>Recommended Actions</div>
                        {[
                          { icon: "🔴", text: "Evacuate within 500m radius", color: "#ef4444" },
                          { icon: "→", text: "Deploy Fire Brigade Units", color: "#f97316" },
                          { icon: "→", text: "Notify nearby hospitals", color: "#3b82f6" },
                          { icon: "→", text: "Monitor wind direction", color: "#94a3b8" },
                        ].map((a, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                            <span style={{ fontSize: "12px", color: a.color }}>{a.icon}</span>
                            <span style={{ fontSize: "11px", color: a.color }}>{a.text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Rescue Plan summary */}
                    {activePlan && (
                      <div style={{ background: "#0d1527", border: "1px solid #1e293b", borderRadius: "8px", padding: "12px", marginBottom: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Rescue Plan Active</span>
                          <span style={{ background: (PRIORITY_COLOR[activePlan.priority] || "#64748b") + "22", color: PRIORITY_COLOR[activePlan.priority] || "#64748b", border: `1px solid ${PRIORITY_COLOR[activePlan.priority] || "#64748b"}44`, fontSize: "10px", fontWeight: 800, padding: "2px 8px", borderRadius: "4px" }}>{activePlan.priority}</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                          {[
                            { label: "Survivors", val: activePlan.estimated_survivors },
                            { label: "Probability", val: `${(activePlan.survivor_probability * 100).toFixed(0)}%` },
                            { label: "Confidence", val: `${(activePlan.confidence_score * 100).toFixed(0)}%` },
                            { label: "Medical", val: activePlan.medical_priority.toUpperCase() },
                          ].map(m => (
                            <div key={m.label} style={{ background: "#111827", borderRadius: "6px", padding: "8px", border: "1px solid #1e293b" }}>
                              <div style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc" }}>{m.val}</div>
                              <div style={{ fontSize: "9px", color: "#64748b" }}>{m.label}</div>
                            </div>
                          ))}
                        </div>
                        {activePlan.risk_warnings.map((w, i) => (
                          <div key={i} style={{ background: "#ef444411", border: "1px solid #ef444433", color: "#fca5a5", fontSize: "10px", padding: "5px 8px", borderRadius: "5px", marginBottom: "4px" }}>⚠ {w}</div>
                        ))}
                      </div>
                    )}

                    {/* Nearest Resources */}
                    <div style={{ background: "#0d1527", border: "1px solid #1e293b", borderRadius: "8px", padding: "12px" }}>
                      <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: "8px" }}>Nearest Resources</div>
                      {[
                        { name: "Gandhi Hospital", detail: "2.4 km", eta: "5 min", icon: "🏥", color: "#3b82f6" },
                        { name: "Fire Brigade Stn 1", detail: "1.8 km", eta: "4 min", icon: "🚒", color: "#f97316" },
                        { name: "Police Control Room", detail: "2.1 km", eta: "6 min", icon: "🚔", color: "#a855f7" },
                      ].map(r => (
                        <div key={r.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #111827" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "14px" }}>{r.icon}</span>
                            <div>
                              <div style={{ fontSize: "11px", fontWeight: 600, color: "#f8fafc" }}>{r.name}</div>
                              <div style={{ fontSize: "10px", color: "#64748b" }}>{r.detail}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "11px", color: r.color, fontWeight: 700 }}>ETA: {r.eta}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Deployed Units Page ── */}
              <div style={{ display: adminNav === "units" ? "flex" : "none", flexDirection: "column", flex: "1 1 auto", overflow: "hidden", background: "#060a13" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e293b", background: "#08101e", flexShrink: 0 }}>
                  <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", margin: 0 }}>Deployed Units Dashboard</h2>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0 0" }}>Monitor all active rescue and medical units in the field.</p>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
                    {(activePlan ? activePlan.recommended_resources.map((r, i) => ({ id: `RES-${i}`, name: `${r.type.replace(/_/g, " ").toUpperCase()} ×${r.count}`, status: "En Route", distance: `ETA ${r.eta_minutes} min`, color: r.eta_minutes < 10 ? "#10b981" : "#f97316", icon: r.type.includes("ambulance") ? "🚑" : r.type.includes("fire") ? "🚒" : r.type.includes("heli") ? "🚁" : "🪖" })) : DEPLOYED_UNITS).map(unit => (
                      <div key={unit.id} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px", borderRadius: "10px", background: "#0d1527", border: "1px solid #1e293b" }}>
                        <div style={{ fontSize: "32px", background: "#111827", width: "60px", height: "60px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #1e293b" }}>{unit.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "16px", fontWeight: 700, color: "#f8fafc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{unit.name}</div>
                          <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>{unit.distance}</div>
                        </div>
                        <div style={{ fontSize: "13px", color: unit.color, fontWeight: 800, background: unit.color + "1A", padding: "6px 12px", borderRadius: "20px" }}>{unit.status}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Camera Live Feed Page ── */}
              <div style={{ display: adminNav === "camera" ? "flex" : "none", flexDirection: "column", flex: "1 1 auto", overflow: "hidden", background: "#030509" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e293b", background: "#08101e", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", margin: 0 }}>Live Camera Feeds</h2>
                    <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0 0" }}>Real-time surveillance and situational awareness.</p>
                  </div>
                  <span style={{ background: "#ef4444", color: "#fff", fontSize: "11px", fontWeight: 800, padding: "4px 10px", borderRadius: "4px", display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#fff" }} className="anim-blink" /> LIVE</span>
                </div>
                <div style={{ flex: 1, position: "relative", overflow: "hidden", margin: "20px", borderRadius: "12px", border: "1px solid #1e293b" }}>
                  <div style={{ width: "100%", height: "100%", background: "linear-gradient(180deg,#050e1f 0%,#071730 40%,#0a2040 60%,#061525 100%)", position: "relative" }}>
                    {/* Floodwater surface */}
                    <div style={{ position: "absolute", bottom: "0", left: "0", right: "0", height: "45%", background: "linear-gradient(180deg,rgba(30,80,160,0.55) 0%,rgba(15,50,120,0.75) 100%)", borderTop: "2px solid rgba(96,165,250,0.4)" }} />
                    {/* Water ripple rings */}
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ position: "absolute", bottom: `${20 + i * 10}px`, left: `${25 + i * 20}%`, width: `${30 + i * 12}px`, height: `${8 + i * 4}px`, border: "1px solid rgba(96,165,250,0.35)", borderRadius: "50%", animation: `fadeIn ${1.2 + i * 0.4}s ease-in-out infinite alternate`, opacity: 0.6 }} />
                    ))}
                    {/* Rain streaks */}
                    {[...Array(24)].map((_, i) => (
                      <div key={i} style={{ position: "absolute", top: `${Math.random() * 60}%`, left: `${i * 4 + 2}%`, width: "1px", height: "20px", background: "rgba(147,197,253,0.4)", animation: `fadeIn ${0.6 + (i % 4) * 0.15}s linear infinite alternate`, transform: "rotate(10deg)" }} />
                    ))}
                    {/* Submerged building silhouette */}
                    <div style={{ position: "absolute", bottom: "40%", left: "15%", fontSize: "64px", filter: "drop-shadow(0 2px 10px rgba(30,80,160,0.8))", opacity: 0.7 }}>🏚️</div>
                    <div style={{ position: "absolute", bottom: "35%", right: "20%", fontSize: "48px", filter: "drop-shadow(0 2px 10px rgba(30,80,160,0.8))", opacity: 0.6 }}>🏘️</div>
                    {/* Flood alert overlay text */}
                    <div style={{ position: "absolute", top: "40px", left: "50%", transform: "translateX(-50%)", background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.5)", borderRadius: "8px", padding: "8px 16px", fontSize: "14px", color: "#fca5a5", fontFamily: "monospace", textAlign: "center", letterSpacing: "1px" }}>⚠ SEVERE FLOODING — BEGUMPET ZONE · MUSI RIVER +2.4m</div>
                    {/* Camera overlay info */}
                    <div style={{ position: "absolute", top: "16px", left: "16px", fontSize: "14px", color: "#94a3b8", fontFamily: "monospace", background: "rgba(0,0,0,0.5)", padding: "4px 8px", borderRadius: "4px" }}>CAM-07 · BEGUMPET BRIDGE</div>
                    <div style={{ position: "absolute", top: "16px", right: "16px", fontSize: "14px", color: "#ef4444", fontFamily: "monospace", background: "rgba(0,0,0,0.5)", padding: "4px 8px", borderRadius: "4px" }}>{timeStr}</div>
                    <div style={{ position: "absolute", bottom: "16px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "10px", justifyContent: "center" }}>
                      {["◀", "● REC", "▶"].map((c, i) => <button key={c} style={{ background: "rgba(0,0,0,0.7)", border: "1px solid #1e293b", color: i === 1 ? "#ef4444" : "#64748b", padding: "8px 16px", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>{c}</button>)}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Weather & Environment Page ── */}
              <div style={{ display: adminNav === "weather" ? "flex" : "none", flexDirection: "column", flex: "1 1 auto", overflow: "hidden", background: "#060a13" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e293b", background: "#08101e", flexShrink: 0 }}>
                  <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", margin: 0 }}>Weather & Environment</h2>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0 0" }}>Meteorological data and environmental conditions.</p>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px", marginBottom: "30px" }}>
                    {[
                      { label: "Temperature", val: "33°C", sub: "Partly Sunny", icon: "🌡️" },
                      { label: "Humidity", val: "62%", sub: "Moderate", icon: "💧" },
                      { label: "Wind Speed", val: "18 km/h", sub: "SW Direction", icon: "💨" },
                      { label: "Visibility", val: "8 km", sub: "Clear", icon: "👁️" },
                    ].map(w => (
                      <div key={w.label} style={{ background: "#0d1527", borderRadius: "10px", padding: "20px", border: "1px solid #1e293b", display: "flex", alignItems: "center", gap: "16px" }}>
                        <div style={{ fontSize: "36px" }}>{w.icon}</div>
                        <div>
                          <div style={{ fontSize: "24px", fontWeight: 800, color: "#f8fafc" }}>{w.val}</div>
                          <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>{w.label}</div>
                          <div style={{ fontSize: "11px", color: "#475569", marginTop: "4px" }}>{w.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div style={{ background: "#0d1527", borderRadius: "10px", padding: "20px", border: "1px solid #1e293b" }}>
                    <div style={{ fontSize: "14px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginBottom: "16px", letterSpacing: "1px" }}>Hourly Rain Forecast</div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "200px", borderBottom: "1px solid #1e293b", paddingBottom: "10px" }}>
                      {RAIN_FORECAST.map((r, i) => (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", height: "100%", justifyContent: "flex-end" }}>
                          <div style={{ color: "#64748b", fontSize: "10px", fontWeight: 700 }}>{r.val}mm</div>
                          <div style={{ width: "60%", height: `${(r.val / maxRain) * 150}px`, background: r.val > 50 ? "linear-gradient(180deg, #3b82f6, #1d4ed8)" : "linear-gradient(180deg, #1d4ed8, #1e3a8a)", borderRadius: "4px 4px 0 0", minHeight: "5px", transition: "height 0.5s" }} />
                          <span style={{ fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap", marginTop: "4px" }}>{r.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Communication Log Page ── */}
              <div style={{ display: adminNav === "comms" ? "flex" : "none", flexDirection: "column", flex: "1 1 auto", overflow: "hidden", background: "#060a13" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e293b", background: "#08101e", flexShrink: 0 }}>
                  <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", margin: 0 }}>Communication Log</h2>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0 0" }}>System-wide communication and alerts history.</p>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {commLog.map(entry => (
                      <div key={entry.id} className="anim-fadeIn" style={{ display: "flex", gap: "16px", padding: "16px", background: "#0d1527", borderRadius: "10px", border: "1px solid #1e293b" }}>
                        <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: entry.fromColor + "1A", border: `1px solid ${entry.fromColor}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
                          {entry.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <span style={{ fontSize: "14px", fontWeight: 800, color: entry.fromColor }}>{entry.from}</span>
                            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>{entry.time}</span>
                          </div>
                          <div style={{ fontSize: "14px", color: "#e2e8f0", lineHeight: "1.5" }}>{entry.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Sidebar Right Panel (Voice/Responder/WhatIf) ── */}
              {/* This is shown as a collapsible panel above the bottom action bar */}
              <div style={{ display: "flex", borderBottom: "1px solid #1e293b", flexShrink: 0, background: "#08101e" }}>
                {["voice", "responder", "whatif"].map(tab => (
                  <button key={tab} onClick={() => setSidebarTab(tab as any)} style={{ flex: 1, padding: "6px 0", border: "none", background: "transparent", color: sidebarTab === tab ? "#3b82f6" : "#475569", fontSize: "10px", fontWeight: sidebarTab === tab ? 700 : 500, cursor: "pointer", borderBottom: sidebarTab === tab ? "2px solid #3b82f6" : "2px solid transparent" }}>
                    {tab === "voice" ? "📞 Voice Agent" : tab === "responder" ? "📲 Register Responder" : "🎛 What-If Sim"}
                  </button>
                ))}
                <button onClick={() => setShowRightPanel(p => !p)} style={{ padding: "6px 12px", border: "none", background: "transparent", color: "#475569", cursor: "pointer", fontSize: "12px" }}>{showRightPanel ? "▼" : "▲"}</button>
              </div>

              {showRightPanel && (
                <div style={{ background: "#08101e", padding: "12px 16px", display: "grid", gridTemplateColumns: sidebarTab === "voice" ? "1fr 1fr 1fr" : "1fr", gap: "14px", flexShrink: 0 }}>
                  {/* VOICE TAB */}
                  {sidebarTab === "voice" && (
                    <>
                      <div>
                        <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "5px" }}>Dial Outbound Number (no country code)</label>
                        <input id="voice-phone" value={vPhone} onChange={e => setVPhone(e.target.value)} placeholder="e.g. 6304589007"
                          style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", background: "#0d1527", border: "1px solid #334155", color: "#f8fafc", fontSize: "12px" }} />
                        <button id="trigger-voice-btn" onClick={triggerVoiceCall} disabled={vStatus === "calling" || !selected}
                          style={{ ...btn(vStatus === "active" ? "#15803d" : "#2563eb"), width: "100%", padding: "8px", fontSize: "11px", borderRadius: "6px", marginTop: "6px", opacity: !selected ? 0.5 : 1 }}>
                          {!selected ? "⚠ Select an Incident" : vStatus === "calling" ? "📞 Dialing..." : "📞 Call & Assess Survivor"}
                        </button>
                        {vMsg && <div style={{ fontSize: "10px", marginTop: "5px", padding: "5px 8px", borderRadius: "5px", background: vStatus === "error" ? "#ef444411" : "#10b98111", color: vStatus === "error" ? "#fca5a5" : "#6ee7b7", border: `1px solid ${vStatus === "error" ? "#ef444433" : "#10b98133"}` }}>{vMsg}</div>}
                      </div>
                      <div>
                        {activeCall && (activeCall.status === "ringing" || activeCall.status === "connected") && (
                          <div>
                            <div style={{ fontSize: "10px", color: "#3b82f6", fontWeight: 700, marginBottom: "6px" }}>⚡ VIRTUAL DIALPAD SIMULATOR</div>
                            <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "8px" }}>Simulate victim pressing keys:</div>
                            {[
                              { key: "1", label: "I am Safe", color: "#10b981" },
                              { key: "2", label: "Trapped / Need Rescue", color: "#fbbf24" },
                              { key: "3", label: "Critical Medical Help", color: "#ef4444" },
                            ].map(k => (
                              <button key={k.key} onClick={() => simulateKeypress(k.key)}
                                style={{ display: "block", width: "100%", padding: "7px 10px", borderRadius: "5px", border: `1px solid ${k.color}44`, background: `${k.color}11`, color: k.color, fontSize: "11px", fontWeight: 700, cursor: "pointer", marginBottom: "5px", textAlign: "left" }}>
                                [{k.key}] {k.label}
                              </button>
                            ))}
                          </div>
                        )}
                        {!activeCall && <div style={{ fontSize: "11px", color: "#334155", textAlign: "center", padding: "20px" }}>No active call. Dial a number to begin assessment.</div>}
                      </div>
                      <div>
                        <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>Call Assessment Logs ({voiceCalls.length})</div>
                        <div style={{ maxHeight: "100px", overflowY: "auto" }}>
                          {voiceCalls.length === 0 && <div style={{ fontSize: "10px", color: "#334155" }}>No calls yet.</div>}
                          {voiceCalls.map((c: any) => (
                            <div key={c.id} style={{ fontSize: "10px", padding: "5px 8px", background: "#0d1527", borderRadius: "5px", marginBottom: "4px", borderLeft: `3px solid ${c.status === "completed" ? "#10b981" : "#fbbf24"}` }}>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span>📞 +91-{c.phone}</span>
                                <span style={{ color: c.status === "completed" ? "#10b981" : "#fbbf24" }}>{c.status.toUpperCase()}</span>
                              </div>
                              <div style={{ color: "#64748b", marginTop: "2px" }}>Status: {c.safety_status.toUpperCase()}{c.digits ? ` · Key ${c.digits}` : ""}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* RESPONDER TAB */}
                  {sidebarTab === "responder" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
                      <div>
                        <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>Name</label>
                        <input id="responder-name" value={rName} onChange={e => setRName(e.target.value)} placeholder="e.g. Ravi Kumar"
                          style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", background: "#0d1527", border: "1px solid #334155", color: "#f8fafc", fontSize: "12px" }} />
                      </div>
                      <div>
                        <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>WhatsApp Number</label>
                        <input id="responder-phone" value={rPhone} onChange={e => setRPhone(e.target.value)} placeholder="e.g. 6304589007"
                          style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", background: "#0d1527", border: "1px solid #334155", color: "#f8fafc", fontSize: "12px" }} />
                      </div>
                      <div>
                        <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>Asset Types</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                          {["ambulance", "fire_truck", "rescue_team", "ndrf_unit", "police"].map(t => (
                            <button key={t} onClick={() => setRAssets(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])}
                              style={{ padding: "3px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 700, border: "1px solid", borderColor: rAssets.includes(t) ? "#3b82f6" : "#334155", background: rAssets.includes(t) ? "#1d4ed822" : "transparent", color: rAssets.includes(t) ? "#60a5fa" : "#64748b", cursor: "pointer" }}>
                              {t.replace(/_/g, " ").toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", gridColumn: "1 / -1" }}>
                        <div>
                          <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>District</label>
                          <select value={rDistrict} onChange={e => setRDistrict(e.target.value)}
                            style={{ padding: "7px 10px", borderRadius: "6px", background: "#0d1527", border: "1px solid #334155", color: "#f8fafc", fontSize: "12px" }}>
                            {["Hyderabad", "Rangareddy", "Warangal", "Karimnagar", "Nizamabad", "Khammam", "Nalgonda"].map(d => <option key={d}>{d}</option>)}
                          </select>
                        </div>
                        <button id="register-responder-btn" onClick={registerResponder} disabled={rStatus === "loading"}
                          style={{ ...btn(rStatus === "success" ? "#065f46" : "#1d4ed8"), padding: "8px 20px", fontSize: "12px", borderRadius: "6px" }}>
                          {rStatus === "loading" ? "Registering..." : rStatus === "success" ? "✅ Registered!" : "📲 Register for Alerts"}
                        </button>
                        {rMsg && <div style={{ fontSize: "10px", color: rStatus === "success" ? "#34d399" : "#fca5a5", flex: 1 }}>{rMsg}</div>}
                      </div>
                      {notifsSent.length > 0 && (
                        <div style={{ gridColumn: "1 / -1" }}>
                          <div style={{ fontSize: "10px", color: "#34d399", fontWeight: 700, marginBottom: "5px" }}>📨 {notifsSent.length} DISPATCH ALERT(S) SENT VIA WHATSAPP</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* WHAT-IF TAB */}
                  {sidebarTab === "whatif" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", alignItems: "start" }}>
                      <div>
                        <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "6px", fontWeight: 600 }}>Flood Peak Surge Intensity</label>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => setWFlood(0)} style={{ flex: 1, padding: "7px", borderRadius: "5px", border: "1px solid #334155", background: wFlood === 0 ? "#1e293b" : "transparent", color: wFlood === 0 ? "#60a5fa" : "#64748b", cursor: "pointer", fontSize: "11px" }}>Normal</button>
                          <button onClick={() => setWFlood(1)} style={{ flex: 1, padding: "7px", borderRadius: "5px", border: "1px solid #334155", background: wFlood === 1 ? "#ef444422" : "transparent", color: wFlood === 1 ? "#ef4444" : "#64748b", cursor: "pointer", fontSize: "11px" }}>Critical (+1)</button>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div>
                          <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Gandhi Hospital Full</label>
                          <input type="checkbox" checked={wHospFull} onChange={e => setWHospFull(e.target.checked)} style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#3b82f6" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Severe Weather Delay</label>
                          <input type="checkbox" checked={wWeather} onChange={e => setWWeather(e.target.checked)} style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#3b82f6" }} />
                        </div>
                      </div>
                      <div style={{ fontSize: "10px", color: "#475569", lineHeight: "1.5" }}>
                        💡 Changing parameters automatically modifies resource allocations, ETAs, and hospital routing when the simulation pipeline runs.
                        {mode === "LIVE" && <span style={{ display: "block", marginTop: "4px", color: "#ef444499" }}>⚠ Disabled in LIVE mode.</span>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── BOTTOM ACTION BAR ── */}
              <div style={{ background: "#080d1a", borderTop: "1px solid #1e293b", padding: "8px 16px", display: "flex", gap: "8px", flexShrink: 0 }}>
                {[
                  { label: "Dispatch All Units", icon: "🚒", bg: "#ef4444" },
                  { label: "Send Public Alert", icon: "📢", bg: "#1d4ed8" },
                  { label: "Notify Hospitals", icon: "🏥", bg: "#0f766e" },
                  { label: "Call SDRF / NDRF", icon: "📞", bg: "#9333ea" },
                  { label: "Generate Report", icon: "📋", bg: "#b45309" },
                  { label: "Share Update", icon: "📡", bg: "#0e7490" },
                ].map(a => (
                  <button key={a.label} style={{ ...btn(a.bg), flex: 1, padding: "8px 6px", fontSize: "11px", borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}
                    onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.15)")}
                    onMouseLeave={e => (e.currentTarget.style.filter = "none")}>
                    <span>{a.icon}</span> {a.label}
                  </button>
                ))}
              </div>
            </main>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          CITIZEN APP VIEW
      ════════════════════════════════════════════════════════════════════════ */}
      {view === "citizen" && (
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", minHeight: "calc(100vh - 49px)", background: "#060a13", padding: "24px", gap: "40px" }}>
          {/* Phone Frame */}
          <div className="phone-frame">
            <div className="phone-notch" />
            <div className="phone-screen" style={{ display: "flex", flexDirection: "column" }}>
              {/* Status bar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "28px 18px 4px", background: "transparent", flexShrink: 0, zIndex: 10 }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#f8fafc" }}>{now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", color: "#f8fafc" }}>▲▲▲</span>
                  <span style={{ fontSize: "10px", color: "#f8fafc" }}>WiFi</span>
                  <span style={{ fontSize: "10px", color: "#f8fafc" }}>88%🔋</span>
                </div>
              </div>

              {/* ── SCREEN: LOGIN ── */}
              {cScreen === "login" && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
                  {/* BG image effect */}
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,#0a1628 0%,#0d1f3c 40%,#0a1220 100%)" }} />
                  <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 30% 50%, rgba(59,130,246,0.08) 0%, transparent 60%), radial-gradient(circle at 70% 20%, rgba(239,68,68,0.06) 0%, transparent 50%)" }} />
                  <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", padding: "20px 20px 30px", overflow: "auto" }}>
                    {/* Logo */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "28px", marginTop: "10px" }}>
                      <div style={{ width: "70px", height: "70px", borderRadius: "50%", background: "linear-gradient(135deg,#1d4ed8,#ef4444)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", marginBottom: "10px", boxShadow: "0 0 25px rgba(59,130,246,0.4)" }}>🛡️</div>
                      <div style={{ fontSize: "20px", fontWeight: 800, color: "#f8fafc" }}>RescueNet AI</div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>AI-Powered Emergency Response</div>
                    </div>
                    {/* High Risk Banner */}
                    <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: "8px", padding: "8px 12px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className="anim-blink" style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#ef4444" }}>Current Risk Level</span>
                      </div>
                      <span style={{ fontSize: "12px", fontWeight: 900, color: "#ef4444" }}>HIGH RISK</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", marginBottom: "16px" }}>📍 Hyderabad, Telangana</div>
                    {/* Phone input */}
                    <div style={{ marginBottom: "10px" }}>
                      <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>Enter your mobile number</label>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <div style={{ background: "#0d1527", border: "1px solid #334155", borderRadius: "8px", padding: "10px 10px", fontSize: "13px", color: "#94a3b8", flexShrink: 0 }}>+91</div>
                        <input value={cPhone.replace("+91 ", "")} onChange={e => setCPhone("+91 " + e.target.value)}
                          style={{ flex: 1, background: "#0d1527", border: "1px solid #334155", borderRadius: "8px", padding: "10px 12px", color: "#f8fafc", fontSize: "13px" }} placeholder="98765 43210" />
                      </div>
                    </div>
                    {!cOtp ? (
                      <button onClick={() => setCOtp(true)} style={{ ...btn("linear-gradient(135deg,#1d4ed8,#3b82f6)"), width: "100%", padding: "13px", fontSize: "14px", borderRadius: "10px", marginBottom: "10px" }}>
                        Send OTP
                      </button>
                    ) : (
                      <div style={{ marginBottom: "10px" }}>
                        <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>Enter OTP</label>
                        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                          {[...Array(6)].map((_, i) => (
                            <input key={i} maxLength={1} style={{ flex: 1, background: "#0d1527", border: "1px solid #334155", borderRadius: "8px", padding: "10px 0", color: "#f8fafc", fontSize: "16px", textAlign: "center", fontWeight: 700 }} defaultValue={i < 4 ? ["5", "8", "2", "1"][i] : ""} />
                          ))}
                        </div>
                        <button onClick={() => { setCLoggedIn(true); setCScreen("home"); }} style={{ ...btn("linear-gradient(135deg,#1d4ed8,#3b82f6)"), width: "100%", padding: "13px", fontSize: "14px", borderRadius: "10px" }}>
                          Verify & Login
                        </button>
                      </div>
                    )}
                    <button onClick={() => { setCLoggedIn(true); setCScreen("home"); }} style={{ ...btn("transparent"), width: "100%", padding: "10px", fontSize: "13px", borderRadius: "10px", color: "#ef4444", border: "1px solid rgba(239,68,68,0.4)" }}>
                      ⚡ Emergency Login
                    </button>
                    <div style={{ fontSize: "9px", color: "#334155", textAlign: "center", marginTop: "12px" }}>By continuing, you agree to our Terms & Privacy Policy</div>
                  </div>
                </div>
              )}

              {/* ── SCREEN: HOME ── */}
              {cScreen === "home" && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  {/* Header */}
                  <div style={{ padding: "8px 16px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc" }}>Home</div>
                    <span style={{ fontSize: "18px" }}>🔔</span>
                  </div>
                  <div style={{ padding: "0 16px 8px", display: "flex", gap: "6px", flexShrink: 0, alignItems: "center" }}>
                    <span className="anim-blink" style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                    <span style={{ fontSize: "11px", color: "#10b981", fontWeight: 700 }}>Live</span>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>📍 Hyderabad, Telangana</span>
                  </div>
                  {/* Risk alert banner */}
                  <div style={{ margin: "0 14px 10px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: "8px", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "10px", color: "#ef4444", fontWeight: 700 }}>Current Risk Level</div>
                      <div style={{ fontSize: "16px", fontWeight: 900, color: "#ef4444" }}>HIGH RISK</div>
                    </div>
                    <span style={{ fontSize: "24px" }}>⚠️</span>
                  </div>
                  {/* Mini map */}
                  <div style={{ margin: "0 14px 10px", height: "100px", background: "linear-gradient(135deg,#0a1628,#0d2040)", borderRadius: "10px", overflow: "hidden", position: "relative", border: "1px solid #1e293b" }}>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "rgba(239,68,68,0.25)", border: "2px solid #ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>🔥</div>
                    </div>
                    <div style={{ position: "absolute", top: "6px", right: "8px", fontSize: "9px", color: "#64748b" }}>Live Risk Map 🔍</div>
                    {/* Dots */}
                    {[{ x: "20%", y: "40%", c: "#3b82f6" }, { x: "65%", y: "55%", c: "#f97316" }, { x: "80%", y: "30%", c: "#ef4444" }].map((d, i) => (
                      <div key={i} style={{ position: "absolute", left: d.x, top: d.y, width: "8px", height: "8px", borderRadius: "50%", background: d.c, boxShadow: `0 0 6px ${d.c}` }} />
                    ))}
                  </div>
                  {/* Active alerts */}
                  <div style={{ padding: "0 14px", marginBottom: "8px", flexShrink: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#f8fafc" }}>Active Alerts</div>
                      <span style={{ fontSize: "11px", color: "#3b82f6" }}>View All</span>
                    </div>
                    {incidents.slice(0, 2).map(inc => (
                      <div key={inc.id} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#0d1527", border: "1px solid #1e293b", borderRadius: "8px", padding: "8px", marginBottom: "5px" }}>
                        <span style={{ fontSize: "18px" }}>{INC_ICON[inc.type] || "⚠️"}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#f8fafc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inc.title}</div>
                          <div style={{ fontSize: "10px", color: "#64748b" }}>2.4 km from you · <span style={{ color: SEV_COLOR[inc.severity] }}>{SEV_LABEL[inc.severity]}</span></div>
                        </div>
                        <span style={{ fontSize: "10px", color: "#475569" }}>10 min ago</span>
                      </div>
                    ))}
                  </div>
                  {/* Quick Actions grid */}
                  <div style={{ padding: "0 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                    {[
                      { label: "Report Incident", icon: "📸", color: "#ef4444", screen: "report" as const },
                      { label: "Nearby Help", icon: "🏥", color: "#3b82f6", screen: "help" as const },
                      { label: "Emergency Call", icon: "📞", color: "#10b981", screen: "home" as const },
                      { label: "Safe Check-in", icon: "✅", color: "#a855f7", screen: "home" as const },
                    ].map(a => (
                      <button key={a.label} onClick={() => a.screen !== "home" && setCScreen(a.screen)}
                        style={{ background: `${a.color}18`, border: `1px solid ${a.color}33`, borderRadius: "10px", padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                        <span style={{ fontSize: "22px" }}>{a.icon}</span>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#f8fafc" }}>{a.label}</span>
                      </button>
                    ))}
                  </div>
                  {/* Bottom Nav */}
                  <div style={{ marginTop: "auto", borderTop: "1px solid #1e293b", display: "flex", padding: "8px 0 20px", background: "#080d1a", flexShrink: 0 }}>
                    {[{ icon: "🏠", label: "Home", id: "home" }, { icon: "🔔", label: "Alerts", id: "alerts" }, { label: "SOS", id: "sos", sos: true }, { icon: "📊", label: "Status", id: "status" }, { icon: "👤", label: "Profile", id: "profile" }].map(n => (
                      <button key={n.id} onClick={() => { if (n.id === "alerts") setCScreen("help"); }} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", border: "none", background: "transparent", cursor: "pointer" }}>
                        {n.sos ? (
                          <div className="sos-btn" style={{ width: "40px", height: "40px", fontSize: "11px" }}>SOS</div>
                        ) : (
                          <>
                            <span style={{ fontSize: "18px" }}>{n.icon}</span>
                            <span style={{ fontSize: "9px", color: cNavTab === n.id ? "#3b82f6" : "#475569" }}>{n.label}</span>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SCREEN: NEARBY HELP ── */}
              {cScreen === "help" && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid #1e293b", flexShrink: 0 }}>
                    <button onClick={() => setCScreen("home")} style={{ background: "none", border: "none", color: "#3b82f6", fontSize: "18px", cursor: "pointer" }}>←</button>
                    <span style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc" }}>Nearby Help</span>
                  </div>
                  <div style={{ padding: "8px 14px", flexShrink: 0 }}>
                    <div style={{ background: "#0d1527", border: "1px solid #1e293b", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "12px" }}>📍</span>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>Hyderabad, Telangana</span>
                      <span style={{ fontSize: "13px", marginLeft: "auto", color: "#3b82f6" }}>🎯</span>
                    </div>
                  </div>
                  {/* Tabs */}
                  <div style={{ display: "flex", padding: "0 14px 8px", gap: "6px", flexShrink: 0 }}>
                    {(["hospitals", "fire", "police", "ambulance"] as const).map(t => (
                      <button key={t} onClick={() => setHelpTab(t)} style={{ flex: 1, padding: "6px 4px", borderRadius: "7px", border: "none", fontSize: "10px", fontWeight: 700, cursor: "pointer", background: helpTab === t ? "#3b82f6" : "#0d1527", color: helpTab === t ? "#fff" : "#64748b" }}>
                        {t === "hospitals" ? "Hospitals" : t === "fire" ? "Fire Stn." : t === "police" ? "Police" : "Ambulance"}
                      </button>
                    ))}
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: "0 14px 10px" }}>
                    {helpItems.map((item: any, i: number) => (
                      <div key={i} style={{ background: "#0d1527", border: "1px solid #1e293b", borderRadius: "10px", padding: "12px", marginBottom: "8px" }}>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <div style={{ width: "44px", height: "44px", borderRadius: "8px", background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>
                            {helpTab === "hospitals" ? "🏥" : helpTab === "fire" ? "🚒" : helpTab === "police" ? "🚔" : "🚑"}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc", marginBottom: "2px" }}>{item.name}</div>
                            <div style={{ fontSize: "10px", color: "#64748b" }}>{item.district || "Hyderabad"}</div>
                            {item.beds && <div style={{ fontSize: "10px", color: "#64748b" }}>Beds Available: {item.beds}</div>}
                            {item.capacity && !item.beds && <div style={{ fontSize: "10px", color: "#64748b" }}>{item.capacity}</div>}
                            <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>📞 {item.phone}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "13px", fontWeight: 800, color: "#3b82f6", marginBottom: "6px" }}>{item.distance}</div>
                            <button style={{ ...btn("#3b82f6"), padding: "5px 10px", fontSize: "10px", borderRadius: "6px" }}>Directions</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Bottom Nav */}
                  <div style={{ borderTop: "1px solid #1e293b", display: "flex", padding: "8px 0 20px", background: "#080d1a", flexShrink: 0 }}>
                    {[{ icon: "🏠", label: "Home" }, { icon: "🔔", label: "Alerts" }, { label: "SOS", sos: true }, { icon: "📊", label: "Status" }, { icon: "👤", label: "Profile" }].map((n, i) => (
                      <button key={i} onClick={() => n.label === "Home" && setCScreen("home")} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", border: "none", background: "transparent", cursor: "pointer" }}>
                        {n.sos ? <div className="sos-btn" style={{ width: "40px", height: "40px", fontSize: "11px" }}>SOS</div> : <><span style={{ fontSize: "18px" }}>{n.icon}</span><span style={{ fontSize: "9px", color: "#475569" }}>{n.label}</span></>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SCREEN: REPORT INCIDENT ── */}
              {cScreen === "report" && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid #1e293b", flexShrink: 0 }}>
                    <button onClick={() => setCScreen("home")} style={{ background: "none", border: "none", color: "#3b82f6", fontSize: "18px", cursor: "pointer" }}>←</button>
                    <span style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc" }}>Report Incident</span>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
                    {/* Media upload */}
                    <div onClick={() => setShowUpload(p => !p)} style={{ background: "#0d1527", border: `2px dashed ${showUpload ? "#3b82f6" : "#334155"}`, borderRadius: "12px", padding: "20px", textAlign: "center", cursor: "pointer", marginBottom: "12px", transition: "all 0.2s" }}>
                      <div style={{ fontSize: "28px", marginBottom: "6px" }}>📷</div>
                      <div style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 600 }}>Tap to upload photo / video</div>
                      <div style={{ fontSize: "11px", color: "#475569" }}>or drag and drop</div>
                      {showUpload && <div style={{ fontSize: "11px", color: "#3b82f6", marginTop: "6px" }}>✓ Media attached</div>}
                    </div>
                    {/* Incident type */}
                    <div style={{ marginBottom: "10px" }}>
                      <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>Incident Type</label>
                      <select value={rptType} onChange={e => setRptType(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "#0d1527", border: "1px solid #334155", color: "#f8fafc", fontSize: "13px" }}>
                        {["flood", "fire", "collapse", "earthquake", "cyclone", "landslide", "other"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    {/* Severity */}
                    <div style={{ marginBottom: "10px" }}>
                      <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "6px" }}>Severity</label>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {(["low", "medium", "high", "critical"] as const).map(s => {
                          const cs: Record<string, string> = { low: "#10b981", medium: "#fbbf24", high: "#f97316", critical: "#ef4444" };
                          return (
                            <button key={s} onClick={() => setRptSev(s)} style={{ flex: 1, padding: "8px 4px", borderRadius: "7px", border: `1px solid ${rptSev === s ? cs[s] : "#334155"}`, background: rptSev === s ? cs[s] + "33" : "transparent", color: rptSev === s ? cs[s] : "#64748b", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {/* Description */}
                    <div style={{ marginBottom: "10px" }}>
                      <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>Description</label>
                      <textarea value={rptDesc} onChange={e => setRptDesc(e.target.value)} rows={3} placeholder="Describe what is happening..."
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0d1527", border: "1px solid #334155", color: "#f8fafc", fontSize: "12px", resize: "none" }} />
                    </div>
                    {/* Location */}
                    <div style={{ background: "#0d1527", border: "1px solid #1e293b", borderRadius: "8px", padding: "10px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "16px" }}>📍</span>
                      <div>
                        <div style={{ fontSize: "12px", color: "#f8fafc" }}>Use my current location</div>
                        <div style={{ fontSize: "10px", color: "#64748b" }}>Hyderabad, Telangana</div>
                      </div>
                      <span style={{ marginLeft: "auto", fontSize: "16px", color: "#3b82f6" }}>🎯</span>
                    </div>
                    {/* Submit */}
                    <button onClick={submitCitizenReport} disabled={submitting} style={{ ...btn("linear-gradient(135deg,#ef4444,#b91c1c)"), width: "100%", padding: "14px", fontSize: "14px", fontWeight: 800, borderRadius: "10px", letterSpacing: "0.5px", boxShadow: "0 0 20px rgba(239,68,68,0.3)" }}>
                      {submitting ? "⏳ Submitting Report..." : "📤 Submit Report"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── SCREEN: REPORT SUBMITTED ── */}
              {cScreen === "success" && submitted && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#0a0f1e", position: "relative" }}>
                  {/* Confetti */}
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="confetti-piece" style={{
                      left: `${5 + i * 8}%`, top: "-20px",
                      background: ["#3b82f6","#ef4444","#10b981","#fbbf24","#a855f7"][i % 5],
                      width: `${6 + (i % 3) * 3}px`, height: `${10 + (i % 4) * 4}px`,
                      animationDuration: `${2 + i * 0.3}s`,
                      animationDelay: `${i * 0.15}s`,
                    }} />
                  ))}
                  <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px" }}>
                    {/* Back button */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                      <button onClick={() => { setCScreen("home"); setRptDesc(""); }} style={{ background: "none", border: "none", color: "#3b82f6", fontSize: "18px", cursor: "pointer" }}>←</button>
                      <span style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc" }}>Report Submitted</span>
                    </div>
                    {/* Success check */}
                    <div style={{ textAlign: "center", marginBottom: "18px" }}>
                      <div style={{ width: "70px", height: "70px", borderRadius: "50%", background: "rgba(16,185,129,0.15)", border: "3px solid #10b981", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: "30px" }}>✅</div>
                      <div style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", marginBottom: "4px" }}>Thank You!</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>Your report has been sent to the RescueNet Command Center</div>
                    </div>
                    {/* AI Analysis */}
                    {submitted.plan && (
                      <div style={{ background: "#0d1527", border: "1px solid #1e293b", borderRadius: "12px", padding: "14px", marginBottom: "12px" }}>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#3b82f6", marginBottom: "10px" }}>AI Analysis Result</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                          <div style={{ background: "#111827", borderRadius: "8px", padding: "8px" }}>
                            <div style={{ fontSize: "10px", color: "#64748b" }}>Disaster Type</div>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <span style={{ fontSize: "18px" }}>{INC_ICON[submitted.type] || "🚨"}</span>
                              <span style={{ fontSize: "12px", fontWeight: 700, color: "#f8fafc" }}>{submitted.type.charAt(0).toUpperCase() + submitted.type.slice(1)}</span>
                            </div>
                          </div>
                          <div style={{ background: "#111827", borderRadius: "8px", padding: "8px" }}>
                            <div style={{ fontSize: "10px", color: "#64748b" }}>Severity Score</div>
                            <div style={{ fontSize: "16px", fontWeight: 800, color: SEV_COLOR[submitted.plan.severity] ?? "#fbbf24" }}>{submitted.plan.severity}.0 / 10</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#111827", borderRadius: "8px", padding: "8px" }}>
                          <div>
                            <div style={{ fontSize: "10px", color: "#64748b" }}>AI Confidence</div>
                            <div style={{ fontSize: "18px", fontWeight: 800, color: "#3b82f6" }}>{Math.floor((submitted.plan.confidence_score ?? 0.92) * 100)}%</div>
                          </div>
                          {/* Mini gauge */}
                          <div style={{ position: "relative", width: "50px", height: "50px" }}>
                            <svg viewBox="0 0 50 50" style={{ transform: "rotate(-90deg)" }}>
                              <circle cx="25" cy="25" r="20" fill="none" stroke="#1e293b" strokeWidth="5" />
                              <circle cx="25" cy="25" r="20" fill="none" stroke="#3b82f6" strokeWidth="5"
                                strokeDasharray={`${(submitted.plan.confidence_score ?? 0.92) * 125} 125`} strokeLinecap="round" />
                            </svg>
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 800, color: "#3b82f6" }}>
                              {Math.floor((submitted.plan.confidence_score ?? 0.92) * 100)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Nearest Support */}
                    <div style={{ background: "#0d1527", border: "1px solid #1e293b", borderRadius: "12px", padding: "14px", marginBottom: "12px" }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", marginBottom: "10px" }}>Nearest Support</div>
                      {[
                        { name: "NDRF Unit", dist: "2.1 km", eta: "12 min", icon: "🪖", color: "#3b82f6" },
                        { name: "Ambulance", dist: "2.8 km", eta: "8 min", icon: "🚑", color: "#10b981" },
                      ].map(s => (
                        <div key={s.name} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", background: "#111827", borderRadius: "8px", padding: "8px" }}>
                          <span style={{ fontSize: "20px" }}>{s.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "12px", fontWeight: 700, color: "#f8fafc" }}>{s.name}</div>
                            <div style={{ fontSize: "10px", color: "#64748b" }}>{s.dist}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "12px", color: s.color, fontWeight: 700 }}>ETA: {s.eta}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Track Status */}
                    <button onClick={() => setCScreen("home")} style={{ ...btn("linear-gradient(135deg,#1d4ed8,#3b82f6)"), width: "100%", padding: "13px", fontSize: "13px", borderRadius: "10px", marginBottom: "6px" }}>
                      📡 Track Status
                    </button>
                    <button onClick={() => { setCScreen("home"); setRptDesc(""); }} style={{ ...btn("transparent"), width: "100%", padding: "10px", fontSize: "12px", borderRadius: "10px", color: "#64748b", border: "1px solid #1e293b" }}>
                      Back to Home
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="phone-home-indicator" />
          </div>

          {/* Side info panel next to phone */}
          <div style={{ maxWidth: "320px", display: "flex", flexDirection: "column", gap: "14px", paddingTop: "8px" }}>
            <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: "12px", padding: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: 800, color: "#f8fafc", marginBottom: "8px" }}>📱 Citizen App Guide</div>
              <div style={{ fontSize: "11px", color: "#64748b", lineHeight: "1.6" }}>
                This is a pixel-perfect simulation of the RescueNet AI citizen-facing mobile app. Navigate through all screens using the phone interface on the left.
              </div>
              <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                {[
                  { step: "1", label: "Login / Sign Up", desc: "OTP-based mobile login" },
                  { step: "2", label: "Home", desc: "Risk level, alerts, quick actions" },
                  { step: "3", label: "Nearby Help", desc: "Hospitals, Fire, Police, Ambulance" },
                  { step: "4", label: "Report Incident", desc: "Photo upload, type, severity, GPS" },
                  { step: "5", label: "Report Submitted", desc: "AI analysis + nearest support ETAs" },
                ].map(s => (
                  <div key={s.step} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <span style={{ background: "#1d4ed8", color: "#fff", width: "18px", height: "18px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 800, flexShrink: 0 }}>{s.step}</span>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#f8fafc" }}>{s.label}</div>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Navigation shortcuts */}
            <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: "12px", padding: "16px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Quick Navigate</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                {[
                  { label: "Login Screen", screen: "login" as const, icon: "🔐" },
                  { label: "Home Screen", screen: "home" as const, icon: "🏠" },
                  { label: "Nearby Help", screen: "help" as const, icon: "🏥" },
                  { label: "Report Incident", screen: "report" as const, icon: "📸" },
                ].map(n => (
                  <button key={n.label} onClick={() => setCScreen(n.screen)}
                    style={{ background: cScreen === n.screen ? "#1d4ed820" : "#0d1527", border: `1px solid ${cScreen === n.screen ? "#3b82f6" : "#1e293b"}`, borderRadius: "7px", padding: "8px", color: cScreen === n.screen ? "#60a5fa" : "#64748b", fontSize: "11px", fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
                    {n.icon} {n.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Connection info */}
            <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: "12px", padding: "16px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Twilio Integration</div>
              <div style={{ fontSize: "11px", color: "#64748b", lineHeight: "1.6" }}>
                Reports submitted here are sent to the FastAPI backend in real-time. The backend runs the 10-agent CrewAI pipeline and dispatches WhatsApp alerts to registered responders via Twilio.
              </div>
              <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: apiStatus === "online" ? "#10b981" : "#ef4444", display: "inline-block" }} />
                <span style={{ fontSize: "11px", color: apiStatus === "online" ? "#10b981" : "#ef4444" }}>{apiStatus === "online" ? "Backend Connected" : "Backend Offline"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
