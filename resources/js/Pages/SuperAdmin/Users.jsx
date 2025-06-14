import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import React, { useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Badge } from '@/Components/ui/badge';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatFullName } from '@/Lib/Utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { LogIn } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/Components/ui/tooltip';

function Users({ users, filters }) {
    const [search, setSearch] = useState(filters.search || '');
    const [role, setRole] = useState(filters.role || '');

    const handleSearch = (e) => {
        e.preventDefault();
        router.get('/users', { search, role }, {
            preserveState: true,
            replace: true
        });
    };

    const handleReset = () => {
        setSearch('');
        setRole('');
        router.get('/users', {}, {
            preserveState: true,
            replace: true
        });
    };

    const getRoleVariant = (role) => {
        switch (role) {
            case 'faculty':
                return 'default';
            case 'student':
                return 'secondary';
            case 'program_head':
                return 'destructive';
            case 'evaluator':
                return 'outline';
            case 'registrar':
                return 'default';
            default:
                return 'outline';
        }
    };

    const formatRoleName = (role) => {
        switch (role) {
            case 'program_head':
                return 'Program Head';
            case 'faculty':
                return 'Faculty';
            case 'student':
                return 'Student';
            case 'evaluator':
                return 'Evaluator';
            case 'registrar':
                return 'Registrar';
            default:
                return role;
        }
    };

    const loginAs = (user) => {
        router.post(`/impersonate/${user.id}`);
    };

    return (
        <div>
            <Head title='Users'/>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">Users</CardTitle>
                    <CardDescription>
                        View all users in the system
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Search Form */}
                    <form onSubmit={handleSearch} className="mb-6">
                        <div className="flex gap-2 flex-wrap">
                            <div className="relative flex-1 min-w-[240px]">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search users by name or email..."
                                    className="pl-10"
                                />
                            </div>

                            <Select value={role || 'all'} onValueChange={(val) => setRole(val === 'all' ? '' : val)}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="All Roles" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Roles</SelectItem>
                                    <SelectItem value="program_head">Program Head</SelectItem>
                                    <SelectItem value="registrar">Registrar</SelectItem>
                                    <SelectItem value="evaluator">Evaluator</SelectItem>
                                    <SelectItem value="faculty">Faculty</SelectItem>
                                    <SelectItem value="student">Student</SelectItem>
                                </SelectContent>
                            </Select>


                            <Button type="submit" variant="default">
                                Search
                            </Button>
                            {(search || role) && (
                                <Button type="button" onClick={handleReset} variant="outline">
                                    <X className="h-4 w-4 mr-2" />
                                    Reset
                                </Button>
                            )}
                        </div>
                    </form>


                    {/* Users Table */}
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>User Role</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.data.length > 0 ? (
                                    users.data.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">
                                                {formatFullName(user)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getRoleVariant(user.user_role)}>
                                                    {formatRoleName(user.user_role)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" className="h-max" size="icon" onClick={() => loginAs(user)}>
                                                                <LogIn  />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            Login as
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                            No users found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    <div className="mt-6 flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                            Showing{' '}
                            <span className="font-medium">{users.from || 0}</span>
                            {' '}to{' '}
                            <span className="font-medium">{users.to || 0}</span>
                            {' '}of{' '}
                            <span className="font-medium">{users.total}</span>
                            {' '}results
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Previous Button */}
                            {users.prev_page_url ? (
                                <Button asChild variant="outline" size="sm">
                                    <Link href={users.prev_page_url}>
                                        <ChevronLeft className="h-4 w-4 mr-2" />
                                        Previous
                                    </Link>
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" disabled>
                                    <ChevronLeft className="h-4 w-4 mr-2" />
                                    Previous
                                </Button>
                            )}

                            {/* Page Numbers */}
                            <div className="flex items-center gap-1">
                                {users.links.slice(1, -1).map((link, index) => (
                                    link.url ? (
                                        <Button
                                            key={index}
                                            asChild
                                            variant={link.active ? "default" : "outline"}
                                            size="sm"
                                            className="min-w-[2.5rem]"
                                        >
                                            <Link
                                                href={link.url}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        </Button>
                                    ) : (
                                        <Button
                                            key={index}
                                            variant="outline"
                                            size="sm"
                                            disabled
                                            className="min-w-[2.5rem]"
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    )
                                ))}
                            </div>

                            {/* Next Button */}
                            {users.next_page_url ? (
                                <Button asChild variant="outline" size="sm">
                                    <Link href={users.next_page_url}>
                                        Next
                                        <ChevronRight className="h-4 w-4 ml-2" />
                                    </Link>
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" disabled>
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default Users;
Users.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
