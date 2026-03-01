import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Separator } from '@/Components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { TabsContent } from '@/Components/ui/tabs';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { router, usePage } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import { Check, CheckCircle, ChevronLeft, ChevronRight, Circle, Edit, Loader2, Plus, Search, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import AddUpdateEvaluatorDialog from './AddUpdateEvaluatorDialog';
import { formatFullName } from '@/Lib/Utils';
import SearchBar from '@/Components/ui/SearchBar';
import axios from 'axios';
import { Skeleton } from '@/Components/ui/skeleton';
import PaginationPages from '@/Components/ui/PaginationPages';

export default function Index({ search }) {
    const [searchKey, setSearchKey] = useState(search || '');

    const getEvaluatorsData = async () => {
        const res = await axios.post('')
        return res.data
    }

    const { url } = usePage();

    const { data, isLoading, refetch, isFetching, isError } = useQuery({
        queryKey: [url],
        queryFn: getEvaluatorsData,
        staleTime: 10000 * 60,
    })

    const [evaluators, setEvaluators] = useState([]);

    useEffect(() => {
        if (data?.data) {
            setEvaluators(data.data);
        }
    }, [data]);

    const handleSearch = (value) => {
        console.log(value);

        router.get('', {
            search: value,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const { prev_page_url, next_page_url, from, to, total, links, current_page, last_page } = data || {};

    const [open, setOpen] = useState(false);

    const activeOnChange = async (id, value) => {
        setEvaluators(prev =>
            prev.map(ev => ev.id === id ? { ...ev, active: value } : ev)
        );

        await axios.post(route('nstp-director.toggle-active'), { id, value });

        setTimeout(() => {
            refetch();
        }, 3000);
    };

    const [selectedEvaluator, setSelectedEvaluator] = useState(null)

    return (
        <div>
            <Card>
                <CardHeader>
                    <CardTitle></CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                    <div className='flex justify-between gap-8'>
                        <div className='w-full'>
                            <Button onClick={() => { setOpen(true) }} variant="outline"><Plus /> Add Evaluator</Button>
                        </div>
                        <SearchBar className="w-full" onSearch={handleSearch} />
                    </div>
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className='w-44'>ID Number</TableHead>
                                    <TableHead className='w-80'>Name</TableHead>
                                    <TableHead className='w-96'>Email</TableHead>
                                    <TableHead className='w-32 text-center'>Active</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <>
                                        {
                                            [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((index) => (
                                                <TableRow key={index}>
                                                    <TableCell><Skeleton className='h-7 w-20' /></TableCell>
                                                    <TableCell><Skeleton className='h-7 w-44' /></TableCell>
                                                    <TableCell><Skeleton className='h-7 w-28' /></TableCell>
                                                    <TableCell className='flex justify-center'><Skeleton className='h-7 w-20' /></TableCell>
                                                    <TableCell ><Skeleton className='h-7 w-10' /></TableCell>
                                                </TableRow>
                                            ))
                                        }
                                    </>
                                ) : isError ? (
                                    <Alert variant="destructive">
                                        <AlertTitle>Error</AlertTitle>
                                        <AlertDescription>Failed to fetch evaluators. Please try again.</AlertDescription>
                                    </Alert>
                                ) : !evaluators || evaluators.length === 0 ? (
                                    <TableRow >
                                        <TableCell colSpan={5} className='text-center'>No Evaluators</TableCell>
                                    </TableRow>
                                ) : evaluators && evaluators.length > 0 ? (
                                    <>
                                        {evaluators.map((evaluator) => (
                                            <TableRow key={evaluator.user_id_no}>
                                                <TableCell>{evaluator.user_id_no}</TableCell>
                                                <TableCell>{formatFullName(evaluator)}</TableCell>
                                                <TableCell>{evaluator.email}</TableCell>
                                                <TableCell className='flex justify-center'>
                                                    <button
                                                        onClick={() => activeOnChange(evaluator.id, evaluator.active ? 0 : 1)}
                                                        className="group flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition-all hover:bg-slate-50 active:scale-95"
                                                    >
                                                        {evaluator.active ? (
                                                            <>
                                                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600">
                                                                    <Check className="h-3 w-3" strokeWidth={3} />
                                                                </span>
                                                                <span className="text-xs font-medium text-green-700">Active</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                                                    <Circle className="h-3 w-3 fill-current" />
                                                                </span>
                                                                <span className="text-xs font-medium text-slate-500">Inactive</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant='icon'
                                                        className='py-0 h-max flex flex-col justify-center text-green-500'
                                                        onClick={() => {
                                                            setOpen(true)
                                                            setSelectedEvaluator(evaluator)
                                                        }}
                                                    >
                                                        <Edit />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}</>
                                ) : (
                                    <></>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </CardContent>
                <CardFooter>
                    <PaginationPages data={data}/>
                </CardFooter>
            </Card>

            <AddUpdateEvaluatorDialog open={open} setOpen={setOpen} selectedEvaluator={selectedEvaluator} setSelectedEvaluator={setSelectedEvaluator} refetch={refetch} />
        </div>
    )
}

Index.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;