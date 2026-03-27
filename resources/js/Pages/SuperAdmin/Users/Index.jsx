import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { router } from '@inertiajs/react';
import React, { useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Search, LogIn } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { Card } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import UsersTable from './UsersTable';
import { userRoles } from '@/Lib/Utils';
import PaginationPages from '@/Components/ui/PaginationPages';
import SearchBar from '@/Components/ui/SearchBar';

function Index({ users, filters }) {
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
        router.get(route('users'), {
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

        router.get(route('users'), {}, {
            preserveState: true,
            replace: true,
        });
    };

    const loginAs = (userId) => {
        router.post(`/impersonate/${userId}`);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-end justify-between w-full">
                    <div className='flex flex-col sm:flex-row gap-4 w-full md:flex-1'>
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

                    <div className="w-full md:w-auto md:min-w-[300px] mt-2 md:mt-0">
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
            </div>

            {/* DESKTOP VIEW: Standard Table */}
            <div className="hidden md:block">
                <UsersTable users={users} />
            </div>

            {/* MOBILE VIEW: Card List */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
                {users.data.length > 0 ? (
                    users.data.map((user) => (
                        <Card key={user.id} className="p-4 flex flex-col gap-3 shadow-sm">
                            <div className="flex justify-between items-start gap-2">
                                <div className="truncate">
                                    <h3 className="font-semibold text-base truncate">
                                        {user.first_name} {user.last_name}
                                    </h3>
                                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                                </div>
                                <Badge variant="secondary" className="capitalize whitespace-nowrap shrink-0">
                                    {user.user_role.replace('_', ' ')}
                                </Badge>
                            </div>

                            {user.contact_number && (
                                <p className="text-sm text-gray-600">
                                    <span className="font-medium">Contact:</span> {user.contact_number}
                                </p>
                            )}

                            <div className="mt-2 pt-3 border-t flex justify-end">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-primary"
                                    onClick={() => loginAs(user.id)}
                                >
                                    <LogIn className="h-4 w-4 mr-2" />
                                    Login As
                                </Button>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-8 text-gray-500 bg-white rounded-lg border">
                        No users found.
                    </div>
                )}
            </div>

            <PaginationPages data={users} />
        </div>
    );
}

export default Index;
Index.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;