import { useState, useRef, useEffect, useCallback } from 'react';
import { 
    AnimatePresence, 
    LazyMotion, 
    domAnimation, 
    m, 
    useReducedMotion 
} from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2, Info, AlertTriangle, X, ChevronDown } from 'lucide-react';

/**
 * Modal status types
 */
const STATUS = {
    IDLE: 'idle',
    LOADING: 'loading',
    SUCCESS: 'success',
    ERROR: 'error',
    INFO: 'info',
    WARNING: 'warning',
};

export const STATUS_CONFIG = {
    [STATUS.LOADING]: {
        icon: Loader2,
        title: 'Processing',
        iconBg: 'bg-primary/10',
        iconColor: 'text-primary',
        showSpinner: true,
    },
    [STATUS.SUCCESS]: {
        icon: CheckCircle2,
        title: 'Success',
        iconBg: 'bg-emerald-500/15',
        iconColor: 'text-emerald-600 dark:text-emerald-500',
        showSpinner: false,
    },
    [STATUS.ERROR]: {
        icon: AlertCircle,
        title: 'Error',
        iconBg: 'bg-destructive/15',
        iconColor: 'text-destructive',
        showSpinner: false,
    },
    [STATUS.INFO]: {
        icon: Info,
        title: 'Information',
        iconBg: 'bg-blue-500/15',
        iconColor: 'text-blue-600 dark:text-blue-500',
        showSpinner: false,
    },
    [STATUS.WARNING]: {
        icon: AlertTriangle,
        title: 'Warning',
        iconBg: 'bg-amber-500/15',
        iconColor: 'text-amber-600 dark:text-amber-500',
        showSpinner: false,
    },
};

const modalRef = { current: null };
let activeProvider = false;

export const FeedbackModal = {
    Show: (message = 'Processing...', options = {}) => {
        modalRef.current?.show(message, options);
    },
    Success: (message = 'Success!', options = {}) => {
        modalRef.current?.setStatus(STATUS.SUCCESS, message, {
            autoClose: true,
            autoCloseDelay: 1000,
            ...options,
        });
    },
    Error: (message = 'Something went wrong!', options = {}) => {
        modalRef.current?.setStatus(STATUS.ERROR, message, {
            autoClose: true,
            autoCloseDelay: 2500,
            ...options,
        });
    },
    Info: (message = 'Information', options = {}) => {
        modalRef.current?.setStatus(STATUS.INFO, message, options);
    },
    Warning: (message = 'Warning', options = {}) => {
        modalRef.current?.setStatus(STATUS.WARNING, message, options);
    },
    Close: () => {
        modalRef.current?.close();
    },
    promise: async (promise, messages = {}) => {
        const {
            loading = 'Processing...',
            success = 'Success!',
            error = 'Something went wrong!',
        } = messages;

        try {
            FeedbackModal.Show(loading);
            const result = await promise;
            FeedbackModal.Success(success);
            return result;
        } catch (err) {
            FeedbackModal.Error(error);
            throw err;
        }
    },
};

function getFocusableElements(container) {
    if (!container) return [];
    return Array.from(
        container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
    ).filter((el) => !el.hasAttribute('disabled'));
}

/**
 * Premium Spring Configuration for UI Snappiness
 */
const springConfig = {
    type: 'spring',
    stiffness: 350,
    damping: 25,
    mass: 0.8,
};

