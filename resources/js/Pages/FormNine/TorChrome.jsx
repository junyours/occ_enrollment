import React from 'react';
import AppLogo from '@/Components/AppLogo';
import { joinName, namePart } from './torNames';
import TorPhotoFrame from './TorPhotoFrame';
import TorPhotoActions from './TorPhotoActions';
import './TorChrome.css';

const text = (value) => value == null ? '' : String(value);

function displayDate(value) {
    if (!value) return '';
    const dateText = text(value);
    const match = dateText.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
    if (!match) return dateText;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime())
        ? dateText
        : date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function Detail({ label, value, full = false }) {
    return (
        <div className={`tor-detail${full ? ' tor-detail-full' : ''}`}>
            <span className="tor-detail-label">{label}</span>
            <span className="tor-detail-value">{text(value) || '\u00a0'}</span>
        </div>
    );
}

export function TorHeader({ data }) {
    const information = data?.info?.information || {};
    return (
        <header className="tor-header">
            <div className="tor-college-identity">
                <AppLogo size="md" className="tor-college-logo" />
                <div className="tor-college-copy">
                    <h1>OPOL COMMUNITY COLLEGE</h1>
                    <p className="tor-college-location">Opol, Misamis Oriental</p>
                    <p className="tor-college-contact">
                        <span>opolcommunitycollege@yahoo.com</span>
                        <span>www.occ.edu.ph</span>
                    </p>
                    <h2>OFFICE OF THE REGISTRAR</h2>
                </div>
            </div>
            <h2 className="tor-document-title">OFFICIAL TRANSCRIPT OF RECORDS</h2>
            <div className="tor-student-name">
                <span className="tor-name-label">Name:</span>
                <div className="tor-name-part">
                    <strong>{joinName(information.last_name, information.suffix).toUpperCase() || '\u00a0'}</strong>
                    <span>Last Name</span>
                </div>
                <div className="tor-name-part">
                    <strong>{namePart(information.first_name).toUpperCase() || '\u00a0'}</strong>
                    <span>First Name</span>
                </div>
                <div className="tor-name-part">
                    <strong>{namePart(information.middle_name).toUpperCase() || '\u00a0'}</strong>
                    <span>Middle Name</span>
                </div>
            </div>
        </header>
    );
}

export function TorStudentDetails({ data, options, photoOptions = options, onPhotoFramingChange, photoEditingDisabled = false, photoActions }) {
    const info = data?.info || {};
    const information = info.information || {};
    const parent = info.parent || {};
    const education = info.preliminary_education || {};
    const records = data?.enrollmentRecord || [];
    const latestProgram = records[records.length - 1]?.program || '';
    const majorMatch = text(latestProgram).match(/\s+MAJOR IN\s+(.+)$/i);
    const program = text(latestProgram).replace(/\s+MAJOR IN\s+.+$/i, '');
    const father = joinName(parent.father_first_name, parent.father_middle_name, parent.father_last_name, parent.father_suffix);
    const mother = joinName(parent.mother_first_name, parent.mother_middle_name, parent.mother_maiden_last_name, parent.mother_suffix);
    return (
        <section className="tor-student-details" aria-label="Student information">
            <div className="tor-profile-grid">
                <div className="tor-profile-fields">
                    <Detail label="Date of Birth:" value={displayDate(information.birthday)} />
                    <Detail label="Sex:" value={information.gender} />
                    <Detail label="Place of Birth:" value={information.place_of_birth} full />
                    <Detail label="Name of Father:" value={father} />
                    <Detail label="Citizenship:" value={options.citizenship || information.nationality} />
                    <Detail label="Name of Mother:" value={mother} />
                    <Detail label="Civil Status:" value={information.civil_status} />
                    <Detail label="Name of Spouse:" value={options.spouse} full />
                    <Detail label="Home Address:" value={information.address} full />
                    <Detail label="Date of Admission:" value={options.dateAdmission} />
                    <Detail label="Admission Credentials:" value={options.admissionCredentials} />
                </div>
                <div className="tor-photo-and-id">
                    <div className="tor-student-photo relative group">
                        {photoOptions.photoUrl ? <TorPhotoFrame src={photoOptions.photoUrl} options={photoOptions} className="h-full w-full" onFramingChange={onPhotoFramingChange} disabled={photoEditingDisabled} label="Adjust photo on TOR" /> : <span>Photo</span>}
                        {photoActions && <TorPhotoActions photoUrl={photoOptions.photoUrl} {...photoActions} />}
                    </div>
                    <strong>{text(info.user_id_no)}</strong>
                </div>
            </div>
            <div className="tor-degree-details">
                <Detail label="Candidate for the degree of:" value={program} full />
                <Detail label="Major in:" value={options.major || majorMatch?.[1]} full />
                <Detail label="Date of Graduation:" value={displayDate(options.dateGraduation)} full />
            </div>
            <section className="tor-preliminary-education" aria-label="Record of preliminary education">
                <h3>RECORD OF PRELIMINARY EDUCATION</h3>
                <table>
                    <colgroup><col className="tor-education-level" /><col className="tor-education-school" /><col className="tor-education-address" /><col className="tor-education-year" /></colgroup>
                    <thead><tr><th aria-label="Education level" /><th>Name of School</th><th>Address</th><th>School Year</th></tr></thead>
                    <tbody>
                        <tr><th scope="row">Elementary</th><td>{text(education.elementary_name) || '\u00a0'}</td><td>{text(education.elementary_address) || '\u00a0'}</td><td>{text(education.elementary_year) || '\u00a0'}</td></tr>
                        <tr><th scope="row">Secondary</th><td>{text(education.secondary_name) || '\u00a0'}</td><td>{text(education.secondary_address) || '\u00a0'}</td><td>{text(education.secondary_year) || '\u00a0'}</td></tr>
                    </tbody>
                </table>
            </section>
        </section>
    );
}

