import { useEffect, useRef, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail, User } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { TwoModeToggle } from '@/Components/two-modes-toggle';
import AppLogo from '@/Components/AppLogo';

export default function ForgotPassword({ status, errors: pageErrors = {}, server_time = null, expires_at = null, user_found = false, user_data = null, otp_sent = false, resend_available_at = null, expires_in_minutes = 10, max_attempts = 5 }) {
    const lookup = useForm({ user_id_no: '' });
    const action = useForm({});
    const serverOffset = useRef(server_time == null ? 0 : server_time - Date.now() / 1000);
    const [now, setNow] = useState(() => server_time ?? Math.floor(Date.now() / 1000));
    const found = Boolean(user_found && user_data);
    const busy = lookup.processing || action.processing;
    const cooldown = Math.max(0, (resend_available_at || 0) - now);
    const cooldownText = `${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, '0')}`;
    const maskedEmail = (user_data?.masked_email || 'your registered email').replace(/\*+/g, '•••');
    const errors = { ...pageErrors, ...lookup.errors, ...action.errors };
    const error = errors.user_id_no || errors.general || errors.email;
    const continuingToCode = found && otp_sent && !error;

    useEffect(() => {
        serverOffset.current = server_time == null ? 0 : server_time - Date.now() / 1000;
        const updateClock = () => setNow(Math.floor(Date.now() / 1000 + serverOffset.current));
        updateClock();
        const timer = window.setInterval(updateClock, 1000);
        return () => window.clearInterval(timer);
    }, [server_time, expires_at, resend_available_at]);

    useEffect(() => {
        if (found && otp_sent && !busy && !error) {
            router.get(route('password.reset'), {}, { replace: true, preserveScroll: false });
        }
    }, [found, otp_sent, busy, error]);

    const findAccount = (event) => {
        event.preventDefault();
        action.clearErrors();
        lookup.post(route('password.find-user'), { preserveScroll: true });
    };
    const sendCode = (event) => {
        event.preventDefault();
        lookup.clearErrors();
        action.post(route('password.email'), { preserveScroll: false });
    };
    const startOver = () => {
        lookup.reset();
        lookup.clearErrors();
        action.post(route('password.restart'), { preserveScroll: true });
    };

    return (
        <main className="flex min-h-svh w-full flex-col bg-gradient-to-br from-slate-50 to-blue-50 px-4 py-4 dark:from-slate-950 dark:to-slate-900 sm:py-6" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
            <Head title="Forgot Password" />
            <div className="mx-auto my-auto w-full max-w-md">
                <Card className="border-0 shadow-xl">
                    <CardHeader className="mt-0 space-y-4 p-5 pb-0 sm:p-6 sm:pb-0">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <AppLogo size="xs" className="shrink-0" />
                                <div className="min-w-0 space-y-1">
                                    <p className="text-xs font-semibold tracking-wide text-foreground">SIS–OCC</p>
                                    <p className="text-xs text-muted-foreground">Account recovery · Step {found ? '2' : '1'} of 4</p>
                                </div>
                            </div>
                            <TwoModeToggle className="shrink-0" />
                        </div>
                        <div className="space-y-1.5">
                            <CardTitle className="text-2xl font-bold leading-tight"><h1>{found ? 'Confirm your account' : 'Forgot your password?'}</h1></CardTitle>
                            <CardDescription className="text-sm leading-relaxed">{found ? 'Send a verification code to your registered email.' : 'Enter your ID number to find your account.'}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 p-5 sm:p-6">
                        {status && <div role="status" className="flex items-start gap-2 text-sm text-green-800 dark:text-green-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>{status}</p></div>}
                        {error && <div id="recovery-error" role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-400"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>{error}</p></div>}
                        {!found ? (
                            <form onSubmit={findAccount} className="space-y-4" aria-busy={busy}>
                                <div className="space-y-2">
                                    <Label htmlFor="user_id_no" className="block">ID number</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                                        <Input id="user_id_no" name="user_id_no" value={lookup.data.user_id_no} onChange={(event) => lookup.setData('user_id_no', event.target.value)} className="h-11 pl-11" placeholder="Enter your ID number" autoComplete="username" maxLength={255} autoFocus required disabled={busy} aria-invalid={Boolean(errors.user_id_no)} aria-describedby={error ? 'recovery-error' : undefined} />
                                    </div>
                                </div>
                                <Button type="submit" className="h-11 w-full bg-blue-600 font-semibold text-white hover:bg-blue-700" disabled={busy || !lookup.data.user_id_no.trim()}>{lookup.processing && <Loader2 className="animate-spin" aria-hidden="true" />}{lookup.processing ? 'Finding account…' : 'Find my account'}</Button>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                        <div className="min-w-0 space-y-1">
                                            {user_data.name && <p className="break-words text-sm font-semibold text-foreground">{user_data.name}</p>}
                                            <p className="break-all text-xs text-muted-foreground">ID: {user_data.user_id_no}</p>
                                        </div>
                                        <Button type="button" variant="link" className="h-auto min-h-8 px-0 py-1 text-xs text-blue-700 dark:text-blue-400" disabled={busy || continuingToCode} onClick={startOver}>Change ID</Button>
                                    </div>
                                    <p className="flex items-start gap-2 text-sm font-medium"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="min-w-0 break-all">{maskedEmail}</span></p>
                                </div>
                                <p className="text-xs leading-relaxed text-muted-foreground">The code is valid for {expires_in_minutes} minutes, with up to {max_attempts} attempts.</p>
                                <form onSubmit={sendCode} className="space-y-2" aria-busy={busy}>
                                    <Button type="submit" className="h-11 w-full bg-blue-600 font-semibold text-white hover:bg-blue-700" disabled={busy || cooldown > 0 || continuingToCode}>{(action.processing || continuingToCode) && <Loader2 className="animate-spin" aria-hidden="true" />}{action.processing ? 'Sending code…' : continuingToCode ? 'Opening code entry…' : 'Send verification code'}</Button>
                                    {cooldown > 0 && !continuingToCode && <p className="text-xs text-muted-foreground" aria-live="off">Send code in {cooldownText}.</p>}
                                </form>
                            </div>
                        )}
                        <details className="text-sm text-muted-foreground">
                            <summary className="w-fit cursor-pointer rounded-sm py-1 font-medium text-blue-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-blue-400">Can’t access your email?</summary>
                            <div className="mt-2 space-y-2 text-xs leading-relaxed">
                                <p>Contact the CICT office with your school ID to ask for help verifying your identity and updating your registered email.</p>
                                {/* <p>For a referral, <a href="mailto:opolcommunitycollege@yahoo.com?subject=SIS%20account%20recovery" className="font-medium text-blue-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-blue-400">email OCC for recovery help</a>. Don’t send your password or verification code.</p> */}
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
