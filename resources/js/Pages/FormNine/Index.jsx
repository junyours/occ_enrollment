import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Head, usePage } from '@inertiajs/react';
import { Edit, List, MoreHorizontal, PlusSquareIcon, PanelLeftClose, PanelLeftOpen, UserRound } from 'lucide-react';
import axios from 'axios';
import { formatName } from '@/Lib/InfoUtils';
import { Button } from '@/Components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu';
import StudentSearch from '@/Components/StudentSearch';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Paper from './Paper';
import PaperContainer from './components/PaperContainer';
import AddRecordDialog from './AddRecordDialog';
import AddStudentInfo from './AddStudentInfo';
import ViewRecords from './ViewRecords';
import TorPaper from './TorPaper';
import TorOptions from './TorOptions';
import { loadTorPreferences, loadTorStudentOptions, saveTorOptions } from './torSettings';
import { createTorPhoto, torPhotoFile, validateTorPhoto } from './torPhoto';
import { photoFramingOptions } from './torPhotoFraming';
import { loadRecordWorkspacePreferences, saveRecordWorkspacePreferences, MIN_SETTINGS_WIDTH, MAX_SETTINGS_WIDTH } from './recordWorkspacePreferences';
import { validateTorForPrint } from './torValidation';
import TorPrintChecklist from './TorPrintChecklist';
import './RecordWorkspace.css';

export default function Index() {
    const { auth } = usePage().props;
    return <RecordEditor key={auth?.user?.id ?? 'guest'} user={auth?.user} />;
}

