import { useEffect, useRef, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { AlertCircle, ArrowLeft, CheckCircle2, Circle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/Components/ui/input-otp';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { TwoModeToggle } from '@/Components/two-modes-toggle';
import AppLogo from '@/Components/AppLogo';

const formatDuration = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const initialDeliveryStatus = 'A six-digit code was sent. Check your inbox and spam folder.';
const verifiedStatus = 'Email verified. You can now choose a new password.';
const focusAfterUpdate = (input) => {
    // Let React and the OTP input finish updating before restoring focus.
    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => input.current?.focus());
    });
};

export default function ResetPassword({ status, errors: pageErrors = {}, server_time = null, user_data, code_verified = false, expires_at, resend_available_at, max_attempts = 5 }) {
    const verifyForm = useForm({ otp: '' });
    const passwordForm = useForm({ password: '', password_confirmation: '' });
    const action = useForm({});
    const serverOffset = useRef(server_time == null ? 0 : server_time - Date.now() / 1000);
    const [now, setNow] = useState(() => server_time ?? Math.floor(Date.now() / 1000));
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmationTouched, setConfirmationTouched] = useState(false);
    const [resendNotice, setResendNotice] = useState('');
    const otpInput = useRef(null);
    const passwordInput = useRef(null);
    const confirmationInput = useRef(null);
    const busy = verifyForm.processing || passwordForm.processing || action.processing;
    const remaining = Math.max(0, Math.ceil((expires_at || 0) - now));
    const cooldown = Math.max(0, Math.ceil((resend_available_at || 0) - now));
    const expired = remaining === 0;
    const maskedEmail = (user_data?.masked_email || 'your registered email').replace(/\*+/g, '•••');
    const passwordTooLong = new TextEncoder().encode(passwordForm.data.password).length > 72;
    const requirements = [
        { label: 'At least 8 characters', met: Array.from(passwordForm.data.password).length >= 8 },
        { label: 'An uppercase letter', met: /\p{Lu}/u.test(passwordForm.data.password) },
        { label: 'A lowercase letter', met: /\p{Ll}/u.test(passwordForm.data.password) },
        { label: 'A number', met: /\p{N}/u.test(passwordForm.data.password) },
    ];
    const passwordsMatch = passwordForm.data.password !== '' && passwordForm.data.password === passwordForm.data.password_confirmation;
    const errors = { ...pageErrors, ...action.errors, ...(code_verified ? passwordForm.errors : verifyForm.errors) };
    const generalError = errors.general || errors.email || errors.user_id_no;
    const passwordError = passwordTooLong ? 'This password is too long. Use fewer characters; emoji and accented letters can take more space.' : errors.password;
    const confirmationMessage = errors.password_confirmation || (confirmationTouched && passwordForm.data.password_confirmation ? passwordsMatch ? 'Passwords match.' : 'Passwords don’t match. Enter the same password in both fields.' : '');
    const showStatus = status && status !== initialDeliveryStatus && status !== verifiedStatus;

    useEffect(() => {
        serverOffset.current = server_time == null ? 0 : server_time - Date.now() / 1000;
        const updateClock = () => setNow(Math.floor(Date.now() / 1000 + serverOffset.current));
        updateClock();
        const timer = window.setInterval(updateClock, 1000);
        return () => window.clearInterval(timer);
    }, [server_time, expires_at, resend_available_at]);

    useEffect(() => {
        if (code_verified) passwordInput.current?.focus();
    }, [code_verified]);

    const verifyCode = (event) => {
        event.preventDefault();
        if (busy || expired || verifyForm.data.otp.length !== 6) return;
        action.clearErrors();
        verifyForm.post(route('password.verify'), {
            preserveScroll: false,
            onSuccess: () => {
                verifyForm.reset('otp');
                setResendNotice('');
            },
            onError: () => {
                verifyForm.reset('otp');
                focusAfterUpdate(otpInput);
            },
        });
    };
    const submitPassword = (event) => {
        event.preventDefault();
        if (busy || expired || passwordTooLong || !passwordsMatch || !requirements.every(({ met }) => met)) return;
        action.clearErrors();
        passwordForm.post(route('password.store'), {
            preserveScroll: false,
            onSuccess: () => passwordForm.reset(),
            onError: (errors) => {
                if (errors.password) focusAfterUpdate(passwordInput);
                else if (errors.password_confirmation) focusAfterUpdate(confirmationInput);
            },
        });
    };
    const resend = () => {
        if (busy || cooldown > 0) return;
        setResendNotice('');
        action.post(route('password.email'), {
            preserveScroll: true,
            onSuccess: () => {
                verifyForm.reset('otp');
                verifyForm.clearErrors();
                passwordForm.reset();
                setConfirmationTouched(false);
                setResendNotice('A new code was sent. Use the latest email.');
                focusAfterUpdate(otpInput);
            },
        });
    };
    const restart = () => {
        if (busy) return;
        verifyForm.reset();
        passwordForm.reset();
        action.post(route('password.restart'));
    };

    return (
        <main className="flex min-h-svh w-full flex-col bg-gradient-to-br from-slate-50 to-blue-50 px-4 py-4 dark:from-slate-950 dark:to-slate-900 sm:py-6 [&_*]:[font-family:inherit]" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
            <Head title={code_verified ? 'Reset Password' : 'Check Your Email'} />
            <div className="mx-auto my-auto w-full max-w-md">
                <Card className="border-0 shadow-xl">
                    <CardHeader className="mt-0 space-y-4 p-5 pb-0 sm:p-6 sm:pb-0">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <AppLogo size="xs" className="shrink-0" />
                                <div className="min-w-0 space-y-1">
                                    <p className="text-xs font-semibold tracking-wide text-foreground">SIS–OCC</p>
                                    <p className="text-xs text-muted-foreground">Account recovery · Step {code_verified ? '4' : '3'} of 4</p>
                                </div>
                            </div>
                            <TwoModeToggle className="shrink-0" />
                        </div>
                        <div className="space-y-1.5">
                            <CardTitle className="text-2xl font-bold leading-tight"><h1>{code_verified ? 'Create your new password' : 'Check your email'}</h1></CardTitle>
                            <CardDescription className="text-sm leading-relaxed">{code_verified ? 'Choose a strong password for your account.' : <>Enter the code sent to <span className="break-all font-medium text-foreground">{maskedEmail}</span>.</>}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 p-5 sm:p-6">
                        {showStatus && <div role="status" className="flex items-start gap-2 text-sm text-green-800 dark:text-green-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>{status}</p></div>}
                        {generalError && <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-400"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>{generalError}</p></div>}

                        {!code_verified ? (
                            <>
                                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                    <p className="min-w-0 break-all text-xs text-muted-foreground">{user_data?.user_id_no ? `ID: ${user_data.user_id_no}` : 'Recovering your account'}</p>
                                    <Button type="button" variant="link" className="h-auto min-h-8 px-0 py-1 text-xs text-blue-700 dark:text-blue-400" onClick={restart} disabled={busy}>Change ID</Button>
                                </div>
                                <form onSubmit={verifyCode} className="space-y-4" aria-busy={busy}>
                                    <div className="space-y-3">
                                        <Label htmlFor="otp" className="block">Verification code</Label>
                                        <InputOTP ref={otpInput} id="otp" name="otp" maxLength={6} minLength={6} value={verifyForm.data.otp} onChange={(value) => verifyForm.setData('otp', value)} pattern={REGEXP_ONLY_DIGITS} pasteTransformer={(value) => value.replace(/\D/g, '')} inputMode="numeric" autoComplete="one-time-code" containerClassName="justify-center gap-2" required autoFocus disabled={busy || expired} aria-invalid={Boolean(errors.otp)} aria-describedby={`otp-help${errors.otp ? ' otp-error' : ''}`}>
                                            <InputOTPGroup>
                                                {[0, 1, 2].map((index) => <InputOTPSlot key={index} index={index} aria-invalid={Boolean(errors.otp)} className={`h-11 w-8 text-xl min-[360px]:w-10 sm:w-11 ${errors.otp ? 'border-red-500' : ''}`} />)}
                                            </InputOTPGroup>
                                            <InputOTPSeparator className="[&_svg]:h-4 [&_svg]:w-4" aria-hidden="true" />
                                            <InputOTPGroup>
                                                {[3, 4, 5].map((index) => <InputOTPSlot key={index} index={index} aria-invalid={Boolean(errors.otp)} className={`h-11 w-8 text-xl min-[360px]:w-10 sm:w-11 ${errors.otp ? 'border-red-500' : ''}`} />)}
                                            </InputOTPGroup>
                                        </InputOTP>
                                        {errors.otp && <p id="otp-error" role="alert" className="text-sm text-red-700 dark:text-red-400">{errors.otp}</p>}
                                        <p id="otp-help" aria-live="off" className={`text-xs tabular-nums ${expired ? 'font-medium text-red-700 dark:text-red-400' : 'text-muted-foreground'}`}>{expired ? 'This code has expired. Request a new code below.' : `Code expires in ${formatDuration(remaining)}.`}</p>
                                    </div>
                                    <Button type="submit" className="h-11 w-full bg-blue-600 font-semibold text-white hover:bg-blue-700" disabled={busy || expired || verifyForm.data.otp.length !== 6}>{verifyForm.processing && <Loader2 className="animate-spin" aria-hidden="true" />}{verifyForm.processing ? 'Verifying code…' : 'Verify code'}</Button>
                                </form>
                                <div className="space-y-1.5">
                                    <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                        <p className="text-xs text-muted-foreground">Check your spam folder.</p>
                                        {cooldown > 0 ? <p className="text-xs tabular-nums text-muted-foreground" aria-live="off">Resend code in {formatDuration(cooldown)}</p> : <Button type="button" variant="link" className="h-9 px-0 text-blue-700 dark:text-blue-400" onClick={resend} disabled={busy}>{action.processing ? 'Sending code…' : 'Resend code'}</Button>}
                                    </div>
                                    <p className="text-xs leading-relaxed text-muted-foreground">A new code replaces the previous one. Up to {max_attempts} attempts per code.</p>
                                    {resendNotice && <p role="status" className="text-sm text-green-800 dark:text-green-300">{resendNotice}</p>}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                    <p role="status" className="flex items-center gap-1.5 font-medium text-green-800 dark:text-green-300"><CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />Email verified</p>
                                    <p aria-live="off" className={`tabular-nums ${expired ? 'font-medium text-red-700 dark:text-red-400' : 'text-muted-foreground'}`}>{expired ? 'Your reset session has expired. Start again below.' : `Reset within ${formatDuration(remaining)}.`}</p>
                                </div>
                                <form onSubmit={submitPassword} className="space-y-4" aria-busy={busy}>
                                    <div className="space-y-2">
                                        <Label htmlFor="password" className="block">New password</Label>
                                        <div className="relative">
                                            <Input ref={passwordInput} id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={passwordForm.data.password} onChange={(event) => { passwordForm.setData('password', event.target.value); setConfirmationTouched(false); }} minLength={8} maxLength={72} className="h-11 pr-12" required disabled={busy || expired} aria-invalid={Boolean(passwordError)} aria-describedby={`password-requirements${passwordError ? ' password-error' : ''}`} />
                                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide new password' : 'Show new password'} aria-pressed={showPassword} disabled={busy || expired}>{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</Button>
                                        </div>
                                        {passwordError && <p id="password-error" role="alert" className="text-sm text-red-700 dark:text-red-400">{passwordError}</p>}
                                        <ul id="password-requirements" aria-label="Password requirements" className="grid grid-cols-1 gap-x-3 gap-y-1 text-xs min-[360px]:grid-cols-2">{requirements.map(({ label, met }) => <li key={label} className={`flex items-start gap-1.5 ${met ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}><>{met ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />}<span>{label}<span className="sr-only">{met ? " — met" : " — not yet met"}</span></span></></li>)}</ul>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password_confirmation" className="block">Confirm new password</Label>
                                        <div className="relative">
                                            <Input ref={confirmationInput} id="password_confirmation" name="password_confirmation" type={showConfirmation ? 'text' : 'password'} autoComplete="new-password" value={passwordForm.data.password_confirmation} onChange={(event) => passwordForm.setData('password_confirmation', event.target.value)} onFocus={() => setConfirmationTouched(false)} onBlur={() => setConfirmationTouched(true)} maxLength={72} className="h-11 pr-12" required disabled={busy || expired} aria-invalid={Boolean(errors.password_confirmation || (confirmationTouched && passwordForm.data.password_confirmation && !passwordsMatch))} aria-describedby="confirmation-help" />
                                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1" onClick={() => setShowConfirmation(!showConfirmation)} aria-label={showConfirmation ? 'Hide password confirmation' : 'Show password confirmation'} aria-pressed={showConfirmation} disabled={busy || expired}>{showConfirmation ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</Button>
                                        </div>
                                        <p id="confirmation-help" aria-live="polite" role={errors.password_confirmation ? 'alert' : undefined} className={`min-h-4 text-xs ${errors.password_confirmation || (confirmationTouched && !passwordsMatch) ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground'}`}>{confirmationMessage}</p>
                                    </div>
                                    <Button type="submit" className="h-11 w-full bg-blue-600 font-semibold text-white hover:bg-blue-700" disabled={busy || expired || passwordTooLong || !passwordsMatch || !requirements.every(({ met }) => met)}>{passwordForm.processing && <Loader2 className="animate-spin" aria-hidden="true" />}{passwordForm.processing ? 'Resetting password…' : 'Reset password'}</Button>
                                </form>
                                {expired && <Button type="button" variant="outline" className="h-11 w-full" onClick={restart} disabled={busy}>Start recovery again</Button>}
                            </>
                        )}

                        <details className="text-sm text-muted-foreground">
                            <summary className="w-fit cursor-pointer rounded-sm py-1 font-medium text-blue-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-blue-400">{code_verified ? 'Need help with recovery?' : 'Can’t access your email?'}</summary>
                            <div className="mt-2 space-y-2 text-xs leading-relaxed">
                                <p>Contact the CICT office with your school ID to ask for help verifying your identity and updating your registered email.</p>
                                {/* <p>For a referral, <a href="mailto:opolcommunitycollege@yahoo.com?subject=SIS%20account%20recovery" className="font-medium text-blue-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-blue-400">email OCC for recovery help</a>. Don’t send your password or verification code.</p>
                                {code_verified && !expired && <Button type="button" variant="link" className="h-auto min-h-8 whitespace-normal px-0 py-1 text-xs text-blue-700 dark:text-blue-400" onClick={restart} disabled={busy}>Start recovery again</Button>} */}
                            </div>
                        </details>
                        <div className="border-t border-border pt-2 text-center text-sm">
                            <Link href={route('login')} className="inline-flex min-h-9 items-center gap-2 font-medium text-blue-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-blue-400"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to sign in</Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