function Signatory({ label, name, title }) {
    return (
        <div className="tor-signatory">
            <p className="tor-signatory-label">{label}</p>
            <div className="tor-signature-space" aria-hidden="true" />
            <strong className="tor-signatory-name">{text(name) || '\u00a0'}</strong>
            <p className="tor-signatory-title">{text(title) || '\u00a0'}</p>
        </div>
    );
}

export function TorFooter({ options, pageNumber, totalPages }) {
    return (
        <footer className="tor-footer border-t border-solid border-black">
            <p className="tor-grade-legend">
                <strong>Official Grades:</strong> 1.0-95%; 1.1-94%; 1.2-93%; 1.3-92%; 1.4-91%; 1.5-90%; 1.6-89%; 1.7-88%; 1.8-87%; 1.9-86%; 2.0-85%; 2.1-84%; 2.2-83%; 2.3-82%; 2.4-81%; 2.5-80%; 2.6-79%; 2.7-78%; 2.8-77%; 2.9-76%; 3.0-75%; 5.0-74% &amp; below.
            </p>
            <div className="tor-remarks">
                <strong>Remarks:</strong>
                <p className="tor-purpose">{text(options.purpose) || '\u00a0'}</p>
                {options.additionalRemarks && <p className="tor-additional-remarks">{text(options.additionalRemarks)}</p>}
            </div>
            <div className="tor-certification">
                <h3>CERTIFICATION</h3>
                <p>I hereby certify that the foregoing records of the above-named student have been verified by me, and that the true copies of the official records substantiating the same are kept in the files of the school. I also certify that this student has enrolled in this institution.</p>
                <p className="tor-seal-note">(NOT VALID WITHOUT OCC SEAL)</p>
            </div>
            <div className="tor-signatories">
                <Signatory label="Prepared By:" name={options.preparedBy} title={options.preparedByTitle} />
                <Signatory label="Checked By:" name={options.checkedBy} title={options.checkedByTitle} />
                <Signatory label="Certified Correct:" name={options.certifiedBy} title={options.certifiedByTitle} />
            </div>
            <div className="tor-issuance">
                <span>
                    Date of issuance: {new Date(options.dateIssued).toLocaleDateString('en-US')}
                </span>
                <span className="tor-page-number">{pageNumber} of {totalPages}</span>
                <span className="tor-form-revision">{options.formRevision ? `Revised on: ${options.formRevision}` : 'Revised on: \u00a0'}</span>
            </div>
        </footer>
    );
}
