import GuestLayout from "@/Layouts/GuestLayout";
import { Head } from "@inertiajs/react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/Components/ui/card";
import {
    GraduationCap,
    Users,
    Award,
    Building2,
    Target,
    Heart,
    Lightbulb,
} from "lucide-react";
import Section1 from "@/Components/guest/welcome/section1";
import Section2 from "@/Components/guest/welcome/section2";
import Section3 from "@/Components/guest/welcome/section3";
import Section4 from "@/Components/guest/welcome/section4";
import Section5 from "@/Components/guest/welcome/section5";

function Welcome() {
    const programs = [
        {
            title: "Bachelor of Science in Information Technology",
            department: "College of Information Technology",
            description:
                "Comprehensive IT program covering programming, systems development, networking, and emerging technologies",
            duration: "4 years",
            badge: "Popular",
        },
        {
            title: "Bachelor of Elementary Education",
            department: "Teacher Education Department",
            description:
                "Comprehensive program preparing future elementary school teachers with modern pedagogical approaches",
            duration: "4 years",
            badge: "High Demand",
        },
        {
            title: "Bachelor of Secondary Education Major in English",
            department: "Teacher Education Department",
            description:
                "Specialized program for aspiring English teachers focusing on language and literature instruction",
            duration: "4 years",
            badge: "In-Demand",
        },
        {
            title: "BS Business Administration Major in Financial Management",
            department: "College of Business Administration",
            description:
                "Advanced financial planning, analysis, and management skills for corporate and entrepreneurial success",
            duration: "4 years",
            badge: "Growing Field",
        },
        {
            title: "BS Business Administration Major in Marketing Management",
            department: "College of Business Administration",
            description:
                "Strategic marketing concepts, digital marketing, and brand management for modern businesses",
            duration: "4 years",
            badge: "New",
        },
    ];

    const stats = [
        { icon: Users, label: "Active Students", value: "2,400+" },
        { icon: GraduationCap, label: "Graduates", value: "5,000+" },
        { icon: Award, label: "Programs", value: "5" },
        { icon: Building2, label: "Departments", value: "3" },
    ];

    const features = [
        {
            icon: Target,
            title: "Quality Education",
            description:
                "Excellence in preparing students with comprehensive training and practical experience",
        },
        {
            icon: Heart,
            title: "Career-Ready Graduates",
            description:
                "Equipping students with practical skills and knowledge to thrive in today’s job market",
        },
        {
            icon: Lightbulb,
            title: "Modern Learning",
            description:
                "Updated curriculum and facilities to meet current industry standards",
        },
    ];

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
