import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import "./AuroraField.css";

gsap.registerPlugin(useGSAP);

export default function AuroraField() {
    const rootRef = useRef(null);

    useGSAP(() => {
        const blobs = gsap.utils.toArray(".aurora-blob");
        blobs.forEach((blob, i) => {
            gsap.to(blob, {
                x: `random(-60, 60)`,
                y: `random(-40, 40)`,
                scale: `random(0.9, 1.15)`,
                duration: `random(8, 14)`,
                ease: "sine.inOut",
                repeat: -1,
                yoyo: true,
                delay: i * 1.5,
            });
        });
    }, { scope: rootRef });

    return (
        <div className="aurora-field" ref={rootRef} aria-hidden="true">
            <div className="aurora-blob aurora-blob--1" />
            <div className="aurora-blob aurora-blob--2" />
            <div className="aurora-blob aurora-blob--3" />
        </div>
    );
}