function RecordEditor({ user }) {
    const queryClient = useQueryClient();
    const documentRef = useRef(null);
    const searchHostRef = useRef(null);
    const settingsToggleRef = useRef(null);
    const workspaceRef = useRef(null);
    const resizeStartRef = useRef(null);
    const photoRequestRef = useRef(0);
    const photoWriteQueuesRef = useRef(new Map());
    const photoObjectUrlRef = useRef(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [addingRecord, setAddingRecord] = useState(false);
    const [addingInfo, setAddingInfo] = useState(false);
    const [viewRecords, setViewRecords] = useState(false);
    const [isTor, setIsTor] = useState(false);
    const [initialWorkspace] = useState(() => loadRecordWorkspacePreferences(user));
    const workspacePreferencesRef = useRef(initialWorkspace);
    const [settingsOpen, setSettingsOpen] = useState(() => typeof window === 'undefined' || window.matchMedia('(min-width: 1024px)').matches ? initialWorkspace.settingsOpen : false);
    const [settingsWidth, setSettingsWidth] = useState(initialWorkspace.settingsWidth);
    const settingsWidthRef = useRef(settingsWidth);
    const [workspaceWidth, setWorkspaceWidth] = useState(0);
    const [resizingSettings, setResizingSettings] = useState(false);
    const [workspaceSaveError, setWorkspaceSaveError] = useState(false);
    const [checksOpen, setChecksOpen] = useState(false);
    const [torReady, setTorReady] = useState(false);
    const [formNineReady, setFormNineReady] = useState(false);
    const [torOptions, setTorOptions] = useState(() => loadTorPreferences(user));
    const torOptionsRef = useRef(torOptions);
    torOptionsRef.current = torOptions;
    const [storageStatus, setStorageStatus] = useState('');
    const [photoError, setPhotoError] = useState('');
    const [photoLoading, setPhotoLoading] = useState(false);
    const [photoMessage, setPhotoMessage] = useState('');
    const [photoDraft, setPhotoDraft] = useState(null);
    const [photoRemoving, setPhotoRemoving] = useState(false);

    const showPhotoDraft = value => {
        const previous = photoObjectUrlRef.current;
        photoObjectUrlRef.current = value?.startsWith('blob:') ? value : null;
        setPhotoDraft(value);
        if (previous && previous !== value) URL.revokeObjectURL(previous);
    };

    useEffect(() => {
        const desktop = window.matchMedia('(min-width: 1024px)');
        const changed = () => {
            const open = desktop.matches ? workspacePreferencesRef.current.settingsOpen : false;
            if (!open && document.getElementById('record-settings-body')?.contains(document.activeElement)) settingsToggleRef.current?.focus();
            setSettingsOpen(open);
        };
        desktop.addEventListener('change', changed);
        return () => desktop.removeEventListener('change', changed);
    }, []);

    useEffect(() => {
        const workspace = workspaceRef.current;
        if (!workspace) return;
        const observer = new ResizeObserver(() => setWorkspaceWidth(workspace.clientWidth));
        observer.observe(workspace);
        setWorkspaceWidth(workspace.clientWidth);
        return () => observer.disconnect();
    }, []);

    const rememberWorkspace = values => {
        const next = { ...workspacePreferencesRef.current, ...values };
        workspacePreferencesRef.current = next;
        setWorkspaceSaveError(!saveRecordWorkspacePreferences(user, next));
    };
    const updateSettingsOpen = open => {
        if (open && (!selectedStudent?.id || !data)) return;
        setSettingsOpen(open);
        if (window.matchMedia('(min-width: 1024px)').matches) rememberWorkspace({ settingsOpen: open });
    };
    const maximumSettingsWidth = workspaceWidth ? Math.max(MIN_SETTINGS_WIDTH, Math.min(MAX_SETTINGS_WIDTH, workspaceWidth - 372)) : MAX_SETTINGS_WIDTH;
    const displayedSettingsWidth = Math.min(settingsWidth, maximumSettingsWidth);
    const changeSettingsWidth = width => {
        const next = Math.round(Math.max(MIN_SETTINGS_WIDTH, Math.min(maximumSettingsWidth, width)));
        settingsWidthRef.current = next;
        setSettingsWidth(next);
        return next;
    };
    const startSettingsResize = event => {
        if (event.button !== 0) return;
        event.preventDefault();
        resizeStartRef.current = { x: event.clientX, width: displayedSettingsWidth };
        setResizingSettings(true);
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const moveSettingsResize = event => {
        if (resizeStartRef.current) changeSettingsWidth(resizeStartRef.current.width + event.clientX - resizeStartRef.current.x);
    };
    const finishSettingsResize = event => {
        if (!resizeStartRef.current) return;
        resizeStartRef.current = null;
        setResizingSettings(false);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        rememberWorkspace({ settingsWidth: settingsWidthRef.current });
    };
    const keyboardSettingsResize = event => {
        let next;
        if (event.key === 'ArrowLeft') next = displayedSettingsWidth - (event.shiftKey ? 32 : 16);
        if (event.key === 'ArrowRight') next = displayedSettingsWidth + (event.shiftKey ? 32 : 16);
        if (event.key === 'Home') next = MIN_SETTINGS_WIDTH;
        if (event.key === 'End') next = maximumSettingsWidth;
        if (next === undefined) return;
        event.preventDefault();
        rememberWorkspace({ settingsWidth: changeSettingsWidth(next) });
    };

    useEffect(() => {
        if (!selectedStudent) searchHostRef.current?.querySelector('input, select')?.focus();
    }, [selectedStudent?.id]);

    useEffect(() => () => {
        photoRequestRef.current += 1;
        if (photoObjectUrlRef.current) URL.revokeObjectURL(photoObjectUrlRef.current);
    }, []);

    const updateTorOptions = next => {
        setTorReady(false);
        torOptionsRef.current = next;
        setTorOptions(next);
        setStorageStatus(saveTorOptions(user, selectedStudent?.id, next) ? 'saved' : 'error');
    };

    const changePhotoFraming = framing => updateTorOptions({ ...torOptionsRef.current, ...photoFramingOptions(framing) });

    const selectStudent = student => {
        photoRequestRef.current += 1;
        showPhotoDraft(null);
        setPhotoRemoving(false);
        setPhotoLoading(false);
        setPhotoError('');
        setPhotoMessage('');
        setChecksOpen(false);
        setTorReady(false);
        setFormNineReady(false);
        const next = loadTorStudentOptions(user, student?.id, torOptionsRef.current);
        torOptionsRef.current = next;
        setTorOptions(next);
        setSelectedStudent(student);
    };

    const { data, dataUpdatedAt, isLoading, isFetching, isError, refetch } = useQuery({
        queryKey: ['permanent-record-student', selectedStudent?.id],
        queryFn: async () => {
            const response = await axios.get(route('permanent-record-student', { id: selectedStudent?.id }));
            return response.data;
        },
        enabled: !!selectedStudent?.id,
        staleTime: 1000 * 60,
        refetchOnWindowFocus: false,
    });

    const photoKey = ['permanent-record-photo', user?.id ?? 'guest', selectedStudent?.id];
    const photoQuery = useQuery({
        queryKey: photoKey,
        queryFn: async ({ signal }) => {
            const response = await axios.get(route('permanent-record.photo.show', { id: selectedStudent.id }), { signal });
            return response.data;
        },
        enabled: isTor && !!selectedStudent?.id && !photoLoading,
        staleTime: 0,
        retry: false,
        refetchOnWindowFocus: false,
    });
    const photoBusy = photoLoading || photoQuery.isFetching;
    const photoUrl = photoDraft !== null ? photoDraft : photoQuery.data?.photoUrl || torOptions.photoUrl;
    const previewOptions = useMemo(() => ({ ...torOptions, photoUrl }), [torOptions, photoUrl]);
    const legacyPhotoAvailable = photoDraft === null && photoQuery.isSuccess && !photoQuery.data?.photoUrl && !!torOptions.photoUrl;

    const handlePhotoChange = async (file, currentPhotoUrl = '') => {
        const studentId = selectedStudent?.id;
        const uploading = !!(file || currentPhotoUrl);
        if (!studentId || photoQuery.isFetching || (photoLoading && (uploading || photoRemoving))) return;
        if (file) {
            try { validateTorPhoto(file); }
            catch (error) { setPhotoError(error.message); return; }
        }
        const request = ++photoRequestRef.current;
        setPhotoError('');
        setPhotoMessage('');
        setPhotoLoading(true);
        setPhotoRemoving(!uploading);
        showPhotoDraft(uploading ? (file ? URL.createObjectURL(file) : currentPhotoUrl) : '');

        const writePhoto = work => {
            const queues = photoWriteQueuesRef.current;
            const previous = queues.get(studentId) || Promise.resolve();
            // A remove waits for any upload already sent to the server, so it cannot reappear.
            const pending = previous.catch(() => { }).then(async () => {
                const response = await work();
                await queryClient.cancelQueries({ queryKey: photoKey, exact: true });
                queryClient.setQueryData(photoKey, response.data);
                return response;
            });
            queues.set(studentId, pending);
            const cleanup = () => { if (queues.get(studentId) === pending) queues.delete(studentId); };
            pending.then(cleanup, cleanup);
            return pending;
        };

        try {
            await queryClient.cancelQueries({ queryKey: photoKey, exact: true });
            if (request !== photoRequestRef.current) return;
            let response;
            if (uploading) {
                const prepared = file ? await createTorPhoto(file) : currentPhotoUrl;
                if (request !== photoRequestRef.current) return;
                const body = new FormData();
                body.append('photo', torPhotoFile(prepared));
                response = await writePhoto(() => axios.post(route('permanent-record.photo.store', { id: studentId }), body));
            } else {
                response = await writePhoto(() => axios.delete(route('permanent-record.photo.destroy', { id: studentId })));
            }
            if (!response || request !== photoRequestRef.current) return;
            // Drive is now authoritative; remove the old browser-only photo.
            updateTorOptions({ ...torOptionsRef.current, photoUrl: '' });
            showPhotoDraft(null);
            setPhotoMessage(uploading ? 'Student photo saved to Google Drive.' : 'Student photo removed.');
        } catch (error) {
            if (request !== photoRequestRef.current) return;
            showPhotoDraft(null);
            setPhotoError(error.response?.data?.errors?.photo?.[0] || error.response?.data?.message || error.message || 'Could not save the student photo. Please try again.');
        } finally {
            if (request === photoRequestRef.current) {
                setPhotoRemoving(false);
                setPhotoLoading(false);
            }
        }
    };

    const printChecks = useMemo(() => validateTorForPrint(data, previewOptions), [data, previewOptions]);

    const handlePrint = useReactToPrint({
        contentRef: documentRef,
        documentTitle: `${isTor ? 'Transcript of Records' : 'Form 9'} - ${data ? formatName(data.info.information, { format: 'LFM' }) : 'Student Record'}`,
    });
    const canPrint = !!data && !isFetching && !photoLoading && (isTor ? torReady && !photoQuery.isPending && !photoQuery.isFetching && !photoQuery.isError && printChecks.errors.length === 0 : formNineReady);
    const printDisabledReason = !data ? 'Select a student to print.' : isFetching ? 'Wait for the student record to load.' : photoBusy ? 'Wait for the photo update to finish.' : isTor && photoQuery.isError ? 'Retry loading the student photo.' : isTor && printChecks.errors.length ? 'Resolve the missing required information in Print checks.' : 'Wait for the preview to finish preparing.';
    const studentName = formatName(data?.info?.information || selectedStudent, { format: 'FULL', defaultValue: 'Loading student...' });
    const studentId = data?.info?.user_id_no || selectedStudent?.user_id_no || selectedStudent?.id_no;
    const records = data?.enrollmentRecord || [];
    const program = records[records.length - 1]?.program || selectedStudent?.program || selectedStudent?.course_name;

    const selectFormat = tor => {
        if (tor === isTor) return;
        setTorReady(false);
        setFormNineReady(false);
        setChecksOpen(false);
        setIsTor(tor);
    };

    const changeStudent = () => {
        setAddingRecord(false);
        setAddingInfo(false);
        setViewRecords(false);
        selectStudent(null);
    };

    const settingsAvailable = !!selectedStudent?.id && !!data;
    const settingsVisible = settingsAvailable && settingsOpen;

    const closeSettings = () => {
        updateSettingsOpen(false);
        settingsToggleRef.current?.focus();
    };

    const resolvePrintIssue = issue => {
        setChecksOpen(false);
        if (issue.area === 'student' && !['citizenship', 'dateAdmission', 'admissionCredentials', 'dateGraduation', 'major', 'spouse'].includes(issue.field)) { setAddingInfo(true); return; }
        if (issue.id === 'records-empty') { setAddingRecord(true); return; }
        if (issue.area === 'records') { setViewRecords(true); return; }
        updateSettingsOpen(true);
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const field = issue.field ? document.getElementById('tor-' + issue.field) : null;
            if (field) {
                const section = field.closest('details');
                if (section) section.open = true;
                field.scrollIntoView({ block: 'center' });
                field.focus();
            }
        }));
    };

    return (
        <div className="record-editor">
            <Head title={isTor ? 'Transcript of Records' : 'Permanent Record'} />
            <div className="record-commandbar print:hidden">
                <div className="record-document-actions">
                    <div className="record-format-selector" role="group" aria-label="Document format">
                        <button className='w-36' type="button" aria-pressed={!isTor} onClick={() => selectFormat(false)}>Form 9</button>
                        <button className='w-36' type="button" aria-pressed={isTor} onClick={() => selectFormat(true)}>Transcript of Records</button>
                    </div>
                </div>
            </div>
            {workspaceSaveError && <p className="m-0 text-xs text-destructive print:hidden" role="status">The layout could not be remembered in this browser.</p>}

            <section className="record-student-card print:hidden" aria-label="Selected student">
                {selectedStudent ? (
                    <>
                        <div className="record-student-identity" data-student-identity>
                            <span className="record-student-avatar" aria-hidden="true"><UserRound size={22} /></span>
                            <div className="record-identity-copy">
                                <h2>{studentName}</h2>
                                <div className="record-student-meta">
                                    <span className="record-student-id">Student ID: <strong>{studentId || (isFetching ? 'Loading...' : 'Unavailable')}</strong></span>
                                    <span className="record-student-program">{program || (isFetching ? 'Loading program...' : 'Program unavailable')}</span>
                                </div>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={changeStudent}>Change student</Button>
                        </div>
                        <div className="record-student-actions">
                            <Button type="button" className="record-academic-action" onClick={() => setAddingRecord(true)}><PlusSquareIcon size={16} aria-hidden="true" />Add Academic Record</Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button type="button" variant="outline" size="sm" aria-label="More student actions"><MoreHorizontal size={16} aria-hidden="true" /><span>More</span></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => setViewRecords(true)}><List size={16} aria-hidden="true" />View Academic Records</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => setAddingInfo(true)}><Edit size={16} aria-hidden="true" />Edit Student Info</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </>
                ) : (
                    <div className="record-student-search" ref={searchHostRef}>
                        <h2>Select a student</h2>
                        <StudentSearch onSelect={selectStudent} className="w-full" />
                    </div>
                )}
            </section>

            {data && isFetching && <p className="record-fetch-status print:hidden" role="status">Refreshing student record...</p>}
            {isError && <div role="alert" className="record-fetch-error print:hidden">Could not load the student record.<Button type="button" variant="outline" size="sm" onClick={() => refetch()}>Retry</Button></div>}

            <div className="record-workspace" ref={workspaceRef} style={{ '--record-settings-width': `${displayedSettingsWidth}px` }} data-resizing={resizingSettings || undefined}>
                {isTor && (
                    <>
                        {settingsVisible && <button type="button" className="record-settings-backdrop print:hidden" aria-label="Close settings drawer" onClick={closeSettings} />}
                        <aside id="record-settings-panel" className="record-settings-panel print:hidden" aria-labelledby="record-settings-title" data-record-sidebar data-collapsed={!settingsVisible || undefined} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); closeSettings(); } }}>
                            <h2 className={'m-0 shrink-0 ' + (settingsVisible ? 'border-b border-border' : '')}>
                                <button ref={settingsToggleRef} type="button" className={'flex min-h-12 w-full items-center justify-between gap-3 px-3 py-3 text-left text-xs font-semibold text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ' + (settingsVisible ? '' : 'lg:justify-center')}
                                    disabled={!settingsAvailable} aria-label="Document Settings" aria-expanded={settingsVisible} aria-controls="record-settings-body" title={!settingsAvailable ? 'Select a student to edit document settings.' : settingsVisible ? 'Collapse document settings' : 'Expand document settings'} onClick={() => updateSettingsOpen(!settingsVisible)}>
                                    <span id="record-settings-title" className={settingsVisible ? '' : 'lg:sr-only'}>Document Settings</span>
                                    {settingsVisible ? <PanelLeftClose size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" /> : <PanelLeftOpen size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />}
                                </button>
                            </h2>
                            <div id="record-settings-body" className="record-settings-body" hidden={!settingsVisible}>
                                {/* {storageStatus === 'saved' && <p className="mb-3 text-xs text-muted-foreground" role="status">Settings saved in this browser.</p>} */}
                                {storageStatus === 'error' && <p className="mb-3 text-xs text-destructive" role="alert">Some TOR settings could not be saved in this browser. Your current preview still works.</p>}
                                {photoBusy && <p className="mb-3 text-xs text-muted-foreground" role="status">{photoLoading ? (photoRemoving ? 'Removing student photo...' : 'Saving student photo...') : 'Loading student photo...'}</p>}
                                {photoQuery.isError && <div className="mb-3 space-y-2 text-xs text-destructive" role="alert">Could not load the saved student photo.<Button type="button" variant="outline" size="sm" onClick={() => photoQuery.refetch()}>Retry photo</Button></div>}
                                {photoError && <p className="mb-3 text-xs text-destructive" role="alert">{photoError}</p>}
                                {photoMessage && <p className="mb-3 text-xs text-muted-foreground" role="status">{photoMessage}</p>}
                                <TorOptions key={selectedStudent?.id ?? 'no-student'} options={previewOptions}
                                    onChange={next => updateTorOptions({ ...next, photoUrl: torOptionsRef.current.photoUrl })}
                                    onPhotoChange={handlePhotoChange} photoBusy={photoBusy} photoSaving={photoLoading} photoRemoving={photoRemoving} photoDisabled={!selectedStudent?.id || photoQuery.isPending || photoQuery.isFetching || photoQuery.isError}
                                    legacyPhotoAvailable={legacyPhotoAvailable} onUploadCurrentPhoto={() => handlePhotoChange(null, torOptionsRef.current.photoUrl)} />
                            </div>
                        </aside>
                        {settingsVisible && <div role="separator" tabIndex={0} aria-label="Resize settings panel" aria-orientation="vertical" aria-valuemin={MIN_SETTINGS_WIDTH} aria-valuemax={maximumSettingsWidth} aria-valuenow={displayedSettingsWidth} aria-controls="record-settings-panel" className="record-settings-resizer print:hidden"
                            onPointerDown={startSettingsResize} onPointerMove={moveSettingsResize} onPointerUp={finishSettingsResize} onPointerCancel={finishSettingsResize} onKeyDown={keyboardSettingsResize}
                            onDoubleClick={() => rememberWorkspace({ settingsWidth: changeSettingsWidth(350) })}><span aria-hidden="true" /></div>}
                    </>
                )}
                <section className="record-preview-panel" aria-label="Document preview">
                    <PaperContainer hasDocument={!!data && !!selectedStudent?.id} documentRef={documentRef} documentKey={selectedStudent?.id ?? null} format={isTor ? 'tor' : 'form9'} onPrint={() => { if (canPrint) handlePrint(); }} canPrint={canPrint} printLabel={isTor ? 'Print TOR' : 'Print Form 9'} printDisabledReason={printDisabledReason}
                        toolbarExtra={isTor && data ? ({ exitFullscreen }) => <TorPrintChecklist printingReady={canPrint} printDisabledReason={printDisabledReason} result={printChecks} open={checksOpen} onResolve={resolvePrintIssue} studentListUrl={route('student-list')} onRefresh={() => refetch()} isRefreshing={isFetching}
                            onOpenChange={async open => { if (open && !await exitFullscreen({ restoreFocus: false })) return; setChecksOpen(open); }} /> : null}>
                        <div ref={documentRef} className="record-print-content print:p-0 print:bg-white">
                            {!data && isLoading ? (
                                <div className="record-preview-placeholder" role="status">Loading record...</div>
                            ) : !data ? (
                                <div className="record-preview-placeholder">Select a student to preview {isTor ? 'the Transcript of Records' : 'Form 9'}</div>
                            ) : isTor ? (
                                <TorPaper key={selectedStudent?.id} data={data} options={previewOptions} onReadyChange={setTorReady} onPhotoFramingChange={changePhotoFraming}
                                    photoEditingDisabled={!selectedStudent?.id || photoRemoving || photoQuery.isPending || photoQuery.isFetching || photoQuery.isError}
                                    photoActions={{
                                        onPhotoChange: handlePhotoChange, fetching: photoQuery.isPending || photoQuery.isFetching, loadError: photoQuery.isError, onRetry: () => photoQuery.refetch(), photoSaving: photoLoading, photoRemoving,
                                        photoDisabled: !selectedStudent?.id || photoQuery.isPending || photoQuery.isFetching || photoQuery.isError, error: photoError, message: photoMessage
                                    }} />
                            ) : (
                                <Paper key={`${selectedStudent?.id}-${dataUpdatedAt}`} data={data} onReadyChange={setFormNineReady} />
                            )}
                        </div>
                    </PaperContainer>
                </section>
            </div>

            {addingRecord && <AddRecordDialog student={selectedStudent} open={addingRecord} onClose={setAddingRecord} />}
            {viewRecords && <ViewRecords student={selectedStudent} open={viewRecords} onClose={setViewRecords} />}
            {addingInfo && <AddStudentInfo student={selectedStudent} open={addingInfo} onClose={setAddingInfo} />}
        </div>
    );
}

Index.layout = page => <AuthenticatedLayout children={page} title="Student records" fullWidth />
