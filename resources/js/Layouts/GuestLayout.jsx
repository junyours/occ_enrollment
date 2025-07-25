import ContactSection from "@/Components/guest/web/ContactSection";
import Footer from "@/Components/guest/web/Footer";
import NavHeader from "@/Components/guest/web/NavHeader";

export default function GuestLayout({ children }) {
    return (
        <div className="min-h-svh">
            <NavHeader />
            <main className="container mx-auto p-4">{children}</main>
            <ContactSection />
            <Footer />
        </div>
    );
}
