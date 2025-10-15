import Video from "../../../../videos/promotional.mp4";

export default function Section1() {
    return (
        <section className="relative">
            <video width="100%" height="auto" autoPlay muted loop playsInline>
                <source src={Video} type="video/mp4" />
            </video>

            <div className="absolute inset-0 bg-black/30"></div>

            <div className="absolute inset-x-20 bottom-20 z-10">
                <div className="space-y-4">
                    <h1 className="font-bold text-4xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500">
                        WELCOME TO
                    </h1>
                    <h1 className="font-bold text-white text-5xl">
                        OPOL COMMUNITY COLLEGE
                    </h1>
                    <div className="h-2 max-w-[850px] bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 rounded-full"></div>
                    <p className="font-medium text-white text-xl">
                        Fueling ambition, advancing knowledge, and creating
                        opportunities for every learner.
                    </p>
                </div>
            </div>
        </section>
    );
}
