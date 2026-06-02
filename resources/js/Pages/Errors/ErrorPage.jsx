import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';

export default function ErrorPage() {
    const { status, title, message } = usePage().props;

    const renderDefaults = () => {
        switch (status) {
            case 403:
                return {
                    code: 403,
                    title: "Forbidden",
                    message: "You don’t have permission to access this page.",
                    color: "yellow-500"
                };
            case 404:
                return {
                    code: 404,
                    title: "Page Not Found",
                    message: "The page or resource you're looking for could not be found.",
                    color: "red-500"
                };
            case 500:
                return {
                    code: 500,
                    title: "Server Error",
                    message: "Something went wrong on our end.",
                    color: "purple-600"
                };
            default:
                return {
                    code: status || "Error",
                    title: "Oops!",
                    message: "An unexpected error has occurred.",
                    color: "gray-500"
                };
        }
    };

    const fallback = renderDefaults();
    const code = fallback.code;
    const color = fallback.color;

    return (
        <div className="min-h-full flex flex-col items-center justify-center text-center p-4">
            <h1 className={`text-6xl font-bold text-${color}`}>{code}</h1>
            <p className="text-2xl mt-4 text-gray-700">{title || fallback.title}</p>
            <p className="mt-2 text-gray-500">{message || fallback.message}</p>
            <Link
                href="/"
                className="mt-6"
            >
                <Button>
                    Go Home
                </Button>
            </Link>
        </div>
    );
}

ErrorPage.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
