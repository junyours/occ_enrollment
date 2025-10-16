import b2 from "../../../../images/guest/backgrounds/2.jpg";
import s3 from "../../../../images/guest/styles/3.png";
import s4 from "../../../../images/guest/styles/4.png";
import n1 from "../../../../images/guest/news/1.jpg";
import n2 from "../../../../images/guest/news/2.jpg";
import n3 from "../../../../images/guest/news/3.jpg";
import n4 from "../../../../images/guest/news/4.jpg";
import n5 from "../../../../images/guest/news/5.jpg";
import n6 from "../../../../images/guest/news/6.jpg";
import AnimatedSection from "@/Components/guest/welcome/animated-section";

const news = [
    {
        image: n1,
        description:
            "October 14, 2025 – Early today, faculty members gathered for a retooling and capacity-building workshop aimed at empowering them to transition their research from drafts to published journals. The session, led by Dr. Aga Emm Mahinay, Director for Research, Publication, and Quality Assurance, focused on enhancing the faculty's research capabilities and integrating academic research into their teaching strategies.",
    },
    {
        image: n2,
        description:
            "October 12, 2025 – Opol Community College (OCC) Eskimo athletes showcased their exceptional skills and dedication at the recently concluded MDPS Arnis Inter-Chapter Tournament held at the Manolo Fortich Gymnasium in Bukidnon. The event, which brought together martial artists from various regions, saw the OCC Eskrima team bring home an impressive collection of medals.",
    },
    {
        image: n3,
        description:
            "October 10, 2025 – The Cagayan de Oro Council of Lions Presidents, District 301-E Philippines, conducted a symposium on Mental Health and Well-Being earlier today at the Audio Visual Room of Opol Community College in celebration of World Mental Health Day.",
    },
    {
        image: n4,
        description:
            "OPOL, Misamis Oriental – October 8, 2025 – In a meaningful gesture of support for local education, FDC Misamis Power Corporation, led by Ms. Analiza U. Miso, recently turned over ring binders to Opol Community College.",
    },
    {
        image: n5,
        description:
            "OPOL, Misamis Oriental – October 8, 2025 – Tutors and Youth Development Workers (YDW) from Opol Community College were awarded their cash-for-training payouts through the Department of Social Welfare and Development (DSWD) for completing a five-day Capability Building Program held at Kazh Dreamland Resort and Convention last April 21 to 25, 2025.",
    },
    {
        image: n6,
        description:
            "GENERAL SANTOS CITY, October 6, 2025 – The College of Teacher Education (CTE) of Opol Community College (OCC) participated in the Zonal Public Hearing on the Reframed Pre-Service Teacher Education Curriculum held at Mindanao State University-General Santos (MSU-Gensan).",
    },
];

export default function Section3() {
    return (
        <section className="relative overflow-hidden py-20">
            {/* Background */}
            <img
                src={b2}
                alt="Background"
                className="absolute inset-0 w-full h-full object-cover z-0"
            />
            <div className="absolute inset-0 bg-white/60 z-10"></div>

            {/* Floating decorations */}
            <img
                src={s3}
                alt=""
                className="absolute size-20 top-10 left-20 z-20 opacity-80"
            />
            <img
                src={s4}
                alt=""
                className="absolute size-20 bottom-10 right-20 z-20 opacity-80"
            />

            {/* Content */}
            <div className="relative z-30 max-w-6xl mx-auto px-4 space-y-10">
                <h1 className="uppercase text-center font-extrabold text-4xl">
                    Latest News & Updates
                </h1>

                {/* News Cards */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {news.map((item, index) => (
                        <AnimatedSection key={index}>
                            <div className="bg-white/80 backdrop-blur-md rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
                                <img
                                    src={item.image}
                                    alt={item.title}
                                    className="w-full h-56 object-cover"
                                />
                                <div className="p-5 space-y-2">
                                    <p className="text-gray-600 text-sm line-clamp-3">
                                        {item.description}
                                    </p>
                                    <button className="mt-3 text-blue-600 font-semibold hover:text-blue-800 transition">
                                        Read More →
                                    </button>
                                </div>
                            </div>
                        </AnimatedSection>
                    ))}
                </div>
            </div>
        </section>
    );
}
