import GuestLayout from "@/Layouts/GuestLayout";
import { Head } from "@inertiajs/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/Components/ui/card";
import {
    GraduationCap,
    Users,
    Award,
    Building2,
    Target,
    Heart,
    Lightbulb
} from "lucide-react";

function Welcome() {
    const programs = [
        {
            title: "Bachelor of Science in Information Technology",
            department: "College of Information Technology",
            description: "Comprehensive IT program covering programming, systems development, networking, and emerging technologies",
            duration: "4 years",
            badge: "Popular"
        },
        {
            title: "Bachelor of Elementary Education",
            department: "Teacher Education Department",
            description: "Comprehensive program preparing future elementary school teachers with modern pedagogical approaches",
            duration: "4 years",
            badge: "High Demand"
        },
        {
            title: "Bachelor of Secondary Education Major in English",
            department: "Teacher Education Department",
            description: "Specialized program for aspiring English teachers focusing on language and literature instruction",
            duration: "4 years",
            badge: "In-Demand"
        },
        {
            title: "BS Business Administration Major in Financial Management",
            department: "College of Business Administration",
            description: "Advanced financial planning, analysis, and management skills for corporate and entrepreneurial success",
            duration: "4 years",
            badge: "Growing Field"
        },
        {
            title: "BS Business Administration Major in Marketing Management",
            department: "College of Business Administration",
            description: "Strategic marketing concepts, digital marketing, and brand management for modern businesses",
            duration: "4 years",
            badge: "New"
        }
    ];

    const stats = [
        { icon: Users, label: "Active Students", value: "2,400+" },
        { icon: GraduationCap, label: "Graduates", value: "5,000+" },
        { icon: Award, label: "Programs", value: "5" },
        { icon: Building2, label: "Departments", value: "3" }
    ];

    const features = [
        {
            icon: Target,
            title: "Quality Education",
            description: "Excellence in preparing students with comprehensive training and practical experience"
        },
        {
            icon: Heart,
            title: "Career-Ready Graduates",
            description: "Equipping students with practical skills and knowledge to thrive in today’s job market"
        },
        {
            icon: Lightbulb,
            title: "Modern Learning",
            description: "Updated curriculum and facilities to meet current industry standards"
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <Head title="Welcome" />

            {/* Hero Section */}
            <section className="bg-blue-600 dark:bg-blue-700 text-white py-20">
                <div className="max-w-6xl mx-auto px-4 text-center">
                    <div className="flex items-center justify-center mb-6 space-x-2">
                        <div className="flex items-center space-x-2">
                            <Building2 className="h-6 w-6" />
                            <span className="text-lg opacity-90">Est. 2003</span>
                        </div>
                    </div>


                    <h1 className="text-4xl md:text-5xl font-bold mb-6">
                        Opol Community College
                    </h1>

                    <p className="text-xl mb-8 max-w-3xl mx-auto opacity-90">
                        Fueling ambition, advancing knowledge, and creating opportunities for every learner.
                    </p>

                    {/* <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 dark:bg-gray-100 dark:text-blue-700 dark:hover:bg-white">
                            Apply Now
                        </Button>
                        <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-blue-600 dark:border-gray-200 dark:hover:bg-gray-200 dark:hover:text-blue-700">
                            View Programs
                        </Button>
                    </div> */}
                </div>
            </section>

            {/* Stats Section */}
            {/* <section className="py-16 bg-white dark:bg-gray-800 transition-colors duration-200">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        {stats.map((stat, index) => (
                            <div key={index}>
                                <div className="flex justify-center mb-3">
                                    <stat.icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{stat.value}</div>
                                <div className="text-gray-600 dark:text-gray-300">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section> */}

            {/* About Section */}
            <section className="py-16 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                            Why Choose OCC?
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                            We provide quality education that prepares students for successful careers and meaningful community engagement.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <div key={index} className="text-center">
                                <div className="flex justify-center mb-4">
                                    <feature.icon className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Programs Section */}
            <section className="py-16 bg-white dark:bg-gray-800 transition-colors duration-200">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                            Academic Programs
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-300">
                            Choose from our range of bachelor's degree programs across three departments.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {programs.map((program, index) => (
                            <Card key={index} className="h-full bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 transition-colors duration-200">
                                <CardHeader>
                                    <div className="flex justify-between items-start mb-2">
                                        {/* <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200">
                                            {program.badge}
                                        </Badge> */}
                                        <span className="text-sm text-gray-500 dark:text-gray-400">{program.duration}</span>
                                    </div>
                                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-2 uppercase">
                                        {program.department}
                                    </div>
                                    <CardTitle className="text-lg leading-tight text-gray-900 dark:text-white">
                                        {program.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="mb-4 text-gray-600 dark:text-gray-300">
                                        {program.description}
                                    </CardDescription>
                                    {/* <Button variant="outline" size="sm" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-500 dark:text-gray-200 dark:hover:bg-gray-600">
                                        Learn More
                                    </Button> */}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact Section */}


            {/* Footer */}

        </div>
    );
}

export default Welcome;

Welcome.layout = (page) => <GuestLayout>{page}</GuestLayout>;
