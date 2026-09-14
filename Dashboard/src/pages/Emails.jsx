import { useEffect, useRef, useState, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { getEmails, syncEmails, ingestEmail, getEmailStatus } from "../api/client";
import { useToast } from "../components/Toast";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function SenderAvatar({ sender }) {
  const initial = sender?.charAt(0)?.toUpperCase() || "?";
  const colors = [
    "from-rose-500 to-pink-600",
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
  ];
  // Deterministic color based on sender string
  const idx = (sender?.charCodeAt(0) ?? 0) % colors.length;
  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br ${colors[idx]} text-white text-xs font-bold flex-shrink-0`}
    >
      {initial}
    </span>
  );
}

function AttachmentPills({ names }) {
  if (!names?.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {names.map((n) => (
        <span
          key={n}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-white/8 text-text-muted border border-white/10"
        >
          📎 {n.length > 24 ? n.slice(0, 22) + "…" : n}
        </span>
      ))}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function Emails() {
  const [emails, setEmails] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [ingestingUids, setIngestingUids] = useState(new Set());
  const [expandedUid, setExpandedUid] = useState(null);
  const headerRef = useRef(null);
  const listRef = useRef(null);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const [emailsRes, statusRes] = await Promise.all([
        getEmails(),
        getEmailStatus(),
      ]);
      setEmails(emailsRes.data.emails || []);
      setStatus(statusRes.data);
    } catch {
      toast?.show("Failed to load emails", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useGSAP(
    () => {
      if (!loading) {
        gsap.from(headerRef.current, { y: -12, opacity: 0, duration: 0.4, ease: "power3.out" });
        gsap.from(listRef.current, { y: 16, opacity: 0, duration: 0.5, delay: 0.1, ease: "power3.out" });
      }
    },
    { dependencies: [loading] }
  );

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncEmails();
      const { fetched, errors } = res.data;
      toast?.show(
        fetched > 0
          ? `Synced ${fetched} new email${fetched !== 1 ? "s" : ""}`
          : "No new emails found"
      );
      if (errors?.length) toast?.show(`Sync warning: ${errors[0]}`, "error");
      await load();
    } catch (err) {
      toast?.show("Sync failed — check email credentials in .env", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleIngest = async (uid) => {
    setIngestingUids((prev) => new Set(prev).add(uid));
    try {
      const res = await ingestEmail(uid);
      const { chunks_added, errors, already_ingested } = res.data;
      if (already_ingested) {
        toast?.show("Already ingested into knowledge base");
      } else {
        toast?.show(`Ingested — ${chunks_added} chunk${chunks_added !== 1 ? "s" : ""} added`);
      }
      if (errors?.length) toast?.show(`Ingest warning: ${errors[0]}`, "error");
      // Optimistic UI update
      setEmails((prev) =>
        prev.map((e) =>
          e.uid === uid
            ? { ...e, ingested: true, chunks_added: chunks_added || e.chunks_added }
            : e
        )
      );
      // Refresh status bar
      const statusRes = await getEmailStatus();
      setStatus(statusRes.data);
    } catch {
      toast?.show("Ingest failed", "error");
    } finally {
      setIngestingUids((prev) => {
        const next = new Set(prev);
        next.delete(uid);
        return next;
      });
    }
  };

  const ingestedCount = emails.filter((e) => e.ingested).length;

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div ref={headerRef} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-medium text-text-primary">Internal Communications &amp; Correspondence</h2>
          <p className="text-sm text-text-muted mt-0.5">
            Fetch internal site correspondence, vendor negotiations, and RFIs from on-premises mailboxes and selectively ingest them into the sovereign knowledge base.
          </p>
        </div>
        <button
          id="email-sync-btn"
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                     bg-accent/20 text-accent border border-accent/30
                     hover:bg-accent/30 active:scale-95 transition-all duration-150
                     disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          {syncing ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-accent/40 border-t-accent rounded-full animate-spin" />
              Syncing…
            </>
          ) : (
            <>✉ Sync Now</>
          )}
        </button>
      </div>

      {/* ── Status bar ── */}
      {status && (
        <div className="mb-6 flex flex-wrap gap-4 text-xs text-text-muted">
          <span>
            <span className="text-text-secondary font-medium">{emails.length}</span> fetched
          </span>
          <span>
            <span className="text-emerald-400 font-medium">{ingestedCount}</span> ingested
          </span>
          {status.last_sync && (
            <span>Last sync: <span className="text-text-secondary">{formatDate(status.last_sync)}</span></span>
          )}
          {status.last_sync_error && (
            <span className="text-rose-400">⚠ {status.last_sync_error}</span>
          )}
          {!status.email_configured && (
            <span className="text-amber-400">⚠ Email not configured — add EMAIL_ADDRESS and EMAIL_APP_PASSWORD to .env</span>
          )}
        </div>
      )}

      {/* ── Email list ── */}
      <div ref={listRef}>
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && emails.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl mb-4">✉️</span>
            <p className="text-text-secondary font-medium mb-1">No emails fetched yet</p>
            <p className="text-text-muted text-sm">
              Click <strong className="text-text-secondary">Sync Now</strong> to fetch emails from your inbox.
            </p>
          </div>
        )}

        {!loading && emails.length > 0 && (
          <div className="space-y-2">
            {emails.map((email) => (
              <EmailCard
                key={email.uid}
                email={email}
                expanded={expandedUid === email.uid}
                onToggle={() => setExpandedUid((prev) => (prev === email.uid ? null : email.uid))}
                onIngest={() => handleIngest(email.uid)}
                ingesting={ingestingUids.has(email.uid)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Email card component ──────────────────────────────────────────────────────

function EmailCard({ email, expanded, onToggle, onIngest, ingesting }) {
  const cardRef = useRef(null);
  const bodyRef = useRef(null);

  useGSAP(
    () => {
      gsap.to(bodyRef.current, {
        height: expanded ? "auto" : 0,
        opacity: expanded ? 1 : 0,
        duration: 0.3,
        ease: "power2.inOut",
      });
    },
    { dependencies: [expanded], scope: cardRef }
  );

  return (
    <div
      ref={cardRef}
      className={`rounded-2xl border transition-colors duration-150 overflow-hidden
        ${email.ingested
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-white/8 bg-white/4 hover:bg-white/6"
        }`}
    >
      {/* Card header row */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer select-none"
        onClick={onToggle}
      >
        <SenderAvatar sender={email.sender} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-text-primary truncate max-w-[260px]">
              {email.subject || "(no subject)"}
            </span>
            {email.ingested && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                ✓ In Knowledge Base · {email.chunks_added} chunks
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5 truncate">{email.sender}</p>
          <AttachmentPills names={email.attachment_names} />
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-text-muted hidden sm:block">{formatDate(email.date)}</span>
          {!email.ingested && (
            <button
              id={`ingest-btn-${email.uid}`}
              onClick={(e) => {
                e.stopPropagation();
                onIngest();
              }}
              disabled={ingesting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                         bg-accent/15 text-accent border border-accent/25
                         hover:bg-accent/25 active:scale-95 transition-all duration-150
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {ingesting ? (
                <span className="inline-block w-3 h-3 border-2 border-accent/40 border-t-accent rounded-full animate-spin" />
              ) : (
                "⬇ Ingest"
              )}
            </button>
          )}
          <span className={`text-text-muted transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
            ▾
          </span>
        </div>
      </div>

      {/* Expandable body preview */}
      <div ref={bodyRef} style={{ height: 0, opacity: 0, overflow: "hidden" }}>
        <div className="px-4 pb-4 pt-0">
          <div className="border-t border-white/8 pt-3">
            <p className="text-xs text-text-muted mb-1">
              {formatDate(email.date)} · {email.attachment_names?.length
                ? `${email.attachment_names.length} attachment${email.attachment_names.length !== 1 ? "s" : ""}`
                : "no attachments"}
            </p>
            <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {email.body_preview
                ? email.body_preview + (email.body_preview.length >= 200 ? "…" : "")
                : "(empty body)"}
            </p>
            {email.ingest_error && (
              <p className="mt-2 text-xs text-rose-400">⚠ {email.ingest_error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
