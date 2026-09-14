import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuroraField from "./components/AuroraField/AuroraField.jsx";
import Navbar from "./components/Navbar/Navbar.jsx";
import Hero from "./components/Hero/Hero.jsx";
import TrustedBy from "./components/TrustedBy/TrustedBy.jsx";
import HowItWorks from "./components/HowItWorks/HowItWorks.jsx";
import InteractiveDemo from "./components/InteractiveDemo/InteractiveDemo.jsx";
import Features from "./components/Features/Features.jsx";
import UseCases from "./components/UseCases/UseCases.jsx";
import Workflow from "./components/Workflow/Workflow.jsx";
import Story from "./components/Story/Story.jsx";
import FinalCTA from "./components/FinalCTA/FinalCTA.jsx";
// import MainApp from "./components/MainApp/MainApp.jsx";

function Landing() {
    return (
        <>
            <AuroraField />
            <Navbar />
           
                <Hero />
                <TrustedBy />
                <HowItWorks />
                <InteractiveDemo />
                <Features />
                <UseCases />
                <Workflow />
                <Story />
                <FinalCTA />
           
        </>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Landing />} />
                
            </Routes>
        </BrowserRouter>
    );
}