function ExpandableDetails({ details }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const prefersReducedMotion = useReducedMotion();

    if (!details) return null;

    return (
        <div className="mt-3 overflow-hidden rounded-md">
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                aria-expanded={isExpanded}
            >
                <m.div 
                    animate={{ rotate: isExpanded ? (prefersReducedMotion ? 0 : 180) : 0 }} 
                    transition={{ duration: 0.2 }} 
                    className="mr-1"
                >
                    <ChevronDown className="w-4 h-4" />
                </m.div>
                {isExpanded ? 'Hide Details' : 'Show Details'}
            </button>
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <m.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} // Snappy custom cubic-bezier
                    >
                        <div className="mt-2 p-3 text-xs font-mono bg-muted text-muted-foreground rounded-md overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto border border-border">
                            {details}
                        </div>
                    </m.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function Modal({
    isOpen,
    status,
    message,
    title,
    actions,
    details,
    progress,
    onClose,
    focusReturnElement,
}) {
    const modalNodeRef = useRef(null);
    const closeButtonRef = useRef(null);
    const config = STATUS_CONFIG[status];
    const hasActions = actions && actions.length > 0;
    const prefersReducedMotion = useReducedMotion();

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && status !== STATUS.LOADING) {
                onClose();
                return;
            }
            if (e.key === 'Tab') {
                const focusableElements = getFocusableElements(modalNodeRef.current);
                if (focusableElements.length === 0) return;

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];
                const activeElement = document.activeElement;

                if (e.shiftKey) {
                    if (activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        if (closeButtonRef.current && status !== STATUS.LOADING) {
            closeButtonRef.current.focus();
        }
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, status, onClose]);

    useEffect(() => {
        if (!isOpen && focusReturnElement) {
            requestAnimationFrame(() => {
                if (focusReturnElement instanceof HTMLElement) {
                    focusReturnElement.focus();
                }
            });
        }
    }, [isOpen, focusReturnElement]);

    const getIconAnimation = () => {
        if (prefersReducedMotion) return { scale: 1, opacity: 1, x: 0 };
        if (status === STATUS.SUCCESS) return { scale: [0.8, 1.1, 1], opacity: 1 };
        if (status === STATUS.ERROR) return { x: [0, -4, 4, -4, 4, 0], opacity: 1, transition: { duration: 0.35, ease: 'easeInOut' } };
        return { scale: 1, opacity: 1 };
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0"
                    role="presentation"
                >
                    {/* Backdrop */}
                    <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
                        onClick={status !== STATUS.LOADING ? onClose : undefined}
                        aria-hidden="true"
                    />

                    {/* Modal Dialog */}
                    <m.div
                        ref={modalNodeRef}
                        // Staggering: small 50ms delay on entry lets backdrop load first
                        initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.96, y: prefersReducedMotion ? 0 : 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0, transition: { ...springConfig, delay: 0.05 } }}
                        exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.98, y: prefersReducedMotion ? 0 : 6, transition: { duration: 0.15, ease: 'easeIn' } }}
                        className="relative z-50 grid w-full max-w-md gap-4 border border-border bg-background p-6 shadow-2xl sm:rounded-xl"
                        onClick={(e) => e.stopPropagation()}
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="modal-title"
                    >
                        {status !== STATUS.LOADING && (
                            <button
                                ref={closeButtonRef}
                                onClick={onClose}
                                className="absolute right-4 top-4 rounded-sm opacity-50 ring-offset-background transition-all hover:opacity-100 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none p-1"
                                aria-label="Close dialog"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}

                        <div className="flex gap-4 sm:gap-5">
                            <div className="relative shrink-0 flex h-10 w-10">
                                {/* Success Ripple */}
                                <AnimatePresence>
                                    {status === STATUS.SUCCESS && !prefersReducedMotion && (
                                        <m.div
                                            initial={{ scale: 0.8, opacity: 0.8 }}
                                            animate={{ scale: 2.2, opacity: 0 }}
                                            transition={{ duration: 0.6, ease: 'easeOut' }}
                                            className="absolute inset-0 rounded-full bg-emerald-500/30"
                                        />
                                    )}
                                </AnimatePresence>

                                <div className={`relative z-10 flex h-full w-full items-center justify-center rounded-full transition-colors duration-300 ${config?.iconBg}`}>
                                    {/* mode="wait" ensures icons don't fight during fast status changes */}
                                    <AnimatePresence mode="wait">
                                        <m.div
                                            key={status}
                                            initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.6 }}
                                            animate={getIconAnimation()}
                                            exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.6 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {config?.icon && (() => {
                                                const IconComponent = config.icon;
                                                return (
                                                    <IconComponent
                                                        className={`w-5 h-5 transition-colors duration-300 ${config.iconColor} ${config.showSpinner ? 'animate-spin' : ''}`}
                                                        strokeWidth={2}
                                                    />
                                                );
                                            })()}
                                        </m.div>
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 w-full pt-2">
                                <h2 id="modal-title" className="text-lg font-semibold tracking-tight text-foreground leading-none">
                                    {title}
                                </h2>

                                {message && (
                                    <div id="modal-message" className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap">
                                        {message}
                                    </div>
                                )}

                                {/* Progress Bar Component */}
                                <AnimatePresence>
                                    {config?.showSpinner && progress !== undefined && (
                                        <m.div 
                                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                            className="w-full bg-secondary h-1.5 rounded-full overflow-hidden relative"
                                        >
                                            {/* We keep `width` to prevent children elements (the shimmer) from distorting during scaling. Eased heavily to prevent layout thrashing perception. */}
                                            <m.div
                                                className="bg-primary h-full relative overflow-hidden"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
                                                transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
                                            >
                                                {!prefersReducedMotion && (
                                                    <m.div
                                                        className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-transparent via-white/30 dark:via-black/30 to-transparent"
                                                        animate={{ x: ['-100%', '200%'] }}
                                                        transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                                                    />
                                                )}
                                            </m.div>
                                        </m.div>
                                    )}
                                </AnimatePresence>

                                <ExpandableDetails details={details} />

                                {hasActions && (
                                    <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 sm:gap-0">
                                        {actions.map((action, idx) => {
                                            const isOutline = action.variant === 'outline' || action.variant === 'secondary';
                                            const isDestructive = action.variant === 'destructive';
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={(e) => {
                                                        if (action.onClick) action.onClick(e);
                                                        if (action.closeOnClick !== false) onClose();
                                                    }}
                                                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 ${isDestructive
                                                            ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm'
                                                            : isOutline
                                                                ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm'
                                                                : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                                                        }`}
                                                >
                                                    {action.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </m.div>
                </div>
            )}
        </AnimatePresence>
    );
}

export function FeedbackModalProvider({ children, defaultAutoCloseDelay = 1000 }) {
    const [modalState, setModalState] = useState({
        isOpen: false,
        status: STATUS.IDLE,
        message: '',
        title: '',
        autoClose: false,
        autoCloseDelay: defaultAutoCloseDelay,
        actions: [],
        details: null,
        progress: undefined,
    });

    const timeoutRef = useRef(null);
    const focusReturnElementRef = useRef(null);

    const clearTimeout_ = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const setStatus = useCallback(
        (status, message = '', options = {}) => {
            const {
                autoClose = false,
                autoCloseDelay = defaultAutoCloseDelay,
                title = STATUS_CONFIG[status]?.title,
                actions = [],
                details = null,
                progress = undefined,
            } = options;

            clearTimeout_();

            setModalState((prev) => {
                if (!prev.isOpen) {
                    focusReturnElementRef.current = document.activeElement;
                }
                return {
                    ...prev,
                    isOpen: true,
                    status,
                    message,
                    title,
                    autoClose,
                    autoCloseDelay,
                    actions,
                    details,
                    progress,
                };
            });

            if (autoClose) {
                timeoutRef.current = setTimeout(() => {
                    close();
                }, autoCloseDelay);
            }
        },
        [clearTimeout_, defaultAutoCloseDelay]
    );

    const show = useCallback(
        (message = 'Processing...', options = {}) => {
            setStatus(STATUS.LOADING, message, { autoClose: false, ...options });
        },
        [setStatus]
    );

    const close = useCallback(() => {
        clearTimeout_();
        setModalState((prev) => ({ ...prev, isOpen: false }));
    }, [clearTimeout_]);

    useEffect(() => {
        if (activeProvider) {
            console.warn(
                '[FeedbackModal] Warning: Multiple <FeedbackModalProvider> instances detected. ' +
                'Only one provider should be mounted at a time.'
            );
        }
        activeProvider = true;
        modalRef.current = { show, setStatus, close };

        return () => {
            activeProvider = false;
            clearTimeout_();
            modalRef.current = null;
        };
    }, [show, setStatus, close, clearTimeout_]);

    useEffect(() => {
        return () => clearTimeout_();
    }, [clearTimeout_]);

    return (
        <LazyMotion features={domAnimation}>
            {children}
            <Modal
                isOpen={modalState.isOpen}
                status={modalState.status}
                message={modalState.message}
                title={modalState.title}
                actions={modalState.actions}
                details={modalState.details}
                progress={modalState.progress}
                onClose={close}
                focusReturnElement={focusReturnElementRef.current}
            />
        </LazyMotion>
    );
}