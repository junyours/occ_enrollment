import React, { useRef, useState } from 'react';
import { X } from 'lucide-react';
import TorPhotoFrame from './TorPhotoFrame';
import { getTorPhotoFraming, photoFramingOptions } from './torPhotoFraming';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { createTorLastPageDefaults, getNstpNoteTemplate } from './torNoteTemplates';
import './TorOptions.css';

const LAST_PAGE_DEFAULTS = createTorLastPageDefaults();
const NSTP_COMPONENTS = ['CWTS', 'ROTC', 'LTS'];

const PURPOSES = [
    'For employment purposes',
    'For board examination',
    'For further studies',
    'For transfer',
    'For scholarship',
];

function OptionField({ name, label, options, update, type = 'text', maxLength = 120, placeholder }) {
    const id = `tor-${name}`;
    return (
        <div className="min-w-0 space-y-1.5">
            <Label htmlFor={id} className="text-xs">{label}</Label>
            <Input
                id={id}
                type={type}
                value={options[name] ?? ''}
                onChange={(event) => update(name, event.target.value)}
                maxLength={maxLength}
                placeholder={placeholder}
                className="h-9 w-full min-w-0 max-w-full text-sm"
            />
        </div>
    );
}

function NoteField({ name, label, options, update, maxLength, rows = 3 }) {
    return (
        <div className="min-w-0 space-y-1.5">
            <Label htmlFor={`tor-${name}`} className="text-xs">{label}</Label>
            <textarea id={`tor-${name}`} rows={rows} maxLength={maxLength}
                value={options[name] ?? LAST_PAGE_DEFAULTS[name] ?? ''}
                onChange={event => update(name, event.target.value)}
                className="w-full min-w-0 max-w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
    );
}

