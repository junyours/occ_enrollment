import React, { useId, useRef, useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Alert, AlertDescription, AlertTitle } from '@/Components/ui/alert';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Progress } from '@/Components/ui/progress';
import { Separator } from '@/Components/ui/separator';
import {
    AlertCircle,
    CheckCircle2,
    Circle,
    Eye,
    EyeOff,
    KeyRound,
    Loader2,
    LockKeyhole,
    ShieldCheck,
} from 'lucide-react';

// These checks mirror the guidance in the original form.
// The server remains responsible for enforcing the actual password policy.
function getPasswordChecks(password) {
    return [
        { label: 'At least 8 characters', met: password.length >= 8 },
        { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
        { label: 'One lowercase letter', met: /[a-z]/.test(password) },
        { label: 'One number', met: /[0-9]/.test(password) },
    ];
}

function getConfirmationFeedback(password, confirmation, touched) {
    if (!password || !confirmation) return null;

    if (password === confirmation) {
        return { tone: 'success', message: 'Passwords match.' };
    }

    return touched
        ? { tone: 'error', message: 'Passwords do not match yet.' }
        : null;
}

function PasswordField({
    id,
    name,
    label,
    value,
    onChange,
    onBlur,
    inputRef,
    visible,
    onToggle,
    autoComplete,
    placeholder,
    description,
    error,
    feedback,
    disabled,
    icon: Icon = LockKeyhole,
}) {
    const message = error || feedback?.message;
    const invalid = Boolean(error || feedback?.tone === 'error');
    const MessageIcon = invalid ? AlertCircle : CheckCircle2;
    const visibilityLabel = (visible ? 'Hide ' : 'Show ') + label.toLowerCase();
    const describedBy = [
        description ? id + '-description' : null,
        message ? id + '-message' : null,
    ].filter(Boolean).join(' ') || undefined;

    return (
        <div className="space-y-2">
            <Label htmlFor={id} className="text-sm font-medium">
                {label}
            </Label>

            <div className="relative">
                <Icon
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                    ref={inputRef}
                    id={id}
                    name={name}
                    type={visible ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    disabled={disabled}
                    required
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                    className={[
                        'h-12 rounded-lg bg-background pl-11 pr-12',
                        invalid ? 'border-destructive focus-visible:ring-destructive' : '',
                    ].join(' ')}
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                    disabled={disabled}
                    aria-label={visibilityLabel}
                    title={visibilityLabel}
                    className="absolute right-0.5 top-1/2 h-11 w-11 -translate-y-1/2 rounded-md text-muted-foreground hover:text-foreground"
                >
                    {!visible
                        ? <EyeOff aria-hidden="true" className="h-4 w-4" />
                        : <Eye aria-hidden="true" className="h-4 w-4" />}
                </Button>
            </div>

            {description && (
                <p id={id + '-description'} className="text-xs leading-relaxed text-muted-foreground">
                    {description}
                </p>
            )}

            {message && (
                <p
                    id={id + '-message'}
                    role={invalid ? 'alert' : 'status'}
                    className={[
                        'flex items-start gap-1.5 text-sm leading-5',
                        invalid ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-400',
                    ].join(' ')}
                >
                    <MessageIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{message}</span>
                </p>
            )}
        </div>
    );
}

function PasswordChecklist({ password, id }) {
    const checks = getPasswordChecks(password);
    const completed = checks.filter((check) => check.met).length;
    const allMet = completed === checks.length;

    return (
        <aside
            aria-labelledby={id}
            className="h-fit min-w-0 rounded-xl border bg-muted/20 p-4 sm:p-5"
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id={id} className="text-sm font-semibold">Password checklist</h3>
                <Badge
                    variant="outline"
                    className={[
                        'rounded-full px-2 py-0.5 text-xs font-medium tabular-nums',
                        allMet
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'bg-background text-muted-foreground',
                    ].join(' ')}
                >
                    {completed} / {checks.length}
                </Badge>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Use these checks as a guide for your new password.
            </p>

            <Progress
                value={(completed / checks.length) * 100}
                aria-label="Password checklist completion"
                aria-valuetext={completed + ' of ' + checks.length + ' checks met'}
                className="mb-5 mt-4 h-1.5"
            />

            <ul className="space-y-3">
                {checks.map((check) => {
                    const StatusIcon = check.met ? CheckCircle2 : Circle;

                    return (
                        <li key={check.label} className="flex items-start gap-2.5 text-sm leading-5">
                            <StatusIcon
                                aria-hidden="true"
                                className={[
                                    'mt-0.5 h-4 w-4 shrink-0',
                                    check.met
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-muted-foreground/60',
                                ].join(' ')}
                            />
                            <span className={check.met ? 'text-foreground' : 'text-muted-foreground'}>
                                <span className="sr-only">{check.met ? 'Met: ' : 'Not yet met: '}</span>
                                {check.label}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </aside>
    );
}

export default function ChangePassword() {
    const { data, setData, put, processing, errors, reset, clearErrors } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const [success, setSuccess] = useState(false);
    const [confirmationTouched, setConfirmationTouched] = useState(false);
    const [visibility, setVisibility] = useState({
        current_password: false,
        password: false,
        password_confirmation: false,
    });

    const instanceId = useId();
    const currentPasswordRef = useRef(null);
    const newPasswordRef = useRef(null);
    const confirmationRef = useRef(null);

    const passwordsMatch = Boolean(
        data.password &&
        data.password_confirmation &&
        data.password === data.password_confirmation,
    );
    const confirmationFeedback = getConfirmationFeedback(
        data.password,
        data.password_confirmation,
        confirmationTouched,
    );
    const canSubmit = Boolean(
        !processing &&
        data.current_password &&
        data.password &&
        data.password_confirmation &&
        passwordsMatch,
    );

    const updateField = (field, value) => {
        setData(field, value);
        setSuccess(false);

        if (field === 'password') {
            clearErrors('password', 'password_confirmation');
        } else {
            clearErrors(field);
        }

        if (field === 'password_confirmation') {
            setConfirmationTouched(false);
        }
    };

    const toggleVisibility = (field) => {
        setVisibility((previous) => ({
            ...previous,
            [field]: !previous[field],
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!canSubmit) return;

        setSuccess(false);

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                clearErrors();
                setConfirmationTouched(false);
                setVisibility({
                    current_password: false,
                    password: false,
                    password_confirmation: false,
                });
                setSuccess(true);
            },
            onError: (serverErrors) => {
                const refs = {
                    current_password: currentPasswordRef,
                    password: newPasswordRef,
                    password_confirmation: confirmationRef,
                };
                const firstInvalidField = Object.keys(refs).find((field) => serverErrors[field]);

                if (firstInvalidField) {
                    // Wait for processing to finish and the inputs to become enabled.
                    requestAnimationFrame(() => refs[firstInvalidField].current?.focus());
                }
            },
        });
    };

    return (
        <Card className="w-full min-w-0 gap-0 overflow-hidden rounded-2xl py-0 shadow-sm">
            <CardHeader className="border-b bg-muted/20 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <ShieldCheck aria-hidden="true" className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                        <CardTitle id={instanceId + '-title'} className="text-lg font-semibold tracking-tight">
                            Change password
                        </CardTitle>
                        <CardDescription className="text-sm leading-relaxed">
                            Choose a new password for your account.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <form onSubmit={handleSubmit} aria-labelledby={instanceId + '-title'} aria-busy={processing}>
                <CardContent className="space-y-6 p-5 sm:p-6">
                    {success && (
                        <Alert
                            role="status"
                            className="rounded-xl border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400"
                        >
                            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                            <AlertTitle>Password updated</AlertTitle>
                            <AlertDescription className="text-emerald-800/80 dark:text-emerald-300/90">
                                Your new password is ready to use.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-8">
                        <div className="min-w-0 space-y-5">
                            <PasswordField
                                id={instanceId + '-current'}
                                name="current_password"
                                label="Current password"
                                inputRef={currentPasswordRef}
                                value={data.current_password}
                                onChange={(event) => updateField('current_password', event.target.value)}
                                visible={visibility.current_password}
                                onToggle={() => toggleVisibility('current_password')}
                                autoComplete="current-password"
                                placeholder="Enter your current password"
                                description="Enter the password you currently use to sign in."
                                error={errors.current_password}
                                disabled={processing}
                            />

                            <Separator />

                            <PasswordField
                                id={instanceId + '-new'}
                                name="password"
                                label="New password"
                                inputRef={newPasswordRef}
                                value={data.password}
                                onChange={(event) => updateField('password', event.target.value)}
                                visible={visibility.password}
                                onToggle={() => toggleVisibility('password')}
                                autoComplete="new-password"
                                placeholder="Create a new password"
                                error={errors.password}
                                disabled={processing}
                                icon={KeyRound}
                            />

                            <PasswordField
                                id={instanceId + '-confirmation'}
                                name="password_confirmation"
                                label="Confirm new password"
                                inputRef={confirmationRef}
                                value={data.password_confirmation}
                                onChange={(event) => updateField('password_confirmation', event.target.value)}
                                onBlur={() => setConfirmationTouched(true)}
                                visible={visibility.password_confirmation}
                                onToggle={() => toggleVisibility('password_confirmation')}
                                autoComplete="new-password"
                                placeholder="Re-enter your new password"
                                error={errors.password_confirmation}
                                feedback={confirmationFeedback}
                                disabled={processing}
                                icon={KeyRound}
                            />
                        </div>

                        <PasswordChecklist password={data.password} id={instanceId + '-checklist'} />
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col items-stretch gap-3 border-t bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <p className="text-center text-xs text-muted-foreground sm:text-left">
                        All fields are required.
                    </p>
                    <Button type="submit" disabled={!canSubmit} className="h-11 w-full gap-2 rounded-lg sm:w-auto sm:min-w-[180px]">
                        {processing ? (
                            <>
                                <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />
                                Updating password…
                            </>
                        ) : (
                            <>
                                <LockKeyhole aria-hidden="true" className="h-4 w-4" />
                                Update password
                            </>
                        )}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}

