import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table';
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Download,
    Mail,
    Phone,
    Search,
    SearchX,
    Users,
    X,
} from 'lucide-react';
import { formatName } from '@/Lib/InfoUtils';
import StudentListSkeleton from './StudentListSkeleton';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const text = (value) => String(value ?? '').trim();

function prepareStudents(students) {
    return (Array.isArray(students) ? students : []).map((student, index) => {
        const name = text(formatName(student, { format: 'LFM' })) || 'Unnamed student';
        const id = text(student.user_id_no);
        const email = text(student.email_address);
        const contact = text(student.contact_number);
        const phone = contact.replace(/[^+\d]/g, '');

        return {
            key: student.id ?? (id || index),
            name,
            id,
            email,
            contact,
            gender: text(student.gender),
            emailHref: email ? 'mailto:' + encodeURIComponent(email) : undefined,
            phoneHref: /\d/.test(phone) ? 'tel:' + phone : undefined,
            searchText: [name, id, email, contact, phone].join(' ').toLowerCase(),
        };
    });
}

function filterStudents(students, searchTerm) {
    const terms = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return students;

    return students.filter((student) =>
        terms.every((term) => student.searchText.includes(term)),
    );
}

function getPagination(total, pageSize, requestedPage) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(1, requestedPage), totalPages);
    const startIndex = (page - 1) * pageSize;

    return { page, totalPages, startIndex, endIndex: Math.min(startIndex + pageSize, total) };
}

function ContactDetail({ icon: Icon, label, value, href, mobile = false }) {
    const Element = href ? 'a' : 'div';

    return (
        <Element
            href={href}
            className={[
                'flex min-w-0 items-center gap-2.5 rounded-md text-sm',
                mobile ? 'min-h-[44px] px-2 py-2' : 'py-1',
                href
                    ? 'text-foreground/80 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    : 'text-muted-foreground',
            ].join(' ')}
        >
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 [overflow-wrap:anywhere]">
                <span className={mobile ? 'mb-0.5 block text-xs text-muted-foreground' : 'sr-only'}>
                    {label}{mobile ? '' : ': '}
                </span>
                <span>{value || 'Not provided'}</span>
            </span>
        </Element>
    );
}

function EmptyState({ hasSearch, onClear }) {
    const Icon = hasSearch ? SearchX : Users;

    return (
        <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <Icon aria-hidden="true" className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold">
                {hasSearch ? 'No matching students' : 'No students yet'}
            </h3>
            <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {hasSearch
                    ? 'Try a different name, ID number, email, or contact number.'
                    : 'Student records will appear here when they are available.'}
            </p>
            {hasSearch && (
                <Button type="button" variant="outline" size="sm" className="mt-5" onClick={onClear}>
                    Clear search
                </Button>
            )}
        </div>
    );
}

