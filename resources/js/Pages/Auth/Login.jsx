import { Link, useForm } from "@inertiajs/react";
import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Head } from "@inertiajs/react";
import LoginStudents from "../../../images/Login_Students.png";
import { Card, CardContent } from "@/Components/ui/card";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { Alert, AlertTitle } from "@/Components/ui/alert";
import { CheckCircle2, GraduationCap, AlertCircle } from "lucide-react";
import AppLogo from "@/Components/AppLogo";
import { TwoModeToggle } from "@/Components/two-modes-toggle";

export default function Login({ status }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        user_id_no: "",
        password: "",
        remember: false,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        setSubmitting(true);

        post(route("login"), {
            onError: () => {
                // reset("password");
            },
            onFinish: () => {
                setSubmitting(false);
            },
        });
    };

    return (
        <div className="min-h-screen w-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900">
            <Head title="Login" />

            {status && (
                <div className="fixed top-4 sm:top-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
                    <Alert className="border-green-200 bg-white dark:bg-slate-900 shadow-lg border-l-4 border-l-green-500">
                        <div className="flex gap-3 items-center">
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                            <AlertTitle className="text-green-700 dark:text-green-300 font-medium mb-0 text-sm sm:text-base">
                                {status}
                            </AlertTitle>
                        </div>
                    </Alert>
                </div>
            )}

            <Card className="relative w-full max-w-[95%] sm:max-w-xl md:max-w-2xl lg:max-w-5xl xl:max-w-6xl overflow-hidden shadow-xl border-0">
                <div className="absolute top-3 right-3 z-10">
                    <TwoModeToggle />
                </div>
                <div className="grid lg:grid-cols-[1.1fr_1fr] gap-0">
                    {/* Left Side - Hidden on mobile/tablet, visible on desktop */}
                    <div className="hidden lg:flex flex-col justify-center items-center p-8 xl:p-16 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white relative">
                        {/* Simple decorative elements */}
                        <div className="absolute top-0 right-0 w-48 xl:w-64 h-48 xl:h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
                        <div className="absolute bottom-0 left-0 w-72 xl:w-96 h-72 xl:h-96 bg-white/5 rounded-full translate-y-48 -translate-x-48"></div>

                        <div className="relative z-10 text-center space-y-6 xl:space-y-8 max-w-md">
                            <div className="inline-flex items-center justify-center p-3 xl:p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                                <GraduationCap className="w-12 h-12 xl:w-16 xl:h-16" />
                            </div>

                            <div className="space-y-2 xl:space-y-3">
                                <h2 className="text-3xl xl:text-4xl font-bold tracking-tight">
                                    Opol Community College
                                </h2>
                                <p className="text-lg xl:text-xl font-semibold opacity-95">
                                    Student Information System
                                </p>
                                <div className="w-20 h-1 bg-white/50 mx-auto rounded-full"></div>
                            </div>

                            <div className="space-y-2 xl:space-y-3 text-white/90">
                                <p className="text-base xl:text-lg">📚 Manage your academic journey</p>
                                <p className="text-base xl:text-lg">📊 Access grades and schedules</p>
                                <p className="text-base xl:text-lg">🎓 Stay connected with education</p>
                            </div>

                            <div className="relative mt-8 xl:mt-12">
                                <img
                                    src={LoginStudents}
                                    alt="students"
                                    className="w-64 xl:w-80 rounded-2xl shadow-2xl mx-auto"
                                    draggable="false"
                                    onContextMenu={(e) => e.preventDefault()}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Login Form - Responsive for all devices */}
                    <div className="flex flex-col justify-center p-6 sm:p-8 md:p-10 lg:p-12 bg-white dark:bg-slate-900">
                        <CardContent className="space-y-6 sm:space-y-8 p-0">
                            {/* Logo and Title */}
                            <div className="text-center space-y-3 sm:space-y-4">
                                <Link href="/" className="inline-block">
                                    <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 mx-auto hover:scale-105 transition-transform">
                                        <AppLogo />
                                    </div>
                                </Link>
                                <div className="space-y-1 sm:space-y-2">
                                    <h1 className="text-2xl sm:text-3xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                        Welcome Back
                                    </h1>
                                    <p className="text-sm sm:text-base text-muted-foreground">Sign in to continue your journey</p>
                                </div>
                            </div>



                            {/* Login Form */}
                            <form onSubmit={submit} className="space-y-5 sm:space-y-6">
                                {/* ID Number Field */}
                                <div className="space-y-2">
                                    <label htmlFor="user_id_no" className="text-xs sm:text-sm font-semibold text-foreground">
                                        ID Number <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        type="text"
                                        id="user_id_no"
                                        name="user_id_no"
                                        value={data.user_id_no}
                                        onChange={(e) => setData("user_id_no", e.target.value)}
                                        placeholder="Enter your student ID"
                                        className={`h-11 sm:h-12 text-sm sm:text-base ${errors.user_id_no ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                        required
                                    />
                                    {errors.user_id_no && (
                                        <div className="flex items-center gap-2 p-2.5 sm:p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
                                            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                                            <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm font-medium">
                                                {errors.user_id_no}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Password Field */}
                                <div className="space-y-2">
                                    <label htmlFor="password" className="text-xs sm:text-sm font-semibold text-foreground">
                                        Password <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            id="password"
                                            name="password"
                                            value={data.password}
                                            onChange={(e) => setData("password", e.target.value)}
                                            placeholder="Enter your password"
                                            className={`h-11 sm:h-12 pr-11 sm:pr-12 text-sm sm:text-base ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((prev) => !prev)}
                                            className="absolute top-1/2 right-3 sm:right-4 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showPassword ? <FaEye size={18} className="sm:w-5 sm:h-5" /> : <FaEyeSlash size={18} className="sm:w-5 sm:h-5" />}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <div className="flex items-center gap-2 p-2.5 sm:p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
                                            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                                            <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm font-medium">
                                                {errors.password}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Submit Button */}
                                <Button
                                    type="submit"
                                    disabled={processing || submitting}
                                    className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
                                >
                                    {submitting ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                            Signing in...
                                        </span>
                                    ) : (
                                        "Sign In"
                                    )}
                                </Button>
                            </form>

                            {/* Forgot Password Link */}
                            <div className="text-center">
                                <a href="/forgot-password">
                                    <Button variant="link" className="font-medium text-sm sm:text-base text-blue-600 dark:text-blue-400">
                                        Forgot your password?
                                    </Button>
                                </a>
                            </div>
                        </CardContent>
                    </div>
                </div>
            </Card>

            {/* Footer */}
            <p className="mt-6 sm:mt-8 text-xs sm:text-sm text-muted-foreground text-center">
                © 2024 Opol Community College. All rights reserved.
            </p>
        </div>
    );
}
