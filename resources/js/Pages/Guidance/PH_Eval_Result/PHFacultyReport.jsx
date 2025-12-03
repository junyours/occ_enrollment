import React from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link } from "@inertiajs/react";
import { Calendar, ChevronRight, School } from "lucide-react";

export default function PHFacultyReport({ auth, schoolYears }) {
  return (
    <AuthenticatedLayout user={auth.user}>
      <Head title="Evaluation Results" />

      <div className="max-w-6xl px-6 py-10 mx-auto space-y-8">
        {/* Page Title */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Evaluation Results
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View all evaluation records by School Year and Semester.
          </p>
        </div>

        {/* School Year List */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {schoolYears.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400">No evaluations found.</p>
          )}

          {schoolYears.map((item) => (
            <Link
              key={item.id + "-" + item.semester_name}
              href={route("ph.faculty.list", {
                schoolYearId: item.id,
                semester: item.semester_name,
              })}
              className="flex items-center gap-4 p-4 transition bg-white shadow dark:bg-gray-800 rounded-xl hover:shadow-md"
            >
              {/* Icon */}
              <div className="p-3 bg-indigo-100 dark:bg-indigo-800 rounded-xl">
                <School className="w-6 h-6 text-indigo-700 dark:text-indigo-200" />
              </div>

              {/* School Year Info */}
              <div className="flex-1">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {item.school_year} - {item.semester_name}
                </p>

                <p className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" /> {item.start_date} to {item.end_date}
                </p>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Status: {item.status}
                </p>
              </div>

              {/* Arrow */}
              <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-300" />
            </Link>
          ))}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
