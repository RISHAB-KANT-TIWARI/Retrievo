import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import "./Hero.css";

gsap.registerPlugin(useGSAP);

const HEADING = "Engineering documents. Understood instantly.";

export default function Hero() {
    const rootRef = useRef(null);
    const btnRef = useRef(null);

    useGSAP(() => {
        gsap.from(".hero-word", {
            yPercent: 120,
            opacity: 0,
            duration: 1,
            ease: "power4.out",
            stagger: 0.06,
            delay: 0.4,
        });
        gsap.from(".hero-sub, .hero-cta-row", {
            y: 24,
            opacity: 0,
            duration: 0.9,
            ease: "power3.out",
            delay: 1.1,
        });
    }, { scope: rootRef });

    const onMove = (e) => {
        const r = btnRef.current.getBoundingClientRect();
        btnRef.current.style.setProperty("--mx", `${e.clientX - r.left}px`);
        btnRef.current.style.setProperty("--my", `${e.clientY - r.top}px`);
    };

    return (
        <section className="hero" ref={rootRef} id="overview">
            <div className="hero-grid" aria-hidden="true" />
            <h1 className="hero-heading">
                {HEADING.split(" ").map((w, i) => (
                    <span className="hero-word-mask" key={i}>
                        <span className="hero-word">{w}</span>
                    </span>
                ))}
            </h1>
            <p className="hero-sub">
                Upload specifications, procurement schedules, BOQs, method statements,
                contracts and drawings. Ask questions in natural language and receive
                traceable answers backed by project documents.
            </p>
            <div className="hero-cta-row">
                <button
                    ref={btnRef}
                    className="hero-cta"
                    onMouseMove={onMove}
                >
                    Try the Demo
                </button>
                <a href="#workflow" className="hero-secondary">See the workflow →</a>
            </div>
        </section>
    );
}
