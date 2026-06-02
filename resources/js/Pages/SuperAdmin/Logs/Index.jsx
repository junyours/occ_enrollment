import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PaginationPages from '@/Components/ui/PaginationPages';
import { formatName } from '@/Lib/InfoUtils';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/Components/ui/table";
import { Badge } from "@/Components/ui/badge";
import {
    Card,
    CardContent,
} from "@/Components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { userRoles, formatRoleName } from '@/Lib/UsersUtility';
import SearchBar from '@/Components/ui/SearchBar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import JSONFormatter from '@/Components/ui/JSONFormatter';

const getMethodBadge = (method) => {
    switch (method) {
        case 'GET':
            return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200 shadow-none border-none">GET</Badge>;
        case 'POST':
            return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200 shadow-none border-none">POST</Badge>;
        case 'PUT':
        case 'PATCH':
            return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 shadow-none border-none">{method}</Badge>;
        case 'DELETE':
            return <Badge variant="destructive" className="shadow-none">DELETE</Badge>;
        default:
            return <Badge variant="outline" className="shadow-none">{method}</Badge>;
    }
};

const getStatusBadge = (status) => {
    if (status >= 200 && status < 300) {
        return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 shadow-none">{status}</Badge>;
    }
    if (status >= 400 && status < 500) {
        return <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50 shadow-none">{status}</Badge>;
    }
    if (status >= 500) {
        return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 shadow-none">{status}</Badge>;
    }
    return <Badge variant="outline" className="shadow-none">{status}</Badge>;
};

const searchableFields = [
    { value: 'all', label: 'All Fields' },
    { value: 'created_at', label: 'Timestamp' },
    { value: 'user_id_no', label: 'User ID' },
    { value: 'first_name', label: 'First Name' },
    { value: 'last_name', label: 'Last Name' },
    { value: 'user_role', label: 'Role' },
    { value: 'method', label: 'Method' },
    { value: 'endpoint', label: 'Endpoint' },
    { value: 'ip_address', label: 'IP Address' },
    { value: 'status_code', label: 'Status Code' },
    { value: 'payload', label: 'Payload' },
];

export default function Index({ logs, filters }) {

    const [search, setSearch] = useState(filters.search || '');

    const [searchField, setSearchField] = useState(filters.searchField || 'all');
    const [roleFilter, setRoleFilter] = useState(filters.role || 'all');

    const handleSearch = () => {
        router.get(route('admin.logs.index'), {
            search: search,
            searchField: searchField,
            role: roleFilter,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleClearSearch = () => {
        setSearch('');
        setSearchField('all');
        setRoleFilter('all');

        if (!filters.search && !filters.searchField && !filters.role) return

        router.get(route('admin.logs.index'), {}, {
            preserveState: true,
            replace: true,
        });
    };

    return (
        <div className="space-y-4">
            <Head title="System Activity Logs" />
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
                    <div className='flex flex-col md:flex-row gap-4 w-full'>
                        <div className="flex-1 w-full">
                            <label className="text-sm font-medium mb-2 block">Role Filter</label>
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value='all'>All Roles</SelectItem>
                                    {userRoles().map((role) => (
                                        <SelectItem key={role.value} value={role.value}>
                                            {role.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex-1 w-full">
                            <label className="text-sm font-medium mb-2 block">Search Field</label>
                            <Select value={searchField} onValueChange={setSearchField}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {searchableFields.map((field) => (
                                        <SelectItem key={field.value} value={field.value}>
                                            {field.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <SearchBar
                        type="text"
                        placeholder={`Search by ${searchableFields.find(f => f.value === searchField)?.label.toLowerCase()}...`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onSearch={handleSearch}
                        onClear={handleClearSearch}
                    />
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[180px]">Timestamp</TableHead>
                                <TableHead>User ID</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead className="w-[100px]">Method</TableHead>
                                <TableHead>Endpoint</TableHead>
                                <TableHead className="w-[120px] text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.data.length > 0 ? (
                                logs.data.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell>
                                            {new Date(log.created_at).toLocaleString(undefined, {
                                                year: 'numeric', month: 'short', day: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </TableCell>

                                        <TableCell>
                                            {log.user_id_no}
                                        </TableCell>

                                        <TableCell>
                                            {formatName(log)}
                                        </TableCell>

                                        <TableCell>
                                            {formatRoleName(log.user_role)}
                                        </TableCell>

                                        <TableCell>
                                            {getMethodBadge(log.method)}
                                        </TableCell>

                                        <TableCell className="font-mono text-xs truncate max-w-[200px]">
                                            {log.endpoint}
                                        </TableCell>

                                        {/* New Actions Cell */}
                                        <TableCell className="pr-6 text-right">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" size="sm" className="h-8 text-xs px-3">
                                                        View Details
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                                                    <DialogHeader>
                                                        <DialogTitle>Log Details</DialogTitle>
                                                    </DialogHeader>

                                                    <div className="mt-2 space-y-6">
                                                        {/* General Details Grid */}
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                                            <div>
                                                                <span className="font-semibold text-muted-foreground block text-xs uppercase tracking-wider mb-1">User</span>
                                                                <span className="font-medium">{formatName(log)}</span>
                                                                <span className="text-xs text-muted-foreground block">ID: {log.user_id_no}</span>
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-muted-foreground block text-xs uppercase tracking-wider mb-1">Role</span>
                                                                <span>{formatRoleName(log.user_role)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-muted-foreground block text-xs uppercase tracking-wider mb-1">Timestamp</span>
                                                                <span>{new Date(log.created_at).toLocaleString()}</span>
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-muted-foreground block text-xs uppercase tracking-wider mb-1">IP Address</span>
                                                                <span className="font-mono text-xs">{log.ip_address || '-'}</span>
                                                            </div>
                                                            <div className="col-span-2 md:col-span-1">
                                                                <span className="font-semibold text-muted-foreground block text-xs uppercase tracking-wider mb-1">Method & Status</span>
                                                                <div className="flex gap-2 items-center">
                                                                    {getMethodBadge(log.method)}
                                                                    {getStatusBadge(log.status_code)}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <span className="font-semibold text-muted-foreground block text-xs uppercase tracking-wider mb-1">Endpoint</span>
                                                            <div className="p-3 border rounded-md font-mono text-xs break-all text-blue-600 dark:text-blue-400 leading-relaxed">
                                                                {log.endpoint}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <span className="font-semibold text-muted-foreground block text-xs uppercase tracking-wider mb-2">Payload Data</span>
                                                            {log.payload && Object.keys(log.payload).length > 0 ? (
                                                                <JSONFormatter data={log.payload} />
                                                            ) : (
                                                                <div className="p-6 border-2 border-dashed rounded-lg text-center text-muted-foreground italic text-sm bg-muted/20">
                                                                    No payload data for this request.
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-24 text-center">
                                        No activity logs found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pagination */}
            <div className="flex justify-end">
                <PaginationPages data={logs} />
            </div>
        </div>
    );
}

Index.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;