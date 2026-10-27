import { useRef, useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, LogOut, ShieldCheck } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { TwoModeToggle } from '@/Components/two-modes-toggle';

function PasswordField({ name, label, value, onChange, inputRef, visible, onToggle, disabled, error, autoComplete, describedBy, maxLength = 72, autoFocus = false }) {
    return (
        <div className="space-y-2">
            <Label htmlFor={name}>{label}</Label>
            <div className="relative">
                <Input
                    ref={inputRef}
                    id={name}
                    name={name}
                    type={visible ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    autoComplete={autoComplete}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={maxLength}
                    autoFocus={autoFocus}
                    required
                    disabled={disabled}
                    className="h-12 pr-12"
                    aria-invalid={Boolean(error)}
                    aria-describedby={[describedBy, error ? `${name}-error` : null].filter(Boolean).join(' ') || undefined}
                />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1.5" onClick={onToggle} aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={visible} disabled={disabled}>
                    {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </Button>
            </div>
            {error && <p id={`${name}-error`} role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
    );
}

export default function RequiredPasswordChange({ errors: pageErrors = {}, status = null }) {
    const form = useForm({ password: '', password_confirmation: '' });
    const action = useForm({});
    const passwordRef = useRef(null);
    const confirmationRef = useRef(null);
    const errorFocus = useRef(null);
    const [visible, setVisible] = useState({ password: false, password_confirmation: false });
    const busy = form.processing || action.processing;
    const errors = { ...pageErrors, ...form.errors, ...action.errors };
    const requirements = [
        { label: '8+ characters (up to 72 bytes)', met: Array.from(form.data.password).length >= 8 && new TextEncoder().encode(form.data.password).length <= 72 },
        { label: 'An uppercase letter', met: /\p{Lu}/u.test(form.data.password) },
        { label: 'A lowercase letter', met: /\p{Ll}/u.test(form.data.password) },
        { label: 'A number', met: /\p{N}/u.test(form.data.password) },
    ];
    const passwordsMatch = form.data.password !== '' && form.data.password === form.data.password_confirmation;
    const canSubmit = !busy && passwordsMatch && requirements.every(({ met }) => met);
    const toggle = (name) => setVisible((previous) => ({ ...previous, [name]: !previous[name] }));
    const update = (name, value) => {
        form.setData(name, value);
        form.clearErrors(name);
    };

    const submit = (event) => {
        event.preventDefault();
        if (!canSubmit) return;
        errorFocus.current = null;
        action.clearErrors();
        form.put(route('password.required.update'), {
            preserveScroll: true,
            onSuccess: () => form.reset(),
            onError: (serverErrors) => {
                const refs = { password: passwordRef, password_confirmation: confirmationRef };
                const firstInvalid = Object.keys(refs).find((name) => serverErrors[name]);
                errorFocus.current = firstInvalid ? refs[firstInvalid] : null;
            },
            onFinish: () => requestAnimationFrame(() => errorFocus.current?.current?.focus()),
        });
    };

    return (
        <main className="min-h-svh w-full bg-gradient-to-br from-slate-50 to-blue-50 px-4 py-6 dark:from-slate-950 dark:to-slate-900 sm:py-10">
            <Head title="Change Your Password" />
            <div className="mx-auto mb-6 flex w-full max-w-md justify-end"><TwoModeToggle /></div>
            <div className="mx-auto w-full max-w-md">
                <Card className="overflow-hidden rounded-none border-0 bg-transparent shadow-none sm:rounded-lg sm:bg-card sm:shadow-xl">
                    <CardHeader className="mt-0 space-y-3 px-0 pt-6 text-center sm:bg-gradient-to-b sm:from-primary/5 sm:to-transparent sm:px-6">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><ShieldCheck className="h-6 w-6" aria-hidden="true" /></div>
                        <CardTitle className="text-2xl font-bold">Change your password to continue</CardTitle>
                        <CardDescription>Choose a new password to continue using your account.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5 px-0 py-6 sm:p-6">
                        {status && <div role="status" className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">{status}</div>}
                        {errors.general && <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>{errors.general}</p></div>}
                        <form onSubmit={submit} className="space-y-5" aria-busy={busy}>
                            <PasswordField name="password" label="New password" value={form.data.password} onChange={(event) => update('password', event.target.value)} inputRef={passwordRef} visible={visible.password} onToggle={() => toggle('password')} disabled={busy} error={errors.password} autoComplete="new-password" describedBy="password-requirements" autoFocus />
                            <PasswordField name="password_confirmation" label="Confirm new password" value={form.data.password_confirmation} onChange={(event) => update('password_confirmation', event.target.value)} inputRef={confirmationRef} visible={visible.password_confirmation} onToggle={() => toggle('password_confirmation')} disabled={busy} error={errors.password_confirmation} autoComplete="new-password" describedBy="confirmation-help" />
                            <div id="password-requirements" className="rounded-lg border border-border bg-muted/40 p-3">
                                <p className="mb-2 text-xs font-semibold text-foreground">Your password must include:</p>
                                <ul className="space-y-1.5 text-xs">{requirements.map(({ label, met }) => <li key={label} className={`flex items-center gap-2 ${met ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}><CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${met ? '' : 'opacity-40'}`} aria-hidden="true" /><span>{label}{met && <span className="sr-only"> — met</span>}</span></li>)}</ul>
                            </div>
                            <p id="confirmation-help" className={`text-xs ${form.data.password_confirmation && !passwordsMatch ? 'text-destructive' : 'text-muted-foreground'}`}>{form.data.password_confirmation ? passwordsMatch ? 'Passwords match.' : 'Passwords do not match yet.' : 'Enter your new password again.'}</p>
                            <Button type="submit" className="h-12 w-full font-semibold" disabled={!canSubmit}>{form.processing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <KeyRound aria-hidden="true" />}{form.processing ? 'Updating password…' : 'Update password and continue'}</Button>
                        </form>
                        <div className="border-t border-border pt-4">
                            <Button type="button" variant="ghost" className="h-11 w-full" disabled={busy} onClick={() => action.post(route('logout'))}><LogOut className="h-4 w-4" aria-hidden="true" />{action.processing ? 'Signing out…' : 'Sign out'}</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
