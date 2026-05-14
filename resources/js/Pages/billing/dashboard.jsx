import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";

export default function Dashboard() {
    return <div>dashboard</div>;
}

Dashboard.layout = (page) => <AuthenticatedLayout children={page} />;
