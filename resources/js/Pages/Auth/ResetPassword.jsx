import { useEffect, useRef, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/Components/ui/input-otp';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { TwoModeToggle } from '@/Components/two-modes-toggle';

export default function ResetPassword({ status, errors: pageErrors = {}, server_time = null, user_data, code_verified = false, expires_at, resend_available_at, expires_in_minutes = 10, max_attempts = 5 }) {
    const verifyForm = useForm({ otp: '' });
    const passwordForm = useForm({ password: '', password_confirmation: '' });
    const action = useForm({});
    const serverOffset = useRef(server_time == null ? 0 : server_time - Date.now() / 1000);
    const [now, setNow] = useState(() => server_time ?? Math.floor(Date.now() / 1000));
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const otpInput = useRef(null);
    const passwordInput = useRef(null);
    const confirmationInput = useRef(null);
    const busy = verifyForm.processing || passwordForm.processing || action.processing;
    const remaining = Math.max(0, (expires_at || 0) - now);
    const cooldown = Math.max(0, (resend_available_at || 0) - now);
    const expired = remaining === 0;
    const timeLeft = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
    const requirements = [
        { label: '8+ characters (up to 72 bytes)', met: Array.from(passwordForm.data.password).length >= 8 && new TextEncoder().encode(passwordForm.data.password).length <= 72 },
        { label: 'An uppercase letter', met: /\p{Lu}/u.test(passwordForm.data.password) },
        { label: 'A lowercase letter', met: /\p{Ll}/u.test(passwordForm.data.password) },
        { label: 'A number', met: /\p{N}/u.test(passwordForm.data.password) },
    ];
    const passwordsMatch = passwordForm.data.password !== '' && passwordForm.data.password === passwordForm.data.password_confirmation;
    const errors = { ...pageErrors, ...action.errors, ...(code_verified ? passwordForm.errors : verifyForm.errors) };
    const generalError = errors.general || errors.email || errors.user_id_no;

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
        action.clearErrors();
        verifyForm.post(route('password.verify'), {
            preserveScroll: true,
            onSuccess: () => verifyForm.reset('otp'),
            onError: () => {
                verifyForm.reset('otp');
                otpInput.current?.focus();
            },
        });
    };
    const submitPassword = (event) => {
        event.preventDefault();
        action.clearErrors();
        passwordForm.post(route('password.store'), {
            preserveScroll: true,
            onSuccess: () => passwordForm.reset(),
            onError: (errors) => {
                if (errors.password) passwordInput.current?.focus();
                else if (errors.password_confirmation) confirmationInput.current?.focus();
            },
        });
    };
    const resend = () => {
        action.post(route('password.email'), {
            preserveScroll: true,
            onSuccess: () => {
                verifyForm.reset('otp');
                verifyForm.clearErrors();
                passwordForm.reset();
                otpInput.current?.focus();
            },
        });
    };
    const restart = () => {
        verifyForm.reset();
        passwordForm.reset();
        action.post(route('password.restart'));
    };

    return (
        <main className="min-h-svh w-full bg-gradient-to-br from-slate-50 to-blue-50 px-4 py-6 dark:from-slate-950 dark:to-slate-900 sm:py-10">
            <Head title={code_verified ? 'Reset Password' : 'Verify Your Email'} />
            <div className="mx-auto mb-6 flex w-full max-w-md justify-end"><TwoModeToggle /></div>
            <div className="mx-auto w-full max-w-md">
                <Card className="overflow-hidden border-0 shadow-xl">
                    <CardHeader className="space-y-3 bg-gradient-to-b from-primary/5 to-transparent text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">{code_verified ? <KeyRound className="h-6 w-6" aria-hidden="true" /> : <Mail className="h-6 w-6" aria-hidden="true" />}</div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Account recovery · Step 3 of 3</p>
                        <CardTitle className="text-2xl font-bold">{code_verified ? 'Create your new password' : 'Verify your email'}</CardTitle>
                        <CardDescription>{code_verified ? 'Your email is verified. Choose a strong password to secure your account.' : <>Enter the six-digit code sent to <span className="break-all font-semibold text-foreground">{user_data?.masked_email}</span>.</>}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5 p-6">
                        {status && <div role="status" className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>{status}</p></div>}
                        {generalError && <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>{generalError}</p></div>}

                        {!code_verified ? (
                            <>
                                <form onSubmit={verifyCode} className="space-y-5" aria-busy={busy}>
                                    <div className="space-y-3">
                                        <Label htmlFor="otp">Six-digit verification code</Label>
                                        <InputOTP ref={otpInput} id="otp" name="otp" maxLength={6} minLength={6} value={verifyForm.data.otp} onChange={(value) => verifyForm.setData('otp', value)} pattern={REGEXP_ONLY_DIGITS} pasteTransformer={(value) => value.replace(/\D/g, '')} inputMode="numeric" autoComplete="one-time-code" containerClassName="justify-center gap-1 sm:gap-2" required autoFocus disabled={busy || expired} aria-invalid={Boolean(errors.otp)} aria-describedby={`otp-help${errors.otp ? ' otp-error' : ''}`}>
                                            <InputOTPGroup>
                                                {[0, 1, 2].map((index) => <InputOTPSlot key={index} index={index} aria-invalid={Boolean(errors.otp)} className={`h-12 w-9 text-xl sm:h-14 sm:w-12 ${errors.otp ? 'border-destructive' : ''}`} />)}
                                            </InputOTPGroup>
                                            <InputOTPSeparator className="[&_svg]:h-4 [&_svg]:w-4" aria-hidden="true" />
                                            <InputOTPGroup>
                                                {[3, 4, 5].map((index) => <InputOTPSlot key={index} index={index} aria-invalid={Boolean(errors.otp)} className={`h-12 w-9 text-xl sm:h-14 sm:w-12 ${errors.otp ? 'border-destructive' : ''}`} />)}
                                            </InputOTPGroup>
                                        </InputOTP>
                                        <p id="otp-help" className={`text-xs ${expired ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>{expired ? 'This code has expired. Request a new code below.' : `Code expires in ${timeLeft}.`}</p>
                                        {errors.otp && <p id="otp-error" role="alert" className="text-sm text-destructive">{errors.otp}</p>}
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="text-xs text-muted-foreground">Check your inbox and spam folder.</span>
                                            <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={resend} disabled={busy || cooldown > 0}>{action.processing ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}</Button>
                                        </div>
                                    </div>
                                    <Button type="submit" className="h-12 w-full font-semibold" disabled={busy || expired || verifyForm.data.otp.length !== 6}>{verifyForm.processing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}{verifyForm.processing ? 'Verifying code…' : 'Verify code'}</Button>
                                </form>
                                <div className="flex gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground"><Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>Only your latest code works. Codes expire after {expires_in_minutes} minutes and allow up to {max_attempts} incorrect attempts. Never share your code.</p></div>
                            </>
                        ) : (
                            <>
                                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                                    <p className="flex items-center gap-2 text-sm font-semibold text-primary"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Email verified</p>
                                    <p className={`mt-1 text-xs ${expired ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>{expired ? 'Your reset session has expired. Start again to request a new code.' : `Complete your password reset within ${timeLeft}.`}</p>
                                </div>
                                <form onSubmit={submitPassword} className="space-y-5" aria-busy={busy}>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">New password</Label>
                                        <div className="relative">
                                            <Input ref={passwordInput} id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={passwordForm.data.password} onChange={(event) => passwordForm.setData('password', event.target.value)} minLength={8} maxLength={72} className="h-12 pr-12" required disabled={busy || expired} aria-invalid={Boolean(errors.password)} aria-describedby={`password-requirements${errors.password ? ' password-error' : ''}`} />
                                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1.5" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide new password' : 'Show new password'} aria-pressed={showPassword} disabled={busy || expired}>{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</Button>
                                        </div>
                                        {errors.password && <p id="password-error" role="alert" className="text-sm text-destructive">{errors.password}</p>}
                                    </div>
                                    <div id="password-requirements" className="rounded-lg border border-border bg-muted/40 p-3">
                                        <p className="mb-2 text-xs font-semibold text-foreground">Your password must include:</p>
                                        <ul className="space-y-1.5 text-xs">{requirements.map(({ label, met }) => <li key={label} className={`flex items-center gap-2 ${met ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}><CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${met ? '' : 'opacity-40'}`} aria-hidden="true" /><span>{label}{met && <span className="sr-only"> — met</span>}</span></li>)}</ul>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password_confirmation">Confirm new password</Label>
                                        <div className="relative">
                                            <Input ref={confirmationInput} id="password_confirmation" name="password_confirmation" type={showConfirmation ? 'text' : 'password'} autoComplete="new-password" value={passwordForm.data.password_confirmation} onChange={(event) => passwordForm.setData('password_confirmation', event.target.value)} maxLength={72} className="h-12 pr-12" required disabled={busy || expired} aria-invalid={Boolean(errors.password_confirmation)} aria-describedby="confirmation-help" />
                                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1.5" onClick={() => setShowConfirmation(!showConfirmation)} aria-label={showConfirmation ? 'Hide password confirmation' : 'Show password confirmation'} aria-pressed={showConfirmation} disabled={busy || expired}>{showConfirmation ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</Button>
                                        </div>
                                        <p id="confirmation-help" className={`text-xs ${errors.password_confirmation || (passwordForm.data.password_confirmation && !passwordsMatch) ? 'text-destructive' : 'text-muted-foreground'}`}>{errors.password_confirmation || (passwordForm.data.password_confirmation ? passwordsMatch ? 'Passwords match.' : 'Passwords do not match yet.' : 'Enter your new password again.')}</p>
                                    </div>
                                    <Button type="submit" className="h-12 w-full font-semibold" disabled={busy || expired || !passwordsMatch || !requirements.every(({ met }) => met)}>{passwordForm.processing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}{passwordForm.processing ? 'Updating password…' : 'Reset password'}</Button>
                                </form>
                            </>
                        )}

                        <Button type="button" variant="ghost" className="w-full" onClick={restart} disabled={busy}><ArrowLeft aria-hidden="true" />{expired && code_verified ? 'Start password recovery again' : 'Use a different account'}</Button>
                        <div className="border-t border-border pt-4 text-center text-sm"><Link href={route('login')} className="font-semibold text-primary hover:underline">Back to sign in</Link></div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
