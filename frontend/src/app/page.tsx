"use client";

/**
 * RescueNet AI — Dashboard Page
 * Schema-corrected to match FastAPI RescuePlan response exactly.
 *
 * Fixed fields (2026-06-20):
 *   survivor_estimate    → estimated_survivors
 *   resources            → recommended_resources
 *   alert_messages       → alert_actions
 *
 * All RescuePlan fields are now rendered with graceful null handling.
 */

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Typed interfaces matching backend schemas.py exactly ──────────────────

type Incident = {
  id: string;
  title: string;
  type: string;
  location: string;
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

// Matches backend RescuePlan Pydantic model exactly
type RescuePlan = {
  priority: string;
  severity: number;
  affected_area: string;
  estimated_survivors: number;       // ← was: survivor_estimate (FIXED)
  survivor_probability: number;
  priority_score: number;
  confidence_score: number;
  medical_priority: string;
  dispatch_urgency: string;
  recommended_hospital: string;
  recommended_resources: ResourceDispatch[]; // ← was: resources (FIXED)
  hospitals: HospitalRouting[];
  alert_actions: AlertActions;       // ← was: alert_messages (FIXED)
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

// ─── Constants ──────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<number, string> = {
  1: "#22c55e",
  2: "#86efac",
  3: "#facc15",
  4: "#fb923c",
  5: "#ef4444",
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
  P2: "#fb923c",
  P3: "#facc15",
  P4: "#86efac",
  P5: "#22c55e",
};

const MEDICAL_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#fb923c",
  medium: "#facc15",
  low: "#22c55e",
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

// ─── Helper components ───────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: "11px", fontWeight: 700, color: "#475569",
      textTransform: "uppercase", letterSpacing: "1.5px",
      marginBottom: "8px", marginTop: "20px",
      paddingBottom: "4px", borderBottom: "1px solid #1e2d4a",
    }}>
      {children}
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: "12px", fontWeight: 700, padding: "4px 10px",
      borderRadius: "6px",
      background: color + "22", color, border: `1px solid ${color}44`,
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [apiStatus, setApiStatus] = useState<"loading" | "online" | "offline">("loading");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [response, setResponse] = useState<AgentExecuteResponse | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"plan" | "agents">("plan");

  // Check API health on mount
  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((r) => r.json())
      .then(() => setApiStatus("online"))
      .catch(() => setApiStatus("offline"));
  }, []);

  // Load incidents list
  useEffect(() => {
    if (apiStatus !== "online") return;
    fetch(`${API_URL}/api/v1/incidents?limit=20`)
      .then((r) => r.json())
      .then((data) => setIncidents(data.incidents || []))
      .catch(() => {});
  }, [apiStatus]);

  // Run agent pipeline for selected incident
  async function runAgents(incidentId: string) {
    setPlanLoading(true);
    setResponse(null);
    setApiError(null);
    setActiveTab("plan");
    try {
      const res = await fetch(`${API_URL}/api/v1/agents/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_id: incidentId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setApiError(`API error ${res.status}: ${err?.detail ?? res.statusText}`);
        return;
      }
      const data: AgentExecuteResponse = await res.json();
      setResponse(data);
    } catch (e) {
      setApiError("Network error — Is the backend running on " + API_URL + "?");
      console.error(e);
    } finally {
      setPlanLoading(false);
    }
  }

  const plan = response?.rescue_plan ?? null;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#e2e8f0", fontFamily: "system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <header style={{
        background: "#0d1426", borderBottom: "1px solid #1e2d4a",
        padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "22px" }}>🚨</span>
          <div>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#f1f5f9", letterSpacing: "0.5px" }}>
              RescueNet AI
            </h1>
            <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>
              Multi-Agent Disaster Response Command Center
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{
              width: "8px", height: "8px", borderRadius: "50%", display: "inline-block",
              background: apiStatus === "online" ? "#22c55e" : apiStatus === "offline" ? "#ef4444" : "#facc15",
            }} />
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              {apiStatus === "loading" ? "Connecting…" : apiStatus === "online" ? "API Online" : "API Offline"}
            </span>
          </div>
          <a
            href={`${API_URL}/docs`}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: "12px", color: "#3b82f6", textDecoration: "none" }}
          >
            /docs ↗
          </a>
        </div>
      </header>

      {/* ── Offline banner ── */}
      {apiStatus === "offline" && (
        <div style={{ background: "#7f1d1d", color: "#fca5a5", padding: "10px 32px", fontSize: "13px" }}>
          ⚠️ Backend API is offline. Start it with:{" "}
          <code style={{ background: "#450a0a", padding: "2px 6px", borderRadius: "4px" }}>
            python -m uvicorn app.main:app --port 8000
          </code>
        </div>
      )}

      <main style={{ padding: "28px 32px", maxWidth: "1500px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "28px", alignItems: "start" }}>

          {/* ── Left: Incident List ── */}
          <div>
            <div style={{
              fontSize: "11px", fontWeight: 700, color: "#475569",
              textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "12px",
            }}>
              Active Incidents ({incidents.length})
            </div>

            {incidents.length === 0 && apiStatus === "online" && (
              <div style={{ color: "#64748b", padding: "24px", textAlign: "center", border: "1px dashed #1e293b", borderRadius: "8px", fontSize: "13px" }}>
                No incidents found.
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  id={`incident-card-${inc.id}`}
                  onClick={() => { setSelected(inc); setResponse(null); setApiError(null); setActiveTab("plan"); }}
                  style={{
                    background: selected?.id === inc.id ? "#0f2044" : "#0d1426",
                    border: `1px solid ${selected?.id === inc.id ? "#3b82f6" : "#1e2d4a"}`,
                    borderRadius: "10px", padding: "14px", cursor: "pointer",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "#f1f5f9", lineHeight: 1.3 }}>
                      {inc.title}
                    </span>
                    <span style={{
                      fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "5px", marginLeft: "8px", flexShrink: 0,
                      background: (SEVERITY_COLORS[inc.severity] ?? "#94a3b8") + "22",
                      color: SEVERITY_COLORS[inc.severity] ?? "#94a3b8",
                      border: `1px solid ${(SEVERITY_COLORS[inc.severity] ?? "#94a3b8")}44`,
                    }}>
                      {SEVERITY_LABELS[inc.severity] ?? `S${inc.severity}`}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    📍 {inc.location ?? "Unknown"}&nbsp;•&nbsp;
                    🏷️ {(inc.type ?? "?").toUpperCase()}&nbsp;•&nbsp;
                    🔵 {inc.status ?? "?"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Command Panel ── */}
          <div>

            {/* Empty state */}
            {!selected && (
              <div style={{
                color: "#475569", padding: "60px 24px", textAlign: "center",
                border: "1px dashed #1e293b", borderRadius: "12px", fontSize: "14px",
              }}>
                ← Select an incident to run the AI rescue pipeline
              </div>
            )}

            {selected && (
              <div style={{ background: "#0d1426", border: "1px solid #1e2d4a", borderRadius: "12px", padding: "24px" }}>

                {/* Incident title */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "17px", fontWeight: 700, color: "#f1f5f9", marginBottom: "4px" }}>
                    {selected.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "#475569" }}>
                    ID: {selected.id} &nbsp;·&nbsp; {selected.location}
                  </div>
                </div>

                {/* Run pipeline button */}
                <button
                  id="run-agents-btn"
                  onClick={() => runAgents(selected.id)}
                  disabled={planLoading}
                  style={{
                    width: "100%", padding: "11px", borderRadius: "8px", border: "none",
                    background: planLoading ? "#1e3a5f" : "#1d4ed8", color: "#fff",
                    fontSize: "14px", fontWeight: 600,
                    cursor: planLoading ? "not-allowed" : "pointer",
                    marginBottom: "20px", transition: "background 0.15s",
                  }}
                >
                  {planLoading ? "⚙️  Running 10 AI Agents…" : "🤖  Run Rescue Pipeline"}
                </button>

                {/* API error */}
                {apiError && (
                  <div style={{
                    color: "#fca5a5", background: "#7f1d1d", padding: "12px",
                    borderRadius: "6px", fontSize: "13px", marginBottom: "16px",
                  }}>
                    ❌ {apiError}
                  </div>
                )}

                {/* Rescue plan display */}
                {plan && (
                  <>
                    {/* ── Tab bar ── */}
                    <div style={{ display: "flex", gap: "4px", marginBottom: "16px" }}>
                      {(["plan", "agents"] as const).map((tab) => (
                        <button
                          key={tab}
                          id={`tab-${tab}`}
                          onClick={() => setActiveTab(tab)}
                          style={{
                            padding: "6px 16px", borderRadius: "6px", border: "none",
                            fontSize: "12px", fontWeight: 600, cursor: "pointer",
                            background: activeTab === tab ? "#1d4ed8" : "#0a0f1e",
                            color: activeTab === tab ? "#fff" : "#64748b",
                          }}
                        >
                          {tab === "plan" ? "🗂 Rescue Plan" : `🤖 Agent Log (${response?.agent_decisions?.length ?? 0})`}
                        </button>
                      ))}
                    </div>

                    {/* ── PLAN TAB ── */}
                    {activeTab === "plan" && (
                      <div id="rescue-plan-panel">

                        {/* ── Status badges row ── */}
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                          <Badge
                            label={`Priority ${plan.priority ?? "N/A"}`}
                            color={PRIORITY_COLORS[plan.priority] ?? "#94a3b8"}
                          />
                          <Badge
                            label={`Medical: ${(plan.medical_priority ?? "N/A").toUpperCase()}`}
                            color={MEDICAL_COLORS[plan.medical_priority] ?? "#94a3b8"}
                          />
                          <Badge
                            label={`Dispatch: ${(plan.dispatch_urgency ?? "N/A").toUpperCase()}`}
                            color="#3b82f6"
                          />
                          <Badge
                            label={`Severity ${plan.severity ?? "N/A"}/5`}
                            color={SEVERITY_COLORS[plan.severity] ?? "#94a3b8"}
                          />
                        </div>

                        {/* ── Key metrics grid ── */}
                        <SectionLabel>Situation Assessment</SectionLabel>
                        <div style={{
                          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                          gap: "10px", marginBottom: "4px",
                        }}>
                          {[
                            { label: "Estimated Survivors", value: (plan.estimated_survivors ?? "N/A").toString(), icon: "👥" },
                            { label: "Survivor Probability", value: plan.survivor_probability != null ? `${(plan.survivor_probability * 100).toFixed(0)}%` : "N/A", icon: "📈" },
                            { label: "Confidence Score", value: plan.confidence_score != null ? `${(plan.confidence_score * 100).toFixed(0)}%` : "N/A", icon: "🎯" },
                          ].map((m) => (
                            <div key={m.label} style={{
                              background: "#0a0f1e", border: "1px solid #1e2d4a",
                              borderRadius: "8px", padding: "12px",
                            }}>
                              <div style={{ fontSize: "18px", marginBottom: "4px" }}>{m.icon}</div>
                              <div style={{ fontSize: "18px", fontWeight: 700, color: "#f1f5f9" }}>{m.value}</div>
                              <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>{m.label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Affected area */}
                        <div style={{ fontSize: "12px", color: "#64748b", margin: "10px 0 4px" }}>
                          📍 Affected Area: <span style={{ color: "#94a3b8" }}>{plan.affected_area ?? "N/A"}</span>
                          &nbsp;·&nbsp; Priority Score: <span style={{ color: "#94a3b8" }}>{plan.priority_score ?? "N/A"}</span>
                        </div>

                        {/* ── Recommended hospital ── */}
                        <SectionLabel>Primary Hospital</SectionLabel>
                        <div style={{
                          background: "#0a0f1e", border: "1px solid #1e2d4a",
                          borderRadius: "8px", padding: "10px 14px",
                          fontSize: "13px", color: "#94a3b8", marginBottom: "4px",
                          display: "flex", alignItems: "center", gap: "8px",
                        }}>
                          <span>🏥</span>
                          <span style={{ fontWeight: 600, color: "#f1f5f9" }}>
                            {plan.recommended_hospital ?? "N/A"}
                          </span>
                        </div>

                        {/* Hospital routing table */}
                        {(plan.hospitals ?? []).length > 0 && (
                          <div style={{ marginTop: "6px" }}>
                            {(plan.hospitals ?? []).map((h, i) => (
                              <div key={i} style={{
                                display: "flex", justifyContent: "space-between",
                                padding: "6px 0", borderBottom: "1px solid #1e2d4a",
                                fontSize: "12px",
                              }}>
                                <span style={{ color: "#94a3b8" }}>{h.name ?? "N/A"}</span>
                                <span style={{ color: "#64748b" }}>
                                  {h.distance_km ?? "?"}km away &nbsp;·&nbsp;
                                  {h.available_beds ?? "?"} beds &nbsp;·&nbsp;
                                  <span style={{ color: "#fb923c" }}>{h.patient_routing ?? "?"} patients</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* ── Resources dispatched ── */}
                        <SectionLabel>Resources Dispatched</SectionLabel>
                        {(plan.recommended_resources ?? []).length === 0 ? (
                          <div style={{ fontSize: "13px", color: "#475569" }}>No resources listed.</div>
                        ) : (
                          <div id="resources-list">
                            {(plan.recommended_resources ?? []).map((r, i) => (
                              <div key={i} style={{
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                padding: "8px 0", borderBottom: "1px solid #1e2d4a", fontSize: "13px",
                              }}>
                                <span style={{ color: "#94a3b8" }}>
                                  {RESOURCE_ICONS[r.type] ?? "🔧"} {(r.type ?? "?").replace(/_/g, " ")}
                                </span>
                                <span>
                                  <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{r.count ?? "?"} units</span>
                                  <span style={{ color: "#475569" }}> · ETA </span>
                                  <span style={{ color: "#22c55e" }}>{r.eta_minutes ?? "?"}min</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* ── Risk warnings ── */}
                        {(plan.risk_warnings ?? []).length > 0 && (
                          <>
                            <SectionLabel>⚠️ Risk Warnings</SectionLabel>
                            <div id="risk-warnings-list">
                              {(plan.risk_warnings ?? []).map((w, i) => (
                                <div key={i} style={{
                                  background: "#431407", border: "1px solid #92400e",
                                  borderRadius: "6px", padding: "8px 12px",
                                  fontSize: "12px", color: "#fbbf24", marginBottom: "6px",
                                }}>
                                  ⚠️ {w}
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {/* ── Alert actions (FIXED: was alert_messages) ── */}
                        {plan.alert_actions && (
                          <>
                            <SectionLabel>📡 Alert Actions</SectionLabel>
                            <div id="alert-actions-panel">
                              {[
                                { key: "field_team", label: "Field Team", icon: "👷", color: "#3b82f6" },
                                { key: "hospital",   label: "Hospital",   icon: "🏥", color: "#a855f7" },
                                { key: "public",     label: "Public",     icon: "📢", color: "#22c55e" },
                              ].map(({ key, label, icon, color }) => {
                                const msg = (plan.alert_actions as Record<string, string>)[key];
                                return (
                                  <div key={key} style={{
                                    background: "#0a0f1e", border: `1px solid ${color}33`,
                                    borderRadius: "8px", padding: "10px 12px", marginBottom: "8px",
                                  }}>
                                    <div style={{
                                      fontSize: "10px", fontWeight: 700, color, textTransform: "uppercase",
                                      letterSpacing: "1px", marginBottom: "5px",
                                    }}>
                                      {icon} {label}
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.5 }}>
                                      {msg ?? <span style={{ color: "#475569" }}>No message available</span>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* ── AGENTS TAB ── */}
                    {activeTab === "agents" && (
                      <div id="agent-decisions-panel">
                        <SectionLabel>10-Agent Pipeline Execution Log</SectionLabel>
                        {(response?.agent_decisions ?? []).length === 0 ? (
                          <div style={{ fontSize: "13px", color: "#475569" }}>No agent decisions recorded.</div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {(response?.agent_decisions ?? []).map((d, i) => (
                              <div key={i} style={{
                                background: "#0a0f1e", border: "1px solid #1e2d4a",
                                borderRadius: "8px", padding: "10px 12px",
                              }}>
                                <div style={{
                                  display: "flex", alignItems: "center", gap: "8px",
                                  marginBottom: "5px",
                                }}>
                                  <span style={{
                                    width: "20px", height: "20px", borderRadius: "50%",
                                    background: "#1e3a5f", display: "flex", alignItems: "center",
                                    justifyContent: "center", fontSize: "10px", fontWeight: 700,
                                    color: "#60a5fa", flexShrink: 0,
                                  }}>
                                    {d.step ?? i + 1}
                                  </span>
                                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#60a5fa" }}>
                                    {AGENT_ICONS[d.agent] ?? "🤖"} {(d.agent ?? "unknown").replace(/_/g, " ")}
                                  </span>
                                  <span style={{
                                    marginLeft: "auto", fontSize: "10px", fontWeight: 700,
                                    padding: "2px 6px", borderRadius: "4px",
                                    background: "#14532d", color: "#86efac",
                                  }}>
                                    ✓ done
                                  </span>
                                </div>
                                <div style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.5, paddingLeft: "28px" }}>
                                  {d.output ?? "No output recorded."}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Map placeholder ── */}
            <div style={{
              marginTop: "20px", height: "160px", border: "1px dashed #1e293b",
              borderRadius: "10px", display: "flex", alignItems: "center",
              justifyContent: "center", flexDirection: "column", gap: "6px", color: "#334155",
            }}>
              <span style={{ fontSize: "28px" }}>🗺️</span>
              <span style={{ fontSize: "13px" }}>Map Component</span>
              <span style={{ fontSize: "11px", color: "#1e293b" }}>Leaflet / Google Maps — coming next</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{ marginTop: "40px", textAlign: "center", color: "#334155", fontSize: "11px" }}>
          RescueNet AI v0.1.0 · API:{" "}
          <a href={`${API_URL}/docs`} target="_blank" rel="noreferrer" style={{ color: "#3b82f6" }}>
            {API_URL}/docs
          </a>
        </div>
      </main>
    </div>
  );
}
