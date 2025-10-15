import b4 from "../../../../images/guest/backgrounds/4.jpg";
import m1 from "../../../../images/guest/mission-vision/1.jpg";
import m2 from "../../../../images/guest/mission-vision/2.jpg";
import m3 from "../../../../images/guest/mission-vision/3.jpg";

export default function Section5() {
    return (
        <section
            className="relative py-16 bg-cover bg-center"
            style={{ backgroundImage: `url(${b4})` }}
        >
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/60"></div>

            {/* Content */}
            <div className="relative z-10 container mx-auto px-6 text-white">
                {/* Title */}
                <h2 className="text-4xl font-bold text-center mb-12 bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 bg-clip-text text-transparent uppercase">
                    Vision & Mission
                </h2>

                {/* Flex container */}
                <div className="grid lg:grid-cols-2 gap-10 items-center">
                    {/* Left side - Vision and Mission text */}
                    <div className="space-y-8">
                        {/* Vision */}
                        <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-lg border border-white/20 hover:bg-white/20 transition-all duration-300">
                            <h3 className="text-2xl font-semibold text-cyan-300 mb-2">
                                Vision
                            </h3>
                            <p className="text-gray-200 text-justify leading-relaxed">
                                Opol Community College envisions becoming an
                                advanced and transformative institution
                                recognized for its excellence in digital
                                innovation, leadership, and entrepreneurship.
                                The college aspires to foster a community of
                                learners equipped with 21st-century skills,
                                guided by integrity, and driven to create
                                sustainable solutions for local and global
                                challenges.
                            </p>
                        </div>

                        {/* Mission */}
                        <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-lg border border-white/20 hover:bg-white/20 transition-all duration-300">
                            <h3 className="text-2xl font-semibold text-cyan-300 mb-2">
                                Mission
                            </h3>
                            <p className="text-gray-200 text-justify leading-relaxed">
                                Opol Community College is committed to producing
                                globally competitive graduates through advanced
                                pedagogical practices, research-driven learning,
                                and a culture of innovation. The college aims to
                                nurture critical thinkers, ethical
                                professionals, and socially responsible citizens
                                who contribute meaningfully to the progress of
                                society and the development of the nation.
                            </p>
                        </div>
                    </div>

                    {/* Right side - Collage of images */}
                    <div className="grid grid-cols-2 gap-4 relative">
                        <img
                            src={m1}
                            alt="Campus life 1"
                            className="rounded-2xl shadow-lg w-full h-60 object-cover hover:scale-105 transition-transform duration-500"
                        />
                        <img
                            src={m2}
                            alt="Campus life 2"
                            className="rounded-2xl shadow-lg w-full h-60 object-cover hover:scale-105 transition-transform duration-500 mt-8"
                        />
                        <img
                            src={m3}
                            alt="Campus life 3"
                            className="col-span-2 rounded-2xl shadow-lg w-full h-64 object-cover hover:scale-105 transition-transform duration-500"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
