import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./InteractiveDemo.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const QUESTION = "When is UPS installation scheduled and which contractor is responsible?";
const STATUSES = ["Searching project documents…", "Thinking…"];
const ANSWER =
    "UPS installation is scheduled for Week 34 (19–23 August) per the construction " +
    "programme Rev. 03, Section 4.2. The responsible contractor is Vertex Electrical " +
    "Ltd as specified in Contract Package EP-07, Clause 3.1.4. Referenced drawing: " +
    "E-DWG-401 Rev B — UPS Room Layout.";

export default function InteractiveDemo() {
    const sectionRef = useRef(null);
    const [status, setStatus] = useState(null);
    const [typed, setTyped] = useState("");
    const played = useRef(false);

    useGSAP(() => {
        played.current = false;
        ScrollTrigger.create({
            trigger: sectionRef.current,
            start: "top 65%",
            once: true,
            onEnter: () => playSequence(),
        });
    }, { scope: sectionRef });

    function playSequence() {
        if (played.current) return;
        played.current = true;

        const tl = gsap.timeline();
        tl.to({}, { duration: 0.5 })
            .call(() => setStatus(STATUSES[0]))
            .to({}, { duration: 0.7 })
            .call(() => setStatus(STATUSES[1]))
            .to({}, { duration: 0.6 })
            .call(() => {
                setStatus(null);
                typeAnswer();
            });
    }

    function typeAnswer() {
        let i = 0;
        const id = setInterval(() => {
            i += 1;
            setTyped(ANSWER.slice(0, i));
            if (i >= ANSWER.length) clearInterval(id);
        }, 16);
    }

    return (
        <section className="demo" ref={sectionRef}>
            <h2 className="demo-heading">See it answer, live</h2>
            <div className="demo-window">
                <div className="demo-bubble demo-bubble--user">{QUESTION}</div>
                <div className="demo-bubble demo-bubble--ai">
                    {status && (
                        <span className="demo-status">
                            {status}
                            <span className="demo-cursor" />
                        </span>
                    )}
                    {!status && (
                        <span>
                            {typed}
                            {typed.length < ANSWER.length && <span className="demo-cursor" />}
                        </span>
                    )}
                </div>
            </div>
        </section>
    );
}
