import b3 from "../../../../images/guest/backgrounds/3.jpg";
import AnimatedSection from "@/Components/guest/welcome/animated-section";

const programs = [
    {
        title: "Bachelor of Science in Information Technology",
        department: "College of Information Technology",
        description:
            "A comprehensive program designed to equip students with advanced technical skills in software development, systems analysis, cybersecurity, and emerging technologies such as artificial intelligence and cloud computing. This course prepares future IT professionals to become innovative problem-solvers and leaders in the digital industry.",
        duration: "4 years",
        badge: "Popular",
    },
    {
        title: "Bachelor of Elementary Education",
        department: "Teacher Education Department",
        description:
            "This program develops competent, compassionate, and reflective elementary teachers who can nurture young learners. Students gain a strong foundation in pedagogy, child psychology, curriculum design, and assessment strategies, preparing them to create engaging and inclusive learning environments for the next generation.",
        duration: "4 years",
        badge: "High Demand",
    },
    {
        title: "Bachelor of Secondary Education Major in English",
        department: "Teacher Education Department",
        description:
            "A specialized program aimed at shaping future educators in the field of English language and literature. It combines linguistic mastery, literary appreciation, and effective teaching methodologies to enable graduates to inspire critical thinking and communication excellence among high school students.",
        duration: "4 years",
        badge: "In-Demand",
    },
    {
        title: "Bachelor of Science in Business Administration Major in Financial Management",
        department: "College of Business Administration",
        description:
            "This program provides a strong grounding in financial principles, investment strategies, and risk management. Students learn how to analyze financial statements, manage portfolios, and make sound business decisions — preparing them for careers in banking, corporate finance, and entrepreneurship.",
        duration: "4 years",
        badge: "Growing Field",
    },
    {
        title: "Bachelor of Science in Business Administration Major in Marketing Management",
        department: "College of Business Administration",
        description:
            "A dynamic program that blends creativity and strategy to prepare students for the fast-evolving world of marketing. It covers digital marketing, consumer behavior, branding, and market research — empowering graduates to craft compelling campaigns and drive business growth in competitive industries.",
        duration: "4 years",
        badge: "New",
    },
];

export default function Section4() {
    return (
        <section
            className="relative py-16 bg-cover bg-center"
            style={{ backgroundImage: `url(${b3})` }}
        >
            <div className="absolute inset-0 bg-black/60"></div>
            <div className="relative z-10 container mx-auto px-6 text-white">
                <h2 className="text-4xl font-bold text-center mb-12 bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 bg-clip-text text-transparent uppercase">
                    Academic Programs
                </h2>
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {programs.map((program, index) => (
                        <AnimatedSection key={index}>
                            <div className="bg-white/10 backdrop-blur-lg p-6 rounded-2xl shadow-lg border border-white/20 hover:bg-white/20 transition-all duration-300">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-xl font-semibold text-cyan-300">
                                        {program.title}
                                    </h3>
                                    <span className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                                        {program.badge}
                                    </span>
                                </div>
                                <p className="text-sm mb-2 italic">
                                    {program.department}
                                </p>
                                <p className="text-gray-200 text-justify mb-4">
                                    {program.description}
                                </p>
                                <div className="text-sm font-medium text-sky-300">
                                    Duration: {program.duration}
                                </div>
                            </div>
                        </AnimatedSection>
                    ))}
                </div>
            </div>
        </section>
    );
}
