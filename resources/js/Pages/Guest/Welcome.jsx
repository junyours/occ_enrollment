import GuestLayout from "@/Layouts/GuestLayout";
import { Head } from "@inertiajs/react";
import Section1 from "@/Components/guest/welcome/section1";
import Section2 from "@/Components/guest/welcome/section2";
import Section3 from "@/Components/guest/welcome/section3";
import Section4 from "@/Components/guest/welcome/section4";
import Section5 from "@/Components/guest/welcome/section5";

function Welcome() {
    return (
        <div>
            <Head title="Welcome" />
            <Section1 />
            <Section2 />
            <Section3 />
            <Section4 />
            <Section5 />
        </div>
    );
}

export default Welcome;

Welcome.layout = (page) => <GuestLayout>{page}</GuestLayout>;
