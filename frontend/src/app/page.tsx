"use client";

/**
 * RescueNet AI — Dashboard Page
 * Minimal placeholder that shows live API status and incident list.
 * Full UI will be built once backend and agent JSON are stable.
 */

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Incident = {
  id: string;
  title: string;
  type: string;
  location: string;
  severity: number;
  status: string;
  created_at: string;
};

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

export default function DashboardPage() {
  const [apiStatus, setApiStatus] = useState<"loading" | "online" | "offline">("loading");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [plan, setPlan] = useState<Record<string, unknown> | null>(null);
  const [planLoading, setPlanLoading] = useState(false);

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
    setPlan(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/agents/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_id: incidentId }),
      });
      const data = await res.json();
      setPlan(data.rescue_plan);
    } catch {
      setPlan({ error: "Failed to reach API. Is the backend running?" });
    } finally {
      setPlanLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#e2e8f0", fontFamily: "system-ui, sans-serif", padding: "0" }}>

      {/* Header */}
      <header style={{ background: "#0d1426", borderBottom: "1px solid #1e2d4a", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "24px" }}>🚨</span>
          <div>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#f1f5f9", letterSpacing: "0.5px" }}>
              RescueNet AI
            </h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
              Multi-Agent Disaster Response Command Center
            </p>
          </div>
        </div>

        {/* API Status indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            width: "10px", height: "10px", borderRadius: "50%",
            background: apiStatus === "online" ? "#22c55e" : apiStatus === "offline" ? "#ef4444" : "#facc15",
            display: "inline-block",
          }} />
          <span style={{ fontSize: "13px", color: "#94a3b8" }}>
            API: {apiStatus === "loading" ? "Connecting..." : apiStatus === "online" ? "Online" : "Offline"}
          </span>
          <span style={{ marginLeft: "16px", fontSize: "13px", color: "#475569" }}>
            {API_URL}
          </span>
        </div>
      </header>

      {/* Offline warning */}
      {apiStatus === "offline" && (
        <div style={{ background: "#7f1d1d", color: "#fca5a5", padding: "12px 32px", fontSize: "14px" }}>
          ⚠️ Backend API is offline. Start it with: <code style={{ background: "#450a0a", padding: "2px 6px", borderRadius: "4px" }}>python scripts/run_backend.py</code>
        </div>
      )}

      <main style={{ padding: "32px", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>

          {/* Left panel: Active Incidents */}
          <div>
            <h2 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>
              Active Incidents ({incidents.length})
            </h2>

            {incidents.length === 0 && apiStatus === "online" && (
              <div style={{ color: "#64748b", padding: "24px", textAlign: "center", border: "1px dashed #1e293b", borderRadius: "8px" }}>
                No incidents found. Submit one via POST /api/v1/incidents
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => { setSelected(inc); setPlan(null); }}
                  style={{
                    background: selected?.id === inc.id ? "#0f2044" : "#0d1426",
                    border: `1px solid ${selected?.id === inc.id ? "#3b82f6" : "#1e2d4a"}`,
                    borderRadius: "10px",
                    padding: "16px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <span style={{ fontWeight: 600, fontSize: "15px", color: "#f1f5f9" }}>{inc.title}</span>
                    <span style={{
                      fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px",
                      background: SEVERITY_COLORS[inc.severity] + "22",
                      color: SEVERITY_COLORS[inc.severity],
                      border: `1px solid ${SEVERITY_COLORS[inc.severity]}44`,
                    }}>
                      {SEVERITY_LABELS[inc.severity] || `S${inc.severity}`}
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", color: "#64748b" }}>
                    📍 {inc.location} &nbsp;•&nbsp; 🏷️ {inc.type.toUpperCase()} &nbsp;•&nbsp; 🔵 {inc.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: Rescue Plan */}
          <div>
            <h2 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>
              Rescue Command Panel
            </h2>

            {!selected && (
              <div style={{ color: "#64748b", padding: "40px 24px", textAlign: "center", border: "1px dashed #1e293b", borderRadius: "8px" }}>
                ← Select an incident to run the AI agents
              </div>
            )}

            {selected && (
              <div style={{ background: "#0d1426", border: "1px solid #1e2d4a", borderRadius: "10px", padding: "24px" }}>
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#f1f5f9", marginBottom: "4px" }}>{selected.title}</div>
                  <div style={{ fontSize: "13px", color: "#64748b" }}>ID: {selected.id}</div>
                </div>

                <button
                  id="run-agents-btn"
                  onClick={() => runAgents(selected.id)}
                  disabled={planLoading}
                  style={{
                    width: "100%", padding: "12px", borderRadius: "8px", border: "none",
                    background: planLoading ? "#1e3a5f" : "#1d4ed8", color: "#fff",
                    fontSize: "14px", fontWeight: 600, cursor: planLoading ? "not-allowed" : "pointer",
                    marginBottom: "20px",
                  }}
                >
                  {planLoading ? "⚙️  Running 10 AI Agents..." : "🤖  Run Rescue Pipeline"}
                </button>

                {plan && !("error" in plan) && (
                  <div>
                    {/* Priority badge */}
                    <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
                      {[
                        { label: `Priority ${plan.priority as string}`, color: "#ef4444" },
                        { label: `${plan.survivor_estimate as number} survivors`, color: "#fb923c" },
                        { label: `Prob ${((plan.survivor_probability as number) * 100).toFixed(0)}%`, color: "#facc15" },
                        { label: `Medical: ${plan.medical_priority as string}`.toUpperCase(), color: "#a855f7" },
                      ].map((badge) => (
                        <span key={badge.label} style={{
                          fontSize: "12px", fontWeight: 700, padding: "4px 10px", borderRadius: "6px",
                          background: badge.color + "22", color: badge.color, border: `1px solid ${badge.color}44`,
                        }}>
                          {badge.label}
                        </span>
                      ))}
                    </div>

                    {/* Resources */}
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px", textTransform: "uppercase" }}>Resources Dispatched</div>
                      {(plan.resources as Array<{type: string; count: number; eta_minutes: number}>).map((r) => (
                        <div key={r.type} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1e2d4a", fontSize: "14px" }}>
                          <span style={{ color: "#94a3b8" }}>🚑 {r.type.replace("_", " ")}</span>
                          <span style={{ color: "#f1f5f9" }}>{r.count} units &nbsp;·&nbsp; ETA {r.eta_minutes}min</span>
                        </div>
                      ))}
                    </div>

                    {/* Alert messages */}
                    {plan.alert_messages && (
                      <div>
                        <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px", textTransform: "uppercase" }}>Alert Messages</div>
                        {Object.entries(plan.alert_messages as Record<string, string>).map(([key, msg]) => (
                          <div key={key} style={{ background: "#0a0f1e", border: "1px solid #1e2d4a", borderRadius: "6px", padding: "10px", marginBottom: "8px", fontSize: "13px", color: "#94a3b8" }}>
                            <strong style={{ color: "#64748b", textTransform: "uppercase", fontSize: "11px" }}>{key}:</strong><br />
                            {msg}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {plan && "error" in plan && (
                  <div style={{ color: "#fca5a5", background: "#7f1d1d", padding: "12px", borderRadius: "6px", fontSize: "14px" }}>
                    {String(plan.error)}
                  </div>
                )}
              </div>
            )}

            {/* Map placeholder */}
            <div style={{
              marginTop: "24px", height: "200px", border: "1px dashed #1e293b", borderRadius: "10px",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: "8px", color: "#475569",
            }}>
              <span style={{ fontSize: "32px" }}>🗺️</span>
              <span style={{ fontSize: "14px" }}>Map Component</span>
              <span style={{ fontSize: "12px", color: "#334155" }}>Google Maps integration — coming next</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{ marginTop: "48px", textAlign: "center", color: "#334155", fontSize: "12px" }}>
          RescueNet AI v0.1.0 · Hackathon MVP · API: <a href={`${API_URL}/docs`} target="_blank" rel="noreferrer" style={{ color: "#3b82f6" }}>{API_URL}/docs</a>
        </div>
      </main>
    </div>
  );
}
