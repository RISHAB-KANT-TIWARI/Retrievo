import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./HowItWorks.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const STEPS = [
    { n: "01", title: "Upload Project Documents", body: "Drag in specifications, drawings, BOQs, schedules, contracts or any engineering document." },
    { n: "02", title: "AI Extracts Text & Tables", body: "Automated parsing of structured content, embedded tables and technical data." },
    { n: "03", title: "Smart Chunking", body: "Documents are segmented into meaningful sections preserving engineering context." },
    { n: "04", title: "Knowledge Base", body: "All project documents are indexed into a searchable engineering knowledge base." },
    { n: "05", title: "Semantic Search", body: "Ask questions in plain language. The AI retrieves relevant sections across all documents." },
    { n: "06", title: "Evidence-backed Answer", body: "Every answer links back to the original document, page and section." },
];

export default function HowItWorks() {
    const sectionRef = useRef(null);
    const trackRef = useRef(null);

    useGSAP(() => {
        const track = trackRef.current;
        const distance = () => track.scrollWidth - window.innerWidth;

        const scrollTween = gsap.to(track, {
            x: () => -distance(),
            ease: "none",
            scrollTrigger: {
                trigger: sectionRef.current,
                pin: true,
                start: "top top",
                end: () => "+=" + distance(),
                scrub: 1,
                invalidateOnRefresh: true,
            },
        });

        gsap.utils.toArray(".how-card").forEach((card) => {
            gsap.fromTo(
                card,
                { scale: 0.9, opacity: 0.4 },
                {
                    scale: 1,
                    opacity: 1,
                    ease: "none",
                    scrollTrigger: {
                        containerAnimation: scrollTween,
                        trigger: card,
                        start: "left 75%",
                        end: "left 35%",
                        scrub: true,
                    },
                }
            );
        });
    }, { scope: sectionRef });

    return (
        <section className="how" ref={sectionRef} id="workflow">
            <div className="how-track" ref={trackRef}>
                <div className="how-intro">
                    <h2>How it works</h2>
                    <p>From raw project files to evidence-backed answers — an engineering workflow.</p>
                </div>
                {STEPS.map((s) => (
                    <div className="how-card" key={s.n}>
                        <span className="how-card-num">{s.n}</span>
                        <h3>{s.title}</h3>
                        <p>{s.body}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
