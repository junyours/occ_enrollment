import { Link, useForm } from "@inertiajs/react";
import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Head } from "@inertiajs/react";
import { Card, CardContent } from "@/Components/ui/card";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { Alert, AlertTitle } from "@/Components/ui/alert";
import { CheckCircle2, GraduationCap, AlertCircle, BookOpen, BarChart3, Globe } from "lucide-react";
import AppLogo from "@/Components/AppLogo";
import { TwoModeToggle } from "@/Components/two-modes-toggle";
import { Checkbox } from "@/Components/ui/checkbox";

export default function Login({ status }) {
    const { data, setData, post, processing, errors, setError } = useForm({
        user_id_no: "",
        password: "",
        remember: false,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const validate = () => {
        const newErrors = {};

        // ID Number Validation (Example: 00-00000 format)
        if (!data.user_id_no) {
            newErrors.user_id_no = "ID Number is required.";
        }

        // Password Validation
        if (!data.password) {
            newErrors.password = "Password is required.";
        } else if (data.password.length < 8) {
            newErrors.password = "Password must be at least 8 characters.";
        }

        return newErrors;
    };

    const submit = (e) => {
        e.preventDefault();

        // 1. Run local validation
        const localErrors = validate();

        // 2. If there are errors, stop and show them
        if (Object.keys(localErrors).length > 0) {
            // Use Inertia's setError to populate the errors object
            Object.keys(localErrors).forEach((key) => {
                setError(key, localErrors[key]);
            });
            return; // Stop the post request
        }

        // 3. If no local errors, proceed with the server request
        setSubmitting(true);
        post(route("login"), {
            onFinish: () => setSubmitting(false),
        });
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-slate-50 via-slate-100 to-blue-100 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
            <Head title="Login" />

            {status && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md animate-in fade-in slide-in-from-top-4 duration-500">
                    <Alert className="border-green-200 bg-white dark:bg-slate-900 shadow-2xl border-l-4 border-l-green-500">
                        <div className="flex gap-3 items-center">
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                            <AlertTitle className="text-green-700 dark:text-green-300 font-medium mb-0 text-sm">
                                {status}
                            </AlertTitle>
                        </div>
                    </Alert>
                </div>
            )}

            <div className="w-full max-w-5xl animate-in fade-in zoom-in-95 duration-700">
                <Card className="relative overflow-hidden shadow-2xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                    {/* Theme Toggle */}
                    <div className="absolute top-4 right-4 z-20">
                        <TwoModeToggle />
                    </div>

                    <div className="grid lg:grid-cols-2">
                        {/* Left Side - Branding & Features */}
                        <div className="hidden lg:flex flex-col justify-between p-12 bg-primary text-primary-foreground relative overflow-hidden">
                            {/* Decorative Background Elements with subtle pulse */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl animate-pulse"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/20 rounded-full translate-y-32 -translate-x-32 blur-3xl animate-pulse duration-1000"></div>
                            <GraduationCap className="absolute -bottom-10 -right-10 h-64 w-64 text-white/5 -rotate-12" />

                            <div className="relative z-10 space-y-12">
                                <div className="space-y-6 animate-in slide-in-from-left-8 duration-700 delay-150 fill-mode-both">
                                    <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 shadow-xl transition-transform hover:scale-110">
                                        <GraduationCap className="h-8 w-8" />
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-bold tracking-tight">Opol Community College</h2>
                                        <p className="text-lg font-medium text-blue-100 opacity-80">Student Information System</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {[
                                        { icon: <BookOpen className="h-5 w-5" />, text: "Manage academic journey", delay: "delay-[400ms]" },
                                        { icon: <BarChart3 className="h-5 w-5" />, text: "Access grades and schedules", delay: "delay-[500ms]" },
                                        { icon: <Globe className="h-5 w-5" />, text: "Stay connected with education", delay: "delay-[600ms]" }
                                    ].map((feature, i) => (
                                        <div key={i} className={`flex items-center gap-4 group animate-in slide-in-from-left-4 fade-in duration-500 fill-mode-both ${feature.delay}`}>
                                            <div className="p-2 rounded-lg bg-white/10 group-hover:bg-white/30 group-hover:scale-110 transition-all">
                                                {feature.icon}
                                            </div>
                                            <span className="text-sm font-medium opacity-90">{feature.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="relative z-10 pt-8 border-t border-white/10 animate-in fade-in duration-1000 delay-[800ms] fill-mode-both mt-2">
                                <p className="text-xs text-blue-200 font-medium uppercase tracking-widest">Empowering Excellence</p>
                            </div>
                        </div>

                        {/* Right Side - Login Form */}
                        <div className="relative flex flex-col justify-center p-8 sm:p-12 bg-white dark:bg-slate-900 overflow-hidden">
                            {/* Large Background Watermark Logo */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
                                <div className="w-[150%] h-[150%] opacity-[0.20] dark:opacity-[0.07] transition-transform duration-700 group-hover:scale-110 -rotate-12 translate-x-20 translate-y-20">
                                    <AppLogo />
                                </div>
                            </div>
                            <CardContent className="relative z-10 space-y-8 p-0 w-full max-w-sm mx-auto">

                                {/* Header Section (Logo, Title, Subtitle) */}
                                <div className="text-center space-y-6 animate-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">

                                    <div className="space-y-2">
                                        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-x">
                                            Welcome Back
                                        </h1>
                                        <p className="text-sm font-medium text-muted-foreground/80 mx-auto">
                                            Sign in to your student account to continue
                                        </p>
                                    </div>
                                </div>

                                <form onSubmit={submit} className="space-y-5 animate-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
                                    <div>
                                        {/* ID Number Input */}
                                        <div className="relative group">
                                            <Input
                                                type="text"
                                                id="user_id_no"
                                                value={data.user_id_no}
                                                onChange={(e) => {
                                                    setData("user_id_no", e.target.value);
                                                    if (errors.user_id_no) setError("user_id_no", null); // Clear error on type
                                                }}
                                                placeholder=" " // Keep this as a space for the label logic to work
                                                className={`peer h-14 pt-6 pb-2 px-3 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 transition-all duration-300
                                                        focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900
                                                        ${errors.user_id_no ? 'border-red-500 focus-visible:ring-red-500 animate-shake' : ''}`}
                                            />
                                            <label
                                                htmlFor="user_id_no"
                                                className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground pointer-events-none transition-all duration-200 
                                                        peer-focus:top-3.5 peer-focus:text-xs peer-focus:text-primary dark:peer-focus:text-blue-400
                                                        peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:text-xs"
                                            >
                                                ID Number
                                            </label>
                                        </div>
                                        {errors.user_id_no && <p className="text-red-500 text-xs mt-1 ml-1 animate-in fade-in slide-in-from-left-1">{errors.user_id_no}</p>}

                                        {/* Password Input */}
                                        <div className="relative group mt-5">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                id="password"
                                                value={data.password}
                                                onChange={(e) => {
                                                    setData("password", e.target.value);
                                                    if (errors.password) setError("password", null); // Clear error on type
                                                }}
                                                placeholder=" " // Keep this as a space
                                                className={`peer h-14 pt-6 pb-2 pr-11 pl-3 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 transition-all duration-300
                                                        focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900
                                                        ${errors.password ? 'border-red-500 focus-visible:ring-red-500 animate-shake' : ''}`}
                                            />
                                            <label
                                                htmlFor="password"
                                                className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground pointer-events-none transition-all duration-200 
                                                       peer-focus:top-3.5 peer-focus:text-xs peer-focus:text-primary dark:peer-focus:text-blue-400
                                                       peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:text-xs"
                                            >
                                                Password
                                            </label>
                                            <button
                                                type="button"
                                                tabIndex="-1" // This prevents the Tab key from selecting the button
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none z-10"
                                            >
                                                {showPassword ? <FaEye size={18} /> : <FaEyeSlash size={18} />}
                                            </button>
                                        </div>
                                        {errors.password && <p className="text-red-500 text-xs mt-1 ml-1 animate-in fade-in slide-in-from-left-1">{errors.password}</p>}
                                    </div>
                                    {/* Remember & Forgot Password */}
                                    <div className="flex items-center justify-between transition-all animate-in fade-in duration-700 delay-500 fill-mode-both">
                                        <div className="flex items-center space-x-2 group cursor-pointer">
                                            <Checkbox
                                                id="remember"
                                                checked={data.remember}
                                                onCheckedChange={(checked) => setData("remember", checked)}
                                                className="transition-transform group-active:scale-90"
                                            />
                                            <label htmlFor="remember" className="text-sm font-medium text-muted-foreground cursor-pointer select-none">Remember me</label>
                                        </div>
                                        <Link href="/forgot-password" size="sm" className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline transition-all">Forgot Password?</Link>
                                    </div>

                                    {/* Submit Button */}
                                    <Button
                                        type="submit"
                                        disabled={processing || submitting}
                                        className="w-full h-12 text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-700 fill-mode-both"
                                    >
                                        {submitting ? (
                                            <span className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Signing In...
                                            </span>
                                        ) : "Sign In"}
                                    </Button>
                                </form>
                            </CardContent>
                        </div>
                    </div>
                </Card>

                <footer className="mt-8 flex flex-col items-center gap-2 animate-in fade-in duration-1000 delay-[1000ms] fill-mode-both">
                    <p className="text-xs text-muted-foreground font-medium">
                        © 2024 Opol Community College. All rights reserved.
                    </p>
                </footer>
            </div>
        </div>
    );
}