export default function TorOptions({ options, onChange, onPhotoChange, photoBusy = false, photoSaving = false, photoRemoving = false, photoDisabled = false, legacyPhotoAvailable = false, onUploadCurrentPhoto }) {
    const photoInputRef = useRef(null);
    const [purposeMode, setPurposeMode] = useState(() => PURPOSES.includes(options.purpose) ? options.purpose : 'custom');
    const [nstpMode, setNstpMode] = useState(() => NSTP_COMPONENTS.includes(options.nstpComponent ?? 'CWTS') ? (options.nstpComponent ?? 'CWTS') : 'custom');
    const update = (name, value) => onChange({ ...options, [name]: value });
    const photoFraming = getTorPhotoFraming(options);
    const updatePhotoFraming = framing => onChange({ ...options, ...photoFramingOptions(framing) });
    const framingDisabled = photoDisabled || photoRemoving;

    const changePurposeMode = (value) => {
        setPurposeMode(value);
        update('purpose', value === 'custom' ? '' : value);
    };

    const changeNstpComponent = component => {
        const previousTemplate = getNstpNoteTemplate(options.nstpComponent ?? 'CWTS');
        const currentNote = options.nstpNote ?? LAST_PAGE_DEFAULTS.nstpNote;
        onChange({
            ...options, nstpComponent: component,
            nstpNote: currentNote === previousTemplate ? getNstpNoteTemplate(component) : currentNote
        });
    };

    return (
        <div className="tor-options min-w-0 max-w-full space-y-4 print:hidden">
            <div className="min-w-0 space-y-3">
                <div className="min-w-0 space-y-1.5">
                    <Label htmlFor="tor-purpose-preset" className="text-xs">Purpose</Label>
                    <select
                        id="tor-purpose-preset"
                        value={purposeMode}
                        onChange={(event) => changePurposeMode(event.target.value)}
                        className="h-9 w-full min-w-0 max-w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        {PURPOSES.map((purpose) => <option key={purpose} value={purpose}>{purpose}</option>)}
                        <option value="custom">Custom purpose</option>
                    </select>
                </div>
                {purposeMode === 'custom' && (
                    <OptionField name="purpose" label="Specify purpose" options={options} update={update} maxLength={160} placeholder="Enter the reason for issuance" />
                )}
                <OptionField name="dateIssued" label="Date issued" type="date" options={options} update={update} />
                <OptionField name="formRevision" label="Form revision" options={options} update={update} maxLength={80} placeholder="Enter form code / revision" />
            </div>

            <details className="min-w-0 rounded-md border p-3">
                <summary className="cursor-pointer text-sm font-medium">Additional student details</summary>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Enter verified details that are not available in the student record. These values apply to the selected student.</p>
                <div className="mt-3 min-w-0 space-y-3">
                    <OptionField name="citizenship" label="Citizenship" options={options} update={update} />
                    <OptionField name="spouse" label="Name of spouse" options={options} update={update} />
                    <OptionField name="dateAdmission" label="Date of admission" options={options} update={update} placeholder="For example, August 2021" />
                    <OptionField name="admissionCredentials" label="Admission credentials" options={options} update={update} />
                    <OptionField name="major" label="Major" options={options} update={update} />
                    <OptionField name="dateGraduation" label="Date of graduation" type="date" options={options} update={update} />
                    {/* <div className="min-w-0 space-y-1.5">
                        <Label htmlFor="tor-additionalRemarks" className="text-xs">Additional remarks</Label>
                        <textarea
                            id="tor-additionalRemarks"
                            rows={3}
                            value={options.additionalRemarks ?? ''}
                            onChange={(event) => update('additionalRemarks', event.target.value)}
                            maxLength={500}
                            className="w-full min-w-0 max-w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            placeholder="Optional remarks included with the purpose on every page"
                        />
                    </div> */}
                    {onPhotoChange && (
                        <>
                            {/* <div className="min-w-0 space-y-1.5"> */}
                                {/* <Label htmlFor="tor-student-photo" className="text-xs">Student photo (optional)</Label> */}
                                {/* <div className="flex min-w-0 flex-col items-start gap-2"> */}
                                    {/* <Input
                                        ref={photoInputRef}
                                        id="tor-student-photo"
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        disabled={photoBusy || photoDisabled}
                                        onChange={(event) => { const file = event.target.files?.[0]; if (file) onPhotoChange(file); event.target.value = ''; }}
                                        className="h-9 w-full min-w-0 max-w-full text-xs file:text-xs"
                                    /> */}
                                    {/* <p className="text-xs leading-relaxed text-muted-foreground">Saved privately to Google Drive for this student. PNG, JPEG, or WebP, up to 10 MB.</p> */}
                                    {/* {legacyPhotoAvailable && <>
                                        <p className="text-xs leading-relaxed text-muted-foreground">The current photo is saved only in this browser.</p>
                                        <Button type="button" variant="outline" size="sm" disabled={photoBusy || photoDisabled} onClick={onUploadCurrentPhoto}>Upload current photo</Button>
                                    </>} */}
                                    {/* {options.photoUrl && (
                                        <div className="w-full min-w-0 space-y-3" data-photo-adjuster>
                                            <div className="relative mt-1 w-32 shrink-0">
                                                <TorPhotoFrame src={options.photoUrl} options={options} alt="Student photo preview" onFramingChange={updatePhotoFraming} disabled={framingDisabled}
                                                    className="aspect-[6/7] w-full rounded-md border border-border bg-muted" />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    aria-label="Remove photo"
                                                    title="Remove photo"
                                                    disabled={photoDisabled || photoRemoving}
                                                    onClick={() => { onPhotoChange(null); if (photoInputRef.current) photoInputRef.current.value = ''; }}
                                                    className="absolute -right-2 -top-2 h-7 w-7 rounded-full bg-background shadow-sm"
                                                >
                                                    <X size={14} aria-hidden="true" />
                                                </Button>
                                            </div>
                                            <p id="tor-photo-framing-help" className="text-xs leading-relaxed text-muted-foreground">Drag the photo here or on the paper to position it. Scroll over the photo to zoom, or use the controls below. Arrow keys move a focused photo.</p>
                                            <div className="space-y-3">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between gap-2 text-xs"><Label htmlFor="tor-photo-zoom" className="text-xs">Photo zoom</Label><output htmlFor="tor-photo-zoom">{Math.round(photoFraming.zoom * 100)}%</output></div>
                                                    <input id="tor-photo-zoom" type="range" min="1" max="3" step="0.05" value={photoFraming.zoom} disabled={framingDisabled} aria-valuetext={Math.round(photoFraming.zoom * 100) + '%'}
                                                        onChange={event => updatePhotoFraming({ ...photoFraming, zoom: Number(event.target.value) })} className="block w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="tor-photo-position-x" className="text-xs">Horizontal position</Label>
                                                    <input id="tor-photo-position-x" type="range" min="0" max="100" step="1" value={photoFraming.x} disabled={framingDisabled}
                                                        onChange={event => updatePhotoFraming({ ...photoFraming, x: Number(event.target.value) })} className="block w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="tor-photo-position-y" className="text-xs">Vertical position</Label>
                                                    <input id="tor-photo-position-y" type="range" min="0" max="100" step="1" value={photoFraming.y} disabled={framingDisabled}
                                                        onChange={event => updatePhotoFraming({ ...photoFraming, y: Number(event.target.value) })} className="block w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50" />
                                                </div>
                                                <Button type="button" variant="outline" size="sm" disabled={framingDisabled} onClick={() => updatePhotoFraming({ zoom: 1, x: 50, y: 50 })}>Reset framing</Button>
                                            </div>
                                        </div>
                                    )} */}
                                    {/* {(photoSaving || photoRemoving) && (
                                        <p className="text-xs text-muted-foreground" role="status">{photoRemoving ? 'Removing photo...' : 'Saving photo...'}</p>
                                    )} */}
                                {/* </div> */}
                            {/* </div> */}
                        </>
                    )}
                </div>
            </details>

            <details className="min-w-0 rounded-md border p-3">
                <summary className="cursor-pointer text-sm font-medium">Last-page notes</summary>
                <div className="mt-3 min-w-0 space-y-3">
                    <label className="flex items-center gap-2 text-xs font-medium">
                        <input type="checkbox" checked={options.lastPageNotesEnabled === 'true'}
                            onChange={event => update('lastPageNotesEnabled', event.target.checked ? 'true' : 'false')}
                            className="h-4 w-4 rounded border-input" />
                        Include last-page notes
                    </label>
                    <p className="text-xs leading-relaxed text-muted-foreground">Appears above Official Grades on the last page. Clear any text block to leave it out.</p>
                    {options.lastPageNotesEnabled === 'true' && <>
                        <div className="space-y-1.5">
                            <Label htmlFor="tor-nstp-component" className="text-xs">NSTP component</Label>
                            <select id="tor-nstp-component" value={nstpMode}
                                onChange={event => { setNstpMode(event.target.value); changeNstpComponent(event.target.value === 'custom' ? '' : event.target.value); }}
                                className="h-9 w-full min-w-0 max-w-full rounded-md border border-input bg-background px-3 text-sm">
                                {NSTP_COMPONENTS.map(component => <option key={component} value={component}>{component}</option>)}
                                <option value="custom">Custom component</option>
                            </select>
                        </div>
                        {nstpMode === 'custom' && <OptionField name="nstpComponent" label="Specify NSTP component" options={options} update={update} />}
                        <OptionField name="nstpSerialNumber" label="NSTP serial number" options={options} update={update} />
                        <NoteField name="nstpNote" label="NSTP note" options={options} update={update} maxLength={1000} rows={4} />
                        <NoteField name="completionNote" label="Completion statement" options={options} update={update} maxLength={1500} rows={5} />
                        <p className="text-xs leading-relaxed text-muted-foreground">Degree and graduation-date placeholders use the selected student's details. You can replace the entire statement.</p>
                        <NoteField name="chedNote" label="CHED special order" options={options} update={update} maxLength={500} rows={2} />
                        <Button type="button" variant="outline" size="sm" onClick={() => onChange({
                            ...options,
                            nstpNote: getNstpNoteTemplate(options.nstpComponent ?? 'CWTS'),
                            completionNote: LAST_PAGE_DEFAULTS.completionNote,
                            chedNote: LAST_PAGE_DEFAULTS.chedNote
                        })}>Restore sample wording</Button>
                    </>}
                </div>
            </details>

            <details className="min-w-0 rounded-md border p-3">
                <summary className="cursor-pointer text-sm font-medium">Signatories</summary>
                <div className="mt-3 min-w-0 space-y-5">
                    <fieldset className="min-w-0 space-y-3">
                        <legend className="text-xs font-medium text-muted-foreground">Prepared by</legend>
                        <OptionField name="preparedBy" label="Name" options={options} update={update} />
                        <OptionField name="preparedByTitle" label="Position" options={options} update={update} />
                    </fieldset>
                    <fieldset className="min-w-0 space-y-3">
                        <legend className="text-xs font-medium text-muted-foreground">Checked by</legend>
                        <OptionField name="checkedBy" label="Name" options={options} update={update} />
                        <OptionField name="checkedByTitle" label="Position" options={options} update={update} />
                    </fieldset>
                    <fieldset className="min-w-0 space-y-3">
                        <legend className="text-xs font-medium text-muted-foreground">Certified correct</legend>
                        <OptionField name="certifiedBy" label="Name" options={options} update={update} />
                        <OptionField name="certifiedByTitle" label="Position" options={options} update={update} />
                    </fieldset>
                </div>
            </details>


        </div>
    );
}
