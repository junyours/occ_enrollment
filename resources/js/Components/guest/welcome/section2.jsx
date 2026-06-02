import b1 from "../../../../images/guest/backgrounds/1.jpg";
import s1 from "../../../../images/guest/styles/1.png";
import s2 from "../../../../images/guest/styles/2.png";
import Autoplay from "embla-carousel-autoplay";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/Components/ui/carousel";
import c1 from "../../../../images/guest/carousels/1.jpg";
import c2 from "../../../../images/guest/carousels/2.jpg";
import c3 from "../../../../images/guest/carousels/3.jpg";
import c4 from "../../../../images/guest/carousels/4.jpg";
import c5 from "../../../../images/guest/carousels/5.jpg";
import c6 from "../../../../images/guest/carousels/6.jpg";
import c7 from "../../../../images/guest/carousels/7.jpg";
import AnimatedSection from "@/Components/guest/welcome/animated-section";

const carousels = [c1, c2, c3, c4, c5, c6, c7];

const events = [
    {
        month: "August",
        date: "7–8",
        title: "DO DAY",
        description:
            "Join us in fostering a cleaner and greener campus! During DO Day, students, faculty, and staff come together to clean classrooms, organize facilities, and beautify the surroundings. It’s a great way to show pride in our school community while building teamwork and environmental awareness.",
    },
    {
        month: "August",
        date: "6",
        title: "Himamat",
        description:
            "Kickstart your exciting journey at OCC with ‘Himamat,’ our official student orientation! Meet your fellow freshmen, get to know your instructors, and learn everything you need to thrive at college. Expect fun activities, campus tours, and inspiring messages that will help you feel right at home.",
    },
    {
        month: "August",
        date: "5",
        title: "Org. Festival",
        description:
            "Discover your passion and find your second family at the Organization Festival! Explore a wide variety of student clubs and organizations—academic, cultural, artistic, and service-oriented. This is your chance to meet leaders, make new friends, and get involved in meaningful campus activities.",
    },
];

export default function Section2() {
    return (
        <section className="relative overflow-hidden py-20">
            <img
                src={b1}
                alt="Background"
                className="absolute inset-0 w-full h-full object-cover z-0"
            />
            <div className="absolute inset-0 bg-white/60 z-10"></div>
            <img
                src={s1}
                alt=""
                className="absolute size-20 top-10 left-20 z-20 opacity-80"
            />
            <img
                src={s2}
                alt=""
                className="absolute size-20 bottom-10 right-20 z-20 opacity-80"
            />
            <div className="relative z-30 max-w-6xl mx-auto px-4 space-y-10">
                <h1 className="uppercase text-center font-extrabold text-4xl">
                    Upcoming Events
                </h1>
                <div className="flex flex-col md:flex-row gap-6 bg-gray-300/40 rounded-2xl p-6 backdrop-blur-md shadow-md">
                    <div className="flex-1">
                        <AnimatedSection>
                            <Carousel
                                opts={{
                                    loop: true,
                                }}
                                plugins={[
                                    Autoplay({
                                        delay: 3000,
                                        stopOnInteraction: false,
                                    }),
                                ]}
                            >
                                <CarouselContent>
                                    {carousels.map((carousel, index) => (
                                        <CarouselItem
                                            key={index}
                                            className="p-0"
                                        >
                                            <img
                                                src={carousel}
                                                alt={`carousel-${index}`}
                                                className="object-cover"
                                            />
                                        </CarouselItem>
                                    ))}
                                </CarouselContent>
                                <CarouselPrevious className="left-4" />
                                <CarouselNext className="right-4" />
                            </Carousel>
                        </AnimatedSection>
                    </div>
                    <div className="flex-1 flex flex-col gap-4">
                        {events.map((event, index) => (
                            <AnimatedSection key={index}>
                                <div className="flex p-4 gap-4 bg-gray-900/50 rounded-xl text-white shadow-md hover:bg-gray-900/60 cursor-pointer transition-all">
                                    {/* Date box */}
                                    <div className="w-32 flex flex-col items-center justify-center">
                                        <h1 className="font-bold text-lg">
                                            {event.month}
                                        </h1>
                                        <p className="font-extrabold text-4xl">
                                            {event.date}
                                        </p>
                                    </div>
                                    <div className="flex-1">
                                        <h1 className="font-semibold text-xl mb-1">
                                            {event.title}
                                        </h1>
                                        <p className="text-sm line-clamp-3">
                                            {event.description}
                                        </p>
                                    </div>
                                </div>
                            </AnimatedSection>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
