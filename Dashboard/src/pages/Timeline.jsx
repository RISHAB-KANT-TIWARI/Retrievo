import { useEffect, useState } from "react";
import { getAuditLog } from "../api/client";

export default function Timeline() {
  const [logs, setLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    getAuditLog().then((res) => setLogs(res.data.logs.reverse()));
  }, []);

  const filteredLogs = selectedDate
    ? logs.filter((log) => log.time.startsWith(selectedDate))
    : logs;

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-3xl mx-auto">
      <h2 className="text-xl font-medium text-text-primary mb-6">Memory Timeline</h2>

      <div className="mb-6">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary"
        />
      </div>

      <div className="space-y-3">
        {filteredLogs.map((log, i) => (
          <div key={i} className="px-4 py-3 bg-surface border border-border rounded-xl text-sm">
            <span className="text-text-muted text-xs">{new Date(log.time).toLocaleString()}</span>
            <p className="text-text-primary mt-1">
              <strong>{log.action}</strong> — {log.details.filename || JSON.stringify(log.details)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}