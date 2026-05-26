// components/UseQueryTable.jsx
import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import axios from 'axios';

import SearchBar from '@/Components/ui/SearchBar';
import DataTable from './DataTable';
import Pagination from './Pagination';
export default function UseQueryTable({
    queryKeyPrefix,
    routeName,
    routeParams = {},
    method = 'GET',
    extraData = {},
    columns,
    limit = 10,
    searchPlaceholder = "Search...",
    tableName = ''
}) {
    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);

    // Dynamic Fetcher that evaluates route names and methods automatically
    const fetchTableData = async () => {
        const url = route(routeName, routeParams);

        // Build request configuration blocks dynamically
        const config = {
            method: method.toUpperCase(),
            url: url,
        };

        // Standardizing query parameters for search and pagination
        const requestParams = {
            search: searchTerm,
            page: page,
            per_page: limit
        };

        if (config.method === 'GET') {
            config.params = { ...requestParams, ...extraData };
        } else {
            // For POST/PUT/PATCH, pass payloads via request body, and keep tracking params in URL query fields
            config.params = requestParams;
            config.data = extraData;
        }

        const response = await axios(config);

        // Map Laravel's LengthAwarePaginator payload shape
        return {
            items: response.data.data || [],
            total: response.data.total || 0,
            from: response.data.from || 0,
            to: response.data.to || 0,
            links: response.data.links || [],
            last_page: response.data.last_page || 1
        };
    };

    const { data, isLoading, isError, error, isFetching } = useQuery({
        queryKey: [queryKeyPrefix, method, routeName, routeParams, extraData, searchTerm, page],
        queryFn: fetchTableData,
        placeholderData: keepPreviousData,
        enabled: !!routeName,
        staleTime: 5 * 60 * 1000,
    });

    const handleSearch = (value) => {
        setSearchTerm(value);
        setPage(1);
    };

    const handleClear = () => {
        setSearchInput('');
        setSearchTerm('');
        setPage(1);
    };

    const totalItems = data?.total || 0;
    const totalPages = Math.ceil(totalItems / limit);

    if (isError) return <div className="p-4 text-red-500">Error: {error.message}</div>;

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center justify-between w-full">
                <div>
                    {tableName && <h2 className="text-xl font-semibold">{tableName}</h2>}
                </div>
                <div className="max-w-sm w-96">
                    <SearchBar
                        placeholder={searchPlaceholder}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onSearch={handleSearch}
                        onClear={handleClear}
                    />
                </div>
            </div>

            <DataTable
                columns={columns}
                data={data?.items}
                isLoading={isLoading}
                isFetching={isFetching}
            />

            <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                limit={limit}
                setPage={setPage}
                // Pass precalculated indices directly down to the Pagination views
                customFrom={data?.from}
                customTo={data?.to}
                data={data}
            />
        </div>
    );
}