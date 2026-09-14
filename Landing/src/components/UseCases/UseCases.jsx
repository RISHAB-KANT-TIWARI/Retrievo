import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./UseCases.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* Minimal inline SVG icons — monoline style matching the site aesthetic */
const Icons = {
    procurement: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-7-7Z" />
            <path d="M13 2v7h7" />
            <path d="M9 17h6" />
            <path d="M9 13h6" />
        </svg>
    ),
    site: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <path d="M12 12h.01" />
            <path d="M17 12h.01" />
            <path d="M7 12h.01" />
            <path d="M2 10h20" />
            <path d="M2 14h20" />
        </svg>
    ),
    qaqc: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
    ),
    pm: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <path d="M8 14h.01" />
            <path d="M12 14h.01" />
            <path d="M16 14h.01" />
            <path d="M8 18h.01" />
            <path d="M12 18h.01" />
        </svg>
    ),
};

const PERSONAS = [
    {
        icon: Icons.procurement,
        role: "Procurement Teams",
        tasks: [
            "Find delivery milestones",
            "Verify vendor requirements",
            "Compare procurement schedules",
        ],
    },
    {
        icon: Icons.site,
        role: "Site Engineers",
        tasks: [
            "Search installation procedures",
            "Verify construction sequences",
            "Find referenced drawings",
        ],
    },
    {
        icon: Icons.qaqc,
        role: "QA / QC",
        tasks: [
            "Check specification compliance",
            "Validate technical requirements",
            "Locate supporting evidence",
        ],
    },
    {
        icon: Icons.pm,
        role: "Project Managers",
        tasks: [
            "Review schedules",
            "Track milestones",
            "Ask questions across all project documentation",
        ],
    },
];

export default function UseCases() {
    const sectionRef = useRef(null);

    useGSAP(() => {
        ScrollTrigger.batch(".usecase-card", {
            start: "top 88%",
            onEnter: (els) =>
                gsap.to(els, {
                    opacity: 1,
                    y: 0,
                    duration: 0.7,
                    stagger: 0.12,
                    ease: "power3.out",
                }),
        });
    }, { scope: sectionRef });

    return (
        <section className="usecases" ref={sectionRef} id="use-cases">
            <h2 className="usecases-heading">Built for every role on the project</h2>
            <p className="usecases-sub">
                When visitors recognise themselves, the product becomes compelling.
            </p>
            <div className="usecases-grid">
                {PERSONAS.map((p) => (
                    <div className="usecase-card" key={p.role}>
                        <span className="usecase-icon">{p.icon}</span>
                        <h3 className="usecase-role">{p.role}</h3>
                        <ul className="usecase-tasks">
                            {p.tasks.map((t) => (
                                <li key={t}>{t}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </section>
    );
}
