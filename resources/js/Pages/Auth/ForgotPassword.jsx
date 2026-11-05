import { useEffect, useRef, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { AlertCircle, ArrowRight, CheckCircle2, ChevronDown, Loader2, Mail, User } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import PasswordRecoveryLayout from '@/Layouts/PasswordRecoveryLayout';

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
        <PasswordRecoveryLayout
            title="Forgot Password"
            heading={found ? 'Confirm your account' : 'Forgot your password?'}
            description={found ? 'Check your details below. We’ll send a verification code to your registered email.' : 'Enter your school ID number below to find your account and get started.'}
            step={found ? 2 : 1}
        >
            {status && <div role="status" className="flex items-start gap-2.5 text-sm leading-6 text-green-800 dark:text-green-300"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" /><p>{status}</p></div>}
            {error && <div id="recovery-error" role="alert" className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm leading-6 text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-400"><AlertCircle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" /><p>{error}</p></div>}

            {!found ? (
                <form onSubmit={findAccount} className="space-y-6 lg:space-y-4" aria-busy={busy}>
                    <div className="space-y-2.5">
                        <Label htmlFor="user_id_no" className="block text-sm font-medium leading-5">School ID number</Label>
                        <div className="relative">
                            <User className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                            <Input id="user_id_no" name="user_id_no" value={lookup.data.user_id_no} onChange={(event) => lookup.setData('user_id_no', event.target.value)} className="h-12 rounded-lg border-slate-300 bg-white pl-11 text-base shadow-none placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900/60 dark:placeholder:text-slate-500 md:text-base" placeholder="Enter your ID number" autoComplete="username" maxLength={255} autoFocus required disabled={busy} aria-invalid={Boolean(errors.user_id_no)} aria-describedby={`id-help${error ? ' recovery-error' : ''}`} />
                        </div>
                        <p id="id-help" className="text-sm leading-6 text-slate-500 dark:text-slate-400">Use the ID number you normally sign in with.</p>
                    </div>
                    <Button type="submit" className="h-12 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white shadow-none hover:bg-blue-700" disabled={busy || !lookup.data.user_id_no.trim()}>
                        {lookup.processing && <Loader2 className="animate-spin" aria-hidden="true" />}
                        {lookup.processing ? 'Finding account…' : 'Find my account'}
                        {!lookup.processing && <ArrowRight aria-hidden="true" />}
                    </Button>
                </form>
            ) : (
                <div className="space-y-6 lg:space-y-4">
                    <div className="space-y-5 border-y border-slate-200 py-5 dark:border-slate-800">
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                            <div className="min-w-0 space-y-1">
                                {user_data.name && <p className="break-words text-base font-semibold leading-6">{user_data.name}</p>}
                                <p className="break-all text-sm leading-6 text-slate-500 dark:text-slate-400">ID: {user_data.user_id_no}</p>
                            </div>
                            <Button type="button" variant="link" className="h-auto min-h-11 px-0 py-2 text-sm font-medium text-blue-700 dark:text-blue-400" disabled={busy || continuingToCode} onClick={startOver}>Change ID</Button>
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-sm leading-5 text-slate-500 dark:text-slate-400">Verification email</p>
                            <p className="flex items-start gap-2.5 text-sm font-medium leading-6"><Mail className="mt-1 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" /><span className="min-w-0 break-all">{maskedEmail}</span></p>
                        </div>
                    </div>
                    <form onSubmit={sendCode} className="space-y-3" aria-busy={busy}>
                        <Button type="submit" className="h-12 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white shadow-none hover:bg-blue-700" disabled={busy || cooldown > 0 || continuingToCode}>{(action.processing || continuingToCode) && <Loader2 className="animate-spin" aria-hidden="true" />}{action.processing ? 'Sending code…' : continuingToCode ? 'Opening code entry…' : 'Send verification code'}</Button>
                        {cooldown > 0 && !continuingToCode && <p className="text-sm tabular-nums leading-6 text-slate-500 dark:text-slate-400" aria-live="off">Send code in {cooldownText}.</p>}
                        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Your code is valid for {expires_in_minutes} minutes, with up to {max_attempts} attempts.</p>
                    </form>
                </div>
            )}

            <details className="group border-t border-slate-200 pt-6 text-sm lg:pt-4 text-slate-600 dark:border-slate-800 dark:text-slate-400">
                <summary className="flex min-h-11 w-full cursor-pointer list-none items-center justify-between gap-3 rounded-sm font-medium text-slate-700 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:text-blue-400 [&::-webkit-details-marker]:hidden">
                    Can’t access your email?
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="mt-2 leading-6">Contact the CICT office with your school ID for help verifying your identity and updating your registered email.</p>
            </details>
        </PasswordRecoveryLayout>
    );
}

