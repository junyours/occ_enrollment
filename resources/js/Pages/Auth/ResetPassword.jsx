import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Lock, Eye, EyeOff, Shield, CheckCircle, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Alert, AlertTitle } from '@/Components/ui/alert';
import AppLogo from '@/Components/AppLogo';
import { TwoModeToggle } from '@/Components/two-modes-toggle';

export default function ResetPassword({ token, email }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);

    // Password strength calculation
    const calculatePasswordStrength = (password) => {
        let strength = 0;
        if (password.length >= 8) strength += 25;
        if (/[A-Z]/.test(password)) strength += 25;
        if (/[a-z]/.test(password)) strength += 25;
        if (/[0-9]/.test(password)) strength += 15;
        if (/[^A-Za-z0-9]/.test(password)) strength += 10;
        return Math.min(strength, 100);
    };

    const handlePasswordChange = (e) => {
        const newPassword = e.target.value;
        setData('password', newPassword);
        setPasswordStrength(calculatePasswordStrength(newPassword));
    };

    const getStrengthColor = () => {
        if (passwordStrength < 25) return 'bg-red-500';
        if (passwordStrength < 50) return 'bg-orange-500';
        if (passwordStrength < 75) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getStrengthText = () => {
        if (passwordStrength < 25) return 'Weak';
        if (passwordStrength < 50) return 'Fair';
        if (passwordStrength < 75) return 'Good';
        return 'Strong';
    };

    const passwordsMatch = data.password && data.password_confirmation && data.password === data.password_confirmation;

    const submit = (e) => {
        e.preventDefault();
        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <div className='h-svh w-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900'>
            <Head title="Reset Password" />

            {/* Theme Toggle */}
            <div className="absolute top-4 right-4">
                <TwoModeToggle />
            </div>

            <div className="w-full max-w-md space-y-6">
                {/* Logo */}
                <div className="text-center">
                    <a href="/" className="inline-block">
                        <div className="w-16 h-16 mx-auto hover:scale-105 transition-transform">
                            <AppLogo />
                        </div>
                    </a>
                </div>

                {/* Main Card */}
                <Card className="shadow-xl border-0 overflow-hidden">
                    <CardHeader className="text-center space-y-3 pb-6 bg-gradient-to-b from-primary/5 to-transparent mt-0">
                        <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center ring-8 ring-primary/5 mt-4">
                            <KeyRound className="w-7 h-7 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-foreground">
                            Create New Password
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                            Set up a strong and secure password for your account
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6 p-6">
                        {/* Error Alert */}
                        {errors.email && (
                            <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
                                <div className='flex gap-3 items-center'>
                                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
                                    <AlertTitle className="text-red-700 dark:text-red-300 font-medium mb-0 text-sm">
                                        {errors.email}
                                    </AlertTitle>
                                </div>
                            </Alert>
                        )}

                        <form onSubmit={submit} className="space-y-5">
                            {/* New Password Field */}
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                                    New Password <span className="text-destructive">*</span>
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={data.password}
                                        onChange={handlePasswordChange}
                                        className={`pl-11 pr-12 h-12 text-base ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                        placeholder="Create a strong password"
                                        autoComplete="new-password"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>

                                {/* Password Strength Indicator */}
                                {data.password && (
                                    <div className="space-y-2 pt-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground font-medium">Password strength:</span>
                                            <span className={`font-semibold ${passwordStrength < 50 ? 'text-red-600 dark:text-red-400' :
                                                    passwordStrength < 75 ? 'text-yellow-600 dark:text-yellow-400' :
                                                        'text-green-600 dark:text-green-400'
                                                }`}>
                                                {getStrengthText()}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                                                style={{ width: `${passwordStrength}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {errors.password && (
                                    <div className="flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg mt-2">
                                        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                        <p className="text-red-600 dark:text-red-400 text-xs font-medium">
                                            {errors.password}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password Field */}
                            <div className="space-y-2">
                                <Label htmlFor="password_confirmation" className="text-sm font-semibold text-foreground">
                                    Confirm Password <span className="text-destructive">*</span>
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                                    <Input
                                        id="password_confirmation"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="password_confirmation"
                                        value={data.password_confirmation}
                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                        className={`pl-11 pr-12 h-12 text-base ${errors.password_confirmation ? 'border-destructive focus-visible:ring-destructive' :
                                                passwordsMatch ? 'border-green-500 focus-visible:ring-green-500 dark:border-green-600' : ''
                                            }`}
                                        placeholder="Re-enter your password"
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>

                                {/* Password Match Indicator */}
                                {data.password_confirmation && (
                                    <div className="flex items-center text-xs mt-2">
                                        {passwordsMatch ? (
                                            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
                                                <CheckCircle className="w-4 h-4" />
                                                Passwords match
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
                                                <AlertCircle className="w-4 h-4" />
                                                Passwords don't match
                                            </div>
                                        )}
                                    </div>
                                )}

                                {errors.password_confirmation && (
                                    <div className="flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg mt-2">
                                        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                        <p className="text-red-600 dark:text-red-400 text-xs font-medium">
                                            {errors.password_confirmation}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Password Requirements */}
                            <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                <h4 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-primary" />
                                    Password Requirements
                                </h4>
                                <ul className="text-xs space-y-2">
                                    <li className={`flex items-center transition-colors ${data.password.length >= 8 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                                        <CheckCircle className={`w-3.5 h-3.5 mr-2 ${data.password.length >= 8 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground/50'}`} />
                                        At least 8 characters long
                                    </li>
                                    <li className={`flex items-center transition-colors ${/[A-Z]/.test(data.password) ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                                        <CheckCircle className={`w-3.5 h-3.5 mr-2 ${/[A-Z]/.test(data.password) ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground/50'}`} />
                                        One uppercase letter (A-Z)
                                    </li>
                                    <li className={`flex items-center transition-colors ${/[a-z]/.test(data.password) ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                                        <CheckCircle className={`w-3.5 h-3.5 mr-2 ${/[a-z]/.test(data.password) ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground/50'}`} />
                                        One lowercase letter (a-z)
                                    </li>
                                    <li className={`flex items-center transition-colors ${/[0-9]/.test(data.password) ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                                        <CheckCircle className={`w-3.5 h-3.5 mr-2 ${/[0-9]/.test(data.password) ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground/50'}`} />
                                        At least one number (0-9)
                                    </li>
                                </ul>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                                disabled={processing || !data.password || !data.password_confirmation || !passwordsMatch}
                            >
                                {processing ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Resetting Password...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <Shield className="w-5 h-5" />
                                        Reset Password
                                    </span>
                                )}
                            </Button>
                        </form>

                        {/* Divider */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-2 text-muted-foreground">
                                    or
                                </span>
                            </div>
                        </div>

                        {/* Back to Login */}
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">
                                Remember your password?{' '}
                                <a
                                    href={route('login')}
                                    className="font-semibold text-primary hover:underline transition-all"
                                >
                                    Sign in here
                                </a>
                            </p>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}