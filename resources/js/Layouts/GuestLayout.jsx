import ContactSection from "@/components/guest/web/ContactSection";
import Footer from "@/components/guest/web/Footer";
import NavHeader from "@/components/guest/web/NavHeader";

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
