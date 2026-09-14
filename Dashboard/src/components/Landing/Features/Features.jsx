import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./Features.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const CARDS = [
    { title: "Document Intelligence", body: "Reads specifications, BOQs, schedules, contracts and technical reports. No manual tagging required." },
    { title: "Cross-document Reasoning", body: "Answers using information spread across multiple project documents." },
    { title: "Compliance Verification", body: "Compare project documents against client specifications and standards." },
    { title: "Schedule Intelligence", body: "Search construction timelines, procurement milestones and commissioning activities." },
    { title: "Traceable Answers", body: "Every answer links back to the original document, page and source section." },
    { title: "Structured Data Extraction", body: "Reads tables, schedules and engineering spreadsheets without manual searching." },
];

export default function Features() {
    const rootRef = useRef(null);

    useGSAP(() => {
        ScrollTrigger.batch(".bento-card", {
            start: "top 85%",
            onEnter: (els) =>
                gsap.to(els, { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: "power3.out" }),
        });
    }, { scope: rootRef });

    const onMove = (e) => {
        const card = e.currentTarget;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(card, {
            rotateX: py * -8,
            rotateY: px * 8,
            duration: 0.4,
            ease: "power2.out",
            transformPerspective: 700,
        });
    };

    const onLeave = (e) => {
        gsap.to(e.currentTarget, { rotateX: 0, rotateY: 0, duration: 0.6, ease: "power3.out" });
    };

    return (
        <section className="bento" ref={rootRef} id="capabilities">
            <h2 className="bento-heading">Built for engineering documentation</h2>
            <div className="bento-grid">
                {CARDS.map((c) => (
                    <div
                        className="bento-card"
                        key={c.title}
                        onMouseMove={onMove}
                        onMouseLeave={onLeave}
                    >
                        <h3>{c.title}</h3>
                        <p>{c.body}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
