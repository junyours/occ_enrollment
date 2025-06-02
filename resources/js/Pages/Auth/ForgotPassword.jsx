import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Mail, ArrowLeft, CheckCircle, Loader2, CheckCircle2Icon, User } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/Components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import GuestLayout from '@/Layouts/GuestLayout';

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
        <GuestLayout>
            <Head title="Forgot Password" />

            <div className="min-h-screen flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md space-y-6">
                    <Card className="">
                        <CardHeader className="text-center space-y-2 pb-6">
                            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <Mail className="w-6 h-6 text-blue-600" />
                            </div>
                            <CardTitle className="text-2xl font-bold">
                                Forgot Password?
                            </CardTitle>
                            <CardDescription className="">
                                {step === 1
                                    ? "No worries! Enter your User ID and we'll help you find your account."
                                    : "Confirm sending password reset link to your email."
                                }
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {/* Success Status */}
                            {status && (
                                <Alert className="border-green-200 bg-green-50">
                                    <div className='flex gap-2 items-center'>
                                        <CheckCircle2Icon className="h-4 w-4 text-green-600" />
                                        <AlertTitle className="text-green-700 font-medium mb-0">
                                            {status}
                                        </AlertTitle>
                                    </div>
                                </Alert>
                            )}

                            {/* Error Messages */}
                            {(errors.user_id_no || errors.email || errors.general) && (
                                <Alert className="border-red-200 bg-red-50">
                                    <div className='flex gap-2 items-start'>
                                        <div className="w-1 h-1 bg-red-600 rounded-full mt-2"></div>
                                        <div>
                                            {errors.user_id_no && (
                                                <p className="text-sm text-red-600">{errors.user_id_no}</p>
                                            )}
                                            {errors.email && (
                                                <p className="text-sm text-red-600">{errors.email}</p>
                                            )}
                                            {errors.general && (
                                                <p className="text-sm text-red-600">{errors.general}</p>
                                            )}
                                        </div>
                                    </div>
                                </Alert>
                            )}

                            {/* Step 1: Find User */}
                            {step === 1 && (
                                <form onSubmit={findUser} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="user_id_no" className="text-sm font-medium">
                                            User ID
                                        </Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                                            <Input
                                                id="user_id_no"
                                                type="text"
                                                name="user_id_no"
                                                value={data.user_id_no}
                                                onChange={(e) => setData('user_id_no', e.target.value)}
                                                className={`pl-10 h-11 ${errors.user_id_no ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                                                placeholder="Enter your User ID"
                                                autoFocus
                                                disabled={processing}
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                                        disabled={processing || !data.user_id_no}
                                    >
                                        {processing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Finding Account...
                                            </>
                                        ) : (
                                            <>
                                                <User className="w-4 h-4 mr-2" />
                                                Find My Account
                                            </>
                                        )}
                                    </Button>
                                </form>
                            )}

                            {/* Step 2: Confirm Email and Send Reset Link */}
                            {step === 2 && foundUser && (
                                <div className="space-y-4">
                                    {/* User Found Display */}
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                            <div>
                                                <p className="font-medium text-green-800">Account Found!</p>
                                                <p className="text-sm text-green-600">
                                                    {foundUser.name} - {foundUser.masked_email}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <form onSubmit={sendResetLink} className="space-y-4">
                                        <div className="text-center">
                                            <p className="text-sm text-slate-600 mb-4">
                                                We'll send a password reset link to your email address.
                                            </p>
                                        </div>

                                        <div className="flex gap-3">
                                            <Button
                                                type="button"
                                                onClick={startOver}
                                                variant="outline"
                                                className="flex-1 h-11"
                                                disabled={processing}
                                            >
                                                <ArrowLeft className="w-4 h-4 mr-2" />
                                                Try Again
                                            </Button>

                                            <Button
                                                type="submit"
                                                className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                                                disabled={processing}
                                            >
                                                {processing ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Sending...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Mail className="w-4 h-4 mr-2" />
                                                        Send Link
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Additional Help */}
                            <div className="text-center pt-4 border-t border-slate-200">
                                <p className="text-sm text-slate-500">
                                    Remember your password?{' '}
                                    <a
                                        href={route('login')}
                                        className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                                    >
                                        Sign in here
                                    </a>
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </GuestLayout>
    );
}
