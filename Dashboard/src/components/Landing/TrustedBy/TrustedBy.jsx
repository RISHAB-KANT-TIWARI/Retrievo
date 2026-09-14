import { useRef } from "react";
import "./TrustedBy.css";

const LOGOS = [
    "Specifications", "Drawings", "BOQ", "Method Statements",
    "Procurement Schedules", "Inspection Reports", "Contracts",
    "Vendor Datasheets", "RFIs", "Commissioning Plans",
];

export default function TrustedBy() {
    const trackRef = useRef(null);

    return (
        <section className="trusted">
            <p className="trusted-label">Documents your AI understands</p>
            <div className="trusted-track-wrap">
                <div className="trusted-track" ref={trackRef}>
                    {[...LOGOS, ...LOGOS].map((l, i) => (
                        <span className="trusted-logo" key={i}>{l}</span>
                    ))}
                </div>
            </div>
        </section>
    );
}
