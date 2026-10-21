import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import { Check, CheckCircle2, Eye, EyeOff, Info, Loader2, Mail, Send, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/Components/ui/alert';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Separator } from '@/Components/ui/separator';
import { Skeleton } from '@/Components/ui/skeleton';

import { REGEXP_ONLY_DIGITS } from 'input-otp';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from '@/Components/ui/input-otp';

// These are ordinary same-origin JSON requests inside your Inertia page.
// Axios sends Laravel's XSRF-TOKEN cookie in the X-XSRF-TOKEN header.
const api = axios.create({
    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
});

const EMAIL_PATTERN = /^occ\.[a-z]+\.[a-z]+[0-9]*@gmail\.com$/;
const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const secondsUntil = (value, now) => value ? Math.max(0, Math.ceil((Date.parse(value) - now) / 1000)) : 0;

function FieldError({ id, children }) {
    return children ? <p id={id} role="alert" className="text-sm text-destructive">{children}</p> : null;
}

export default function ChangeEmail({ currentEmail = '' }) {
    const [state, setState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [notice, setNotice] = useState(null);
    const [now, setNow] = useState(Date.now());
    const [clockOffset, setClockOffset] = useState(0);
    const [requestWaitUntil, setRequestWaitUntil] = useState(0);
    const mounted = useRef(false);
    const inFlight = useRef(false);
    const emailRef = useRef(null);
    const passwordRef = useRef(null);
    const codeRef = useRef(null);

    const applyState = useCallback((data) => {
        if (!Object.prototype.hasOwnProperty.call(data ?? {}, 'pending')) return;
        setState(data);
        setClockOffset(Date.parse(data.server_time) - Date.now());
        setNow(Date.now());
    }, []);

    const loadStatus = useCallback(async (signal) => {
        setLoading(true);
        setErrors({});
        try {
            const { data } = await api.get(route('profile.email.show'), { signal });
            if (mounted.current) applyState(data);
        } catch (error) {
            if (mounted.current && !axios.isCancel(error)) {
                setErrors({ general: 'Unable to load email settings. Please try again.' });
            }
        } finally {
            if (mounted.current && !signal?.aborted) setLoading(false);
        }
    }, [applyState]);

    useEffect(() => {
        mounted.current = true;
        const controller = new AbortController();
        loadStatus(controller.signal);
        return () => {
            mounted.current = false;
            controller.abort();
        };
    }, [loadStatus]);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    const pending = state?.pending;
    const requiresOccEmail = state?.requires_occ_email === true;
    const serverNow = now + clockOffset;
    const resendWait = secondsUntil(state?.send_available_at, serverNow);
    const requestWait = Math.max(0, Math.ceil((requestWaitUntil - now) / 1000));
    const sendWait = Math.max(resendWait, requestWait);
    const expiresIn = secondsUntil(pending?.expires_at, serverNow);
    const reauthExpired = pending && secondsUntil(pending.reauthenticated_until, serverNow) === 0;
    const disabled = Boolean(busy) || requestWait > 0;

    useEffect(() => {
        setCode('');
        if (pending?.request_id) codeRef.current?.focus();
    }, [pending?.request_id]);

    async function perform(action, payload = {}) {
        if (inFlight.current) return;
        inFlight.current = true;
        setBusy(action);
        setErrors({});
        setNotice(null);

        try {
            const name = action === 'cancel' ? 'destroy' : action;
            const { data } = action === 'cancel'
                ? await api.delete(route(`profile.email.${name}`), { data: payload })
                : await api.post(route(`profile.email.${name}`), payload);

            if (!mounted.current) return;
            applyState(data);
            setNotice({ success: action === 'verify', message: data.message });

            if (action === 'verify') {
                setEmail('');
                setCode('');
                // Refresh both the displayed profile and shared authenticated user.
                router.reload({ only: ['user', 'auth'] });
            } else if (action === 'cancel') {
                setCode('');
                window.requestAnimationFrame(() => emailRef.current?.focus());
            }
        } catch (error) {
            if (!mounted.current) return;
            const data = error.response?.data;
            if (data && typeof data === 'object') applyState(data);

            const fieldErrors = Object.fromEntries(
                Object.entries(data?.errors ?? {}).map(([field, messages]) => [
                    field, Array.isArray(messages) ? messages[0] : messages,
                ]),
            );

            if (error.response?.status === 429) {
                const retry = Number(error.response.headers?.['retry-after']) || 60;
                setRequestWaitUntil(Date.now() + retry * 1000);
                fieldErrors.general = `Too many requests. Please wait ${retry} seconds and try again.`;
            } else if ([401, 419].includes(error.response?.status)) {
                fieldErrors.general = 'Your session expired. Refresh this page and sign in again.';
            } else if (!Object.keys(fieldErrors).length) {
                fieldErrors.general = 'We could not confirm the result. Reload email settings before trying again.';
            }

            const nextPending = data && Object.prototype.hasOwnProperty.call(data, 'pending') ? data.pending : pending;
            if (fieldErrors.new_email && nextPending) fieldErrors.general = fieldErrors.new_email;
            if (fieldErrors.code && !nextPending) fieldErrors.general = fieldErrors.code;
            if (fieldErrors.request_id) fieldErrors.general = fieldErrors.request_id;
            setErrors(fieldErrors);

            window.requestAnimationFrame(() => {
                if (fieldErrors.current_password) passwordRef.current?.focus();
                else if (fieldErrors.new_email && !nextPending) emailRef.current?.focus();
                else if (fieldErrors.code && nextPending) codeRef.current?.focus();
            });
        } finally {
            inFlight.current = false;
            if (mounted.current) {
                setBusy(null);
                if (action === 'send') {
                    setPassword('');
                    setShowPassword(false);
                }
            }
        }
    }

    function sendCode(event) {
        event.preventDefault();
        const normalized = email.trim().toLowerCase();
        if (requiresOccEmail && !EMAIL_PATTERN.test(normalized)) {
            setErrors({ new_email: 'Use occ.lastname.firstname@gmail.com, with optional numbers after the first name.' });
            emailRef.current?.focus();
            return;
        }
        perform('send', { new_email: normalized, current_password: password });
    }

    function verifyCode(event) {
        event.preventDefault();
        perform('verify', { request_id: pending.request_id, code });
    }

    return (
        <Card className="gap-0 overflow-hidden rounded-2xl py-0 shadow-sm">
            <CardHeader className="border-b bg-muted/20 p-5 sm:p-6 mt-0">
                <div className="flex items-start gap-3">
                    <div className="rounded-xl border border-primary/10 bg-primary/10 p-2.5 text-primary">
                        <Mail aria-hidden="true" className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                        <CardTitle className="text-lg">Email address</CardTitle>
                        <CardDescription className="leading-relaxed">Update your email and confirm it with a verification code.</CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6 p-5 sm:p-6" aria-busy={loading || Boolean(busy)}>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3">
                    <div className="min-w-0 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Current email</p>
                        <p className="text-sm font-medium [overflow-wrap:anywhere]">{state?.current_email || currentEmail || 'Not provided'}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 font-normal">{state?.current_email || currentEmail ? 'Current' : 'Not set'}</Badge>
                </div>

                {errors.general && (
                    <Alert variant="destructive">
                        <Info aria-hidden="true" className="h-4 w-4" />
                        <AlertTitle>Unable to complete the request</AlertTitle>
                        <AlertDescription className="space-y-2">
                            <p>{errors.general}</p>
                            <Button type="button" variant="outline" size="sm" disabled={Boolean(busy) || loading} onClick={() => loadStatus()}>
                                Reload email settings
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                {notice?.message && (
                    <Alert role="status" className={notice.success ? 'border-emerald-600/25 bg-emerald-500/5 [&>svg]:text-emerald-600' : 'bg-muted/30'}>
                        {notice.success ? <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> : <Info aria-hidden="true" className="h-4 w-4" />}
                        <AlertDescription>{notice.message}</AlertDescription>
                    </Alert>
                )}

                {loading ? (
                    <div className="space-y-4" role="status" aria-label="Loading email settings">
                        <Skeleton className="h-5 w-2/3" />
                        <Skeleton className="h-11 w-full" />
                        <Skeleton className="h-11 w-full" />
                    </div>
                ) : state ? (
                    <>
                        <ol aria-label="Email verification steps" className="grid grid-cols-2 gap-3 text-sm">
                            {['Enter new email', 'Verify email'].map((label, index) => (
                                <li key={label} aria-current={index === (pending ? 1 : 0) ? 'step' : undefined} className={`flex items-center gap-2 ${index === 0 || pending ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${index === 0 || pending ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                        {index === 0 && pending ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : index + 1}
                                    </span>
                                    <span>{label}</span>
                                </li>
                            ))}
                        </ol>
                        <Separator />

                        {!pending ? (
                            <form onSubmit={sendCode} className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="new-email">New email address</Label>
                                    <Input
                                        ref={emailRef} id="new-email" name="new_email" type="email" required
                                        autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254}
                                        placeholder={requiresOccEmail ? 'occ.lastname.firstname@gmail.com' : 'you@example.com'} className="h-11"
                                        value={email} onChange={(event) => setEmail(event.target.value)} disabled={disabled}
                                        aria-invalid={Boolean(errors.new_email)} aria-describedby={`new-email-hint${errors.new_email ? ' new-email-error' : ''}`}
                                    />
                                    <p id="new-email-hint" className="text-xs leading-relaxed text-muted-foreground">
                                        {requiresOccEmail ? (
                                            <>Use your OCC email format. Numbers after your first name are optional, for example <span className="font-medium [overflow-wrap:anywhere]">occ.santos.juan123@gmail.com</span>.</>
                                        ) : (
                                            'Enter an email address you can access. We will send a verification code to this address.'
                                        )}
                                    </p>
                                    <FieldError id="new-email-error">{errors.new_email}</FieldError>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email-current-password">Current password</Label>
                                    <div className="relative">
                                        <Input
                                            ref={passwordRef} id="email-current-password" name="current_password"
                                            type={showPassword ? 'text' : 'password'} autoComplete="current-password" required maxLength={4096}
                                            className="h-11 pr-12" value={password} disabled={disabled}
                                            onChange={(event) => setPassword(event.target.value)}
                                            aria-invalid={Boolean(errors.current_password)}
                                            aria-describedby={`email-password-hint${errors.current_password ? ' email-password-error' : ''}`}
                                        />
                                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-11 w-11" disabled={disabled}
                                            onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
                                            {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <p id="email-password-hint" className="text-xs text-muted-foreground">Confirm your password to authorize this change.</p>
                                    <FieldError id="email-password-error">{errors.current_password}</FieldError>
                                </div>

                                <Button type="submit" className="min-h-11 w-full gap-2 sm:w-auto" disabled={disabled || sendWait > 0 || !email.trim() || !password}>
                                    {busy === 'send' ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Send aria-hidden="true" className="h-4 w-4" />}
                                    {busy === 'send' ? 'Sending code…' : sendWait > 0 ? `Send code in ${formatTime(sendWait)}` : 'Send verification code'}
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={verifyCode} className="space-y-5">
                                <div className="space-y-1">
                                    <h3 className="font-medium">Check your inbox</h3>
                                    <p className="text-sm leading-relaxed text-muted-foreground">Enter the code sent to <span className="font-medium text-foreground [overflow-wrap:anywhere]">{pending.email}</span>.</p>
                                </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="email-code">Verification code</Label>

                                            <InputOTP
                                                ref={codeRef}
                                                id="email-code"
                                                name="code"
                                                maxLength={6}
                                                minLength={6}
                                                pattern={REGEXP_ONLY_DIGITS}
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                required
                                                value={code}
                                                onChange={setCode}
                                                pasteTransformer={(value) => value.replace(/\D/g, '')}
                                                disabled={disabled || expiresIn === 0 || reauthExpired}
                                                aria-invalid={Boolean(errors.code)}
                                                aria-describedby={`email-code-hint${errors.code ? ' email-code-error' : ''}`}
                                                containerClassName="gap-2"
                                            >
                                                <InputOTPGroup>
                                                    {[0, 1, 2].map((index) => (
                                                        <InputOTPSlot
                                                            key={index}
                                                            index={index}
                                                            aria-invalid={Boolean(errors.code)}
                                                            className={`h-12 w-9 text-xl sm:h-14 sm:w-12 ${errors.code ? 'border-destructive' : ''
                                                                }`}
                                                        />
                                                    ))}
                                                </InputOTPGroup>

                                                <InputOTPSeparator />

                                                <InputOTPGroup>
                                                    {[3, 4, 5].map((index) => (
                                                        <InputOTPSlot
                                                            key={index}
                                                            index={index}
                                                            aria-invalid={Boolean(errors.code)}
                                                            className={`h-12 w-9 text-xl sm:h-14 sm:w-12 ${errors.code ? 'border-destructive' : ''
                                                                }`}
                                                        />
                                                    ))}
                                                </InputOTPGroup>
                                            </InputOTP>

                                            <p id="email-code-hint" className="text-xs text-muted-foreground">
                                                {reauthExpired
                                                    ? 'For your security, start again and confirm your password.'
                                                    : expiresIn > 0
                                                        ? `Code expires in ${formatTime(expiresIn)}.`
                                                        : 'This code has expired. Request a new code below.'}
                                            </p>

                                            <FieldError id="email-code-error">
                                                {errors.code}
                                            </FieldError>
                                        </div>

                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Button type="submit" className="min-h-11 gap-2" disabled={disabled || code.length !== 6 || expiresIn === 0 || reauthExpired}>
                                        {busy === 'verify' ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <ShieldCheck aria-hidden="true" className="h-4 w-4" />}
                                        {busy === 'verify' ? 'Verifying…' : 'Verify & update email'}
                                    </Button>
                                    <Button type="button" variant="outline" className="min-h-11" disabled={disabled}
                                        onClick={() => perform('cancel', { request_id: pending.request_id })}>
                                        {busy === 'cancel' ? 'Cancelling…' : reauthExpired ? 'Start again' : 'Use a different email'}
                                    </Button>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-2 text-sm">
                                    <span className="text-muted-foreground">Didn’t receive it? Check spam or</span>
                                    <Button type="button" variant="link" className="min-h-11 px-0" disabled={disabled || sendWait > 0 || reauthExpired}
                                        onClick={() => perform('resend', { request_id: pending.request_id })}>
                                        {busy === 'resend' ? 'Sending…' : sendWait > 0 ? `resend in ${formatTime(sendWait)}` : 'resend code'}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </>
                ) : null}
            </CardContent>

            <CardFooter className="items-start gap-2 border-t bg-muted/20 p-5 text-xs leading-relaxed text-muted-foreground sm:px-6">
                <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Your current email stays active until verification succeeds. Never share your verification code.</p>
            </CardFooter>
        </Card>
    );
}
