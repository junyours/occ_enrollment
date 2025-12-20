import React from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link } from "@inertiajs/react";
import { Calendar, ChevronRight, School } from "lucide-react";

const SchoolYearCard = ({ item }) => (
  <Link
    href={route("vpaa.archives.faculty.rank", { schoolYearId: item.id })}
    className="flex items-center gap-4 p-5 transition-shadow duration-200 bg-white shadow-sm dark:bg-gray-800 rounded-xl hover:shadow-lg"
  >
    {/* Icon */}
    <div className="flex items-center justify-center p-3 bg-indigo-100 dark:bg-indigo-800 rounded-xl">
      <School className="w-6 h-6 text-indigo-700 dark:text-indigo-200" />
    </div>

    {/* Info */}
    <div className="flex-1 space-y-1">
      <p className="text-lg font-semibold text-gray-900 dark:text-white">
        {item.school_year} – {item.semester_name}
      </p>
      <p className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
        <Calendar className="w-4 h-4" /> {item.start_date} to {item.end_date}
      </p>
      <p
        className={
        "mt-1 text-xs font-semibold " +
        (item.status === "active"
        ? "text-green-600 dark:text-green-400"
        : "text-red-600 dark:text-red-400")
        }
        >
        Status: {item.status}
     </p>
    </div>

    {/* Arrow */}
    <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-300" />
  </Link>
);

export default function RankEval({ auth, schoolYears }) {
  return (
    <AuthenticatedLayout user={auth.user}>
      <Head title="Student Reports" />

      <div className="max-w-6xl px-6 py-10 mx-auto space-y-10">
        {/* Page Title */}
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Student Evaluation Records
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Browse all evaluation records by school year and semester.
          </p>
        </header>

        {/* School Year Cards */}
        {schoolYears.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No evaluations found.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {schoolYears.map((item) => (
              <SchoolYearCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
