import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Mail, ArrowLeft, CheckCircle, Loader2, CheckCircle2, User, AlertCircle, KeyRound } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/Components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import AppLogo from '@/Components/AppLogo';
import { TwoModeToggle } from '@/Components/two-modes-toggle';

export default function ForgotPassword({ status, user_found, user_data }) {
    const { data, setData, post, processing, errors } = useForm({
        user_id_no: '',
        email: '',
    });

    const [step, setStep] = useState(user_found ? 2 : 1);
    const [foundUser, setFoundUser] = useState(user_data || null);

    const findUser = (e) => {
        e.preventDefault();
        post(route('password.find-user'), {
            onSuccess: (page) => {
                if (page.props.user_found) {
                    setStep(2);
                    setFoundUser(page.props.user_data);
                    setData('email', page.props.user_data.email);
                }
            },
        });
    };

    const sendResetLink = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    const startOver = () => {
        setStep(1);
        setFoundUser(null);
        setData({ user_id_no: '', email: '' });
    };

    return (
        <div className='h-svh w-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900'>
            <Head title="Forgot Password" />

            {/* Theme Toggle */}
            <div className="absolute top-4 right-4">
                <TwoModeToggle />
            </div>

            <div className="w-full max-w-md space-y-6">
                {/* Logo */}
                {/* <div className="text-center">
                    <a href="/" className="inline-block">
                        <div className="w-16 h-16 mx-auto hover:scale-105 transition-transform">
                            <AppLogo />
                        </div>
                    </a>
                </div> */}

                {/* Main Card */}
                <Card className="shadow-xl border-0 overflow-hidden">
                    <CardHeader className="text-center space-y-3 pb-6 bg-gradient-to-b from-primary/5 to-transparent mt-0 pt-6">
                        {/* <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center ring-8 ring-primary/5 mt-4">
                            <KeyRound className="w-7 h-7 text-primary" />
                        </div> */}
                        <CardTitle className="text-2xl font-bold text-foreground">
                            Forgot Password?
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                            {step === 1
                                ? "No worries! Enter your Student ID and we'll help you recover your account."
                                : "We'll send a secure password reset link to your registered email."
                            }
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6 p-6">
                        {/* Success Status */}
                        {status && (
                            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
                                <div className='flex gap-3 items-center'>
                                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                                    <AlertTitle className="text-green-700 dark:text-green-300 font-medium mb-0 text-sm">
                                        {status}
                                    </AlertTitle>
                                </div>
                            </Alert>
                        )}

                        {/* Error Messages */}
                        {(errors.user_id_no || errors.email || errors.general) && (
                            <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
                                <div className='flex gap-3 items-start'>
                                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        {errors.user_id_no && (
                                            <p className="text-sm font-medium text-red-600 dark:text-red-400">{errors.user_id_no}</p>
                                        )}
                                        {errors.email && (
                                            <p className="text-sm font-medium text-red-600 dark:text-red-400">{errors.email}</p>
                                        )}
                                        {errors.general && (
                                            <p className="text-sm font-medium text-red-600 dark:text-red-400">{errors.general}</p>
                                        )}
                                    </div>
                                </div>
                            </Alert>
                        )}

                        {/* Step 1: Find User */}
                        {step === 1 && (
                            <form onSubmit={findUser} className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="user_id_no" className="text-sm font-semibold text-foreground">
                                        Student ID Number <span className="text-destructive">*</span>
                                    </Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                                        <Input
                                            id="user_id_no"
                                            type="text"
                                            name="user_id_no"
                                            value={data.user_id_no}
                                            onChange={(e) => setData('user_id_no', e.target.value)}
                                            className={`pl-11 h-12 text-base ${errors.user_id_no ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                            placeholder="Enter your student ID"
                                            autoFocus
                                            disabled={processing}
                                        />
                                    </div>
                                    {errors.user_id_no && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                            <span className="inline-block w-1 h-1 bg-muted-foreground rounded-full"></span>
                                            Please enter a valid student ID
                                        </p>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                                    disabled={processing || !data.user_id_no}
                                >
                                    {processing ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Finding Account...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <User className="w-5 h-5" />
                                            Find My Account
                                        </span>
                                    )}
                                </Button>
                            </form>
                        )}

                        {/* Step 2: Confirm Email and Send Reset Link */}
                        {step === 2 && foundUser && (
                            <div className="space-y-5">
                                {/* User Found Display */}
                                <div className="bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-900 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-green-800 dark:text-green-300">Account Found!</p>
                                            <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                                                {foundUser.name}
                                            </p>
                                            <p className="text-xs text-green-600 dark:text-green-500 mt-0.5 flex items-center gap-1.5">
                                                <Mail className="w-3.5 h-3.5" />
                                                {foundUser.masked_email}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={sendResetLink} className="space-y-4">
                                    <div className="bg-muted/50 rounded-lg p-4 border border-border">
                                        <div className="flex gap-3">
                                            <div className="p-2 bg-primary/10 rounded-full h-fit">
                                                <Mail className="w-4 h-4 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">
                                                    Ready to reset your password?
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Click the button below to receive a secure reset link via email. The link will expire in 60 minutes.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <Button
                                            type="button"
                                            onClick={startOver}
                                            variant="outline"
                                            className="flex-1 h-11 font-medium"
                                            disabled={processing}
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Try Again
                                        </Button>

                                        <Button
                                            type="submit"
                                            className="flex-1 h-11 font-semibold shadow-lg hover:shadow-xl transition-all"
                                            disabled={processing}
                                        >
                                            {processing ? (
                                                <span className="flex items-center gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Sending...
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    <Mail className="w-4 h-4" />
                                                    Send Reset Link
                                                </span>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        )}

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

                        {/* Email Incorrect Notice - Always Visible */}
                        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-900">
                            <div className="flex gap-3 items-start">
                                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                                        Email Incorrect or Changed?
                                    </p>
                                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                        If your registered email is incorrect or outdated, please{' '}
                                        <a
                                            href="https://docs.google.com/forms/d/e/1FAIpQLSem_KPPd2CsZ-HgAd_22u1zKNZbN_PCTE6CROGA0EAXycFumg/viewform"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-semibold underline hover:text-amber-900 dark:hover:text-amber-200 transition-colors"
                                        >
                                            fill out this form
                                        </a>
                                        {' '}to update your information.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Help Text */}
                        {step === 1 && (
                            <div className="bg-muted/30 rounded-lg p-4 border border-border">
                                <p className="text-xs text-muted-foreground text-center">
                                    💡 <span className="font-medium">Tip:</span> Your Student ID is the number you use to log in to the system
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Footer */}
                <p className="text-xs text-muted-foreground text-center">
                    Need help? Contact your system administrator
                </p>
            </div>
        </div>
    );
}