import { Head, Link } from '@inertiajs/react'
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react'

const errors = {
    403: {
        title: 'Access denied',
        message: 'You don’t have permission to view this page.',
        button: 'bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-600',
    },
    404: {
        title: 'Page not found',
        message: 'We couldn’t find the page you’re looking for.',
        button: 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-600',
    },
    500: {
        title: 'Something went wrong',
        message:
            'We’re having trouble loading this page. Please try again in a moment.',
        button: 'bg-violet-600 hover:bg-violet-700 focus-visible:ring-violet-600',
    },
}

export default function GuestErrorPage({
    status = 404,
    title,
    message,
    dashboardHref = '/',
}) {
    const code = Number(status)

    const error = errors[code] ?? {
        ...errors[500],
        title: 'Unable to load this page',
    }

    const imageCode = errors[code] ? code : 500

    const goBack = () => {
        if (window.history.length > 1) {
            window.history.back()
        } else {
            window.location.assign(dashboardHref)
        }
    }

    const primaryClassName = `
        inline-flex min-h-12 w-full items-center justify-center gap-2
        rounded-xl px-6 text-sm font-semibold text-white shadow-sm
        transition focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-offset-2
        sm:w-auto sm:text-base
        ${error.button}
    `

    return (
        <>
            <Head title={`${code} — ${title || error.title} | OCC SIS`} />

            <main className="flex min-h-[100dvh] flex-col bg-white text-slate-800">
                <div
                    className="
                        mx-auto grid w-full max-w-[1440px] flex-1 content-center
                        gap-2 px-5 py-6
                        sm:gap-6 sm:px-10 sm:py-10
                        lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-16 lg:py-4
                    "
                >
                    {/* Illustration */}
                    <div
                        className="
                            mx-auto flex h-48 w-full max-w-sm items-center justify-center
                            sm:h-72 sm:max-w-lg
                            lg:h-[52vh] lg:max-h-[520px] lg:max-w-none
                        "
                    >
                        <img
                            src={`/images/errors/${imageCode}.png`}
                            alt=""
                            className="h-full w-full object-contain"
                        />
                    </div>

                    {/* Content */}
                    <div className="mx-auto w-full max-w-xl text-center lg:mx-0 lg:text-left">
                        <div
                            className="
                                text-7xl font-black leading-none tracking-[-0.07em]
                                text-slate-800
                                sm:text-8xl
                                lg:text-[clamp(7rem,12vw,10rem)]
                            "
                        >
                            {code}
                        </div>

                        <h1
                            className="
                                mt-3 text-3xl font-bold tracking-tight
                                sm:mt-4 sm:text-5xl
                                lg:text-6xl
                            "
                        >
                            {title || error.title}
                        </h1>

                        <p
                            className="
                                mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500
                                sm:mt-5 sm:text-lg sm:leading-relaxed
                                lg:mx-0
                            "
                        >
                            {message || error.message}
                        </p>

                        <div
                            className="
                                mx-auto mt-6 flex w-full max-w-sm flex-col
                                items-center gap-2
                                sm:mt-9 sm:max-w-none sm:flex-row
                                sm:justify-center sm:gap-5
                                lg:mx-0 lg:justify-start
                            "
                        >
                            {code === 500 ? (
                                <button
                                    type="button"
                                    onClick={() => window.location.reload()}
                                    className={primaryClassName}
                                >
                                    <RotateCcw size={18} aria-hidden="true" />
                                    Try Again
                                </button>
                            ) : (
                                <Link
                                    href={dashboardHref}
                                    className={primaryClassName}
                                >
                                    Return to homepage
                                    <ArrowRight size={18} aria-hidden="true" />
                                </Link>
                            )}

                            {code === 500 ? (
                                <Link
                                    href={dashboardHref}
                                    className="
                                        inline-flex min-h-11 items-center justify-center
                                        gap-2 px-3 text-sm font-medium text-slate-700
                                        underline decoration-slate-300 underline-offset-8
                                        hover:text-slate-950 sm:text-base
                                    "
                                >
                                    Return to homepage
                                    <ArrowRight size={17} aria-hidden="true" />
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    onClick={goBack}
                                    className="
                                        inline-flex min-h-11 items-center justify-center
                                        gap-2 px-3 text-sm font-medium text-slate-700
                                        underline decoration-slate-300 underline-offset-8
                                        hover:text-slate-950 sm:text-base
                                    "
                                >
                                    <ArrowLeft size={17} aria-hidden="true" />
                                    Go Back
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <footer className="px-5 pb-5 pt-4 text-center text-xs leading-5 text-slate-400 sm:text-sm">
                    Opol Community College · Student Information System
                </footer>
            </main>
        </>
    )
}