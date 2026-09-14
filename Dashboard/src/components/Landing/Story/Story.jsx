import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./Story.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const SENTENCES = [
    "Thousands of engineering documents. One place to ask questions.",
    "Teams spend hours switching between drawings, specifications and schedules just to answer one question.",
    "We built an AI platform that understands the relationships between specifications, schedules, contracts and drawings — so your team can focus on decisions instead of document hunting.",
];

export default function Story() {
    const sectionRef = useRef(null);

    useGSAP(() => {
        const lines = gsap.utils.toArray(".story-line");
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: sectionRef.current,
                start: "top top",
                end: () => "+=" + lines.length * 700,
                scrub: 0.5,
                pin: true,
            },
        });

        lines.forEach((line, i) => {
            if (i > 0) tl.to(lines[i - 1], { opacity: 0, y: -40, duration: 0.4 });
            tl.to(line, { opacity: 1, y: 0, duration: 0.5 }, i > 0 ? "-=0.1" : 0);
            if (i < lines.length - 1) tl.to({}, { duration: 0.6 });
        });
    }, { scope: sectionRef });

    return (
        <section className="story" ref={sectionRef}>
            <div className="story-stack">
                {SENTENCES.map((s, i) => (
                    <p className="story-line" key={i}>{s}</p>
                ))}
            </div>
        </section>
    );
}