export default function StudentList({ students = [], isLoading = false, nameClass }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const searchRef = useRef(null);
    const instanceId = useId();

    const studentRows = useMemo(() => prepareStudents(students), [students]);
    const filteredStudents = useMemo(
        () => filterStudents(studentRows, searchTerm),
        [studentRows, searchTerm],
    );

    const { page, totalPages, startIndex, endIndex } = getPagination(
        filteredStudents.length,
        itemsPerPage,
        currentPage,
    );
    const currentStudents = filteredStudents.slice(startIndex, endIndex);
    const hasSearch = Boolean(searchTerm.trim());

    // Clamp immediately for rendering, then reconcile stored state when data shrinks.
    // Ignore temporary empty data while the parent is loading.
    useEffect(() => {
        if (!isLoading) setCurrentPage(page);
    }, [isLoading, page]);

    const clearSearch = () => {
        setSearchTerm('');
        setCurrentPage(1);
        searchRef.current?.focus();
    };

    const downloadStudents = () => {
        if (!studentRows.length) {
            toast.error('No students to download');
            return;
        }

        try {
            // Export all students, matching the original component's behavior.
            const excelData = studentRows.map((student, index) => ({
                'No.': index + 1,
                'ID Number': student.id || 'N/A',
                Name: student.name,
                Email: student.email || 'N/A',
                'Contact Number': student.contact || 'N/A',
                Gender: student.gender || 'N/A',
            }));

            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            worksheet['!cols'] = [
                { wch: 6 },
                { wch: 18 },
                { wch: 38 },
                { wch: 34 },
                { wch: 20 },
                { wch: 14 },
            ];

            const classLabel = text(nameClass).replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').trim() || 'Class';
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
            XLSX.writeFile(workbook, classLabel + ' - Students_List.xlsx');
            toast.success('Exported ' + studentRows.length + ' students');
        } catch (error) {
            console.error('Student export failed:', error);
            toast.error('Unable to export students. Please try again.');
        }
    };

    if (isLoading) {
        return (
            <div role="status" aria-busy="true">
                <span className="sr-only">Loading students…</span>
                <div aria-hidden="true"><StudentListSkeleton /></div>
            </div>
        );
    }

    return (
        <Card className="w-full min-w-0 gap-0 overflow-hidden rounded-2xl py-0 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Users aria-hidden="true" className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-semibold tracking-tight">Students</h2>
                            <Badge variant="secondary" className="rounded-full px-2 font-medium tabular-nums">
                                {studentRows.length}
                            </Badge>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                            {text(nameClass) || 'Class roster and contact details'}
                        </p>
                    </div>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={downloadStudents}
                    disabled={!studentRows.length}
                    title="Download all students as an Excel file"
                    className="min-h-[44px] w-full gap-2 sm:w-auto"
                >
                    <Download aria-hidden="true" className="h-4 w-4" />
                    Export all
                </Button>
            </div>

            <div className="flex flex-col gap-3 border-y bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full min-w-0 sm:max-w-md">
                    <Label htmlFor={instanceId + '-search'} className="sr-only">
                        Search students by name, ID, email, or phone
                    </Label>
                    <Search
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                        ref={searchRef}
                        id={instanceId + '-search'}
                        type="search"
                        autoComplete="off"
                        placeholder="Search name, ID, email, or phone…"
                        value={searchTerm}
                        onChange={(event) => {
                            setSearchTerm(event.target.value);
                            setCurrentPage(1);
                        }}
                        className="h-11 rounded-lg bg-background pl-10 pr-11 [&::-webkit-search-cancel-button]:appearance-none"
                    />
                    {searchTerm && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Clear student search"
                            onClick={clearSearch}
                            className="absolute right-0 top-0 h-11 w-11 rounded-l-none rounded-r-lg text-muted-foreground hover:text-foreground"
                        >
                            <X aria-hidden="true" className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                    <Label htmlFor={instanceId + '-page-size'} className="text-sm font-normal text-muted-foreground">
                        Rows per page
                    </Label>
                    <Select
                        value={String(itemsPerPage)}
                        onValueChange={(value) => {
                            setItemsPerPage(Number(value));
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger
                            id={instanceId + '-page-size'}
                            className="h-11 min-h-[44px] w-[88px] rounded-lg bg-background"
                        >
                            <SelectValue placeholder="Rows" />
                        </SelectTrigger>
                        <SelectContent position="popper" align="end">
                            {[10, 25, 50].map((count) => (
                                <SelectItem key={count} value={String(count)}>
                                    {count}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <p role="status" className="sr-only">
                {filteredStudents.length} {hasSearch ? 'matching students' : 'students'}.
            </p>

            {!filteredStudents.length ? (
                <EmptyState hasSearch={hasSearch} onClear={clearSearch} />
            ) : (
                <>
                    <div className="hidden md:block">
                        <Table className="w-full min-w-[620px] table-fixed">
                            <caption className="sr-only">
                                {text(nameClass) ? 'Students in ' + text(nameClass) : 'Student roster'}
                            </caption>
                            <TableHeader>
                                <TableRow className="bg-muted/40 hover:bg-muted/40">
                                    <TableHead scope="col" className="h-11 w-14 text-center text-xs">No.</TableHead>
                                    <TableHead scope="col" className="h-11 w-[38%] text-xs">Student</TableHead>
                                    <TableHead scope="col" className="h-11 text-xs">Contact details</TableHead>
                                    <TableHead scope="col" className="h-11 w-28 text-xs">Gender</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentStudents.map((student, index) => (
                                    <TableRow key={student.key} className="transition-colors hover:bg-muted/30">
                                        <TableCell className="py-4 text-center align-top text-xs tabular-nums text-muted-foreground">
                                            {startIndex + index + 1}
                                        </TableCell>
                                        <TableCell className="whitespace-normal py-4 align-top">
                                            <p className="font-medium leading-6 text-foreground [overflow-wrap:anywhere]">
                                                {student.name}
                                            </p>
                                            <p className="mt-1 font-mono text-xs leading-5 text-muted-foreground [overflow-wrap:anywhere]">
                                                ID: {student.id || 'Not provided'}
                                            </p>
                                        </TableCell>
                                        <TableCell className="whitespace-normal py-3 align-top">
                                            <ContactDetail icon={Mail} label="Email" value={student.email} href={student.emailHref} />
                                            <ContactDetail icon={Phone} label="Contact number" value={student.contact} href={student.phoneHref} />
                                        </TableCell>
                                        <TableCell className="whitespace-normal py-4 align-top">
                                            <Badge variant="secondary" className="max-w-full whitespace-normal rounded-full px-2.5 py-1 text-xs font-normal [overflow-wrap:anywhere]">
                                                {student.gender || 'Not set'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <ul className="m-0 grid list-none gap-3 bg-muted/10 p-3 md:hidden">
                        {currentStudents.map((student, index) => (
                            <li key={student.key} className="overflow-hidden rounded-xl border bg-card">
                                <div className="flex items-start gap-3 p-4">
                                    <div
                                        aria-label={'Student ' + (startIndex + index + 1)}
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold tabular-nums text-primary"
                                    >
                                        {String(startIndex + index + 1).padStart(2, '0')}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-base font-semibold leading-snug [overflow-wrap:anywhere]">
                                            {student.name}
                                        </h3>
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <span className="min-w-0 font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">
                                                ID: {student.id || 'Not provided'}
                                            </span>
                                            {student.gender && (
                                                <Badge variant="secondary" className="max-w-full whitespace-normal rounded-full text-xs font-normal [overflow-wrap:anywhere]">
                                                    {student.gender}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t bg-muted/20 px-2 py-1">
                                    <ContactDetail mobile icon={Mail} label="Email" value={student.email} href={student.emailHref} />
                                    <ContactDetail mobile icon={Phone} label="Contact number" value={student.contact} href={student.phoneHref} />
                                </div>
                            </li>
                        ))}
                    </ul>

                    <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 lg:flex-row">
                        <p className="text-center text-sm tabular-nums text-muted-foreground lg:text-left">
                            Showing <span className="font-medium text-foreground">{startIndex + 1}–{endIndex}</span>
                            {' '}of <span className="font-medium text-foreground">{filteredStudents.length}</span>
                            {hasSearch ? ' matches' : ' students'}
                        </p>

                        <nav aria-label="Student pagination" className="flex items-center gap-1.5">
                            <Button type="button" variant="outline" size="icon" className="hidden h-11 w-11 sm:inline-flex" aria-label="First page" title="First page" disabled={page === 1} onClick={() => setCurrentPage(1)}>
                                <ChevronsLeft aria-hidden="true" className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="outline" size="icon" className="h-11 w-11" aria-label="Previous page" title="Previous page" disabled={page === 1} onClick={() => setCurrentPage(page - 1)}>
                                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                            </Button>
                            <span className="px-2 text-sm tabular-nums text-muted-foreground">
                                <span className="font-medium text-foreground">{page}</span> / {totalPages}
                                <span className="sr-only"> pages</span>
                            </span>
                            <Button type="button" variant="outline" size="icon" className="h-11 w-11" aria-label="Next page" title="Next page" disabled={page === totalPages} onClick={() => setCurrentPage(page + 1)}>
                                <ChevronRight aria-hidden="true" className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="outline" size="icon" className="hidden h-11 w-11 sm:inline-flex" aria-label="Last page" title="Last page" disabled={page === totalPages} onClick={() => setCurrentPage(totalPages)}>
                                <ChevronsRight aria-hidden="true" className="h-4 w-4" />
                            </Button>
                        </nav>
                    </div>
                </>
            )}
        </Card>
    );
}

