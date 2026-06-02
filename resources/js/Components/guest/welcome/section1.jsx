import Video from "../../../../videos/promotional.mp4";
import AnimatedSection from "@/Components/guest/welcome/animated-section";

export default function Section1() {
    return (
        <section className="relative w-full h-screen overflow-hidden">
            {/* Background Video */}
            <video
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
            >
                <source src={Video} type="video/mp4" />
            </video>

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/50"></div>

            {/* Content */}
            <div className="absolute inset-0 flex items-center text-center md:text-left px-6 sm:px-10 md:px-20">
                <AnimatedSection>
                    <div className="space-y-3 max-w-2xl mx-auto md:mx-0 scale-95 md:scale-100">
                        <h1 className="font-extrabold text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500">
                            WELCOME TO
                        </h1>

                        <h1 className="font-extrabold text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
                            OPOL COMMUNITY COLLEGE
                        </h1>

                        <div className="h-1.5 w-full md:max-w-[500px] mx-auto md:mx-0 bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 rounded-full"></div>

                        <p className="font-medium text-white text-sm sm:text-base md:text-lg max-w-xl mx-auto md:mx-0">
                            Fueling ambition, advancing knowledge, and creating
                            opportunities for every learner.
                        </p>
                    </div>
                </AnimatedSection>
            </div>
        </section>
    );
}
