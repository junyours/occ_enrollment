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
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900">
            <Head title="Login" />

            {status && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md">
                    <Alert className="border-green-200 bg-white dark:bg-slate-900 shadow-lg border-l-4 border-l-green-500">
                        <div className="flex gap-3 items-center">
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                            <AlertTitle className="text-green-700 dark:text-green-300 font-medium mb-0 text-sm">
                                {status}
                            </AlertTitle>
                        </div>
                    </Alert>
                </div>
            )}

            {/* Main Container with Max Width */}
            <div className="w-full max-w-[1400px] flex items-center justify-center">
                <Card className="relative w-full max-w-sm sm:max-w-md lg:max-w-4xl xl:max-w-5xl overflow-hidden shadow-xl border-0">
                    <div className="absolute top-3 right-3 z-10">
                        <TwoModeToggle />
                    </div>
                    
                    <div className="grid lg:grid-cols-2 gap-0">
                        {/* Left Side - Desktop Only */}
                        <div className="hidden lg:flex flex-col justify-center items-center p-8 xl:p-10 bg-primary text-primary-foreground relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 xl:w-64 xl:h-64 bg-primary-foreground/5 rounded-full -translate-y-24 translate-x-24"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 xl:w-80 xl:h-80 bg-primary-foreground/5 rounded-full translate-y-32 -translate-x-32"></div>

                            <div className="relative z-10 text-center space-y-4 xl:space-y-5 w-full max-w-sm">
                                <div className="space-y-2">
                                    <h2 className="text-2xl xl:text-3xl font-bold tracking-tight">
                                        Opol Community College
                                    </h2>
                                    <p className="text-base xl:text-lg font-semibold opacity-95">
                                        Student Information System
                                    </p>
                                    <div className="w-20 h-1 bg-primary-foreground/50 mx-auto rounded-full"></div>
                                </div>

                                <div className="space-y-2 opacity-90 text-sm xl:text-base">
                                    <p>📚 Manage your academic journey</p>
                                    <p>📊 Access grades and schedules</p>
                                    <p>🎓 Stay connected with education</p>
                                </div>

                                <div className="relative mt-4 xl:mt-6">
                                    <img
                                        src={LoginStudents}
                                        alt="students"
                                        className="w-52 xl:w-64 rounded-2xl shadow-2xl mx-auto"
                                        draggable="false"
                                        onContextMenu={(e) => e.preventDefault()}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right Side - Login Form */}
                        <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-8 xl:p-10 bg-white dark:bg-slate-900">
                            <CardContent className="space-y-5 xl:space-y-6 p-0 w-full max-w-md mx-auto">
                                {/* Logo and Title */}
                                <div className="text-center space-y-3">
                                    <Link href="/" className="inline-block">
                                        <div className="w-20 h-20 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto hover:scale-105 transition-transform">
                                            <AppLogo />
                                        </div>
                                    </Link>
                                    <div className="space-y-1">
                                        <h1 className="text-xl sm:text-2xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                            Welcome Back
                                        </h1>
                                        <p className="text-xs sm:text-sm text-muted-foreground">Sign in to continue your journey</p>
                                    </div>
                                </div>

                                {/* Login Form */}
                                <form onSubmit={submit} className="space-y-4">
                                    {/* ID Number Field */}
                                    <div className="space-y-2">
                                        <label htmlFor="user_id_no" className="text-xs sm:text-sm font-semibold text-foreground block">
                                            ID Number <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            type="text"
                                            id="user_id_no"
                                            name="user_id_no"
                                            value={data.user_id_no}
                                            onChange={(e) => setData("user_id_no", e.target.value)}
                                            placeholder="Enter your student ID"
                                            className={`h-11 text-sm sm:text-base w-full ${errors.user_id_no ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                            required
                                        />
                                        {errors.user_id_no && (
                                            <div className="flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
                                                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                                <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm font-medium">
                                                    {errors.user_id_no}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Password Field */}
                                    <div className="space-y-2">
                                        <label htmlFor="password" className="text-xs sm:text-sm font-semibold text-foreground block">
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
                                                className={`h-11 pr-11 text-sm sm:text-base w-full ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((prev) => !prev)}
                                                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showPassword ? <FaEye size={18} /> : <FaEyeSlash size={18} />}
                                            </button>
                                        </div>
                                        {errors.password && (
                                            <div className="flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
                                                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
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
                                        className="w-full h-11 text-sm sm:text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
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
                                <div className="text-center pt-1">
                                    <a href="/forgot-password">
                                        <Button variant="link" className="font-medium text-xs sm:text-sm text-blue-600 dark:text-blue-400 p-0 h-auto">
                                            Forgot your password?
                                        </Button>
                                    </a>
                                </div>
                            </CardContent>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Footer */}
            <p className="mt-6 text-xs text-muted-foreground text-center">
                © 2024 Opol Community College. All rights reserved.
            </p>
        </div>
    );
}