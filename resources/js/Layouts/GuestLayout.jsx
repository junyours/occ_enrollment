import ContactSection from "@/Components/guest/web/ContactSection";
import Footer from "@/Components/guest/web/Footer";
import NavHeader from "@/Components/guest/web/NavHeader";

export default function GuestLayout({ children }) {
    return (
        <div className="min-h-svh">
            <NavHeader />
            <main className="max-w-7xl mx-auto">{children}</main>
            <ContactSection />
            <Footer />
        </div>
    );
}
