import React, { useState, useEffect, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

/* ─────────────────────────────────────────────────────────────
   DATA LAYER – localStorage helpers + seed data
   ───────────────────────────────────────────────────────────── */
const LS = {
  get: (k, fb = null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const SEED_INCIDENTS = [
  { id: "RQ-3840211", type: "Building collapse", location: "Lal Bahadur Nagar, Ward 3", area: "North district", priority: "critical", status: "Needs verification", description: "Partial building collapse reported. Multiple people may be trapped under debris. Witness says at least 4 people were inside.", reportedAt: new Date(Date.now() - 8 * 60000).toISOString(), reporter: "+91 98765 43210", duplicate: false, team: null, callStatus: "Pending", verified: false, confidence: 88, aiReason: "Report explicitly states people trapped under debris — highest threat-to-life indicator. Collapse events have narrow intervention windows. Single credible report with witness corroboration warrants critical priority.", missing: ["Exact number of trapped persons", "Structural condition of adjacent buildings"], weather: "Heavy rain in area", lat: 28, lng: 77, public: true },
  { id: "RQ-3840199", type: "Flood", location: "River Belt Colony, Ward 7", area: "River belt", priority: "critical", status: "Verified", description: "Floodwater entering homes rapidly. Elderly residents unable to evacuate. Water level rising approx 2 feet per hour.", reportedAt: new Date(Date.now() - 22 * 60000).toISOString(), reporter: "+91 87654 32109", duplicate: false, team: "Team Alpha", callStatus: "Completed", verified: true, confidence: 94, aiReason: "Multiple corroborating reports. Elderly residents with mobility limitations cannot self-evacuate. Rising water rate of 2ft/hour threatens life within hours. Current rainfall intensifies urgency.", missing: [], weather: "Active rainfall: 48mm/hr", lat: 28.2, lng: 77.3, public: true },
  { id: "RQ-3840187", type: "Landslide", location: "Hill Road, Chota Simla Colony", area: "North district", priority: "high", status: "Under Review", description: "Landslide blocking highway. One vehicle appears to be buried. Unclear if passengers are inside.", reportedAt: new Date(Date.now() - 41 * 60000).toISOString(), reporter: null, duplicate: false, team: null, callStatus: "Pending", verified: false, confidence: 71, aiReason: "Possible trapped vehicle occupants — life-threatening if confirmed. High uncertainty warrants urgent verification. Unstable terrain may prevent rescue access; specialist team required.", missing: ["Confirmation of vehicle occupancy", "Road access status"], weather: "Wet terrain after 6hrs rain", lat: 28.5, lng: 77.1, public: true },
  { id: "RQ-3840175", type: "Medical emergency", location: "Central Market, Block C", area: "Central", priority: "high", status: "Response in Progress", description: "Person collapsed. Bystanders performing CPR. No ambulance available in area due to road blockage.", reportedAt: new Date(Date.now() - 55 * 60000).toISOString(), reporter: "+91 77654 32108", duplicate: false, team: "Team Bravo", callStatus: "Completed", verified: true, confidence: 92, aiReason: "Cardiac event requiring immediate medical intervention. CPR in progress indicates critical window. Road blockage compounds urgency — air or alternate route dispatch may be necessary.", missing: ["Exact patient condition", "Alternative access routes"], weather: "Clear", lat: 28.3, lng: 77.4, public: true },
  { id: "RQ-3840162", type: "Fire", location: "Industrial zone, Shed 14", area: "South district", priority: "high", status: "Needs verification", description: "Large fire visible from multiple blocks. Black smoke. Factory appears to be unmanned but chemical storage reported nearby.", reportedAt: new Date(Date.now() - 78 * 60000).toISOString(), reporter: null, duplicate: false, team: null, callStatus: "Not required", verified: false, confidence: 65, aiReason: "Potential chemical hazard with unknown substances. Multiple witness reports corroborate fire presence. Unmanned facility reduces immediate life risk but chemical exposure and spread risk remain high.", missing: ["Chemical inventory", "Fire spread rate", "Whether anyone present"], weather: "Wind: 22km/h NE", lat: 28.6, lng: 77.5, public: true },
  { id: "RQ-3840150", type: "Flood", location: "Nehru Park Area", area: "Central", priority: "medium", status: "Monitoring", description: "Low-lying park area flooded. No residences affected yet but water level rising slowly.", reportedAt: new Date(Date.now() - 120 * 60000).toISOString(), reporter: null, duplicate: false, team: null, callStatus: "Not required", verified: true, confidence: 80, aiReason: "No immediate life threat confirmed. Water level monitored; precautionary watch warranted given upstream rainfall patterns. May escalate to High if residential areas become affected.", missing: ["Upstream water gauge readings"], weather: "Moderate rain expected", lat: 28.1, lng: 77.2, public: true },
  { id: "RQ-3840143", type: "Other", location: "Sector 12, Main Road", area: "East district", priority: "medium", status: "Needs verification", description: "Fallen tree blocking entire road. No injuries reported. Emergency vehicles may be impacted.", reportedAt: new Date(Date.now() - 180 * 60000).toISOString(), reporter: null, duplicate: true, team: null, callStatus: "Not required", verified: false, confidence: 60, aiReason: "Road obstruction without immediate life risk. Impact is access disruption for emergency response. Flagged as potential duplicate of report RQ-3840138.", missing: ["Whether utilities/power lines affected"], weather: "Wind damage likely", lat: 28.4, lng: 77.6, public: true },
  { id: "RQ-3840130", type: "Landslide", location: "North Hill Access Road", area: "North district", priority: "low", status: "Resolved", description: "Minor debris on side of road. Cleared by morning shift crew. Monitoring for further movement.", reportedAt: new Date(Date.now() - 300 * 60000).toISOString(), reporter: null, duplicate: false, team: "Team Delta", callStatus: "Not required", verified: true, confidence: 95, aiReason: "Incident resolved. Debris cleared. Geotechnical team on routine monitoring. No further action required unless conditions worsen.", missing: [], weather: "Stable", lat: 28.7, lng: 77.0, public: true },
];

const getIncidents = () => LS.get("resqnet-incidents", SEED_INCIDENTS);
const saveIncidents = (v) => LS.set("resqnet-incidents", v);
const getReports = () => LS.get("resqnet-reports", []);

/* Community-user AI follow-up call log (simulated telephony) */
const SEED_USER_CALLS = [
  { id: "CL-90231", reportRef: "RQ-3840211", incidentType: "Building collapse", mode: "ai", status: "missed", at: new Date(Date.now() - 42 * 60000).toISOString(), durationSec: null, reason: "Confirm how many people are trapped and the condition of adjacent buildings", transcript: [], reviewed: false },
  { id: "CL-90218", reportRef: "RQ-3840175", incidentType: "Medical emergency", mode: "ivr", status: "received", at: new Date(Date.now() - 3 * 3600000).toISOString(), durationSec: 96, reason: "Confirm patient condition and an alternate ambulance route", transcript: [{ q: "Is the person still unresponsive?", a: "Yes — breathing but unresponsive." }, { q: "Is the main road still blocked for the ambulance?", a: "Yes, use Market Lane 4 instead." }], reviewed: false },
  { id: "CL-90204", reportRef: "RQ-3840150", incidentType: "Flood", mode: "ai", status: "received", at: new Date(Date.now() - 9 * 3600000).toISOString(), durationSec: 142, reason: "Check whether floodwater has reached residential blocks", transcript: [{ q: "Has water entered any homes in Nehru Park area?", a: "Not yet — only the low-lying park is flooded." }, { q: "Is the water level rising right now?", a: "Rising slowly, roughly two inches per hour." }], reviewed: true },
  { id: "CL-90190", reportRef: "RQ-3840143", incidentType: "Obstruction — fallen tree", mode: "ivr", status: "missed", at: new Date(Date.now() - 26 * 3600000).toISOString(), durationSec: null, reason: "Confirm whether power lines are affected by the fallen tree", transcript: [], reviewed: false },
];

const getUserCalls = () => LS.get("resqnet-user-calls", SEED_USER_CALLS);
const saveUserCalls = (v) => LS.set("resqnet-user-calls", v);

/* ─────────────────────────────────────────────────────────────
   ICON SYSTEM
   ───────────────────────────────────────────────────────────── */
const ICONS = {
  arrow: <><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>,
  back: <><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></>,
  alert: <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  confirm: <><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></>,
  checkCircle: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></>,
  cloud: <><path d="M17.5 19H9a6 6 0 1 1 1.2-11.88A5.5 5.5 0 0 1 20 10.5 4.5 4.5 0 0 1 17.5 19Z"/><path d="M12 13v5M9.5 15.5 12 18l2.5-2.5"/></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2"/></>,
  eyeOff: <><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></>,
  filter: <><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>,
  fire: <><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3Z"/></>,
  list: <><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></>,
  lock: <><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></>,
  map: <><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
  mic: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></>,
  phone: <><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127 1.02.37 2 .72 2.94a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.94.35 1.92.6 2.94.72A2 2 0 0 1 22 16.9Z"/></>,
  phoneMissed: <><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127 1.02.37 2 .72 2.94a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.94.35 1.92.6 2.94.72A2 2 0 0 1 22 16.9Z"/><line x1="18" x2="23" y1="3" y2="8"/><line x1="23" x2="18" y1="3" y2="8"/></>,
  phoneIncoming: <><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127 1.02.37 2 .72 2.94a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.94.35 1.92.6 2.94.72A2 2 0 0 1 22 16.9Z"/><polyline points="23 8 23 2 17 2"/><line x1="23" x2="17" y1="2" y2="8"/></>,
  pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>,
  plus: <><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></>,
  radio: <><path d="M12 18v-7"/><path d="M8.5 21h7"/><path d="M5.6 7.9a9 9 0 0 1 12.8 0"/><path d="M8.5 11a5 5 0 0 1 7 0"/><circle cx="12" cy="8" r="1"/></>,
  search: <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>,
  settings: <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></>,
  shield: <><path d="M12 3 20 7v5c0 5-3.4 8.8-8 10-4.6-1.2-8-5-8-10V7l8-4Z"/><path d="m9 12 2 2 4-4"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></>,
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></>,
  users: <><path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="10" cy="8" r="3"/><path d="M16 11a3 3 0 0 0 0-6M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35"/></>,
  weather: <><path d="M17.5 19H9a6 6 0 1 1 1.2-11.88A5.5 5.5 0 0 1 20 10.5 4.5 4.5 0 0 1 17.5 19z"/></>,
  wifi: <><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" x2="12.01" y1="20" y2="20"/></>,
  x: <><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></>,
  xCircle: <><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></>,
  zap: <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
};

function Icon({ name, size = 18, stroke = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   BRAND
   ───────────────────────────────────────────────────────────── */
function Brand({ onHome, light = false }) {
  return (
    <button className="brand-logo" onClick={onHome} aria-label="ResQNet home">
      <div className="brand-crest">RQ</div>
      <div className="brand-text">
        <span className={`brand-name${light ? " light" : ""}`}>ResQNet</span>
        <span className={`brand-sub${light ? " light" : ""}`}>Disaster Response & Coordination</span>
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   SHARED: PRIORITY HELPERS
   ───────────────────────────────────────────────────────────── */
function PriorityPill({ priority, size = "normal" }) {
  const map = { critical: "pill-critical", high: "pill-high", medium: "pill-medium", low: "pill-low" };
  const labels = { critical: "🔴 Critical", high: "🟠 High", medium: "🔵 Medium", low: "🟢 Low" };
  const cls = `pill ${map[priority] || "pill-unverified"}${size === "sm" ? " text-[11px]" : ""}`;
  return <span className={cls}>{labels[priority] || priority}</span>;
}

function PriorityBar({ priority }) {
  return <div className={`iq-priority-bar ${priority}`} />;
}

function StatusPill({ status }) {
  const map = {
    "Needs verification": "pill-unverified",
    "Verified": "pill-verified",
    "Under Review": "pill-unverified",
    "Response in Progress": "pill-assigned",
    "Resolved": "pill-resolved",
    "Monitoring": "pill-medium",
    "Assigned": "pill-assigned",
    "Needs information": "pill-pending",
    "Escalated": "pill-critical",
  };
  return <span className={`pill ${map[status] || "pill-unverified"}`}>{status}</span>;
}

/* ─────────────────────────────────────────────────────────────
   SHARED: COMMUNITY CONFIRMATION (UPVOTE)
   ───────────────────────────────────────────────────────────── */
const baseConfirmations = (inc) => inc.confirmations ?? (inc.verified ? 12 : inc.priority === "critical" ? 9 : 4);

function UpvoteButton({ incident, upvoted, onToggle }) {
  const count = baseConfirmations(incident) + (upvoted ? 1 : 0);
  return (
    <button
      className={`upvote-btn${upvoted ? " upvoted" : ""}`}
      onClick={(e) => { e.stopPropagation(); onToggle(incident.id); }}
      aria-pressed={upvoted}
      title={upvoted ? "Remove your confirmation" : "Confirm this incident is real"}
    >
      <Icon name="confirm" size={14} />
      <span>{upvoted ? "Confirmed" : "It's real"}</span>
      <span className="upvote-count">{count}</span>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   SHARED: INCIDENT MAP VISUALIZATION
   ───────────────────────────────────────────────────────────── */
function IncidentMapVis({ incidents, authority = false, height = "320px", onMarkerClick }) {
  const [tooltip, setTooltip] = useState(null);
  const mapRef = useRef(null);

  // Lay out markers in a visually spread way
  const positions = [
    { x: "18%", y: "28%" }, { x: "35%", y: "55%" }, { x: "52%", y: "20%" },
    { x: "67%", y: "45%" }, { x: "79%", y: "68%" }, { x: "88%", y: "32%" },
    { x: "28%", y: "72%" }, { x: "60%", y: "75%" },
  ];

  return (
    <div className="pub-map-viz" style={{ height }} ref={mapRef}>
      <div className="pub-map-overlay" />
      {/* Roads */}
      <div className="pub-map-road-h" style={{ top: "40%", left: "5%", right: "5%" }} />
      <div className="pub-map-road-h" style={{ top: "65%", left: "20%", right: "15%" }} />
      <div className="pub-map-road-v" style={{ left: "30%", top: "5%", bottom: "5%" }} />
      <div className="pub-map-road-v" style={{ left: "60%", top: "30%", bottom: "10%" }} />
      {/* River */}
      <div className="pub-map-river" style={{ left: "42%", top: "-10%", width: "18px", height: "120%", transform: "rotate(15deg)", background: "rgba(91,170,188,.35)" }} />
      {/* Markers */}
      {incidents.slice(0, 8).map((inc, i) => {
        const pos = positions[i] || { x: `${30 + i * 8}%`, y: `${40 + i * 6}%` };
        return (
          <div key={inc.id} className="pub-map-marker" style={{ left: pos.x, top: pos.y }}
            onMouseEnter={(e) => setTooltip({ inc, x: e.clientX, y: e.clientY })}
            onMouseLeave={() => setTooltip(null)}
            onClick={() => onMarkerClick && onMarkerClick(inc)}
          >
            <div className={`pub-map-marker-dot ${inc.priority}`} />
          </div>
        );
      })}
      {/* Legend */}
      <div className="pub-map-legend">
        <h4>Incident Priority</h4>
        {[["critical", "Critical"], ["high", "High"], ["medium", "Medium"], ["low", "Low / Resolved"]].map(([p, l]) => (
          <div key={p} className="legend-item">
            <div className={`legend-dot`} style={{ background: { critical: "#ef4444", high: "#f59e0b", medium: "#3b82f6", low: "#10b981" }[p] }} />
            {l}
          </div>
        ))}
      </div>
      {/* Toolbar */}
      <div className="pub-map-toolbar">
        <button aria-label="Zoom in">+</button>
        <button aria-label="Zoom out">−</button>
        <button aria-label="Locate me" title="Current location"><Icon name="pin" size={14} /></button>
      </div>
      {/* Privacy notice for public */}
      {!authority && (
        <div style={{ position: "absolute", bottom: 16, right: 16, background: "rgba(255,255,255,.9)", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, color: "#315360", display: "flex", alignItems: "center", gap: 5 }}>
          <Icon name="lock" size={11} /> Approximate locations only
        </div>
      )}
      {/* Tooltip */}
      {tooltip && (
        <div className="pub-map-tooltip" style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
          <h4>{tooltip.inc.type}</h4>
          <p style={{ marginBottom: 6 }}>{tooltip.inc.area}</p>
          <PriorityPill priority={tooltip.inc.priority} size="sm" />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PUBLIC NAV
   ───────────────────────────────────────────────────────────── */
function PubNav({ go, currentView }) {
  return (
    <nav className="pub-nav" role="navigation" aria-label="Main navigation">
      <div className="pub-nav-inner">
        <Brand onHome={() => go("home")} />
        <div className="pub-nav-links">
          {[["home", "Home"], ["how-it-works", "How It Works"], ["features", "Features"], ["public-map", "Public Incident Map"]].map(([v, l]) => (
            <button key={v} className={currentView === v ? "active" : ""} onClick={() => go(v)}>{l}</button>
          ))}
        </div>
        <div className="pub-nav-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => go("login")}>Log in</button>
          <button className="btn btn-secondary btn-sm" onClick={() => go("register")}>Create Account</button>
          <button className="btn btn-emergency btn-sm" onClick={() => go("report")}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", opacity: .85, display: "inline-block" }} />
            Report Emergency
          </button>
        </div>
      </div>
    </nav>
  );
}

/* ─────────────────────────────────────────────────────────────
   FOOTER
   ───────────────────────────────────────────────────────────── */
function Footer({ go }) {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-col">
            <Brand onHome={() => go("home")} light />
            <p style={{ fontSize: 16, color: "rgba(255,255,255,.5)", marginTop: 16, lineHeight: 1.65 }}>AI-assisted disaster response platform helping identify critical emergencies, prioritize incidents, and coordinate faster responses.</p>
          </div>
          <div className="footer-col">
            <h4>Platform</h4>
            {[["home", "Home"], ["how-it-works", "How It Works"], ["public-map", "Public Incident Map"], ["report", "Report Emergency"]].map(([v, l]) => (
              <button key={v} onClick={() => go(v)}>{l}</button>
            ))}
          </div>
          <div className="footer-col">
            <h4>Access</h4>
            {[["login", "Public Login"], ["register", "Create Account"], ["authority-login", "Authority Portal"], ["admin", "Admin Panel"]].map(([v, l]) => (
              <button key={v} onClick={() => go(v)}>{l}</button>
            ))}
          </div>
          <div className="footer-col">
            <h4>Features</h4>
            <a href="#">AI Urgency Ranking</a>
            <a href="#">Voice Reporting</a>
            <a href="#">Offline Mode</a>
            <a href="#">Privacy Protection</a>
            <a href="#">Weather Awareness</a>
          </div>
        </div>
        <div className="footer-bottom">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>© 2026 ResQNet. Coordinating care when it matters most.</span>
            <span style={{ opacity: .7 }}>Hero photography: NDRF flood rescue, Bihar (PIB / Govt. of India) and U.S. Navy aerial survey — via Wikimedia Commons</span>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            <a href="#" style={{ fontSize: 13, color: "rgba(255,255,255,.4)", textDecoration: "none" }}>Privacy Policy</a>
            <a href="#" style={{ fontSize: 13, color: "rgba(255,255,255,.4)", textDecoration: "none" }}>Accessibility</a>
            <a href="#" style={{ fontSize: 13, color: "rgba(255,255,255,.4)", textDecoration: "none" }}>Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────────────────────
   LANDING PAGE
   ───────────────────────────────────────────────────────────── */
function Landing({ go }) {
  const heroIncidents = [
    { type: "Building Collapse", location: "Lal Bahadur Nagar", priority: "critical" },
    { type: "Flash Flood", location: "River Belt Colony", priority: "critical" },
    { type: "Landslide", location: "Hill Road", priority: "high" },
  ];

  return (
    <div id="home">
      {/* Hero */}
      <section className="hero-section" aria-labelledby="hero-heading">
        <div className="hero-bg-img" aria-hidden="true" />
        <div className="hero-bg-scrim" aria-hidden="true" />
        <div className="hero-bg-pattern" />
        <div className="hero-glow" />
        <div className="hero-glow-2" />
        <div className="hero-inner">
          <div>
            <div className="hero-tag">
              <span className="hero-tag-dot pulse" />
              <span>Live disaster coordination platform</span>
            </div>
            <h1 id="hero-heading" className="hero-h1">Every second matters.<br />Every report <em>counts.</em></h1>
            <p className="hero-desc">An AI-assisted disaster response platform that helps identify critical emergencies, prioritize incidents, and coordinate faster, fairer responses.</p>
            <div className="hero-actions">
              <button className="btn btn-emergency" onClick={() => go("report")} id="hero-report-btn">
                <Icon name="alert" size={15} />
                Report an Emergency
              </button>
              <button className="btn btn-secondary" onClick={() => document.getElementById("how-it-works-section")?.scrollIntoView({ behavior: "smooth" })} id="hero-explore-btn">
                Explore How It Works
                <Icon name="arrow" size={14} />
              </button>
            </div>
            <div className="hero-note">
              <Icon name="lock" size={14} />
              No account required to report an emergency
            </div>
          </div>

          {/* Animated map card */}
          <div className="hero-map-card" aria-label="Live incident preview">
            <div className="hero-map-header">
              <span className="hero-map-title">Live Incident Overview</span>
              <span className="live-badge"><span className="live-badge-dot pulse" /> Live</span>
            </div>
            <div className="hero-map-viz">
              <div className="hero-map-photo" aria-hidden="true" />
              <div className="hero-map-scrim" aria-hidden="true" />
              <div className="hmap-grid" />
              {[{ x: "22%", y: "38%", p: "critical" }, { x: "55%", y: "22%", p: "high" }, { x: "72%", y: "60%", p: "critical" }, { x: "38%", y: "68%", p: "high" }, { x: "85%", y: "30%", p: "low" }].map((m, i) => (
                <div key={i} className={`hmap-marker ${m.p}`} style={{ left: m.x, top: m.y, position: "absolute", transform: "translate(-50%,-50%)" }} />
              ))}
              <div style={{ position: "absolute", bottom: 10, left: 10, right: 10, display: "flex", gap: 6 }}>
                {["critical", "high", "low"].map(p => (
                  <div key={p} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(255,255,255,.7)" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: { critical: "#ef4444", high: "#f59e0b", low: "#10b981" }[p] }} />
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </div>
                ))}
              </div>
            </div>
            <div className="hero-incident-cards">
              {heroIncidents.map((inc) => (
                <div key={inc.type} className="hero-inc-card">
                  <div className="dot" style={{ background: { critical: "#ef4444", high: "#f59e0b", medium: "#3b82f6" }[inc.priority], boxShadow: `0 0 0 3px ${({ critical: "rgba(239,68,68,.2)", high: "rgba(245,158,11,.2)", medium: "rgba(59,130,246,.2)" })[inc.priority]}`, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="inc-type">{inc.type}</div>
                    <div className="inc-location">{inc.location}</div>
                  </div>
                  <span className={`inc-pill ${inc.priority}`}>{inc.priority === "critical" ? "CRITICAL" : "HIGH"}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, textAlign: "center" }}>
              <button className="btn btn-sm" style={{ background: "rgba(255,255,255,.12)", color: "rgba(255,255,255,.8)", width: "100%", justifyContent: "center", fontSize: 13 }} onClick={() => go("public-map")}>
                View full public incident map →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works-section" className="steps-section">
        <div className="steps-inner">
          <div className="section-heading" style={{ textAlign: "center" }}>
            <div className="eyebrow" style={{ justifyContent: "center" }}><span className="bar" /> How It Works</div>
            <h2 className="section-h2" style={{ textAlign: "center" }}>From Report to Response<br />in Four Steps</h2>
            <p className="section-desc" style={{ margin: "12px auto 0", textAlign: "center" }}>ResQNet turns fragmented emergency information into a transparent, prioritized queue that helps responders act on what matters most.</p>
          </div>
          <div className="steps-grid">
            {[
              { n: "📡", cls: "", title: "Report", desc: "Anyone can submit a report — via text, voice, or photo — without creating an account. Works offline too." },
              { n: "🔍", cls: "step2", title: "Analyze", desc: "AI extracts key details, checks for duplicates, and identifies missing information that could affect urgency." },
              { n: "📊", cls: "step3", title: "Prioritize", desc: "A transparent scoring system ranks incidents by urgency with clear reasoning. Authorities can review and override." },
              { n: "🚁", cls: "step4", title: "Respond", desc: "Teams are assigned, routes coordinated, and status tracked in real-time. The public sees updates without sensitive details." },
            ].map((s) => (
              <div key={s.title} className="step-card">
                <div className={`step-num ${s.cls}`} style={{ fontSize: 30 }}>{s.n}</div>
                <h3 className="step-title">{s.title}</h3>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="features-section">
        <div className="features-inner">
          <div className="section-heading">
            <div className="eyebrow"><span className="bar" /> Core Features</div>
            <h2 className="section-h2">Built for the moment.<br />Designed for impact.</h2>
            <p className="section-desc">ResQNet combines AI assistance with human oversight to ensure every genuine emergency gets the attention it deserves.</p>
          </div>
          <div className="features-grid">
            {[
              { icon: "zap", color: "#fef3c7", ico: "#d97706", title: "AI Urgency Ranking", desc: "Threat-to-life signals are surfaced automatically with clear explanations. Authorities can review, adjust, and override any recommendation." },
              { icon: "search", color: "#dbeafe", ico: "#2563eb", title: "Duplicate Detection", desc: "Similar reports are grouped and flagged. A single credible report of trapped persons ranks higher than many reports of a minor obstruction." },
              { icon: "mic", color: "#f3e8ff", ico: "#7c3aed", title: "Voice Reporting", desc: "Use the microphone button to describe an emergency verbally. Speech-to-text converts it to a report you can review before submitting." },
              { icon: "cloud", color: "#d1fae5", ico: "#059669", title: "Offline Reporting", desc: "If connectivity fails, reports are saved locally and queued for automatic sync when the connection returns." },
              { icon: "phone", color: "#fee2e2", ico: "#dc2626", title: "AI Follow-Up Calls", desc: "For incomplete reports, the system can initiate follow-up calls to reporters to gather critical missing details." },
              { icon: "weather", color: "#e0f2fe", ico: "#0369a1", title: "Weather Awareness", desc: "Real-time rainfall, flood risk, and severe weather alerts give responders crucial environmental context." },
              { icon: "pin", color: "#fdf4ff", ico: "#7e22ce", title: "Privacy-First Locations", desc: "Public maps show approximate areas only. Precise coordinates are restricted to authorized personnel with appropriate permissions." },
              { icon: "shield", color: "#f0fdf4", ico: "#15803d", title: "Role-Based Access", desc: "Different roles — NGO coordinator, control room operator, volunteer — see only what they need to act effectively." },
            ].map((f) => (
              <div key={f.title} className="feat-card">
                <div className="feat-icon" style={{ background: f.color, color: f.ico }}>
                  <Icon name={f.icon} size={22} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="privacy-section">
        <div className="privacy-inner">
          <div>
            <div className="eyebrow"><span className="bar" /> Privacy & Accessibility</div>
            <h2 className="section-h2">Designed for everyone.<br />Protected by default.</h2>
            <div className="privacy-list">
              {[
                "Anyone can report an emergency without creating an account or providing personal information.",
                "Public incident maps show only approximate locations — precise coordinates are never exposed.",
                "Reporter contact information is restricted to authorized personnel with a legitimate need.",
                "Offline reporting works without an internet connection; data syncs automatically when connectivity returns.",
                "Anonymous reporters can check their report status using a secure reference number — no account required.",
              ].map((item) => (
                <div key={item} className="privacy-item">
                  <div className="privacy-check"><Icon name="check" size={12} /></div>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ background: "white", borderRadius: 20, padding: 28, border: "1px solid var(--ink-subtle)", boxShadow: "var(--shadow-md)" }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>Report Without Registration</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { icon: "📝", label: "Describe the emergency", sub: "Text, voice, or photo" },
                  { icon: "📍", label: "Share your location", sub: "Auto-detect or enter manually" },
                  { icon: "📱", label: "Optional contact", sub: "For follow-up calls only" },
                  { icon: "✅", label: "Submit instantly", sub: "Reference number provided" },
                ].map((s) => (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", background: "#f8f9fa", borderRadius: 10 }}>
                    <span style={{ fontSize: 26 }}>{s.icon}</span>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{s.label}</div>
                      <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 2 }}>{s.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn btn-emergency" style={{ width: "100%", justifyContent: "center", marginTop: 20 }} onClick={() => go("report")}>
                <Icon name="alert" size={15} /> Report an Emergency Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Why ResQNet */}
      <section className="why-section">
        <div className="why-inner">
          <div className="section-heading" style={{ textAlign: "center" }}>
            <div className="eyebrow" style={{ justifyContent: "center" }}><span className="bar" /> Why ResQNet</div>
            <h2 className="section-h2" style={{ textAlign: "center" }}>Built for people.<br />Designed for impact.</h2>
          </div>
          <div className="why-grid">
            {[
              { icon: "zap", title: "Transparent AI", desc: "Every priority recommendation includes a clear explanation. Authorities can see why an incident was ranked critical — and override it if they disagree." },
              { icon: "users", title: "Human in the Loop", desc: "AI assists but never decides alone. Every prioritization goes through human review. Authorities control what gets verified and who responds." },
              { icon: "pin", title: "Focus on the Unheard", desc: "Designed to surface incidents from low-connectivity areas and communities less likely to be reached by traditional emergency channels." },
              { icon: "wifi", title: "Works Offline", desc: "Emergency reporting doesn't require a stable connection. Reports saved locally sync automatically when connectivity returns." },
              { icon: "shield", title: "Privacy Protected", desc: "Public information is carefully controlled. Sensitive details are only available to authorized personnel with appropriate permissions." },
              { icon: "phone", title: "Active Follow-Up", desc: "When reports are incomplete, the system can initiate automated or manual follow-up calls to gather the information responders need." },
            ].map((w) => (
              <div key={w.title} className="why-item">
                <div className="why-icon"><Icon name={w.icon} size={20} /></div>
                <h3>{w.title}</h3>
                <p>{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-inner">
          <div>
            <div className="eyebrow light" style={{ marginBottom: 12 }}><span className="bar" /> Need help now?</div>
            <h2 className="cta-h2">Your report can help<br />someone get home safe.</h2>
            <p className="cta-desc">Every report is reviewed. Every incident matters. No account required.</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button className="btn" style={{ background: "white", color: "var(--ink)", fontWeight: 700 }} onClick={() => go("report")}>
              <Icon name="alert" size={15} /> Report an Emergency
            </button>
            <button className="btn" style={{ border: "1.5px solid rgba(255,255,255,.4)", color: "rgba(255,255,255,.85)" }} onClick={() => go("authority-login")}>
              Authority Portal <Icon name="arrow" size={14} />
            </button>
          </div>
        </div>
      </section>

      <Footer go={go} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PUBLIC INCIDENT MAP PAGE
   ───────────────────────────────────────────────────────────── */
function PublicMap({ go }) {
  const incidents = getIncidents().filter(i => i.public);
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const filtered = incidents.filter(i => {
    const pMatch = filter === "all" || i.priority === filter;
    const tMatch = typeFilter === "all" || i.type === typeFilter;
    return pMatch && tMatch;
  });

  const types = [...new Set(incidents.map(i => i.type))];
  const counts = {
    total: incidents.length,
    critical: incidents.filter(i => i.priority === "critical").length,
    areas: [...new Set(incidents.map(i => i.area))].length,
    recent: incidents.filter(i => new Date(i.reportedAt) > new Date(Date.now() - 60 * 60000)).length,
  };

  function timeAgo(iso) {
    const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  }

  return (
    <div className="screen-wrap">
      <div className="screen-header">
        <div className="screen-header-inner">
          <Brand onHome={() => go("home")} />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: "var(--ink-muted)" }}>Public view — approximate locations only</span>
            <button className="btn btn-sm btn-ghost" onClick={() => go("home")}><Icon name="back" size={14} /> Home</button>
            <button className="btn btn-emergency btn-sm" onClick={() => go("report")}>Report Emergency</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "24px clamp(16px, 3vw, 48px)" }}>
        {/* Summary cards */}
        <div style={{ marginBottom: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}><span className="bar" /> Public Incident Dashboard</div>
          <h1 className="font-display" style={{ fontSize: 34, fontWeight: 700, marginBottom: 20 }}>Active Incidents in Your Region</h1>
          <div className="stats-grid">
            <div className="stat-card neutral"><div className="stat-label">Reported Incidents</div><div className="stat-value">{counts.total}</div><div className="stat-sub">All time today</div></div>
            <div className="stat-card critical"><div className="stat-label">Critical Incidents</div><div className="stat-value v-critical">{counts.critical}</div><div className="stat-sub">Immediate attention</div></div>
            <div className="stat-card medium"><div className="stat-label">Areas Affected</div><div className="stat-value v-medium">{counts.areas}</div><div className="stat-sub">Distinct locations</div></div>
            <div className="stat-card ok"><div className="stat-label">Recently Updated</div><div className="stat-value" style={{ color: "#059669" }}>{counts.recent}</div><div className="stat-sub">Last 60 minutes</div></div>
          </div>
        </div>

        <div className="pub-map-layout" style={{ height: "auto", display: "grid", gridTemplateColumns: "380px 1fr", gap: 20 }}>
          {/* Sidebar */}
          <div style={{ background: "white", border: "1px solid var(--ink-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--ink-subtle)" }}>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>Recent Incidents</div>
              {/* Filters */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {[["all", "All"], ["critical", "Critical"], ["high", "High"], ["medium", "Medium"], ["low", "Low"]].map(([v, l]) => (
                  <button key={v} className={`aq-filter-btn btn-xs ${filter === v ? "active" : ""} ${v}`} onClick={() => setFilter(v)}>{l}</button>
                ))}
              </div>
              <select className="input input-sm" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                <option value="all">All Types</option>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ maxHeight: 500, overflowY: "auto" }}>
              {filtered.map(inc => (
                <div key={inc.id} className="pub-inc-card" style={{ background: selected?.id === inc.id ? "#f0fdf4" : "white" }} onClick={() => setSelected(inc)}>
                  <div className="pic-type" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className={`dot dot-${inc.priority}`} />
                    {inc.type}
                  </div>
                  <div className="pic-location"><Icon name="pin" size={11} style={{ display: "inline" }} /> {inc.area}</div>
                  <div className="pic-meta">
                    <PriorityPill priority={inc.priority} size="sm" />
                    <StatusPill status={inc.verified ? "Verified" : "Needs verification"} />
                    <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                      {(() => { const mins = Math.floor((Date.now() - new Date(inc.reportedAt)) / 60000); return mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`; })()}
                    </span>
                  </div>
                  {selected?.id === inc.id && (
                    <div style={{ marginTop: 10, padding: "10px 12px", background: "#f0fdf4", borderRadius: 8, fontSize: 13, color: "rgba(17,45,56,.75)", lineHeight: 1.55 }}>
                      {inc.description.slice(0, 120)}...
                    </div>
                  )}
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="empty-state" style={{ padding: 32 }}>
                  <div className="empty-state-icon">🗺️</div>
                  <h3>No incidents match</h3>
                  <p>Try adjusting your filters</p>
                </div>
              )}
            </div>
          </div>
          {/* Map */}
          <div style={{ background: "white", border: "1px solid var(--ink-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ink-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Incident Map</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--teal)", fontWeight: 600 }}>
                <Icon name="lock" size={12} /> Privacy-protected · Approximate locations only
              </span>
            </div>
            <IncidentMapVis incidents={filtered} authority={false} height="520px" onMarkerClick={setSelected} />
          </div>
        </div>
      </div>
      <Footer go={go} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   EMERGENCY REPORT PAGE
   ───────────────────────────────────────────────────────────── */
function EmergencyReport({ go }) {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [recording, setRecording] = useState(false);
  const [locMode, setLocMode] = useState(null);
  const [form, setForm] = useState({ type: "Flood", description: "", location: "", locMode: null, phone: "", photo: null });
  const update = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setForm(f => ({ ...f, description: f.description + " [Voice reporting not available in this browser]" })); return; }
    const r = new SR(); r.lang = "en-IN"; setRecording(true);
    r.onresult = e => setForm(f => ({ ...f, description: e.results[0][0].transcript }));
    r.onend = () => setRecording(false);
    r.start();
  };

  const getLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      pos => setForm(f => ({ ...f, location: `Lat ${pos.coords.latitude.toFixed(4)}, Lng ${pos.coords.longitude.toFixed(4)} (device GPS)`, locMode: "gps" })),
      () => setForm(f => ({ ...f, location: "Location access denied — please enter manually", locMode: "manual" }))
    );
    setLocMode("gps");
  };

  const submit = e => {
    e.preventDefault();
    const ref = `RQ-${Date.now().toString().slice(-7)}`;
    const report = { ...form, id: ref, reference: ref, priority: "Pending review", status: "Received", createdAt: new Date().toISOString(), public: true };
    const existing = getReports();
    LS.set("resqnet-reports", [...existing, report]);
    // Also add to incidents list for dashboard
    const incs = getIncidents();
    LS.set("resqnet-incidents", [...incs, { ...report, area: "Pending", aiReason: "Awaiting AI analysis", confidence: 0, missing: [], verified: false, duplicate: false, team: null, callStatus: "Pending", lat: 28.3, lng: 77.3 }]);
    setSubmitted(report);
  };

  if (submitted) {
    return (
      <div className="screen-wrap">
        <div className="screen-header">
          <div className="screen-header-inner">
            <Brand onHome={() => go("home")} />
            <button className="btn btn-ghost btn-sm" onClick={() => go("home")}><Icon name="back" size={14} /> Home</button>
          </div>
        </div>
        <div className="report-form-wrap">
          <div className="submission-success">
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#bbf7d0", color: "#15803d", display: "grid", placeItems: "center", margin: "0 auto 20px" }}>
              <Icon name="checkCircle" size={30} />
            </div>
            <h1 className="font-display" style={{ fontSize: 34, fontWeight: 700, marginBottom: 8 }}>Report submitted successfully</h1>
            <p style={{ fontSize: 17, color: "var(--ink-muted)", maxWidth: 440, margin: "0 auto 20px" }}>Our coordination team has received your report. Keep your reference number to check for updates.</p>
            <div className="ref-number">{submitted.reference}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, maxWidth: 420, margin: "24px auto 0", textAlign: "left" }}>
              {[["Incident type", submitted.type], ["Location", submitted.location || "Not provided"], ["Status", offline ? "Saved on device — waiting to sync" : "Received by coordination team"], ["Next steps", "Authorities will review and prioritize. You may receive a follow-up call if you provided a number."]].map(([k, v]) => (
                <div key={k} style={{ background: "rgba(255,255,255,.7)", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{k}</div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>
            {offline && (
              <div style={{ marginTop: 20, padding: "12px 16px", background: "#fef3c7", borderRadius: 10, fontSize: 15, color: "#92400e", display: "flex", gap: 8 }}>
                <Icon name="cloud" size={16} /> Report saved on this device. Will sync automatically when you reconnect.
              </div>
            )}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={() => go("home")}>Return Home</button>
              <button className="btn btn-secondary" onClick={() => go("public-map")}>View Public Incidents</button>
              <button className="btn btn-ghost" onClick={() => go("login")}>Track with an Account</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-wrap">
      {/* Header */}
      <div className="report-page-header">
        <div className="report-header-inner">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <Brand onHome={() => go("home")} light />
            <button className="btn btn-ghost btn-sm" style={{ color: "rgba(255,255,255,.7)" }} onClick={() => go("home")}><Icon name="back" size={14} /> Back</button>
          </div>
          <div className="eyebrow light" style={{ marginBottom: 12 }}><span className="bar" /> No login required</div>
          <h1 className="font-display" style={{ fontSize: 38, fontWeight: 700, color: "white", marginBottom: 8 }}>Report an Emergency</h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,.65)", maxWidth: 480 }}>Share what you know. You can add details later. Essential information first — additional questions may follow if needed.</p>
        </div>
      </div>

      <div className="report-form-wrap">
        {/* Connectivity banner */}
        <div className={`offline-banner ${!offline ? "online-banner" : ""}`} style={{ marginBottom: 24 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: offline ? "#f59e0b" : "#059669", flexShrink: 0 }} />
          {offline ? "You are offline — your report will be saved on this device and synced when you reconnect." : "You are online — your report will be sent securely to the coordination team."}
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {/* Step 1: Describe */}
          <div>
            <div className="report-step-header">
              <div className="report-step-num">1</div>
              <div>
                <div className="report-step-title">Describe the incident</div>
                <div className="report-step-sub">Share only what you know. You can add details later.</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div className="field">
                <label className="field-label">Incident type *</label>
                <select className="input" value={form.type} onChange={update("type")} id="incident-type">
                  {["Flood", "Fire", "Landslide", "Building collapse", "Medical emergency", "Other"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Severity (your estimate)</label>
                <select className="input" id="incident-severity" onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                  <option value="">Not sure</option>
                  <option>People may be trapped</option>
                  <option>Injuries present</option>
                  <option>Evacuation needed</option>
                  <option>Property damage only</option>
                  <option>Monitoring / precautionary</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label className="field-label">What is happening? *</label>
              <textarea id="incident-description" className="input" value={form.description} onChange={update("description")} required placeholder="Describe the emergency: what you see, who is affected, and what immediate help is needed..." />
              <button type="button" className={`voice-btn${recording ? " recording" : ""}`} onClick={startVoice} id="voice-input-btn">
                <Icon name="mic" size={14} /> {recording ? "Listening... tap to stop" : "Describe by voice"}
              </button>
              <div className="field-hint">Voice recording uses browser speech recognition. You can review the text before submitting.</div>
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label className="field-label">Photo (optional)</label>
              <div className="photo-drop" onClick={() => document.getElementById("photo-input").click()}>
                <Icon name="upload" size={24} style={{ color: "var(--ink-muted)" }} />
                <p>Click to attach a photo</p>
                <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>JPG, PNG, WEBP · max 10MB</span>
                <input id="photo-input" type="file" accept="image/*" className="hidden" onChange={e => setForm(f => ({ ...f, photo: e.target.files[0]?.name }))} />
              </div>
              {form.photo && <div style={{ fontSize: 13, color: "var(--teal)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}><Icon name="check" size={13} /> {form.photo}</div>}
            </div>
          </div>

          {/* Step 2: Location */}
          <div>
            <div className="report-step-header">
              <div className="report-step-num">2</div>
              <div>
                <div className="report-step-title">Provide the location</div>
                <div className="report-step-sub">Even an approximate location helps responders reach the right area.</div>
              </div>
            </div>
            <div className="loc-btn-grid" style={{ marginBottom: 16 }}>
              {[
                { id: "gps", icon: "pin", label: "Use my location", sub: "Auto-detect via GPS", action: getLocation },
                { id: "map", icon: "map", label: "Select on map", sub: "Choose approximate area", action: () => { setLocMode("map"); setForm(f => ({ ...f, location: "Location selected on map (approximate)", locMode: "map" })); } },
                { id: "manual", icon: "search", label: "Enter manually", sub: "Type address or landmark", action: () => setLocMode("manual") },
              ].map(m => (
                <button key={m.id} type="button" className={`loc-btn${locMode === m.id ? " selected" : ""}`} onClick={m.action} id={`loc-${m.id}-btn`}>
                  <Icon name={m.icon} size={22} style={{ color: "var(--teal)" }} />
                  <span>{m.label}</span>
                  <small>{m.sub}</small>
                </button>
              ))}
            </div>
            <div className="field">
              <label className="field-label">Location details *</label>
              <input id="location-input" required className="input" value={form.location} onChange={update("location")} placeholder="Address, landmark, village name, or general area..." />
              <div className="field-hint">You can submit even if automatic location access fails. Your approximate description is helpful.</div>
            </div>
          </div>

          {/* Step 3: Contact */}
          <div>
            <div className="report-step-header">
              <div className="report-step-num">3</div>
              <div>
                <div className="report-step-title">Contact information (optional)</div>
                <div className="report-step-sub">Only used if responders need to follow up with clarifying questions.</div>
              </div>
            </div>
            <div className="field">
              <label className="field-label">Phone number (optional)</label>
              <input id="phone-input" className="input" value={form.phone} onChange={update("phone")} placeholder="+91 98765 43210" />
              <div className="field-hint">Your number will not be shared publicly. It is used only if the coordination team needs to clarify details to help respond effectively.</div>
            </div>
          </div>

          {/* Submit */}
          <div style={{ borderTop: "1px solid var(--ink-subtle)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <p style={{ fontSize: 13, color: "var(--ink-muted)", maxWidth: 360, lineHeight: 1.6 }}>
              You can submit without an account. Public maps show approximate locations only. Exact coordinates are restricted to authorized personnel.
            </p>
            <button id="submit-report-btn" className="btn btn-emergency" type="submit" style={{ fontSize: 17, padding: "13px 28px" }}>
              <Icon name="alert" size={16} /> Submit Emergency Report
            </button>
          </div>
        </form>
      </div>
      <Footer go={go} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   AUTH: REGISTER
   ───────────────────────────────────────────────────────────── */
function Register({ go, onSuccess }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "", location: "" });
  const update = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const [showPw, setShowPw] = useState(false);

  const submit = e => {
    e.preventDefault();
    if (form.password !== form.confirm) { alert("Passwords do not match."); return; }
    LS.set("resqnet-user", { name: form.name, email: form.email, phone: form.phone, location: form.location, role: "public" });
    onSuccess(form.name);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo-wrap"><Brand onHome={() => go("home")} /></div>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-sub">Track reports, receive updates, and stay connected to your community.</p>
        <div className="portal-badge public">
          <div className="pb-icon"><Icon name="users" size={18} /></div>
          <div><b>Public user account</b><small>For residents and community members. Does not grant authority access.</small></div>
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field"><label className="field-label">Full name *</label><input required className="input" value={form.name} onChange={update("name")} placeholder="Your full name" id="reg-name" /></div>
            <div className="field"><label className="field-label">Email *</label><input required type="email" className="input" value={form.email} onChange={update("email")} placeholder="you@example.com" id="reg-email" /></div>
            <div className="field"><label className="field-label">Phone</label><input className="input" value={form.phone} onChange={update("phone")} placeholder="+91 98765 43210" id="reg-phone" /></div>
            <div className="field"><label className="field-label">City / locality</label><input className="input" value={form.location} onChange={update("location")} placeholder="Where are you based?" id="reg-location" /></div>
          </div>
          <div className="field"><label className="field-label">Password *</label>
            <div className="password-field-wrap"><input required minLength={6} type={showPw ? "text" : "password"} className="input" value={form.password} onChange={update("password")} placeholder="At least 6 characters" id="reg-password" />
              <button type="button" className="password-toggle" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Hide" : "Show"}><Icon name={showPw ? "eyeOff" : "eye"} size={16} /></button>
            </div>
          </div>
          <div className="field"><label className="field-label">Confirm password *</label><input required type="password" className="input" value={form.confirm} onChange={update("confirm")} placeholder="Repeat your password" id="reg-confirm" /></div>
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 4 }} type="submit" id="create-account-btn">
            Create Account <Icon name="arrow" size={14} />
          </button>
        </form>
        <div className="auth-switch">Already registered? <button onClick={() => go("login")}>Log in</button></div>
        <div className="auth-divider"><span /><p>Emergency access</p><span /></div>
        <button className="btn btn-emergency" style={{ width: "100%", justifyContent: "center" }} onClick={() => go("report")}>
          <Icon name="alert" size={14} /> Report Emergency Without Account
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   AUTH: LOGIN
   ───────────────────────────────────────────────────────────── */
function Login({ go, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const submit = e => {
    e.preventDefault();
    const saved = LS.get("resqnet-user", {});
    onSuccess(saved.name || email.split("@")[0] || "ResQNet member");
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo-wrap"><Brand onHome={() => go("home")} /></div>
        <h1 className="auth-title">Public user login</h1>
        <p className="auth-sub">Track your reports and receive status updates.</p>
        <div className="portal-badge public">
          <div className="pb-icon"><Icon name="users" size={18} /></div>
          <div><b>For community members</b><small>Track reports, receive updates, manage your profile.</small></div>
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="field"><label className="field-label">Email or phone</label><input required className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" id="login-email" /></div>
          <div className="field"><label className="field-label">Password</label>
            <div className="password-field-wrap"><input required type={showPw ? "text" : "password"} className="input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" id="login-password" />
              <button type="button" className="password-toggle" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Hide" : "Show"}><Icon name={showPw ? "eyeOff" : "eye"} size={16} /></button>
            </div>
            <div style={{ textAlign: "right", marginTop: 6 }}><button type="button" style={{ fontSize: 13, color: "var(--teal)", fontWeight: 600, textDecoration: "underline" }}>Forgot password?</button></div>
          </div>
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} type="submit" id="login-btn">
            Log in <Icon name="arrow" size={14} />
          </button>
        </form>
        <div className="auth-switch">New to ResQNet? <button onClick={() => go("register")}>Create an account</button></div>
        <div className="auth-divider"><span /><p>Other options</p><span /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="btn btn-emergency" style={{ width: "100%", justifyContent: "center" }} onClick={() => go("report")} id="emergency-no-login-btn">
            <Icon name="alert" size={14} /> Report Emergency Without Logging In
          </button>
          <button className="btn btn-secondary" style={{ width: "100%", justifyContent: "center" }} onClick={() => go("authority-login")}>
            <Icon name="shield" size={14} /> Go to Authority Portal
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   AUTH: AUTHORITY LOGIN
   ───────────────────────────────────────────────────────────── */
const AUTHORITY_PASSWORD = "ResQNet@2026";

function AuthorityLogin({ go, onSuccess }) {
  const [tab, setTab] = useState("login");
  const [org, setOrg] = useState("");
  const [orgType, setOrgType] = useState("Government disaster team");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);

  const submit = e => {
    e.preventDefault();
    if (tab === "register") { setRegistered(true); return; }
    if (password.trim() !== AUTHORITY_PASSWORD) { setError("Incorrect authority password. Use the prototype password shown below."); return; }
    setError("");
    LS.set("resqnet-authority", { org, orgType, email, role: "authority" });
    onSuccess();
  };

  if (registered) return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#d1fae5", color: "#059669", display: "grid", placeItems: "center", margin: "0 auto 20px" }}>
          <Icon name="checkCircle" size={32} />
        </div>
        <h1 className="auth-title">Registration submitted</h1>
        <p style={{ fontSize: 16, color: "var(--ink-muted)", lineHeight: 1.65, marginBottom: 24 }}><strong>{org}</strong> is pending approval. The ResQNet admin team will verify your {orgType.toLowerCase()} credentials. Access credentials are provided only after approval.</p>
        <button className="btn btn-primary" style={{ justifyContent: "center", width: "100%" }} onClick={() => go("home")}>Return Home</button>
      </div>
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-logo-wrap"><Brand onHome={() => go("home")} /></div>
        <h1 className="auth-title">Authority Portal</h1>
        <p className="auth-sub">For approved responder organizations — NGOs, government teams, emergency services.</p>
        <div className="portal-badge authority">
          <div className="pb-icon"><Icon name="shield" size={18} /></div>
          <div><b>Protected access</b><small>This portal leads to the command center, not the public dashboard.</small></div>
        </div>
        <div style={{ display: "flex", background: "#f0f4f8", borderRadius: 10, padding: 4, marginBottom: 24 }}>
          {[["login", "Authority Login"], ["register", "Register Organization"]].map(([v, l]) => (
            <button key={v} type="button" onClick={() => { setTab(v); setError(""); }} style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 15, fontWeight: 600, background: tab === v ? "white" : "transparent", color: tab === v ? "var(--teal)" : "var(--ink-muted)", boxShadow: tab === v ? "var(--shadow-sm)" : "none", transition: "all .2s" }}>{l}</button>
          ))}
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field"><label className="field-label">Organization type</label>
              <select className="input" value={orgType} onChange={e => setOrgType(e.target.value)} id="auth-org-type">
                {["Government disaster team", "NGO", "Emergency services", "Healthcare organization", "Relief & volunteer group"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field"><label className="field-label">Organization name</label><input required className="input" value={org} onChange={e => setOrg(e.target.value)} placeholder="e.g. State NDRF" id="auth-org-name" /></div>
          </div>
          <div className="field"><label className="field-label">Coordinator email / ID</label><input required className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="coordinator@agency.gov.in" id="auth-email" /></div>
          {tab === "login" && (
            <>
              <div className="field"><label className="field-label">Shared authority password</label>
                <div className="password-field-wrap"><input required type={showPw ? "text" : "password"} className="input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Authority access password" id="auth-password" />
                  <button type="button" className="password-toggle" onClick={() => setShowPw(!showPw)} aria-label="Toggle password"><Icon name={showPw ? "eyeOff" : "eye"} size={16} /></button>
                </div>
              </div>
              <div className="proto-hint">
                <span>Prototype access password:</span>
                <b>{AUTHORITY_PASSWORD}</b>
                <button type="button" onClick={() => { setPassword(AUTHORITY_PASSWORD); setError(""); }}>Use this</button>
              </div>
              {error && <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", fontSize: 15, color: "#dc2626", display: "flex", gap: 8 }}><Icon name="alert" size={14} /> {error}</div>}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", background: "#eff6ff", borderRadius: 8, fontSize: 13, color: "#1e40af" }}>
                <Icon name="shield" size={14} style={{ flexShrink: 0, marginTop: 2 }} /> Public registration never creates authority access. Organization approval and a managed shared password are required.
              </div>
            </>
          )}
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", background: "var(--navy)" }} type="submit" id="authority-submit-btn">
            {tab === "login" ? "Enter Command Center" : "Submit Organization Registration"} <Icon name="arrow" size={14} />
          </button>
          <button type="button" className="btn btn-emergency" style={{ width: "100%", justifyContent: "center" }} onClick={() => go("report")}>
            <Icon name="alert" size={14} /> Report Emergency Without Login
          </button>
        </form>
        <div className="auth-switch">Public user? <button onClick={() => go("login")}>Log in here</button></div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DASHBOARD SHELL
   ───────────────────────────────────────────────────────────── */
function DashboardShell({ name, authority = false, activeTab, setTab, go, onLogout, missedCalls = 0, children }) {
  const navItems = authority
    ? [
        { id: "overview", label: "Overview", icon: "zap" },
        { id: "queue", label: "Incident Queue", icon: "list" },
        { id: "map", label: "Incident Map", icon: "map" },
        { id: "verification", label: "Verification", icon: "shield" },
        { id: "calls", label: "Follow-Up Calls", icon: "phone" },
        { id: "coordination", label: "Response Coordination", icon: "users" },
        { id: "weather", label: "Weather & Context", icon: "weather" },
        { id: "admin", label: "Admin & Permissions", icon: "settings" },
      ]
    : [
        { id: "overview", label: "Overview", icon: "zap" },
        { id: "my-reports", label: "My Reports", icon: "list" },
        { id: "calls", label: "AI Follow-Up Calls", icon: "phoneIncoming", badge: missedCalls || null },
        { id: "public-map", label: "Public Incidents", icon: "map" },
        { id: "notifications", label: "Notifications", icon: "bell", badge: 3 },
        { id: "profile", label: "Profile & Settings", icon: "settings" },
      ];

  return (
    <div className="db-layout">
      <aside className="db-sidebar">
        <div className="db-sidebar-top">
          <Brand onHome={() => go("home")} light />
        </div>
        <div className="db-workspace-badge" style={{ margin: 12, marginTop: 14 }}>
          <div className={`db-workspace-badge-dot ${authority ? "authority" : "public"}`} />
          <div>
            <b>{authority ? "Authority workspace" : "Public dashboard"}</b>
            <small>{authority ? "Protected access" : "Connected account"}</small>
          </div>
        </div>
        <nav className="db-nav" aria-label="Dashboard navigation">
          <div className="db-nav-section">
            <div className="db-nav-label">Workspace</div>
            {navItems.map(item => (
              <button key={item.id} className={`db-nav-item${activeTab === item.id ? " active" : ""}`} onClick={() => setTab(item.id)}>
                <Icon name={item.icon} size={16} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {!!item.badge && <span className="db-nav-badge">{item.badge}</span>}
              </button>
            ))}
          </div>
          {!authority && (
            <div className="db-nav-section" style={{ marginTop: 12 }}>
              <div className="db-nav-label">Quick Actions</div>
              <button className="db-nav-item" onClick={() => go("report")} style={{ background: "rgba(239,68,68,.12)", color: "#fca5a5" }}>
                <Icon name="alert" size={16} /> Report Emergency
              </button>
            </div>
          )}
        </nav>
        <div className="db-sidebar-bottom">
          <div className="db-user">
            <div className={`db-avatar${authority ? " authority-avatar" : ""}`}>{(name || "R").charAt(0).toUpperCase()}</div>
            <div>
              <b>{authority ? "Responder" : name}</b>
              <small>{authority ? "Authorized personnel" : "ResQNet member"}</small>
            </div>
          </div>
          <button className="db-logout" onClick={onLogout}><Icon name="logout" size={14} /> Log out</button>
        </div>
      </aside>
      <div className="db-main">
        <header className="db-topbar">
          <div>
            <div className="db-topbar-kicker">{authority ? "COMMAND CENTER" : "MY RESQNET"}</div>
            <div className="db-topbar-title">{authority ? "Authority Command Center" : `Welcome back, ${name}`}</div>
          </div>
          <div className="db-topbar-actions">
            <button className="topbar-icon-btn" aria-label="Notifications" onClick={() => setTab("notifications")}>
              <Icon name="bell" size={16} />
              <span className="notif-dot" />
            </button>
            {!authority && (
              <button className="btn btn-emergency btn-sm" onClick={() => go("report")}>
                <Icon name="alert" size={13} /> Report Emergency
              </button>
            )}
          </div>
        </header>
        <main className="db-content">{children}</main>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PUBLIC USER DASHBOARD — AI FOLLOW-UP CALL PANEL
   ───────────────────────────────────────────────────────────── */
function timeAgoShort(iso) {
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const fmtDur = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const CALL_SCRIPT = [
  { q: "Hello, this is the ResQNet AI assistant following up on your emergency report. Is now a good time?", a: "Yes, I can talk." },
  { q: "Can you confirm the location you reported is still correct?", a: "Yes, the location is correct." },
  { q: "Has the situation changed since you submitted the report?", a: "No change from what I reported." },
  { q: "Is anyone in immediate danger at that location right now?", a: "Yes — help is still needed there." },
  { q: "Thank you. Your answers were added to the report for responders.", a: "Understood, thank you." },
];

const CALL_STATUS = {
  received: { icon: "checkCircle", cls: "call-icon completed", label: "Received", pill: "pill-verified" },
  missed: { icon: "phoneMissed", cls: "call-icon failed", label: "Missed call", pill: "pill-critical" },
  declined: { icon: "phoneMissed", cls: "call-icon failed", label: "Couldn't talk", pill: "pill-unverified" },
  scheduled: { icon: "phoneIncoming", cls: "call-icon pending", label: "Return call scheduled", pill: "pill-pending" },
  ringing: { icon: "phoneIncoming", cls: "call-icon pending", label: "Incoming now", pill: "pill-verified" },
  active: { icon: "phone", cls: "call-icon completed", label: "In progress", pill: "pill-assigned" },
};

function UserCallsPanel({ calls, ringing, active, elapsed, step, reports, onAnswer, onDecline, onEnd, onRequestCallback, onMarkReviewed, onNewReport }) {
  const received = calls.filter(c => c.status === "received").length;
  const missed = calls.filter(c => c.status === "missed" || c.status === "declined").length;

  return (
    <div>
      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#1e40af", display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Icon name="phone" size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>Calls are simulated in this prototype. In production this connects to a telephony provider (Twilio / Exotel) running the AI voice agent or IVR mode.</span>
      </div>

      {/* Incoming AI call */}
      {ringing && (
        <div className="call-incoming">
          <div className="call-phone-pulse"><Icon name="phoneIncoming" size={24} /></div>
          <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#6ee7b7" }}>Incoming AI follow-up call</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{ringing.incidentType} — {ringing.reportRef}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.65)", marginTop: 4 }}>{ringing.reason}</div>
          </div>
          <div style={{ display: "flex", gap: 10, position: "relative", zIndex: 1, flexWrap: "wrap" }}>
            <button className="btn btn-sm" style={{ background: "#10b981", color: "white" }} onClick={() => onAnswer(ringing.id)}>
              <Icon name="phone" size={13} /> Answer
            </button>
            <button className="btn btn-sm" style={{ background: "rgba(255,255,255,.14)", color: "rgba(255,255,255,.85)" }} onClick={() => onDecline(ringing.id)}>
              Can't talk now
            </button>
          </div>
        </div>
      )}

      {/* Active call */}
      {active && (
        <div className="call-active-card">
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div className="waveform">{Array.from({ length: 9 }).map((_, i) => <span key={i} style={{ animationDelay: `${i * 0.1}s` }} />)}</div>
            <div style={{ flex: 1, minWidth: 200, position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>AI follow-up call in progress</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.65)", marginTop: 2 }}>{active.incidentType} — {active.reportRef} · {fmtDur(elapsed)}</div>
            </div>
            <button className="btn btn-danger btn-sm" onClick={onEnd}><Icon name="x" size={12} /> End call</button>
          </div>
          <div className="call-transcript" style={{ position: "relative", zIndex: 1 }}>
            {CALL_SCRIPT.map((line, i) => (
              <div key={line.q} style={{ opacity: i <= step ? 1 : .3, transition: "opacity .4s", marginBottom: i < CALL_SCRIPT.length - 1 ? 12 : 0 }}>
                <div className="ct-agent">AI agent: {line.q}</div>
                {i < step && <div className="ct-user">You: {line.a}</div>}
              </div>
            ))}
            {step >= CALL_SCRIPT.length && (
              <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: "#6ee7b7" }}>All questions answered — you can end the call.</div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card neutral"><div className="stat-label">Total calls</div><div className="stat-value">{calls.length}</div><div className="stat-sub">AI &amp; IVR follow-ups</div></div>
        <div className="stat-card ok"><div className="stat-label">Received</div><div className="stat-value">{received}</div><div className="stat-sub">Details captured</div></div>
        <div className="stat-card critical"><div className="stat-label">Missed</div><div className="stat-value v-critical">{missed}</div><div className="stat-sub">Request a return call</div></div>
      </div>

      {/* Request a follow-up call */}
      <div className="card card-p" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Request a return call</h3>
        <p style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 14, lineHeight: 1.55 }}>Missed our call? Ask the AI agent to call you back so you can confirm details on your report — it only takes a minute.</p>
        {reports.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>No reports on this device yet — <button onClick={onNewReport} style={{ color: "var(--teal)", fontWeight: 600, textDecoration: "underline" }}>submit a report</button> to enable follow-up calls about it.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {reports.map(r => (
              <div key={r.reference} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "var(--cream)", borderRadius: 10 }}>
                <div className="my-report-ref" style={{ minWidth: 96 }}>{r.reference}</div>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{r.type}</div>
                <button className="btn btn-primary btn-sm" onClick={() => onRequestCallback(r.reference, r.type)}>
                  <Icon name="phoneIncoming" size={12} /> Call me back
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Call history */}
      <div style={{ fontFamily: "Lora, serif", fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Call history</div>
      {calls.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📞</div><h3>No follow-up calls yet</h3><p>The AI agent will call if details are missing from a report.</p></div>
      ) : calls.map(c => {
        const meta = CALL_STATUS[c.status] || CALL_STATUS.missed;
        return (
          <div key={c.id} className="call-row">
            <div className={meta.cls}><Icon name={meta.icon} size={18} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{c.incidentType} — {c.reportRef}</span>
                <span className={`call-mode-badge ${c.mode}`}>{c.mode === "ai" ? "AI-Assisted" : "IVR"}</span>
                <span className={`pill ${meta.pill}`}>{meta.label}</span>
                {c.reviewed && <span className="pill pill-resolved">Reviewed</span>}
              </div>
              <div className="call-detail">{timeAgoShort(c.at)}{c.durationSec ? ` · ${fmtDur(c.durationSec)} call` : ""} · {c.mode === "ai" ? "ResQNet AI voice agent" : "ResQNet IVR line"}</div>
              <div className="call-q"><b>Reason for call:</b><div style={{ marginTop: 4 }}>{c.reason}</div></div>
              {c.transcript?.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                  {c.transcript.map(t => (
                    <div key={t.q} style={{ background: "var(--cream)", borderRadius: 8, padding: "8px 10px" }}>
                      <div className="ct-agent dark">AI: {t.q}</div>
                      <div className="ct-user dark">You: {t.a}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
              {(c.status === "missed" || c.status === "declined") && (
                <button className="btn btn-primary btn-sm" onClick={() => onRequestCallback(c.reportRef, c.incidentType)}>
                  <Icon name="phoneIncoming" size={12} /> Return call
                </button>
              )}
              {c.status === "received" && !c.reviewed && (
                <button className="btn btn-secondary btn-sm" onClick={() => onMarkReviewed(c.id)}>Mark reviewed</button>
              )}
              {c.status === "scheduled" && (
                <span className="pill pill-pending">Waiting for callback…</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UserDashboard({ name, go, onLogout }) {
  const [tab, setTab] = useState("overview");
  const reports = getReports();
  const incidents = getIncidents().filter(i => i.public).slice(0, 5);
  const [refSearch, setRefSearch] = useState("");
  const [refResult, setRefResult] = useState(null);
  const [profile, setProfile] = useState(() => LS.get("resqnet-user", {}));

  /* community upvotes (public incident confirmation) */
  const [upvoted, setUpvoted] = useState(() => LS.get("resqnet-user-upvotes", []));
  const toggleUpvote = (id) => setUpvoted(prev => {
    const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
    LS.set("resqnet-user-upvotes", next);
    return next;
  });

  /* AI follow-up calls */
  const [calls, setCalls] = useState(getUserCalls);
  const [activeId, setActiveId] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [step, setStep] = useState(0);
  const [toast, setToast] = useState(null);
  const callTimers = useRef({ tick: null, advance: null, ring: null });

  const showToast = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200); };

  const persistCalls = (next) => { setCalls(next); saveUserCalls(next); };
  const stopCallTimers = () => {
    if (callTimers.current.tick) clearInterval(callTimers.current.tick);
    if (callTimers.current.advance) clearInterval(callTimers.current.advance);
    callTimers.current.tick = null;
    callTimers.current.advance = null;
  };
  useEffect(() => () => { stopCallTimers(); if (callTimers.current.ring) clearTimeout(callTimers.current.ring); }, []);

  const ringing = calls.find(c => c.status === "ringing");
  const active = calls.find(c => c.id === activeId);
  const missedCount = calls.filter(c => c.status === "missed").length;

  const requestReturnCall = (reportRef, incidentType = "Your report") => {
    if (calls.some(c => c.status === "ringing" || c.status === "active" || c.status === "scheduled")) {
      showToast("A follow-up call is already pending", "error");
      return;
    }
    const id = `CL-${Date.now().toString().slice(-6)}`;
    const entry = {
      id, reportRef, incidentType, mode: "ai", status: "scheduled",
      at: new Date().toISOString(), durationSec: null,
      reason: "You requested a return call — the AI agent will confirm missing details on your report",
      transcript: [], reviewed: false,
    };
    persistCalls([entry, ...calls]);
    showToast("Return call requested — the AI agent will ring you in a moment");
    callTimers.current.ring = setTimeout(() => {
      setCalls(prev => {
        const next = prev.map(c => c.id === id ? { ...c, status: "ringing", at: new Date().toISOString() } : c);
        saveUserCalls(next);
        return next;
      });
      showToast("Incoming AI follow-up call — pick up to continue", "ok");
    }, 6000);
  };

  const answerCall = (id) => {
    if (callTimers.current.ring) { clearTimeout(callTimers.current.ring); callTimers.current.ring = null; }
    setActiveId(id); setStep(0); setElapsed(0);
    persistCalls(calls.map(c => c.id === id ? { ...c, status: "active" } : c));
    callTimers.current.tick = setInterval(() => setElapsed(e => e + 1), 1000);
    callTimers.current.advance = setInterval(() => setStep(s => (s >= CALL_SCRIPT.length ? s : s + 1)), 2600);
  };

  const declineCall = (id) => {
    if (callTimers.current.ring) { clearTimeout(callTimers.current.ring); callTimers.current.ring = null; }
    persistCalls(calls.map(c => c.id === id ? { ...c, status: "declined" } : c));
    showToast("Call declined — request a return call whenever you're ready");
  };

  const endCall = () => {
    stopCallTimers();
    const done = Math.min(step, CALL_SCRIPT.length);
    persistCalls(calls.map(c => c.id === activeId
      ? { ...c, status: "received", durationSec: elapsed, reviewed: false,
          transcript: CALL_SCRIPT.slice(0, done).map(x => ({ q: x.q, a: x.a })) }
      : c));
    setActiveId(null);
    showToast(`Call ended — ${done} detail${done === 1 ? "" : "s"} captured for responders`);
  };

  const markReviewed = (id) => {
    if (!id) return;
    persistCalls(calls.map(c => c.id === id ? { ...c, reviewed: true } : c));
    showToast("Marked as reviewed");
  };

  const notifications = [
    ...calls.filter(c => c.status === "missed").map(c => ({
      msg: `AI follow-up call about ${c.reportRef} was missed — request a return call to verify faster.`,
      time: timeAgoShort(c.at),
    })),
    ...calls.filter(c => c.status === "received").slice(0, 1).map(c => ({
      msg: `AI follow-up call about ${c.reportRef} completed — ${c.transcript.length} detail${c.transcript.length === 1 ? "" : "s"} captured.`,
      time: timeAgoShort(c.at),
    })),
    { msg: "Your report RQ-3840211 has been received by the coordination team.", time: "2 minutes ago" },
    { msg: "A response team has been assigned to the flood incident near River Belt Colony.", time: "18 minutes ago" },
    { msg: "Report RQ-3840150 status updated to 'Monitoring'.", time: "1 hour ago" },
    { msg: "Public incident map updated — 4 new reports in your area.", time: "2 hours ago" },
  ];

  return (
    <DashboardShell name={name} authority={false} activeTab={tab} setTab={setTab} go={go} onLogout={onLogout} missedCalls={missedCount}>
      {/* OVERVIEW */}
      {tab === "overview" && (
        <div>
          <div className="stats-grid">
            <div className="stat-card neutral"><div className="stat-label">My Reports</div><div className="stat-value">{reports.length}</div><div className="stat-sub">Submitted by you</div></div>
            <div className="stat-card neutral"><div className="stat-label">Unread Notifications</div><div className="stat-value">{notifications.length}</div><div className="stat-sub">Check updates</div></div>
            <div className="stat-card critical"><div className="stat-label">Public Incidents</div><div className="stat-value">{incidents.length}</div><div className="stat-sub">Active today</div></div>
          </div>
          {missedCount > 0 && (
            <div className="missed-call-banner">
              <div className="call-icon failed"><Icon name="phoneMissed" size={18} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{missedCount} AI follow-up {missedCount === 1 ? "call" : "calls"} missed</div>
                <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 2 }}>The AI agent tried to reach you about missing report details. A quick return call helps responders verify your report faster.</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setTab("calls")}><Icon name="phoneIncoming" size={13} /> View calls</button>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
            <div className="card card-p">
              <div style={{ fontFamily: "Lora, serif", fontSize: 21, fontWeight: 700, marginBottom: 4 }}>Recent public incidents near you</div>
              <div style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 16 }}>Public information only. Precise locations are restricted to authorized personnel. If you are at the scene, upvote a genuine incident so responders can verify it faster.</div>
              {incidents.map(inc => (
                <div key={inc.id} className="my-report-card">
                  <div className={`dot dot-${inc.priority}`} />
                  <div style={{ flex: 1 }}>
                    <div className="my-report-type">{inc.type}</div>
                    <div className="my-report-meta">{inc.area} · {(() => { const m = Math.floor((Date.now() - new Date(inc.reportedAt)) / 60000); return m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`; })()}</div>
                  </div>
                  <PriorityPill priority={inc.priority} size="sm" />
                  <StatusPill status={inc.status} />
                  <UpvoteButton incident={inc} upvoted={upvoted.includes(inc.id)} onToggle={toggleUpvote} />
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => setTab("public-map")}>View all incidents →</button>
            </div>
            <div className="card card-p">
              <div style={{ fontFamily: "Lora, serif", fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Track anonymous report</div>
              <p style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 14, lineHeight: 1.6 }}>Enter a reference number to check a report submitted without login. Sensitive location details remain protected.</p>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="input input-sm" value={refSearch} onChange={e => setRefSearch(e.target.value)} placeholder="RQ-1234567" style={{ fontFamily: "monospace" }} />
                <button className="btn btn-primary btn-sm" onClick={() => { const r = reports.find(r => r.reference === refSearch.trim()); setRefResult(r || { reference: refSearch, status: "Not found", type: "Unknown" }); }}>Find</button>
              </div>
              {refResult && (
                <div style={{ marginTop: 12, background: refResult.type === "Unknown" ? "#fee2e2" : "#f0fdf4", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, marginBottom: 4 }}>{refResult.reference}</div>
                  <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>{refResult.type} · {refResult.status}</div>
                </div>
              )}
              <div className="divider" />
              <div style={{ fontFamily: "Lora, serif", fontSize: 17, fontWeight: 700, marginBottom: 10 }}>Recent notifications</div>
              {notifications.slice(0, 2).map((n, i) => (
                <div key={i} className="notif-item">
                  <div className="notif-dot" />
                  <div>
                    <div className="notif-msg">{n.msg}</div>
                    <div className="notif-time">{n.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MY REPORTS */}
      {tab === "my-reports" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h2 className="font-display" style={{ fontSize: 26, fontWeight: 700 }}>My Reports</h2>
              <p style={{ fontSize: 15, color: "var(--ink-muted)", marginTop: 4 }}>Private status updates for reports connected to this device.</p>
            </div>
            <button className="btn btn-emergency btn-sm" onClick={() => go("report")}><Icon name="plus" size={14} /> New Report</button>
          </div>
          {reports.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📋</div><h3>No reports yet</h3><p>Emergency reports submitted from this device will appear here.</p><button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => go("report")}>Submit a Report</button></div>
          ) : reports.map(r => (
            <div key={r.reference} className="my-report-card">
              <div className="my-report-ref">{r.reference}</div>
              <div style={{ flex: 1 }}>
                <div className="my-report-type">{r.type}</div>
                <div className="my-report-meta">{r.location} · {new Date(r.createdAt).toLocaleString()}</div>
              </div>
              {calls.some(c => c.reportRef === r.reference) && (
                <button className="btn btn-secondary btn-sm" onClick={() => setTab("calls")}>
                  <Icon name="phone" size={12} /> Follow-up call
                </button>
              )}
              <StatusPill status={r.status} />
            </div>
          ))}
          <div className="card card-p" style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Track an anonymous report</h3>
            <p style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 12, lineHeight: 1.55 }}>Enter a reference number from a report submitted without login.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="input input-sm" value={refSearch} onChange={e => setRefSearch(e.target.value)} placeholder="RQ-1234567" style={{ fontFamily: "monospace" }} />
              <button className="btn btn-primary btn-sm" onClick={() => { const r = reports.find(r => r.reference === refSearch.trim()); setRefResult(r || { reference: refSearch, status: "Reference not found on this device", type: "Anonymous report" }); }}>Find</button>
            </div>
            {refResult && <div style={{ marginTop: 10, background: "#f0fdf4", borderRadius: 8, padding: "10px 12px", fontSize: 13 }}><b style={{ fontFamily: "monospace" }}>{refResult.reference}</b> · {refResult.type} · {refResult.status}</div>}
          </div>
        </div>
      )}

      {/* AI FOLLOW-UP CALLS */}
      {tab === "calls" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h2 className="font-display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>AI Follow-Up Calls</h2>
            <p style={{ fontSize: 15, color: "var(--ink-muted)", maxWidth: 680 }}>The AI agent calls back when details are missing from a report. Answer to confirm location, status and urgency — answers are attached to your report for responders.</p>
          </div>
          <UserCallsPanel
            calls={calls}
            ringing={ringing}
            active={active}
            elapsed={elapsed}
            step={step}
            reports={reports}
            onAnswer={answerCall}
            onDecline={declineCall}
            onEnd={endCall}
            onRequestCallback={requestReturnCall}
            onMarkReviewed={markReviewed}
            onNewReport={() => go("report")}
          />
        </div>
      )}

      {/* PUBLIC MAP */}
      {tab === "public-map" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div><h2 className="font-display" style={{ fontSize: 26, fontWeight: 700 }}>Public Incident Map</h2><p style={{ fontSize: 15, color: "var(--ink-muted)", marginTop: 4 }}>Approximate locations only — precise coordinates are restricted to responders.</p></div>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--teal)", background: "var(--teal-light)", padding: "6px 12px", borderRadius: 999 }}><Icon name="lock" size={11} /> Privacy protected</span>
          </div>
          <div className="card" style={{ overflow: "hidden" }}>
            <IncidentMapVis incidents={getIncidents()} authority={false} height="380px" />
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
            {[["critical", "#ef4444", "Critical"], ["high", "#f59e0b", "High priority"], ["medium", "#3b82f6", "Medium"], ["low", "#10b981", "Monitoring"]].map(([p, c, l]) => (
              <span key={p} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-muted)" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: c, display: "inline-block" }} />{l}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* NOTIFICATIONS */}
      {tab === "notifications" && (
        <div>
          <h2 className="font-display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Notifications</h2>
          <p style={{ fontSize: 15, color: "var(--ink-muted)", marginBottom: 24 }}>Updates about your reports and relevant incidents.</p>
          <div className="card card-p">
            {notifications.map((n, i) => (
              <div key={i} className="notif-item">
                <div className="notif-dot" style={{ background: i < 3 ? "var(--teal)" : "#d1d5db" }} />
                <div>
                  <div className="notif-msg">{n.msg}</div>
                  <div className="notif-time">{n.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PROFILE */}
      {tab === "profile" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="card card-p">
            <h2 className="font-display" style={{ fontSize: 21, fontWeight: 700, marginBottom: 20 }}>Your Profile</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field"><label className="field-label">Full name</label><input className="input" value={profile.name || ""} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="field"><label className="field-label">Email</label><input className="input" value={profile.email || ""} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} /></div>
              <div className="field"><label className="field-label">Phone</label><input className="input" value={profile.phone || ""} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} /></div>
              <div className="field"><label className="field-label">Location / city</label><input className="input" value={profile.location || ""} onChange={e => setProfile(p => ({ ...p, location: e.target.value }))} /></div>
              <button className="btn btn-primary" onClick={() => LS.set("resqnet-user", profile)}>Save profile</button>
            </div>
          </div>
          <div className="card card-p">
            <h2 className="font-display" style={{ fontSize: 21, fontWeight: 700, marginBottom: 20 }}>Privacy & Notifications</h2>
            {[["Email me about report status", true], ["Show my reports on public map (approximate)", true], ["SMS updates for urgent nearby incidents", false], ["Allow follow-up calls for my reports", true]].map(([label, def]) => (
              <label key={label} className="setting-toggle" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: "1px solid var(--ink-subtle)", fontSize: 15, color: "rgba(17,45,56,.75)", cursor: "pointer" }}>
                <input type="checkbox" defaultChecked={def} style={{ accentColor: "var(--teal)", width: 16, height: 16 }} />
                {label}
              </label>
            ))}
            <p style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 16, lineHeight: 1.6 }}>Anonymous reports are never linked to your profile unless you retrieve them using their reference number.</p>
          </div>
        </div>
      )}
      {/* Toast */}
      {toast && (
        <div className={`toast${toast.type === "error" ? " error" : ""}`}>{toast.msg}</div>
      )}
    </DashboardShell>
  );
}

/* ─────────────────────────────────────────────────────────────
   AUTHORITY DASHBOARD
   ───────────────────────────────────────────────────────────── */
function AuthorityDashboard({ go, onLogout }) {
  const [tab, setTab] = useState("overview");
  const [incidents, setIncidents] = useState(getIncidents());
  const [selected, setSelected] = useState(null);
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200); };

  const updateIncident = (id, changes) => {
    const updated = incidents.map(i => i.id === id ? { ...i, ...changes } : i);
    setIncidents(updated);
    saveIncidents(updated);
    if (selected?.id === id) setSelected({ ...selected, ...changes });
  };

  const filteredQueue = incidents.filter(i => {
    const pOk = filterPriority === "all" || i.priority === filterPriority;
    const sOk = filterStatus === "all" || i.status === filterStatus;
    const tOk = filterType === "all" || i.type === filterType;
    return pOk && sOk && tOk;
  });

  const stats = {
    total: incidents.filter(i => i.status !== "Resolved").length,
    critical: incidents.filter(i => i.priority === "critical").length,
    high: incidents.filter(i => i.priority === "high").length,
    verification: incidents.filter(i => !i.verified).length,
    unassigned: incidents.filter(i => !i.team && i.status !== "Resolved").length,
  };

  const weather = { temp: "28°C", rain: "48mm/hr", humidity: "91%", wind: "22km/h NE", alert: "Heavy rain warning active in River Belt district. Flash flood risk elevated through 23:00." };

  function timeAgo(iso) { const m = Math.floor((Date.now() - new Date(iso)) / 60000); return m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`; }

  /* ---- Incident Detail Panel ---- */
  function IncidentDetailPanel({ inc }) {
    if (!inc) return (
      <div className="id-panel">
        <div style={{ padding: 32, textAlign: "center", color: "var(--ink-muted)" }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Select an incident</div>
          <div style={{ fontSize: 15 }}>Click any incident in the queue to view details, AI analysis, and verification options.</div>
        </div>
      </div>
    );

    return (
      <div className="id-panel">
        <div className="id-panel-header">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--teal)", marginBottom: 4 }}>Incident Details</div>
              <div style={{ fontFamily: "Lora, serif", fontSize: 21, fontWeight: 700 }}>{inc.type}</div>
              <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 3 }}>{inc.id} · {timeAgo(inc.reportedAt)}</div>
            </div>
            <PriorityPill priority={inc.priority} />
          </div>
        </div>
        <div className="id-panel-body">
          {/* AI Analysis */}
          <div className="id-section">
            <div className="id-section-title">AI Analysis — Pipeline 3: Urgency Ranking</div>
            <div className="ai-panel">
              <div className="ai-panel-title"><Icon name="zap" size={14} /> AI Priority Recommendation</div>
              <div className="ai-priority-badge" style={{ color: { critical: "#dc2626", high: "#d97706", medium: "#2563eb", low: "#059669" }[inc.priority] || "#374151" }}>
                {inc.priority?.toUpperCase()} PRIORITY
              </div>
              <p className="ai-reasoning">{inc.aiReason}</p>
              {inc.missing?.length > 0 && (
                <div className="ai-missing">
                  <div className="ai-missing-title">⚠️ Missing information</div>
                  {inc.missing.map(m => (
                    <div key={m} className="ai-missing-item"><Icon name="alert" size={12} /> {m}</div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-muted)", marginBottom: 4 }}>
                  <span>AI Confidence</span><span>{inc.confidence}%</span>
                </div>
                <div className="confidence-bar"><div className="confidence-fill" style={{ width: `${inc.confidence}%` }} /></div>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--ink-muted)", fontStyle: "italic" }}>AI analysis assists review — it does not verify the incident.</div>
            </div>
          </div>

          {/* Report Info */}
          <div className="id-section">
            <div className="id-section-title">Report Information</div>
            {[
              ["Incident ID", inc.id],
              ["Category", inc.type],
              ["Location", inc.location],
              ["Reported", timeAgo(inc.reportedAt)],
              ["Status", <StatusPill status={inc.status} />],
              ["Verified", inc.verified ? "✅ Yes" : "❌ Awaiting verification"],
              ["Team assigned", inc.team || "None"],
              ["Reporter contact", inc.reporter ? `${inc.reporter} (restricted)` : "Not provided"],
              ["Weather context", inc.weather || "N/A"],
            ].map(([k, v]) => (
              <div key={k} className="id-field">
                <span className="id-field-key">{k}</span>
                <span className="id-field-val">{v}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="id-section">
            <div className="id-section-title">Report Description</div>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(17,45,56,.8)" }}>{inc.description}</p>
          </div>

          {/* Duplicate flag */}
          {inc.duplicate && (
            <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8, padding: "10px 12px", marginBottom: 16, fontSize: 13, color: "#92400e", display: "flex", gap: 8 }}>
              <Icon name="alert" size={14} /> This report may be a duplicate of another incident. Review before creating a separate response.
            </div>
          )}

          {/* Override */}
          {showOverride && (
            <div className="override-box">
              <div style={{ fontSize: 13, fontWeight: 700, color: "#c2410c", marginBottom: 8 }}>Record reason for overriding AI priority</div>
              <textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder="Explain why you are changing the priority..." />
            </div>
          )}

          {/* Actions */}
          <div className="id-section">
            <div className="id-section-title">Verification Actions</div>
            <div className="id-action-grid">
              <button className="id-action-btn primary full" onClick={() => { updateIncident(inc.id, { verified: true, status: "Verified" }); showToast("Incident confirmed and verified"); }}>
                ✅ Confirm Incident
              </button>
              <button className="id-action-btn" onClick={() => { updateIncident(inc.id, { status: "Needs information" }); showToast("Flagged — additional information requested"); }}>
                📋 Request Information
              </button>
              <button className="id-action-btn" onClick={() => { updateIncident(inc.id, { status: "Escalated", priority: "critical" }); showToast("Priority escalated to Critical"); }}>
                🔺 Escalate Priority
              </button>
              <button className="id-action-btn" onClick={() => { updateIncident(inc.id, { duplicate: !inc.duplicate }); showToast(inc.duplicate ? "Duplicate flag removed" : "Flagged as possible duplicate"); }}>
                🔁 {inc.duplicate ? "Unmark Duplicate" : "Flag Duplicate"}
              </button>
              <button className="id-action-btn" onClick={() => setShowOverride(!showOverride)}>
                ✏️ Override AI Reasoning
              </button>
              {showOverride && <button className="id-action-btn primary" onClick={() => { if (overrideReason) { updateIncident(inc.id, { aiReason: `[HUMAN OVERRIDE] ${overrideReason}` }); setShowOverride(false); setOverrideReason(""); showToast("AI reasoning overridden"); } }}>Save Override</button>}
              <button className="id-action-btn danger full" onClick={() => { updateIncident(inc.id, { status: "Needs verification", verified: false }); showToast("Marked as unverified"); }}>
                ❌ Mark as Unverified
              </button>
            </div>
          </div>

          {/* Team Assignment */}
          <div className="id-section">
            <div className="id-section-title">Response Assignment</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <select className="input input-sm" value={inc.team || ""} onChange={e => { updateIncident(inc.id, { team: e.target.value || null }); showToast(e.target.value ? `Assigned to ${e.target.value}` : "Team unassigned"); }}>
                <option value="">Unassigned</option>
                {["Team Alpha", "Team Bravo", "Team Delta", "Team Echo", "NDRF Unit 3", "Fire Brigade #12", "Medical Response A"].map(t => <option key={t}>{t}</option>)}
              </select>
              <select className="input input-sm" value={inc.status} onChange={e => { updateIncident(inc.id, { status: e.target.value }); showToast(`Status updated to: ${e.target.value}`); }}>
                {["Needs verification", "Under Review", "Verified", "Assigned", "Response in Progress", "Monitoring", "Resolved"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const types = [...new Set(incidents.map(i => i.type))];

  return (
    <DashboardShell name="Responder" authority activeTab={tab} setTab={setTab} go={go} onLogout={onLogout}>
      {/* OVERVIEW */}
      {tab === "overview" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "12px 16px", fontSize: 15, color: "#c2410c" }}>
            <Icon name="lock" size={15} />
            Protected workspace — public accounts do not receive authority access automatically. Organization approval is required.
          </div>
          <div className="stats-grid">
            <div className="stat-card neutral"><div className="stat-label">Active Incidents</div><div className="stat-value">{stats.total}</div><div className="stat-sub">Excluding resolved</div></div>
            <div className="stat-card critical"><div className="stat-label">Critical Priority</div><div className="stat-value v-critical">{stats.critical}</div><div className="stat-sub">Immediate attention</div></div>
            <div className="stat-card high"><div className="stat-label">High Priority</div><div className="stat-value v-high">{stats.high}</div><div className="stat-sub">Urgent response</div></div>
            <div className="stat-card neutral"><div className="stat-label">Awaiting Verification</div><div className="stat-value">{stats.verification}</div><div className="stat-sub">Human review needed</div></div>
            <div className="stat-card neutral"><div className="stat-label">Awaiting Response</div><div className="stat-value">{stats.unassigned}</div><div className="stat-sub">No team assigned</div></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
            <div className="card card-p">
              <div style={{ fontFamily: "Lora, serif", fontSize: 21, fontWeight: 700, marginBottom: 4 }}>Urgency-Ranked Incidents</div>
              <p style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 16 }}>AI-assisted prioritization. Click an incident to view details and take action.</p>
              {incidents.filter(i => i.status !== "Resolved").slice(0, 4).map(inc => (
                <div key={inc.id} className={`iq-row${selected?.id === inc.id ? " selected" : ""}`} onClick={() => { setSelected(inc); setTab("queue"); }}>
                  <PriorityBar priority={inc.priority} />
                  <div className="iq-body">
                    <div className="iq-header">
                      <span className="iq-title">{inc.type}</span>
                      <PriorityPill priority={inc.priority} size="sm" />
                    </div>
                    <div className="iq-meta"><Icon name="pin" size={11} /> {inc.location} · {timeAgo(inc.reportedAt)}</div>
                    <div className="iq-ai-reason">
                      <div className="ai-label">AI Reasoning</div>
                      <p>{inc.aiReason?.slice(0, 100)}...</p>
                    </div>
                  </div>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => setTab("queue")}>View all incidents →</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="weather-panel">
                <div className="weather-header">
                  <span className="weather-title">🌧️ Weather Context</span>
                  <span className="weather-timestamp">Updated 5 min ago</span>
                </div>
                <div className="weather-grid">
                  {[["🌡️", weather.temp, "Temperature"], ["🌧️", weather.rain, "Rainfall rate"], ["💧", weather.humidity, "Humidity"], ["💨", weather.wind, "Wind speed"]].map(([icon, val, label]) => (
                    <div key={label} className="weather-card">
                      <div style={{ fontSize: 23, marginBottom: 6 }}>{icon}</div>
                      <div className="weather-val">{val}</div>
                      <div className="weather-label">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="weather-alert"><Icon name="alert" size={14} /> {weather.alert}</div>
              </div>
              <div className="card card-p">
                <div style={{ fontFamily: "Lora, serif", fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Quick Actions</div>
                {[["queue", "View incident queue", "list"], ["calls", "Follow-up calls", "phone"], ["coordination", "Response coordination", "users"]].map(([v, l, i]) => (
                  <button key={v} className="btn btn-secondary btn-sm" style={{ width: "100%", justifyContent: "flex-start", marginBottom: 8 }} onClick={() => setTab(v)}>
                    <Icon name={i} size={14} /> {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INCIDENT QUEUE */}
      {tab === "queue" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h2 className="font-display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Urgency-Ranked Incident Queue</h2>
            <p style={{ fontSize: 15, color: "var(--ink-muted)" }}>AI-assisted prioritization with clear reasoning. Authorities can review and override. Precise locations visible to authorized responders only.</p>
          </div>
          <div className="aq-layout">
            {/* Queue list */}
            <div>
              {/* Filters */}
              <div style={{ marginBottom: 14 }}>
                <div className="aq-filters">
                  {[["all", "All", ""], ["critical", "🔴 Critical", "critical"], ["high", "🟠 High", "high"], ["medium", "🔵 Medium", ""], ["low", "🟢 Low", ""]].map(([v, l, c]) => (
                    <button key={v} className={`aq-filter-btn ${c} ${filterPriority === v ? "active" : ""}`} onClick={() => setFilterPriority(v)}>{l}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <select className="input input-sm" style={{ flex: 1 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="all">All statuses</option>
                    {["Needs verification", "Verified", "Under Review", "Response in Progress", "Monitoring", "Resolved"].map(s => <option key={s}>{s}</option>)}
                  </select>
                  <select className="input input-sm" style={{ flex: 1 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                    <option value="all">All types</option>
                    {types.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 12 }}>Showing {filteredQueue.length} of {incidents.length} incidents</div>
              {filteredQueue.length === 0 ? (
                <div className="empty-state"><div className="empty-state-icon">✅</div><h3>No incidents match</h3><p>Try adjusting filters</p></div>
              ) : filteredQueue.map(inc => (
                <div key={inc.id} className={`iq-row${selected?.id === inc.id ? " selected" : ""}`} onClick={() => setSelected(inc)}>
                  <PriorityBar priority={inc.priority} />
                  <div className="iq-body">
                    <div className="iq-header">
                      <span className="iq-title">{inc.type} — {inc.location}</span>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <PriorityPill priority={inc.priority} size="sm" />
                        {inc.duplicate && <span className="pill pill-high">Possible duplicate</span>}
                      </div>
                    </div>
                    <div className="iq-meta"><Icon name="pin" size={11} /> {inc.area} · {timeAgo(inc.reportedAt)} · {inc.verified ? "✅ Verified" : "⏳ Unverified"}</div>
                    <div className="iq-ai-reason">
                      <div className="ai-label">🤖 AI Reasoning (Pipeline 3)</div>
                      <p>{inc.aiReason}</p>
                    </div>
                    <div className="iq-actions" onClick={e => e.stopPropagation()}>
                      <button className="iq-action-btn primary" onClick={() => { setSelected(inc); }}>View Details</button>
                      <button className="iq-action-btn" onClick={() => { updateIncident(inc.id, { verified: true, status: "Verified" }); showToast("Incident verified"); }}>✅ Verify</button>
                      <button className="iq-action-btn" onClick={() => { updateIncident(inc.id, { status: "Escalated", priority: "critical" }); showToast("Escalated to Critical"); }}>🔺 Escalate</button>
                      <button className="iq-action-btn" onClick={() => { setSelected(inc); setTab("calls"); showToast("Opened in follow-up calls"); }}>📞 Follow-up</button>
                      <select className="authority-select" value={inc.team || ""} onChange={e => { updateIncident(inc.id, { team: e.target.value || null }); showToast(e.target.value ? `Assigned to ${e.target.value}` : "Team removed"); }} style={{ border: "1.5px solid var(--ink-subtle)", borderRadius: 999, padding: "6px 28px 6px 10px", fontSize: 12, fontWeight: 600, background: "white", cursor: "pointer", appearance: "auto" }}>
                        <option value="">Assign team</option>
                        {["Team Alpha", "Team Bravo", "Team Delta", "NDRF Unit 3", "Fire Brigade #12"].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Detail panel */}
            <IncidentDetailPanel inc={selected} />
          </div>
        </div>
      )}

      {/* INCIDENT MAP */}
      {tab === "map" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h2 className="font-display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Incident Map — Authority View</h2>
            <p style={{ fontSize: 15, color: "var(--ink-muted)" }}>Authorized responders can access precise coordinates. Click markers to view incident details.</p>
          </div>
          <div className="card" style={{ overflow: "hidden" }}>
            <IncidentMapVis incidents={incidents} authority height="500px" onMarkerClick={inc => { setSelected(inc); setTab("queue"); }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 16 }}>
            {incidents.filter(i => i.status !== "Resolved").slice(0, 4).map(inc => (
              <div key={inc.id} className="card card-p" style={{ cursor: "pointer" }} onClick={() => { setSelected(inc); setTab("queue"); }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <div className={`dot dot-${inc.priority}`} style={{ marginTop: 3 }} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{inc.type}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>{inc.area}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>Precise: {inc.location}</div>
                <PriorityPill priority={inc.priority} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VERIFICATION */}
      {tab === "verification" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h2 className="font-display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Incident Verification</h2>
            <p style={{ fontSize: 15, color: "var(--ink-muted)" }}>Review unverified incidents and confirm or reject them. Link duplicates before creating separate response tasks.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 20 }}>
            <div>
              <div className="tabs">
                <button className="tab-btn active">Unverified ({incidents.filter(i => !i.verified).length})</button>
                <button className="tab-btn">Possible duplicates ({incidents.filter(i => i.duplicate).length})</button>
                <button className="tab-btn">All incidents ({incidents.length})</button>
              </div>
              {incidents.filter(i => !i.verified).map(inc => (
                <div key={inc.id} className={`iq-row${selected?.id === inc.id ? " selected" : ""}`} onClick={() => setSelected(inc)}>
                  <PriorityBar priority={inc.priority} />
                  <div className="iq-body">
                    <div className="iq-header">
                      <span className="iq-title">{inc.type} — {inc.location}</span>
                      <PriorityPill priority={inc.priority} size="sm" />
                    </div>
                    <div className="iq-meta">{inc.id} · {timeAgo(inc.reportedAt)} · Confidence: {inc.confidence}%</div>
                    <div className="iq-actions" onClick={e => e.stopPropagation()}>
                      <button className="iq-action-btn primary" onClick={() => { updateIncident(inc.id, { verified: true, status: "Verified" }); showToast("Incident verified"); }}>✅ Confirm Incident</button>
                      <button className="iq-action-btn danger" onClick={() => { updateIncident(inc.id, { status: "Needs verification", verified: false }); showToast("Marked as unverified"); }}>❌ Mark Unverified</button>
                      <button className="iq-action-btn" onClick={() => { updateIncident(inc.id, { duplicate: !inc.duplicate }); showToast(inc.duplicate ? "Duplicate flag removed" : "Flagged as duplicate"); }}>{inc.duplicate ? "🔁 Unlink Duplicate" : "🔗 Link Duplicate"}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <IncidentDetailPanel inc={selected} />
          </div>
        </div>
      )}

      {/* FOLLOW-UP CALLS */}
      {tab === "calls" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h2 className="font-display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>AI-Assisted Follow-Up Calls</h2>
            <p style={{ fontSize: 15, color: "var(--ink-muted)" }}>Initiate follow-up calls for incomplete reports. Urgent incidents are never downgraded due to unanswered calls.</p>
          </div>
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 15, color: "#1e40af" }}>
            <Icon name="phone" size={14} style={{ display: "inline", marginRight: 8 }} />
            For this prototype, call outcomes are simulated. In production, this integrates with a telephony provider (e.g., Twilio, Exotel) for real AI-assisted or IVR calls.
          </div>
          {incidents.filter(i => i.reporter && i.status !== "Resolved").map(inc => (
            <div key={inc.id} className="call-row">
              <div className={`call-icon ${inc.callStatus === "Completed" ? "completed" : inc.callStatus === "Failed" ? "failed" : "pending"}`}>
                <Icon name="phone" size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{inc.type} — {inc.id}</span>
                  <PriorityPill priority={inc.priority} size="sm" />
                  <span className={`call-mode-badge ${inc.callStatus === "AI" ? "ai" : "ivr"}`}>
                    {inc.callStatus === "Completed" ? "AI call" : "IVR mode"}
                  </span>
                </div>
                <div className="call-detail">{inc.location} · Reporter: {inc.reporter}</div>
                {inc.missing?.length > 0 && (
                  <div className="call-q">
                    <b>Questions to ask:</b>
                    {inc.missing.map(m => <div key={m} style={{ marginTop: 4 }}>• {m}</div>)}
                  </div>
                )}
                <div style={{ marginTop: 8 }}>
                  <span className={`pill ${inc.callStatus === "Completed" ? "pill-verified" : inc.callStatus === "Failed" ? "pill-critical" : "pill-pending"}`}>
                    Call: {inc.callStatus || "Pending"}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button className="btn btn-primary btn-sm" onClick={() => { updateIncident(inc.id, { callStatus: "Completed", missing: [] }); showToast(`Follow-up call simulated for ${inc.id}`); }}>
                  <Icon name="phone" size={12} /> Initiate Call
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => { updateIncident(inc.id, { callStatus: "Failed" }); showToast("Call marked as failed — incident remains in queue"); }}>
                  Mark Failed
                </button>
              </div>
            </div>
          ))}
          <div className="card card-p" style={{ marginTop: 20 }}>
            <h3 style={{ fontFamily: "Lora, serif", fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Calling Modes</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { mode: "ai", title: "Mode 1: AI-Assisted Call", desc: "A telephony service connects to an AI that asks relevant follow-up questions and extracts information from responses automatically." },
                { mode: "ivr", title: "Mode 2: IVR Without AI", desc: "Pre-recorded prompts are played and keypad responses collected. Works without online AI dependency — suitable for low-bandwidth areas." },
              ].map(m => (
                <div key={m.mode} style={{ background: "var(--cream)", borderRadius: 10, padding: 16 }}>
                  <span className={`call-mode-badge ${m.mode}`} style={{ marginBottom: 10, display: "inline-block" }}>{m.mode === "ai" ? "AI-Assisted" : "IVR"}</span>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{m.title}</div>
                  <div style={{ fontSize: 15, color: "var(--ink-muted)", lineHeight: 1.6 }}>{m.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RESPONSE COORDINATION */}
      {tab === "coordination" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h2 className="font-display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Response Coordination</h2>
            <p style={{ fontSize: 15, color: "var(--ink-muted)" }}>Track team assignments, response status, and incident lifecycle from verification to resolution.</p>
          </div>
          {/* Lifecycle legend */}
          <div className="card card-p" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Incident Lifecycle</div>
            <div className="lifecycle">
              {["Reported", "Under Review", "Verified", "Assigned", "In Progress", "Resolved"].map((s, i, arr) => (
                <React.Fragment key={s}>
                  <div className="lifecycle-step">
                    <div className={`lifecycle-dot ${i < 3 ? "done" : i === 3 ? "current" : ""}`}>{i < 3 ? <Icon name="check" size={12} /> : i + 1}</div>
                    <div className="lifecycle-label">{s}</div>
                  </div>
                  {i < arr.length - 1 && <div className={`lifecycle-line${i < 3 ? " done" : ""}`} style={{ flex: 1 }} />}
                </React.Fragment>
              ))}
            </div>
          </div>
          {incidents.filter(i => i.status !== "Resolved").map(inc => (
            <div key={inc.id} className="rc-row">
              <PriorityBar priority={inc.priority} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{inc.type} — {inc.id}</span>
                  <PriorityPill priority={inc.priority} size="sm" />
                  <StatusPill status={inc.status} />
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 8 }}>{inc.location} · {timeAgo(inc.reportedAt)}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {inc.team ? <span className="team-tag"><Icon name="users" size={12} /> {inc.team}</span> : <span style={{ fontSize: 13, color: "#9ca3af" }}>No team assigned</span>}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <select className="input input-sm" value={inc.team || ""} onChange={e => { updateIncident(inc.id, { team: e.target.value || null }); showToast(e.target.value ? `Assigned to ${e.target.value}` : "Team removed"); }}>
                  <option value="">Assign team</option>
                  {["Team Alpha", "Team Bravo", "Team Delta", "NDRF Unit 3", "Fire Brigade #12", "Medical Response A"].map(t => <option key={t}>{t}</option>)}
                </select>
                <select className="input input-sm" value={inc.status} onChange={e => { updateIncident(inc.id, { status: e.target.value }); showToast(`Status → ${e.target.value}`); }}>
                  {["Needs verification", "Under Review", "Verified", "Assigned", "Response in Progress", "Monitoring", "Resolved"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* WEATHER */}
      {tab === "weather" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h2 className="font-display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Weather & Environmental Context</h2>
            <p style={{ fontSize: 15, color: "var(--ink-muted)" }}>Real-time weather data to support incident assessment. Weather informs but does not determine priority.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div className="weather-panel" style={{ height: "auto" }}>
              <div className="weather-header">
                <span className="weather-title">🌧️ Current Conditions — Response Area</span>
                <span className="weather-timestamp">Updated: {new Date().toLocaleTimeString()}</span>
              </div>
              <div className="weather-grid">
                {[["🌡️", weather.temp, "Temperature"], ["🌧️", weather.rain, "Rainfall (active)"], ["💧", weather.humidity, "Humidity"], ["💨", weather.wind, "Wind direction & speed"], ["👁️", "3km", "Visibility"], ["🌊", "Elevated", "Flood risk"]].map(([icon, val, label]) => (
                  <div key={label} className="weather-card">
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
                    <div className="weather-val">{val}</div>
                    <div className="weather-label">{label}</div>
                  </div>
                ))}
              </div>
              <div className="weather-alert"><Icon name="alert" size={14} /> {weather.alert}</div>
              <div style={{ marginTop: 12, fontSize: 12, color: "rgba(255,255,255,.45)" }}>Data source: India Meteorological Department (IMD) · Refreshed every 5 minutes</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="card card-p">
                <div style={{ fontFamily: "Lora, serif", fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Severe Weather Alerts</div>
                {[
                  { level: "high", alert: "Flash flood warning — River Belt district", time: "Active until 23:00" },
                  { level: "medium", alert: "Strong wind advisory — North Hill corridor", time: "Active until 22:00" },
                  { level: "low", alert: "Landslide risk elevated — post-rain terrain instability", time: "12-hour advisory" },
                ].map(a => (
                  <div key={a.alert} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--ink-subtle)" }}>
                    <div className={`dot dot-${a.level}`} style={{ marginTop: 3, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{a.alert}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 3 }}>{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="card card-p">
                <div style={{ fontFamily: "Lora, serif", fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Weather × Incidents</div>
                <p style={{ fontSize: 15, color: "var(--ink-muted)", lineHeight: 1.65, marginBottom: 14 }}>Current rainfall and flood conditions correlate with {incidents.filter(i => ["Flood", "Landslide"].includes(i.type)).length} active incidents. Weather context is provided to help authorities assess conditions — weather data alone does not change incident priority.</p>
                {incidents.filter(i => ["Flood", "Landslide"].includes(i.type) && i.status !== "Resolved").slice(0, 3).map(inc => (
                  <div key={inc.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--ink-subtle)", fontSize: 13 }}>
                    <div className={`dot dot-${inc.priority}`} />
                    <span style={{ flex: 1 }}>{inc.type} — {inc.area}</span>
                    <span style={{ color: "var(--ink-muted)" }}>{inc.weather}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN */}
      {tab === "admin" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h2 className="font-display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Admin & Permissions</h2>
            <p style={{ fontSize: 15, color: "var(--ink-muted)" }}>Review authority account requests, manage roles and organizations. Public users cannot grant themselves privileged roles.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div className="card card-p">
              <div style={{ fontFamily: "Lora, serif", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Pending Approvals</div>
              <p style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 16 }}>Organizations awaiting authority access review</p>
              {[
                { name: "Green Valley NGO", type: "NGO", email: "coord@greenvalley.org", submitted: "2h ago" },
                { name: "District Medical Response", type: "Healthcare", email: "dmr@health.gov.in", submitted: "5h ago" },
                { name: "Volunteer Fire Corps #7", type: "Emergency services", email: "vfc7@rescue.in", submitted: "1d ago" },
              ].map(r => (
                <div key={r.name} className="admin-row">
                  <div className="admin-avatar">{r.name.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 3 }}>{r.type} · {r.email}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>Submitted {r.submitted}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-sm" style={{ background: "#d1fae5", color: "#065f46", fontWeight: 700 }} onClick={() => showToast(`${r.name} approved`)}>Approve</button>
                    <button className="btn btn-sm" style={{ background: "#fee2e2", color: "#dc2626", fontWeight: 700 }} onClick={() => showToast(`${r.name} rejected`)}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="card card-p">
              <div style={{ fontFamily: "Lora, serif", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Active Authority Accounts</div>
              <p style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 16 }}>Approved organizations with active access</p>
              {[
                { name: "State NDRF Unit 3", role: "Disaster management authority", email: "ndrf3@ndrf.gov.in", status: "Active" },
                { name: "District Control Room", role: "Control-room operator", email: "dcr@district.gov.in", status: "Active" },
                { name: "City Fire Brigade #12", role: "Fire and rescue responder", email: "cfb12@fire.gov.in", status: "Active" },
                { name: "Helping Hands NGO", role: "NGO coordinator", email: "coord@hh.org", status: "Active" },
              ].map(a => (
                <div key={a.name} className="admin-row">
                  <div className="admin-avatar" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>{a.name.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{a.name}</div>
                    <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 2 }}>{a.email}</div>
                    <span className="role-tag authority-role" style={{ marginTop: 4, display: "inline-flex" }}>{a.role}</span>
                  </div>
                  <button className="btn btn-ghost btn-xs" onClick={() => showToast(`${a.name} access disabled`)}>Disable</button>
                </div>
              ))}
            </div>
          </div>
          <div className="card card-p" style={{ marginTop: 20 }}>
            <div style={{ fontFamily: "Lora, serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Available Roles</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              {[
                ["Disaster management authority", "authority-role", "Full incident access"],
                ["Control-room operator", "authority-role", "Monitor and coordinate"],
                ["Fire and rescue responder", "authority-role", "Field response"],
                ["NGO coordinator", "volunteer-role", "Aid coordination"],
                ["Volunteer", "volunteer-role", "Limited field support"],
                ["Public user", "public-role", "Report and track only"],
                ["Administrator", "admin-role", "Platform management"],
              ].map(([role, cls, desc]) => (
                <div key={role} style={{ padding: "12px 14px", background: "var(--cream)", borderRadius: 10 }}>
                  <span className={`role-tag ${cls}`} style={{ marginBottom: 6, display: "inline-flex" }}>{role}</span>
                  <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 4 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast${toast.type === "error" ? " error" : ""}`}>
          <Icon name="checkCircle" size={18} style={{ color: "var(--teal)", flexShrink: 0 }} />
          {toast.msg}
        </div>
      )}
    </DashboardShell>
  );
}

/* ─────────────────────────────────────────────────────────────
   APP ROOT
   ───────────────────────────────────────────────────────────── */
function App() {
  const [view, setView] = useState("home");
  const [userName, setUserName] = useState(() => LS.get("resqnet-user", {}).name || "");

  const go = useCallback((v) => { setView(v); window.scrollTo(0, 0); }, []);

  if (view === "report") return <EmergencyReport go={go} />;
  if (view === "public-map") return <PublicMap go={go} />;
  if (view === "register") return <Register go={go} onSuccess={n => { setUserName(n); go("dashboard"); }} />;
  if (view === "login") return <Login go={go} onSuccess={n => { setUserName(n || LS.get("resqnet-user", {}).name || "member"); go("dashboard"); }} />;
  if (view === "authority-login") return <AuthorityLogin go={go} onSuccess={() => go("authority")} />;
  if (view === "dashboard") return <UserDashboard name={userName || "User"} go={go} onLogout={() => go("home")} />;
  if (view === "authority") return <AuthorityDashboard go={go} onLogout={() => go("home")} />;
  if (view === "admin") return <AuthorityDashboard go={go} onLogout={() => go("home")} />;

  return (
    <>
      <PubNav go={go} currentView={view} />
      <Landing go={go} />
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
