import GuestLayout from "@/Layouts/GuestLayout";
import { Head } from "@inertiajs/react";

function Welcome() {
    return (
        <div>
            <Head title="Welcome" />
            Welcome
        </div>
    );
}

export default Welcome;

Welcome.layout = (page) => <GuestLayout>{page}</GuestLayout>;
