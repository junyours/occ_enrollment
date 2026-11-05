import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Check } from 'lucide-react';
import AppLogo from '@/Components/AppLogo';
import { TwoModeToggle } from '@/Components/two-modes-toggle';

const steps = [
    { title: 'Find your account', description: 'Start with your school ID number.' },
    { title: 'Confirm your details', description: 'Check your registered email address.' },
    { title: 'Verify your email', description: 'Enter your six-digit verification code.' },
    { title: 'Set a new password', description: 'Choose a password to sign back in.' },
];

export default function PasswordRecoveryLayout({ title, heading, description, step, children }) {
    return (
        <div className="flex min-h-svh flex-col bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100 [&_*]:[font-family:inherit]" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
            <Head title={title} />

            <header className="px-5 sm:px-8">
                <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 border-b border-slate-200/80 py-5 dark:border-slate-800 sm:py-6 lg:py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <AppLogo size="xs" className="h-10 w-10 shrink-0 sm:h-11 sm:w-11" />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold leading-5 tracking-tight">Opol Community College</p>
                            <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">Student Information System</p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-6">
                        <Link href={route('login')} className="hidden min-h-11 items-center gap-2 rounded-sm text-sm font-medium text-slate-600 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-400 dark:hover:text-blue-400 lg:inline-flex">
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                            Back to sign in
                        </Link>
                        <TwoModeToggle className="h-11 w-11 shrink-0 border-slate-200 bg-transparent shadow-none hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-900" />
                    </div>
                </div>
            </header>

            <main className="flex flex-1 flex-col justify-center px-5 py-8 sm:px-8 sm:py-12 lg:py-4">
                <div className="mx-auto grid w-full max-w-[816px] items-start gap-12 lg:grid-cols-[280px_minmax(0,440px)] lg:gap-24">
                    <aside className="hidden lg:block">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-400">Account recovery</p>
                        <h2 className="mt-4 text-4xl font-semibold leading-[1.15] tracking-[-0.04em]">Let’s get you<br />back in.</h2>
                        <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">A few simple steps to regain access to your SIS account.</p>

                        <nav aria-label="Recovery progress" className="mt-10">
                            <ol className="space-y-6">
                                {steps.map((item, index) => {
                                    const number = index + 1;
                                    const current = step === number;
                                    const complete = step > number;

                                    return (
                                        <li key={item.title} aria-current={current ? 'step' : undefined} className="flex items-start gap-3.5">
                                            <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${current ? 'bg-blue-600 text-white' : complete ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' : 'border border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'}`}>
                                                {complete ? <Check className="h-4 w-4" /> : number}
                                            </span>
                                            <div className="pt-0.5">
                                                <p className={`text-sm leading-5 ${current ? 'font-semibold text-slate-900 dark:text-slate-100' : complete ? 'font-medium text-slate-600 dark:text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>{item.title}<span className="sr-only">{complete ? ', completed' : current ? ', current step' : ''}</span></p>
                                                {current && <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.description}</p>}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        </nav>
                    </aside>

                    <section aria-labelledby="recovery-heading" className="mx-auto w-full min-w-0 max-w-[440px] lg:mx-0">
                        <Link href={route('login')} className="inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-medium text-slate-600 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-400 dark:hover:text-blue-400 lg:hidden">
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                            Back to sign in
                        </Link>

                        <header className="mb-8 mt-6 sm:mt-8 lg:mb-5 lg:mt-0">
                            <div className="mb-5 flex items-center justify-between gap-4 lg:mb-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700 dark:text-blue-400">Step {step} of {steps.length}</p>
                                <div className="flex gap-1.5 lg:hidden" aria-hidden="true">
                                    {steps.map((item, index) => <span key={item.title} className={`h-1 w-6 rounded-full ${index < step ? 'bg-blue-600 dark:bg-blue-400' : 'bg-slate-200 dark:bg-slate-800'}`} />)}
                                </div>
                            </div>
                            <h1 id="recovery-heading" className="text-3xl font-semibold leading-[1.15] tracking-[-0.035em] sm:text-4xl">{heading}</h1>
                            <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-400 lg:mt-2 lg:leading-6">{description}</p>
                        </header>

                        <div className="space-y-6 lg:space-y-4">{children}</div>
                    </section>
                </div>
            </main>
        </div>
    );
}
