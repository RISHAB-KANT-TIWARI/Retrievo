import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./FinalCTA.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function FinalCTA() {
    const sectionRef = useRef(null);

    useGSAP(() => {
        gsap.to(".cta-glow", {
            scale: 1.4,
            opacity: 0.6,
            ease: "power1.inOut",
            scrollTrigger: {
                trigger: sectionRef.current,
                start: "top 80%",
                end: "top 20%",
                scrub: 1,
            },
        });
    }, { scope: sectionRef });

    return (
        <section className="final-cta" ref={sectionRef}>
            <div className="cta-glow" aria-hidden="true" />
            <h2>Stop searching documents. Start asking questions.</h2>
            <p>Upload your project documents. Ask engineering questions. Get traceable answers.</p>
            <button className="cta-button">
                <span>Try the Demo</span>
            </button>
        </section>
    );
}
