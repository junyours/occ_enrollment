import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";

export default function Semester() {
    return <div>school-year</div>;
}

Semester.layout = (page) => <AuthenticatedLayout children={page} />;
