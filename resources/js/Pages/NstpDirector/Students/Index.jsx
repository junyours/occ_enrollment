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
import { Loader2, Search } from 'lucide-react'

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
        router.get('', {}, {
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
                        <div className='flex gap-4'>
                            <TabsList className="grid w-full grid-cols-2">
                                {/* We use asChild on the Trigger so the Link becomes the Trigger */}
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
                            <div className='w-full flex gap-2'>
                                <div className="w-full gap-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                        <Input
                                            type="text"
                                            placeholder={`Search...`}
                                            value={searchKey}
                                            onChange={(e) => setSearchKey(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>

                                <Button onClick={handleSearch}>
                                    Search
                                </Button>
                            </div>
                        </div>
                        
                        <TabsContent value="enrolled" className="mt-4">
                            <Card>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead  className='w-44'>Student ID</TableHead>
                                            <TableHead className='w-96'>Name</TableHead>
                                            <TableHead>Course</TableHead>
                                            <TableHead>NSTP Section</TableHead>
                                            <TableHead className="text-right w-36">Date Enrolled</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <>
                                                <TableRow rowSpan={10}>
                                                    <TableCell colSpan={5}>
                                                        <div className="flex flex-col items-center justify-center py-10">
                                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                                            <p className="text-sm text-muted-foreground mt-2">Loading students...</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                                {
                                                    [1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => (
                                                        <TableRow key={index}>

                                                        </TableRow>
                                                    ))
                                                }
                                            </>
                                        ) : isError ? (
                                            <Alert variant="destructive">
                                                <AlertTitle>Error</AlertTitle>
                                                <AlertDescription>Failed to fetch students. Please try again.</AlertDescription>
                                            </Alert>
                                        ) : students && students.length > 0 ? (
                                            <>
                                                {students.map((student) => (
                                                    <TableRow key={student.enrolled_student_id}>
                                                        <TableCell>{student.user_id_no}</TableCell>
                                                        <TableCell>{formatFullName(student)}</TableCell>
                                                        <TableCell>{student.course}-{student.year_level_id}{student.course_section}</TableCell>
                                                        <TableCell>{student.component_name && student.component_name.toUpperCase()}-{student.nstp_section}</TableCell>
                                                        <TableCell className="text-right">
                                                            {new Date(student.enrolled_date).toLocaleDateString('en-GB')}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}</>
                                        ) : (
                                            <></>
                                        )}
                                    </TableBody>
                                </Table>
                            </Card>
                        </TabsContent>
                        
                        <TabsContent value="not-enrolled" className="mt-4">
                            <Card>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className='w-44'>Student ID</TableHead>
                                            <TableHead className='w-96'>Name</TableHead>
                                            <TableHead>Course</TableHead>
                                            <TableHead className="text-right w-36">Contact No.</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <>
                                                <TableRow rowSpan={10}>
                                                    <TableCell colSpan={5}>
                                                        <div className="flex flex-col items-center justify-center py-10">
                                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                                            <p className="text-sm text-muted-foreground mt-2">Loading students...</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                                {
                                                    [1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => (
                                                        <TableRow key={index}>

                                                        </TableRow>
                                                    ))
                                                }
                                            </>
                                        ) : isError ? (
                                            <Alert variant="destructive">
                                                <AlertTitle>Error</AlertTitle>
                                                <AlertDescription>Failed to fetch students. Please try again.</AlertDescription>
                                            </Alert>
                                        ) : students && students.length > 0 ? (
                                            <>
                                                {students.map((student) => (
                                                    <TableRow key={student.enrolled_student_id}>
                                                        <TableCell>{student.user_id_no}</TableCell>
                                                        <TableCell>{formatFullName(student)}</TableCell>
                                                        <TableCell>{student.course}-{student.year_level_id}{student.course_section}</TableCell>
                                                        <TableCell className="text-right">
                                                            {student.contact_number}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}</>
                                        ) : (
                                            <></>
                                        )}
                                    </TableBody>
                                </Table>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </CardContent>
                <CardFooter>
                    {students.length > 0 && (
                        <div className="flex items-center justify-between px-4 w-full">
                            <div className="text-sm">
                                Showing <span className="font-medium">{from}</span> to{' '}
                                <span className="font-medium">{to}</span> of{' '}
                                <span className="font-medium">{total}</span> results
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(prev_page_url)}
                                    disabled={!prev_page_url}
                                >
                                    Previous
                                </Button>

                                <div className="flex gap-1">
                                    {links.slice(1, -1).map((link, index) => (
                                        <Button
                                            key={index}
                                            variant={link.active ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => handlePageChange(link.url)}
                                            disabled={!link.url}
                                            className="min-w-[40px]"
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(next_page_url)}
                                    disabled={!next_page_url}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardFooter>
            </Card>
        </div>
    )
}

Index.layout = page => <AuthenticatedLayout children={page} />