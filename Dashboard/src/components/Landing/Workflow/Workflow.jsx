import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import "./Workflow.css";

gsap.registerPlugin(useGSAP, ScrollTrigger, MotionPathPlugin);

const NODES = [
    { id: "parse", label: "Document Parsing", cy: 80 },
    { id: "kb", label: "Project Knowledge Base", cy: 260 },
    { id: "answer", label: "Evidence-backed Answers", cy: 440 },
];

export default function Workflow() {
    const sectionRef = useRef(null);

    useGSAP(() => {
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: sectionRef.current,
                start: "top 70%",
                end: "bottom 60%",
                scrub: 0.6,
            },
        });

        tl.to(".packet", {
            motionPath: {
                path: "#flow-path",
                align: "#flow-path",
                alignOrigin: [0.5, 0.5],
            },
            ease: "none",
            duration: 1,
        });

        NODES.forEach((n, i) => {
            tl.to(
                `#node-${n.id}`,
                { opacity: 1, scale: 1.15, duration: 0.15, ease: "power1.out" },
                i / NODES.length
            ).to(
                `#node-${n.id}`,
                { scale: 1, duration: 0.15, ease: "power1.in" },
                i / NODES.length + 0.15
            );
        });
    }, { scope: sectionRef });

    return (
        <section className="workflow" ref={sectionRef}>
            <h2 className="workflow-heading">From project files to engineering insight</h2>
            <svg className="workflow-svg" viewBox="0 0 400 520" width="100%">
                <path id="flow-path" d="M200,80 L200,260 L200,440" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                {NODES.map((n) => (
                    <g key={n.id} id={`node-${n.id}`} className="workflow-node" opacity="0.5">
                        <circle cx="200" cy={n.cy} r="26" className="workflow-node-circle" />
                        <text x="200" y={n.cy + 55} textAnchor="middle" className="workflow-node-label">
                            {n.label}
                        </text>
                    </g>
                ))}
                <circle className="packet" cx="200" cy="80" r="6" />
            </svg>
        </section>
    );
}
