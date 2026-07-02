import { Card, CardContent } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import CopyButton from '@/Components/ui/CopyButton';
import UseQueryTable from '@/Components/UseQueryTable/Index';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatName } from '@/Lib/InfoUtils';
import React, { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import axios from 'axios';
import { useQueryClient } from "@tanstack/react-query";
import { toast } from 'sonner';

const SerialNumberCell = ({ row }) => {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [serialNumber, setSerialNumber] = useState(row.serial_number || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await axios.post(route('nstp-director.serial-numbering.serial-change'), {
                id: row.id,
                serialNumber: serialNumber
            });
            // FIX: Match the queryKeyPrefix from your UseQueryTable exactly
            await queryClient.invalidateQueries({
                queryKey: ['nstp-director-serial-numbering.student-list']
            });
            setIsEditing(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving serial number');
            console.error("Error saving serial number:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setSerialNumber(row.serial_number || '');
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-2">
                <Input
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="Enter Serial No."
                    className="h-8 w-full max-w-[160px]"
                    autoFocus
                />
                <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="h-8 w-8 p-0"
                >
                    {isSaving ? (
                        <span className="animate-pulse">...</span>
                    ) : (
                        <Check className="h-4 w-4" />
                    )}
                    <span className="sr-only">Save</span>
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="h-8 w-8 p-0"
                >
                    <X className="h-4 w-4 text-muted-foreground" />
                    <span className="sr-only">Cancel</span>
                </Button>
            </div>
        );
    }

    return (
        // Removed 'justify-between' from the top div
        <div className="flex items-center group gap-2 h-8">
            <div className="flex items-center gap-2">
                {row.serial_number ? (
                    <>
                        <CopyButton text={row.serial_number} size="xs" />
                        <span>{row.serial_number}</span>
                    </>
                ) : (
                    <span className="text-muted-foreground text-sm italic">No serial number</span>
                )}
            </div>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <Pencil className="h-4 w-4 text-muted-foreground" />
                <span className="sr-only">Edit</span>
            </Button>
        </div>
    );
};

const columns = [
    {
        header: 'ID Number',
        accessor: 'user_id_no',
        className: 'w-[150px]',
        render: (row) => (
            <div className="flex items-center gap-2">
                <CopyButton text={row.user_id_no} size='xs' />
                <span>{row.user_id_no}</span>
            </div>
        )
    },
    {
        header: 'Student Name',
        className: 'w-[250px]',
        render: (row) => {
            return `${formatName(row, { format: 'LFM' })}`;
        }
    },
    {
        header: 'Serial Number',
        className: 'w-[300px]',
        render: (row) => <SerialNumberCell row={row} />
    },
]

export default function Index() {
    return (
        <div>
            <Card>
                <CardContent className='pt-4'>
                    <UseQueryTable
                        queryKeyPrefix={`nstp-director-serial-numbering.student-list`}
                        routeName="student-list"
                        method="POST"
                        columns={columns}
                        limit={10}
                        searchPlaceholder="Search by ID, Name or Serial Number..."
                        tableName="Serial Numbering"
                    />
                </CardContent>
            </Card>
        </div>
    )
}

Index.layout = page => <AuthenticatedLayout children={page} title="Serial Numbering" />