import { Button } from '@/Components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/Components/ui/alert-dialog";

import { Card, CardContent } from '@/Components/ui/card'
import CopyButton from '@/Components/ui/CopyButton';
import UseQueryTable from '@/Components/UseQueryTable/Index'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { formatName } from '@/Lib/InfoUtils';
import { router } from '@inertiajs/react';
import React from 'react'
import { toast } from 'sonner';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';

export default function NotEnrolledIndex() {

    const queryClient = useQueryClient();

    const deleteStudent = (student) => {
        let cancelled = false;

        const toastId = toast.warning(
            `Delete ${formatName(student, { format: 'LFM' })}?`,
            {
                description: "This action cannot be undone.",
                duration: 5000,
                action: {
                    label: "Undo",
                    onClick: () => {
                        cancelled = true;
                        toast.dismiss(toastId);
                        toast.info("Deletion cancelled.");
                    },
                },
            }
        );

        setTimeout(async () => {
            if (!cancelled) {
                try {
                    await axios.delete(route('not-enrolled-student.destroy'), {
                        data: {
                            studentId: student.id
                        }
                    });

                    toast.success("Student permanently deleted.");

                    queryClient.invalidateQueries({
                        queryKey: ['not-enrolled-list']
                    });

                } catch (error) {
                    toast.error(error.response?.data?.message ?? "Delete failed");
                }
            }
        }, 5000);
    };


    const columns = [
        {
            header: 'STUDENT ID',
            accessor: 'user_id_no',
            render: (row) => (
                <div>
                    <CopyButton text={row.user_id_no} size='xs' />
                    <span>{row.user_id_no}</span>
                </div>
            )
        },
        {
            header: 'NAME',
            render: (row) => {
                return `${formatName(row, { format: 'LFM' })}`;
            }
        },
        {
            header: 'EMAIL',
            accessor: 'email'
        },
        {
            header: 'MOBILE',
            accessor: 'contact_number'
        },
        {
            header: 'ACTION',
            render: (row) => (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                            Delete
                        </Button>
                    </AlertDialogTrigger>

                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Delete student permanently?
                            </AlertDialogTitle>

                            <AlertDialogDescription>
                                This will permanently remove this student
                                from the system. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter>
                            <AlertDialogCancel>
                                Cancel
                            </AlertDialogCancel>

                            <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteStudent(row)}
                            >
                                Permanently Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )
        },
    ];

    return (
        <Card>
            <CardContent className='pt-4'>
                <UseQueryTable
                    queryKeyPrefix={`not-enrolled-list`}
                    routeName="not-enrolled-list"
                    method="POST"
                    columns={columns}
                    limit={10}
                    searchPlaceholder="Search by ID, Name..."
                    tableName="Not Enrolled List"
                />
            </CardContent>
        </Card>
    )
}

NotEnrolledIndex.layout = (page) => (
    <AuthenticatedLayout children={page} />
)