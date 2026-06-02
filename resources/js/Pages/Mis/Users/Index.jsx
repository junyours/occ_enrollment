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
import PaginationPages from '@/Components/ui/PaginationPages';
import SearchBar from '@/Components/ui/SearchBar';

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

                <div className="flex gap-4 justify-between">
                    <div className='flex gap-4 w-full'>
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
                    </div>
                    <div className='flex-row justify-end w-full self-end'>
                        <SearchBar
                            type="text"
                            placeholder={`Search by ${searchableFields.find(f => f.value === searchField)?.label.toLowerCase()}...`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            onClear={handleClearSearch}
                        />
                    </div>
                </div>
            </div>

            {/* Users */}
            <UsersTable users={users} setSelectedUser={setSelectedUser} />

            <PaginationPages data={users} />

            <UserDetails selectedUser={selectedUser} setSelectedUser={setSelectedUser} />
            <AddUserDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
        </div>
    );
}
Index.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;