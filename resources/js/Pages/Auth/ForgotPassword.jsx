import { useEffect, useRef, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail, User } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { TwoModeToggle } from '@/Components/two-modes-toggle';

export default function ForgotPassword({ status, errors: pageErrors = {}, server_time = null, expires_at = null, user_found = false, user_data = null, otp_sent = false, resend_available_at = null, expires_in_minutes = 10, max_attempts = 5 }) {
    const lookup = useForm({ user_id_no: '' });
    const action = useForm({});
    const serverOffset = useRef(server_time == null ? 0 : server_time - Date.now() / 1000);
    const [now, setNow] = useState(() => server_time ?? Math.floor(Date.now() / 1000));
    const found = user_found && user_data;
    const busy = lookup.processing || action.processing;
    const cooldown = Math.max(0, (resend_available_at || 0) - now);
    const errors = { ...pageErrors, ...lookup.errors, ...action.errors };
    const error = errors.user_id_no || errors.general || errors.email;

    useEffect(() => {
        serverOffset.current = server_time == null ? 0 : server_time - Date.now() / 1000;
        const updateClock = () => setNow(Math.floor(Date.now() / 1000 + serverOffset.current));
        updateClock();
        const timer = window.setInterval(updateClock, 1000);
        return () => window.clearInterval(timer);
    }, [server_time, expires_at, resend_available_at]);

    const findAccount = (event) => {
        event.preventDefault();
        action.clearErrors();
        lookup.post(route('password.find-user'), { preserveScroll: true });
    };
    const sendCode = (event) => {
        event.preventDefault();
        lookup.clearErrors();
        action.post(route('password.email'), { preserveScroll: true });
    };
    const startOver = () => {
        lookup.reset();
        lookup.clearErrors();
        action.post(route('password.restart'), { preserveScroll: true });
    };

    return (
        <main className="min-h-svh w-full bg-gradient-to-br from-slate-50 to-blue-50 px-4 py-6 dark:from-slate-950 dark:to-slate-900 sm:py-10 flex  items-center justify-center">
            <Head title="Forgot Password" />
            {/* <div className="mx-auto mb-6 flex w-full max-w-md justify-end"><TwoModeToggle /></div> */}
            <div className="mx-auto w-full max-w-md">
                <Card className="overflow-hidden rounded-none border-0 bg-transparent shadow-none sm:rounded-lg sm:bg-card sm:shadow-xl">
                    <CardHeader className="mt-0 space-y-3 px-0 pt-4 text-center sm:bg-gradient-to-b sm:from-primary/5 sm:to-transparent sm:px-6">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><KeyRound className="h-6 w-6" aria-hidden="true" /></div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Account recovery · Step {found ? '2' : '1'} of 3</p>
                        <CardTitle className="text-2xl font-bold">{found ? 'Confirm your account' : 'Forgot your password?'}</CardTitle>
                        <CardDescription>{found ? 'We’ll email a one-time code to your registered address.' : 'Enter your ID Number to recover your account.'}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5 px-1 py-6 sm:p-6">
                        {status && <div role="status" className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>{status}</p></div>}
                        {error && <div id="recovery-error" role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>{error}</p></div>}
                        {!found ? (
                            <form onSubmit={findAccount} className="space-y-5" aria-busy={busy}>
                                <div className="space-y-2">
                                    <Label htmlFor="user_id_no">ID Number</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                                        <Input id="user_id_no" name="user_id_no" value={lookup.data.user_id_no} onChange={(event) => lookup.setData('user_id_no', event.target.value)} className="h-12 pl-11" placeholder="Enter your ID number" autoComplete="username" maxLength={255} autoFocus required disabled={busy} aria-invalid={Boolean(errors.user_id_no)} aria-describedby={error ? 'recovery-error' : undefined} />
                                    </div>
                                </div>
                                <Button type="submit" className="h-12 w-full font-semibold" disabled={busy || !lookup.data.user_id_no.trim()}>{lookup.processing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <User aria-hidden="true" />}{lookup.processing ? 'Finding account…' : 'Find my account'}</Button>
                            </form>
                        ) : (
                            <div className="space-y-5">
                                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                                    <p className="font-semibold text-foreground">{user_data.name || 'Your account'}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">ID: {user_data.user_id_no}</p>
                                    <p className="mt-3 flex items-center gap-2 break-all text-sm font-medium"><Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{user_data.masked_email}</p>
                                </div>
                                <p className="text-sm leading-relaxed text-muted-foreground">Your six-digit code expires in {expires_in_minutes} minutes and allows up to {max_attempts} incorrect attempts. Keep this page open to enter the code and choose your new password.</p>
                                <form onSubmit={sendCode} className="space-y-3" aria-busy={busy}>
                                    <Button type="submit" className="h-12 w-full font-semibold" disabled={busy || cooldown > 0}>{action.processing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Mail aria-hidden="true" />}{action.processing ? 'Sending code…' : cooldown > 0 ? `Send again in ${cooldown}s` : otp_sent ? 'Send a new code' : 'Send verification code'}</Button>
                                    {otp_sent && <Button asChild variant="outline" className="h-11 w-full"><Link href={route('password.reset')}>I already have a code</Link></Button>}
                                    <Button type="button" variant="ghost" className="h-11 w-full" disabled={busy} onClick={startOver}><ArrowLeft aria-hidden="true" />Use a different account</Button>
                                </form>
                            </div>
                        )}
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                            <p className="font-semibold">Can’t access your registered email?</p>
                            <p className="mt-1">Contact the school’s CICT office for help updating your email and recovering your account.</p>
                        </div>
                        <div className="border-t border-border pt-4 text-center text-sm"><Link href={route('login')} className="inline-flex items-center gap-2 font-semibold text-primary hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to sign in</Link></div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
