import React, { useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link } from "@inertiajs/react";
import { Input } from "@/components/ui/input";
import { Folder, FileText, Search, Settings } from "lucide-react";
import { Dialog } from "@headlessui/react";

export default function Archives({ auth, title }) {
  const [search, setSearch] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const archives = [
    { title: "Evaluation Result", type: "evaluation", href: "/archives" },
    { title: "Student Evaluation List", type: "students", href: "/studarchives" },
    // { title: "Reports", type: "report", href: "/reports" },
    { title: "Faculty Ranking", type: "ranking", href: "/rankarchives" },
  ];

  const filtered = archives.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  const [categoryColors, setCategoryColors] = useState({
    evaluation: { gradientFrom: "#8B5CF6", gradientTo: "#A78BFA", badgeBg: "#EDE9FE", badgeText: "#6B21A8" },
    students: { gradientFrom: "#FACC15", gradientTo: "#FCD34D", badgeBg: "#FEF3C7", badgeText: "#B45309" },
    // report: { gradientFrom: "#3B82F6", gradientTo: "#60A5FA", badgeBg: "#DBEAFE", badgeText: "#1D4ED8" },
    ranking: { gradientFrom: "#10B981", gradientTo: "#34D399", badgeBg: "#D1FAE5", badgeText: "#065F46" },
  });

  const handleColorChange = (category, field, value) => {
    setCategoryColors((prev) => ({
      ...prev,
      [category]: { ...prev[category], [field]: value },
    }));
  };

  const typeIcons = { evaluation: Folder, students: Folder, report: FileText, statistics: FileText };

  return (
    <AuthenticatedLayout user={auth.user}>
      <Head title={title} />

      <div className="px-6 py-10 mx-auto space-y-8 max-w-7xl">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Archives Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Browse archives and configure category colors.
            </p>
          </div>
          {/* Settings Icon */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 transition rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Category Settings"
          >
            <Settings className="w-6 h-6 text-gray-700 dark:text-gray-200" />
          </button>
        </header>

        {/* Search Bar */}
        {/* <div className="flex items-center max-w-md gap-2 mt-4">
          <Search className="w-5 h-5 text-gray-400 dark:text-gray-300" />
          <Input
            placeholder="Search archives..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
        </div> */}

        {/* Grid */}
        {filtered.length === 0 ? (
          <p className="mt-4 text-gray-500 dark:text-gray-400">No archives found.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 mt-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => {
              const colors = categoryColors[item.type] || categoryColors.default || {};
              const Icon = typeIcons[item.type] || FileText;
              return (
                <Link key={item.title} href={item.href}>
                  <div className="relative overflow-hidden transition-transform duration-200 transform shadow-md rounded-xl hover:scale-105 hover:shadow-xl">
                    {/* Gradient Header */}
                    <div
                      className="flex items-center gap-3 p-4"
                      style={{ background: `linear-gradient(to right, ${colors.gradientFrom}, ${colors.gradientTo})` }}
                    >
                      <Icon className="w-6 h-6 text-white" />
                      <span className="font-semibold text-white">{item.title}</span>
                    </div>

                    {/* Content */}
                    <div className="flex justify-end p-4 bg-white dark:bg-gray-800">
                      <span
                        className="px-2 py-1 text-xs font-semibold rounded-full"
                        style={{ backgroundColor: colors.badgeBg, color: colors.badgeText }}
                      >
                        {item.type.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Settings Modal */}
        <Dialog open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-lg p-6 space-y-4 bg-white shadow-lg dark:bg-gray-800 rounded-2xl">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                Category Color Settings
              </Dialog.Title>
              {Object.keys(categoryColors).map((category) => (
                <div key={category} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <span className="w-32 font-medium text-gray-700 capitalize dark:text-gray-300">{category}</span>
                  <input
                    type="color"
                    value={categoryColors[category].gradientFrom}
                    onChange={(e) => handleColorChange(category, "gradientFrom", e.target.value)}
                    title="Gradient Start"
                  />
                  <input
                    type="color"
                    value={categoryColors[category].gradientTo}
                    onChange={(e) => handleColorChange(category, "gradientTo", e.target.value)}
                    title="Gradient End"
                  />
                  <input
                    type="color"
                    value={categoryColors[category].badgeBg}
                    onChange={(e) => handleColorChange(category, "badgeBg", e.target.value)}
                    title="Badge Background"
                  />
                  <input
                    type="color"
                    value={categoryColors[category].badgeText}
                    onChange={(e) => handleColorChange(category, "badgeText", e.target.value)}
                    title="Badge Text"
                  />
                </div>
              ))}

              <div className="mt-4 text-right">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 text-white transition bg-gray-600 rounded-md hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
}
