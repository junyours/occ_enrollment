import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Lock, Mail, Eye, EyeOff, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Progress } from '@/Components/ui/progress';
import GuestLayout from '@/Layouts/GuestLayout';

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
        <GuestLayout>
            <Head title="Reset Password" />

            <div className="min-h-screen flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md space-y-6">
                    <Card className="">
                        <CardHeader className="text-center space-y-2 pb-6">
                            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <Shield className="w-6 h-6 text-green-600" />
                            </div>
                            <CardTitle className="text-2xl font-bold">
                                Reset Your Password
                            </CardTitle>
                            <CardDescription className="leading-relaxed">
                                Create a new secure password for your account
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                {/* Email Field */}
                                {/* <div className="space-y-2">
                                    <Label htmlFor="email" className="text-sm font-medium">
                                        Email Address
                                    </Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" />
                                        <Input
                                            id="email"
                                            type="email"
                                            name="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            className={`pl-10 h-11 ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                                            autoComplete="username"
                                            readOnly
                                        />
                                    </div>

                                </div> */}

                                {errors.email && (
                                    <p className="text-sm text-red-600 mt-1 flex items-center">
                                        <AlertCircle className="w-4 h-4 mr-2" />
                                        {errors.email}
                                    </p>
                                )}

                                {/* New Password Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-sm font-medium">
                                        New Password
                                    </Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" />
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={data.password}
                                            onChange={handlePasswordChange}
                                            className={`pl-10 pr-10 h-11 ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                                            placeholder="Enter your new password"
                                            autoComplete="new-password"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    {data.password && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="">Password strength:</span>
                                                <span className={`font-medium ${passwordStrength < 50 ? 'text-red-600' : passwordStrength < 75 ? 'text-yellow-600' : 'text-green-600'}`}>
                                                    {getStrengthText()}
                                                </span>
                                            </div>
                                            <Progress value={passwordStrength} className="h-2">
                                                <div className={`h-full rounded-full transition-all ${getStrengthColor()}`} style={{ width: `${passwordStrength}%` }} />
                                            </Progress>
                                        </div>
                                    )}
                                    {errors.password && (
                                        <p className="text-sm text-red-600 mt-1 flex items-center">
                                            <AlertCircle className="w-4 h-4 mr-2" />
                                            {errors.password}
                                        </p>
                                    )}
                                </div>

                                {/* Confirm Password Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="password_confirmation" className="text-sm font-medium">
                                        Confirm New Password
                                    </Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" />
                                        <Input
                                            id="password_confirmation"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            name="password_confirmation"
                                            value={data.password_confirmation}
                                            onChange={(e) => setData('password_confirmation', e.target.value)}
                                            className={`pl-10 pr-10 h-11 ${errors.password_confirmation ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : passwordsMatch ? 'border-green-300 focus:border-green-500 focus:ring-green-500' : ''}`}
                                            placeholder="Confirm your new password"
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                                        >
                                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    {data.password_confirmation && (
                                        <div className="flex items-center text-xs mt-1">
                                            {passwordsMatch ? (
                                                <div className="flex items-center text-green-600">
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    Passwords match
                                                </div>
                                            ) : (
                                                <div className="flex items-center text-red-600">
                                                    <AlertCircle className="w-4 h-4 mr-1" />
                                                    Passwords don't match
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {errors.password_confirmation && (
                                        <p className="text-sm text-red-600 mt-1 flex items-center">
                                            <AlertCircle className="w-4 h-4 mr-2" />
                                            {errors.password_confirmation}
                                        </p>
                                    )}
                                </div>

                                {/* Password Requirements */}
                                <div className="p-4 rounded-lg border">
                                    <h4 className="text-sm font-medium mb-2">Password Requirements:</h4>
                                    <ul className="text-xs space-y-1">
                                        <li className={`flex items-center ${data.password.length >= 8 ? 'text-green-600' : ''}`}>
                                            <CheckCircle className={`w-3 h-3 mr-2 ${data.password.length >= 8 ? 'text-green-600' : 'text-slate-400'}`} />
                                            At least 8 characters
                                        </li>
                                        <li className={`flex items-center ${/[A-Z]/.test(data.password) ? 'text-green-600' : ''}`}>
                                            <CheckCircle className={`w-3 h-3 mr-2 ${/[A-Z]/.test(data.password) ? 'text-green-600' : 'text-slate-400'}`} />
                                            One uppercase letter
                                        </li>
                                        <li className={`flex items-center ${/[a-z]/.test(data.password) ? 'text-green-600' : ''}`}>
                                            <CheckCircle className={`w-3 h-3 mr-2 ${/[a-z]/.test(data.password) ? 'text-green-600' : 'text-slate-400'}`} />
                                            One lowercase letter
                                        </li>
                                        <li className={`flex items-center ${/[0-9]/.test(data.password) ? 'text-green-600' : ''}`}>
                                            <CheckCircle className={`w-3 h-3 mr-2 ${/[0-9]/.test(data.password) ? 'text-green-600' : 'text-slate-400'}`} />
                                            One number
                                        </li>
                                    </ul>
                                </div>

                                <Button
                                    onClick={submit}
                                    className="w-full h-11 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                                    disabled={processing || !data.password || !data.password_confirmation || !passwordsMatch}
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Resetting Password...
                                        </>
                                    ) : (
                                        <>
                                            <Shield className="w-4 h-4 mr-2" />
                                            Reset Password
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Security Note */}
                    {/* <div className="text-center">
                        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                            Your password will be encrypted and stored securely.
                            You'll be automatically signed in after resetting.
                        </p>
                    </div> */}
                </div>
            </div>
        </GuestLayout>
    );
}
