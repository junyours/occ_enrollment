import React, { useState } from 'react';
import { useForm, usePage } from '@inertiajs/react'; // or wherever your useForm comes from
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Progress } from '@/Components/ui/progress';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function ChangePassword() {
    const { data, setData, put, processing, errors, reset } = useForm({
        current_password: '',
        password: '',
        password_confirmation: ''
    });

    const [success, setSuccess] = useState(false);

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
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

    const handlePasswordSubmit = (e) => {
        e.preventDefault();

        // Example post request to /change-password
        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setSuccess(true);
            },
        });
    };

    return (
        <Card>
            <CardHeader className="pb-6">
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                    Update your password to keep your account secure.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                    <div className='gap-4 grid sm:grid-cols-2'>
                        <div className='space-y-2'>
                            {/* Current Password Field */}
                            <div>
                                {success && (
                                    <div className="text-sm text-green-600 flex items-center mb-4">
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Password updated successfully!
                                    </div>
                                )}

                                <Label htmlFor="current_password" className="text-sm font-medium">
                                    Current Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" />
                                    <Input
                                        id="current_password"
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        value={data.current_password}
                                        onChange={(e) => setData('current_password', e.target.value)}
                                        className={`pl-10 pr-10 h-11 ${errors.current_password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                                        placeholder="Enter current password"
                                        autoComplete="current-password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                                    >
                                        {showCurrentPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                    </button>
                                </div>
                                {errors.current_password && (
                                    <p className="text-sm text-red-600 mt-1 flex items-center">
                                        <AlertCircle className="w-4 h-4 mr-2" />
                                        {errors.current_password}
                                    </p>
                                )}
                            </div>

                            {/* New Password Field */}
                            <div>
                                <Label htmlFor="new_password" className="text-sm font-medium">
                                    New Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" />
                                    <Input
                                        id="new_password"
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={data.password}
                                        onChange={handlePasswordChange}
                                        className={`pl-10 pr-10 h-11 ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                                        placeholder="Enter new password"
                                        autoComplete="new-password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                                    >
                                        {showNewPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                    </button>
                                </div>
                                {data.password && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-600">Password strength:</span>
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
                            <div>
                                <Label htmlFor="confirm_password" className="text-sm font-medium">
                                    Confirm New Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" />
                                    <Input
                                        id="confirm_password"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={data.password_confirmation}
                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                        className={`pl-10 pr-10 h-11 ${errors.password_confirmation ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : passwordsMatch ? 'border-green-300 focus:border-green-500 focus:ring-green-500' : ''}`}
                                        placeholder="Confirm new password"
                                        autoComplete="new-password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                                    >
                                        {showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
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
                        </div>

                        {/* Password Requirements */}
                        <div className="p-4 rounded-lg border h-max sm:mt-6">
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
                    </div>

                    <Button
                        type="submit"
                        disabled={processing || !data.current_password || !data.password || !data.password_confirmation || !passwordsMatch}
                        className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                        {processing ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Updating Password...
                            </>
                        ) : (
                            <>
                                <Lock className="w-4 h-4 mr-2" />
                                Change Password
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
