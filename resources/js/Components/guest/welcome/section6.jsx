import AnimatedSection from "@/Components/guest/welcome/animated-section";

export default function Section6() {
    return (
        <section className="relative py-16 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-10 items-center">
                {/* Left: Title and Info */}
                <AnimatedSection>
                    <div className="space-y-6">
                        <h2 className="text-4xl font-bold uppercase bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 bg-clip-text text-transparent">
                            Visit Us
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            We’d love to welcome you to Opol Community College!
                            Our campus is open for visits, inquiries, and
                            community engagement. Come and explore our vibrant
                            learning environment, meet our dedicated faculty,
                            and discover how OCC can help you achieve your
                            goals.
                        </p>

                        <div className="space-y-2 text-gray-700 dark:text-gray-300">
                            <p>
                                <strong>📍 Address:</strong> Zone 1 Poblacion,
                                Opol, Misamis Oriental, Philippines
                            </p>
                            <p>
                                <strong>📞 Contact:</strong> (088) 882-3269
                            </p>
                            <p>
                                <strong>📧 Email:</strong>{" "}
                                opolcommunitycollege@yahoo.com
                            </p>
                            <p>
                                <strong>🕒 Office Hours:</strong> Monday –
                                Friday, 8:00 AM – 5:00 PM
                            </p>
                        </div>
                    </div>
                </AnimatedSection>

                {/* Right: Google Map */}
                <AnimatedSection>
                    <div className="w-full h-[400px] lg:h-[500px] rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700">
                        <iframe
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3005.5667566226484!2d124.5699053735227!3d8.521727496726207!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x32fff45858a8e7f1%3A0x11bd2a01ee20bcd3!2sOpol%20Community%20College!5e1!3m2!1sen!2sph!4v1760510729839!5m2!1sen!2sph"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen=""
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        ></iframe>
                    </div>
                </AnimatedSection>
            </div>
        </section>
    );
}
