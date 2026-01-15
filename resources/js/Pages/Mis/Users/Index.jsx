import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { router } from '@inertiajs/react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import UserDetails from './UserDetails';
import UsersTable from './UsersTable';
import AddUserDialog from './AddUserDialog';
import { userRoles } from '@/Lib/Utils';

export default function Index({ users, filters }) {
    const [selectedUser, setSelectedUser] = useState(null);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [search, setSearch] = useState(filters.search || '');
    const [searchField, setSearchField] = useState(filters.searchField || 'all');
    const [roleFilter, setRoleFilter] = useState(filters.role || 'all');

    const searchableFields = [
        { value: 'all', label: 'All Fields' },
        { value: 'user_id_no', label: 'User ID' },
        { value: 'first_name', label: 'First Name' },
        { value: 'last_name', label: 'Last Name' },
        { value: 'email', label: 'Email' },
        { value: 'user_role', label: 'Role' },
        { value: 'contact_number', label: 'Contact Number' },
    ];

    const handleSearch = () => {
        router.get(route('mis-users'), {
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
        router.get(route('mis-users'), {}, {
            preserveState: true,
            replace: true,
        });
    };

    const handlePageChange = (url) => {
        if (url) {
            router.get(url, {}, {
                preserveState: true,
                replace: true,
            });
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4">

                <div className="flex items-center justify-between">
                    {/* <h1 className="text-3xl font-bold">User Management</h1> */}
                    <Button onClick={() => setShowAddDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add User
                    </Button>
                </div>

                {/* <h1 className="text-3xl font-bold">User Management</h1> */}

                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="text-sm font-medium mb-2 block">Role Filter</label>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All roles
                                </SelectItem>
                                {userRoles().map((role) => (
                                    <SelectItem key={role.value} value={role.value}>
                                        {role.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-1">
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

                    <div className="flex-[2]">
                        <label className="text-sm font-medium mb-2 block">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                type="text"
                                placeholder={`Search by ${searchableFields.find(f => f.value === searchField)?.label.toLowerCase()}...`}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    <Button onClick={handleSearch}>
                        Search
                    </Button>

                    {(filters.search || filters.searchField || filters.role) && (
                        <Button variant="outline" onClick={handleClearSearch}>
                            Clear
                        </Button>
                    )}
                </div>
            </div>

            <UsersTable users={users} setSelectedUser={setSelectedUser} />

            {/* Pagination Controls */}
            {users.data.length > 0 && (
                <div className="flex items-center justify-between px-4">
                    <div className="text-sm">
                        Showing <span className="font-medium">{users.from}</span> to{' '}
                        <span className="font-medium">{users.to}</span> of{' '}
                        <span className="font-medium">{users.total}</span> results
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(users.prev_page_url)}
                            disabled={!users.prev_page_url}
                        >
                            Previous
                        </Button>

                        <div className="flex gap-1">
                            {users.links.slice(1, -1).map((link, index) => (
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
                            onClick={() => handlePageChange(users.next_page_url)}
                            disabled={!users.next_page_url}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            <UserDetails selectedUser={selectedUser} setSelectedUser={setSelectedUser} />
            <AddUserDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
        </div>
    );
}
Index.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;