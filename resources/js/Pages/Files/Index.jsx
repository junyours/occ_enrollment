import { useEffect, useRef, useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const FOLDER = 'application/vnd.google-apps.folder';
const BATCH = 10; // files per upload request (PHP's max_file_uploads defaults to 20)

// Adjust these if your routes differ.
const folderUrl = (id) => `/drive/folders/${id}`;
const fileUrl = (id) => `/drive/files/${id}`;
const newFolderUrl = '/drive/folders';
const uploadUrl = '/drive/upload';

const KINDS = {
    folder: { badge: null, tile: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400' },
    pdf: { badge: 'PDF', tile: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' },
    image: { badge: 'IMG', tile: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400' },
    doc: { badge: 'DOC', tile: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
    sheet: { badge: 'XLS', tile: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
    slides: { badge: 'PPT', tile: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400' },
    video: { badge: 'VID', tile: 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400' },
    audio: { badge: 'AUD', tile: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400' },
    archive: { badge: 'ZIP', tile: 'bg-stone-200 text-stone-700 dark:bg-stone-500/20 dark:text-stone-300' },
    file: { badge: null, tile: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300' },
};

function kindOf(m) {
    if (m === FOLDER) return 'folder';
    if (m === 'application/pdf') return 'pdf';
    if (m.startsWith('image/') || m === 'application/vnd.google-apps.drawing') return 'image';
    if (m.startsWith('video/')) return 'video';
    if (m.startsWith('audio/')) return 'audio';
    if (m === 'application/vnd.google-apps.document' || /word|opendocument\.text|rtf/.test(m)) return 'doc';
    if (m === 'application/vnd.google-apps.spreadsheet' || /excel|spreadsheet|csv/.test(m)) return 'sheet';
    if (m === 'application/vnd.google-apps.presentation' || /powerpoint|presentation/.test(m)) return 'slides';
    if (/zip|compressed|x-tar|rar|7z|gzip/.test(m)) return 'archive';
    return 'file';
}

function formatSize(bytes) {
    if (bytes == null) return '—'; // Google-native files have no size
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let n = Number(bytes);
    let i = 0;
    while (n >= 1024 && i < units.length - 1) {
        n /= 1024;
        i++;
    }
    return `${n >= 10 || i === 0 ? Math.round(n) : n.toFixed(1)} ${units[i]}`;
}

const Icon = ({ children, className = 'h-5 w-5' }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
    >
        {children}
    </svg>
);

const btn =
    'rounded-lg px-3.5 py-2 text-sm font-medium disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
const btnGhost = `${btn} hover:bg-gray-100 focus-visible:outline-gray-400 dark:hover:bg-gray-800`;
const btnPrimary = `${btn} bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline-blue-600`;
const btnDanger = `${btn} bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600`;

function Tile({ kind, name }) {
    const { badge, tile } = KINDS[kind];
    const label = badge ?? (name.includes('.') ? name.split('.').pop().slice(0, 4).toUpperCase() : 'FILE');

    return (
        <span
            aria-hidden="true"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${tile}`}
        >
            {kind === 'folder' ? (
                <Icon>
                    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                </Icon>
            ) : (
                label
            )}
        </span>
    );
}

// Native <dialog>: focus trapping, Escape and the backdrop come for free.
function Dialog({ open, onClose, label, children }) {
    const ref = useRef(null);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    return (
        <dialog
            ref={ref}
            aria-label={label}
            onClose={onClose}
            onClick={(e) => e.target === e.currentTarget && onClose()}
            className="m-auto w-full max-w-md rounded-xl bg-white p-0 text-gray-900 shadow-xl backdrop:bg-black/50 dark:bg-gray-900 dark:text-gray-100"
        >
            {children}
        </dialog>
    );
}

function NewMenu({ disabled, onNewFolder, onFileUpload, onFolderUpload }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;

        const dismiss = (e) => {
            if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false);
        };

        document.addEventListener('mousedown', dismiss);
        document.addEventListener('keydown', dismiss);

        return () => {
            document.removeEventListener('mousedown', dismiss);
            document.removeEventListener('keydown', dismiss);
        };
    }, [open]);

    const item = (label, icon, onSelect) => (
        <button
            type="button"
            onClick={() => {
                setOpen(false);
                onSelect();
            }}
            className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-100 focus-visible:bg-gray-100 focus-visible:outline-none dark:hover:bg-gray-800 dark:focus-visible:bg-gray-800"
        >
            <span className="text-gray-500 dark:text-gray-400">{icon}</span>
            {label}
        </button>
    );

    return (
        <div ref={ref} className="relative shrink-0">
            <button
                type="button"
                aria-expanded={open}
                disabled={disabled}
                onClick={() => setOpen((o) => !o)}
                className={`${btnPrimary} flex items-center gap-2`}
            >
                <Icon className="h-4 w-4">
                    <path d="M5 12h14" />
                    <path d="M12 5v14" />
                </Icon>
                New
            </button>

            {open && (
                <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                    {item(
                        'New folder',
                        <Icon>
                            <path d="M12 10v6" />
                            <path d="M9 13h6" />
                            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                        </Icon>,
                        onNewFolder,
                    )}
                    <hr className="my-1 border-gray-200 dark:border-gray-800" />
                    {item(
                        'File upload',
                        <Icon>
                            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                            <path d="M12 12v6" />
                            <path d="m15 15-3-3-3 3" />
                        </Icon>,
                        onFileUpload,
                    )}
                    {item(
                        'Folder upload',
                        <Icon>
                            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                            <path d="M12 10v6" />
                            <path d="m9 13 3-3 3 3" />
                        </Icon>,
                        onFolderUpload,
                    )}
                </div>
            )}
        </div>
    );
}

function NewFolderDialog({ open, parentId, onClose }) {
    const { data, setData, post, transform, processing, errors, reset, clearErrors } = useForm({
        name: 'Untitled folder',
    });

    // Start from a clean form every time the dialog opens.
    useEffect(() => {
        if (open) {
            reset();
            clearErrors();
        }
    }, [open]);

    const submit = (e) => {
        e.preventDefault();
        transform((form) => ({ ...form, name: form.name.trim(), parent: parentId }));
        post(newFolderUrl, { preserveScroll: true, preserveState: true, onSuccess: onClose });
    };

    const error = errors.name || errors.drive;

    return (
        <Dialog open={open} onClose={onClose} label="New folder">
            <form onSubmit={submit} className="p-6">
                <h2 className="text-lg font-semibold">New folder</h2>
                <input
                    type="text"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    onFocus={(e) => e.target.select()}
                    maxLength={255}
                    required
                    aria-label="Folder name"
                    className="mt-4 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-gray-700"
                />
                {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className={btnGhost}>
                        Cancel
                    </button>
                    <button type="submit" disabled={processing || !data.name.trim()} className={btnPrimary}>
                        Create
                    </button>
                </div>
            </form>
        </Dialog>
    );
}

function RenameDialog({ item, onClose }) {
    const { data, setData, patch, transform, processing, errors } = useForm({ name: item.name });
    const isFolder = item.mimeType === FOLDER;
    const kind = isFolder ? 'folder' : 'file';
    const unchanged = data.name.trim() === item.name;

    // Select the name without its extension, so typing keeps ".pdf" etc.
    const selectBaseName = (e) => {
        const dot = item.name.lastIndexOf('.');
        e.target.setSelectionRange(0, isFolder || dot <= 0 ? item.name.length : dot);
    };

    const submit = (e) => {
        e.preventDefault();
        transform((form) => ({ ...form, name: form.name.trim() }));
        patch(fileUrl(item.id), { preserveScroll: true, preserveState: true, onSuccess: onClose });
    };

    const error = errors.name || errors.drive;

    return (
        <Dialog open onClose={onClose} label={`Rename ${kind}`}>
            <form onSubmit={submit} className="p-6">
                <h2 className="text-lg font-semibold">Rename {kind}</h2>
                <input
                    type="text"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    onFocus={selectBaseName}
                    maxLength={255}
                    required
                    aria-label="Name"
                    className="mt-4 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-gray-700"
                />
                {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className={btnGhost}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={processing || !data.name.trim() || unchanged}
                        className={btnPrimary}
                    >
                        Rename
                    </button>
                </div>
            </form>
        </Dialog>
    );
}

function Row({ f, onRename, onDelete }) {
    const kind = kindOf(f.mimeType);
    const isFolder = kind === 'folder';
    const modified = new Date(f.modifiedTime);
    const date = modified.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const size = isFolder ? '' : formatSize(f.size);
    const muted = 'text-sm text-gray-500 dark:text-gray-400';
    const action =
        'relative z-10 rounded-md p-2 text-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600';

    const Primary = isFolder ? Link : 'a';
    const primaryProps = isFolder
        ? { href: folderUrl(f.id) }
        : { href: fileUrl(f.id), target: '_blank', rel: 'noreferrer' };

    return (
        <li className="group relative flex items-center gap-3 px-4 py-3 hover:bg-gray-50 focus-within:bg-gray-50 dark:hover:bg-gray-900/60 dark:focus-within:bg-gray-900/60">
            <Tile kind={kind} name={f.name} />

            <div className="min-w-0 flex-1">
                {/* The name link stretches over the whole row, so the full row is clickable. */}
                <Primary
                    {...primaryProps}
                    className="block truncate font-medium after:absolute after:inset-0 focus-visible:underline focus-visible:outline-none"
                >
                    {f.name}
                </Primary>
                <div className={`mt-0.5 flex gap-3 sm:hidden ${muted}`}>
                    {size && <span>{size}</span>}
                    <span>{date}</span>
                </div>
            </div>

            <span className={`hidden w-20 text-right sm:block ${muted}`}>{size}</span>
            <time
                dateTime={f.modifiedTime}
                title={modified.toLocaleString()}
                className={`hidden w-28 text-right sm:block ${muted}`}
            >
                {date}
            </time>

            <span className="flex w-28 justify-end">
                {!isFolder && (
                    <a
                        href={`${fileUrl(f.id)}?download=1`}
                        aria-label={`Download ${f.name}`}
                        title="Download"
                        className={`${action} hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200`}
                    >
                        <Icon>
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <path d="m7 10 5 5 5-5" />
                            <path d="M12 15V3" />
                        </Icon>
                    </a>
                )}
                <button
                    type="button"
                    onClick={() => onRename(f)}
                    aria-label={`Rename ${f.name}`}
                    title="Rename"
                    className={`${action} hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200`}
                >
                    <Icon>
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </Icon>
                </button>
                <button
                    type="button"
                    onClick={() => onDelete(f)}
                    aria-label={`Delete ${f.name}`}
                    title="Delete"
                    className={`${action} hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/15 dark:hover:text-red-400`}
                >
                    <Icon>
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        <line x1="10" x2="10" y1="11" y2="17" />
                        <line x1="14" x2="14" y1="11" y2="17" />
                    </Icon>
                </button>
            </span>
        </li>
    );
}

// ".." entry: stays visible inside a subfolder, even while filtering or when the folder is empty.
function UpRow({ href, label }) {
    return (
        <li className="relative flex items-center gap-3 px-4 py-3 hover:bg-gray-50 focus-within:bg-gray-50 dark:hover:bg-gray-900/60 dark:focus-within:bg-gray-900/60">
            <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-500/15 dark:text-gray-400"
            >
                <Icon>
                    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                    <path d="M12 10v6" />
                    <path d="m9 13 3-3 3 3" />
                </Icon>
            </span>

            <div className="min-w-0 flex-1">
                <Link
                    href={href}
                    aria-label={`Back to ${label}`}
                    className="block font-medium after:absolute after:inset-0 focus-visible:underline focus-visible:outline-none"
                >
                    ..
                </Link>
                <div className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">Back to {label}</div>
            </div>
        </li>
    );
}

export default function Index({ trail = [], items = [] }) {
    const { errors } = usePage().props;
    const [query, setQuery] = useState('');
    const [folderDialog, setFolderDialog] = useState(false);
    const [toDelete, setToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [upload, setUpload] = useState(null);
    const fileInput = useRef(null);
    const folderInput = useRef(null);
    const current = trail[trail.length - 1];
    const [toRename, setToRename] = useState(null);

    // Clear the filter when moving to another folder.
    useEffect(() => {
        setQuery('');
    }, [current?.id]);

    const q = query.trim().toLowerCase();
    const visible = q ? items.filter((f) => f.name.toLowerCase().includes(q)) : items;
    const folders = items.filter((f) => f.mimeType === FOLDER).length;
    const files = items.length - folders;
    const title = trail.length > 1 ? current.name : 'Files';

    // The folder one level up, for the ".." row (the root is called "Files").
    const parent = trail.length > 1 ? trail[trail.length - 2] : null;
    const parentHref = trail.length > 2 ? folderUrl(parent.id) : '/drive';
    const parentLabel = trail.length > 2 ? parent.name : 'Files';

    const emptyText = q
        ? `Nothing matches "${query.trim()}".`
        : 'This folder is empty. Use New to upload files or create a folder.';

    // The new-folder dialog shows its own "name" error; everything else is shown above the list.
    const pageError = Object.entries(errors ?? {}).find(([key]) => key !== 'name')?.[1];

    // Sends the files in batches, so a big selection stays under PHP's per-request limits.
    const startUpload = (picked) => {
        if (!picked.length || !current) return;

        const batches = [];
        for (let i = 0; i < picked.length; i += BATCH) batches.push(picked.slice(i, i + BATCH));

        let sent = 0;

        const send = (index) => {
            if (index === batches.length) {
                setUpload(null);
                return;
            }

            const batch = batches[index];
            let succeeded = false;

            router.post(
                uploadUrl,
                {
                    parent: current.id,
                    files: batch,
                    paths: batch.map((file) => file.webkitRelativePath || ''),
                },
                {
                    forceFormData: true,
                    preserveScroll: true,
                    preserveState: true,
                    onProgress: (event) =>
                        setUpload({
                            total: picked.length,
                            percent: Math.round(
                                ((sent + batch.length * ((event?.percentage ?? 0) / 100)) / picked.length) * 100,
                            ),
                        }),
                    onSuccess: () => {
                        succeeded = true;
                        sent += batch.length;
                        send(index + 1);
                    },
                    onFinish: () => {
                        if (!succeeded) setUpload(null);
                    },
                },
            );
        };

        setUpload({ total: picked.length, percent: 0 });
        send(0);
    };

    const onPick = (e) => {
        startUpload(Array.from(e.target.files));
        e.target.value = '';
    };

    const confirmDelete = () => {
        setDeleting(true);
        router.delete(fileUrl(toDelete.id), {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => {
                setDeleting(false);
                setToDelete(null);
            },
        });
    };

    const deletingFolder = toDelete?.mimeType === FOLDER;

    return (
        <>
            <Head title={title} />
            <div className="mx-auto max-w-5xl p-6">
                {trail.length > 1 && (
                    <nav
                        aria-label="Breadcrumb"
                        className="mb-3 flex flex-wrap items-center gap-1 text-sm text-gray-500 dark:text-gray-400"
                    >
                        {trail.slice(0, -1).map((crumb, i) => (
                            <span key={crumb.id} className="flex items-center gap-1">
                                {i > 0 && <span aria-hidden="true">/</span>}
                                <Link
                                    href={i === 0 ? '/drive' : folderUrl(crumb.id)}
                                    className="hover:text-blue-600 hover:underline"
                                >
                                    {i === 0 ? 'Files' : crumb.name}
                                </Link>
                            </span>
                        ))}
                    </nav>
                )}

                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold">{title}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {folders} {folders === 1 ? 'folder' : 'folders'}, {files} {files === 1 ? 'file' : 'files'}
                        </p>
                    </div>

                    <div className="flex w-full items-center gap-2 sm:w-auto">
                        <label className="relative block w-full sm:w-64">
                            <span className="sr-only">Filter this folder</span>
                            <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.3-4.3" />
                            </Icon>
                            <input
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Filter this folder"
                                className="w-full rounded-lg border border-gray-300 bg-transparent py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-gray-700"
                            />
                        </label>

                        <NewMenu
                            disabled={!!upload || !current}
                            onNewFolder={() => setFolderDialog(true)}
                            onFileUpload={() => fileInput.current?.click()}
                            onFolderUpload={() => folderInput.current?.click()}
                        />
                    </div>
                </div>

                {pageError && (
                    <div
                        role="alert"
                        className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                    >
                        {pageError}
                    </div>
                )}

                {!parent && visible.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                        {emptyText}
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
                        {parent && <UpRow href={parentHref} label={parentLabel} />}
                        {visible.length === 0 && (
                            <li className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                {emptyText}
                            </li>
                        )}
                        {visible.map((f) => (
                            <Row key={f.id} f={f} onRename={setToRename} onDelete={setToDelete} />
                        ))}
                    </ul>
                )}
            </div>

            <input ref={fileInput} type="file" multiple hidden onChange={onPick} />
            <input ref={folderInput} type="file" multiple hidden webkitdirectory="true" onChange={onPick} />

            <NewFolderDialog open={folderDialog} parentId={current?.id} onClose={() => setFolderDialog(false)} />
            {toRename && <RenameDialog key={toRename.id} item={toRename} onClose={() => setToRename(null)} />}

            <Dialog open={!!toDelete} onClose={() => setToDelete(null)} label="Confirm delete">
                {toDelete && (
                    <div className="p-6">
                        <h2 className="text-lg font-semibold">Delete {deletingFolder ? 'folder' : 'file'}?</h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium text-gray-900 dark:text-gray-100">{toDelete.name}</span>
                            {deletingFolder && ' and everything in it'} will move to the Drive trash, where it can still
                            be restored.
                        </p>
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setToDelete(null)}
                                disabled={deleting}
                                className={btnGhost}
                            >
                                Cancel
                            </button>
                            <button type="button" onClick={confirmDelete} disabled={deleting} className={btnDanger}>
                                {deleting ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                )}
            </Dialog>

            {upload && (
                <div
                    role="status"
                    className="fixed bottom-4 right-4 z-40 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900"
                >
                    <p className="text-sm font-medium">
                        Uploading {upload.total} {upload.total === 1 ? 'file' : 'files'}
                    </p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                            className="h-full rounded-full bg-blue-600 transition-[width] motion-reduce:transition-none"
                            style={{ width: `${upload.percent}%` }}
                        />
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{upload.percent}%</p>
                </div>
            )}
        </>
    );
}

Index.layout = (page) => <AuthenticatedLayout children={page} title="Google drive" />