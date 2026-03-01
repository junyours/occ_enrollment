import { Button } from '@/Components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/Components/ui/card'
import { useSchoolYearStore } from '@/Components/useSchoolYearStore'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Link, router, usePage } from '@inertiajs/react'
import { useQuery } from '@tanstack/react-query'
import React, { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/Components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table'
import { formatFullName } from '@/Lib/Utils'
import { Input } from '@/Components/ui/input'
import { FileDown, Loader2, Search } from 'lucide-react'
import { Separator } from '@radix-ui/react-context-menu'
import axios from 'axios'
import { DownloadButton } from './DownloadButton'
import { Skeleton } from '@/Components/ui/skeleton'
import SearchBar from '@/Components/ui/SearchBar'
import PaginationPages from '@/Components/ui/PaginationPages'

export default function Index({ tab, search }) {

    const { selectedSchoolYearEntry } = useSchoolYearStore()

    const getDashboardData = async () => {
        const res = await axios.post('', {
            schoolYearId: selectedSchoolYearEntry.id,
        })
        return res.data
    }

    const [selectedTab, setSelectedTab] = useState(tab || 'enrolled');

    useEffect(() => {
        if (tab) {
            setSelectedTab(tab);
        }
    }, [tab]);

    const { url } = usePage();

    const { data, isLoading, refetch, isFetching, isError } = useQuery({
        queryKey: [url, selectedSchoolYearEntry?.id],
        queryFn: getDashboardData,
        enabled: !!selectedSchoolYearEntry?.id,
        staleTime: 10000 * 60,
    })
    const [searchKey, setSearchKey] = useState(search || '');

    const { current_page, last_page, first_page_url, prev_page_url, next_page_url, last_page_url, from, to, total, links } = data || {};
    const students = data?.data || [];

    const handlePageChange = (url) => {
        if (url) {
            router.get(url, {}, {
                preserveState: true,
                replace: true,
            });
        }
    };

    const handleSearch = () => {
        router.get('', {
            search: searchKey,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleClearSearch = () => {
        setSearchKey('');
        router.get('', { search: '' }, {
            preserveState: true,
            replace: true,
        });
    };

    return (
        <div className="w-full mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle></CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs value={selectedTab} className="w-full">
                        <div className="flex gap-4">
                            <div className="flex gap-4 w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="enrolled" asChild>
                                        <Link
                                            href={route('nstp-director.students', {
                                                tab: 'enrolled',
                                                ...(search ? { search } : {}),
                                            })}
                                            preserveState
                                            replace
                                        >
                                            Enrolled
                                        </Link>
                                    </TabsTrigger>

                                    <TabsTrigger value="not-enrolled" asChild>
                                        <Link
                                            href={route('nstp-director.students', {
                                                tab: 'not-enrolled',
                                                ...(search ? { search } : {}),
                                            })}
                                            preserveState
                                            replace
                                        >
                                            Not Enrolled
                                        </Link>
                                    </TabsTrigger>
                                </TabsList>
                                <DownloadButton selectedTab={selectedTab} selectedSchoolYearEntry={selectedSchoolYearEntry} />
                            </div>

                            <Separator aria-orientation="vertical" className="border-l" />

                            <div className="w-full flex gap-2 items-center">
                                <SearchBar
                                    type="text"
                                    placeholder="Search..."
                                    value={searchKey}
                                    onChange={(e) => setSearchKey(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    onSearch={handleSearch}
                                    onClear={handleClearSearch}
                                />
                            </div>
                        </div>

                        {/* Enrolled Tab */}
                        <TabsContent value="enrolled" className="mt-4"> 
                            <Card>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-44">Student ID</TableHead>
                                            <TableHead className="w-96">Name</TableHead>
                                            <TableHead>Course</TableHead>
                                            <TableHead>NSTP Section</TableHead>
                                            <TableHead className="text-right w-36">Date Enrolled</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {(() => {
                                            if (isLoading) {
                                                return renderSkeletonRows(["w-24", "w-52", "w-28", "w-16", "w-20"]);
                                            }

                                            if (isError) {
                                                return renderErrorRow(5);
                                            }

                                            if (!students?.length) {
                                                return renderEmptyRow(5, "No enrolled students found.");
                                            }

                                            return students.map((student) => (
                                                <TableRow key={student.enrolled_student_id}>
                                                    <TableCell>{student.user_id_no ?? "-"}</TableCell>
                                                    <TableCell>{formatFullName(student)}</TableCell>
                                                    <TableCell>
                                                        {student.course}-{student.year_level_id}
                                                        {student.course_section}
                                                    </TableCell>
                                                    <TableCell>
                                                        {student.component_name
                                                            ? `${student.component_name.toUpperCase()}-${student.nstp_section}`
                                                            : "-"}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {formatDate(student.enrolled_date)}
                                                    </TableCell>
                                                </TableRow>
                                            ));
                                        })()}
                                    </TableBody>
                                </Table>
                            </Card>
                        </TabsContent>

                        {/* Not Enrolled Tab */}
                        <TabsContent value="not-enrolled" className="mt-4">
                            <Card>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-44">Student ID</TableHead>
                                            <TableHead className="w-96">Name</TableHead>
                                            <TableHead>Course</TableHead>
                                            <TableHead className="text-right w-36">Contact No.</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {(() => {
                                            if (isLoading) {
                                                return renderSkeletonRows(["w-24", "w-52", "w-28", "w-20"]);
                                            }

                                            if (isError) {
                                                return renderErrorRow(4);
                                            }

                                            if (!students?.length) {
                                                return renderEmptyRow(4, "No students found.");
                                            }

                                            return students.map((student) => (
                                                <TableRow key={student.enrolled_student_id}>
                                                    <TableCell>{student.user_id_no}</TableCell>
                                                    <TableCell>{formatFullName(student)}</TableCell>
                                                    <TableCell>
                                                        {student.course}-{student.year_level_id}
                                                        {student.course_section}
                                                    </TableCell>
                                                    <TableCell className="text-right">{student.contact_number ?? "-"}</TableCell>
                                                </TableRow>
                                            ));
                                        })()}
                                    </TableBody>
                                </Table>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </CardContent>

                <CardFooter>
                    <PaginationPages data={data} />
                </CardFooter>
            </Card>
        </div>

    )
}

const renderSkeletonRows = (cols) =>
    [...Array(10)].map((_, index) => (
        <TableRow key={`skeleton-${index}`}>
            {cols.map((width, i) => (
                <TableCell key={i} className={i === cols.length - 1 ? "text-right" : ""}>
                    <Skeleton className={`h-5 ${width}`} />
                </TableCell>
            ))}
        </TableRow>
    ));

const renderErrorRow = (colSpan) => (
    <TableRow>
        <TableCell colSpan={colSpan}>
            <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                    Failed to fetch students. Please try again.
                </AlertDescription>
            </Alert>
        </TableCell>
    </TableRow>
);

const renderEmptyRow = (colSpan, message) => (
    <TableRow>
        <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-6">
            {message}
        </TableCell>
    </TableRow>
);

const formatDate = (date) => date ? new Date(date).toLocaleDateString("en-GB") : "-";


Index.layout = page => <AuthenticatedLayout children={page} />