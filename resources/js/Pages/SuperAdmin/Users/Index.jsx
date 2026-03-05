import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { router } from '@inertiajs/react';
import React, { useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Search, } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
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

        if (!filters.search || !filters.searchField || !filters.role) return

        router.get(route('users'), {}, {
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
        <div className="space-y-4">
            <div className="flex flex-col gap-4">
                <div className="flex gap-6 items-end justify-between">
                    <div className='flex gap-4 w-full'>
                        <div className="flex-1">
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

            {/* Users */}
            <UsersTable users={users} />

            <PaginationPages data={users} />
        </div>
    );
}

export default Index;
Index.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
