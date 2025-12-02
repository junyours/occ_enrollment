import React, { useState, useMemo, useEffect } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage, router } from "@inertiajs/react";
import { Card, CardHeader, CardContent, CardTitle } from "@/Components/ui/card";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { Search, Trash2, Undo2, FileText, ListTree, ClipboardList } from "lucide-react";

export default function TrashPage({
  auth,
  title,
  deletedQuestions = [],
  deletedCriteria = [],
  deletedEvaluations = []
}) {
  const { props: pageProps } = usePage();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [trash, setTrash] = useState({
    questions: [],
    criteria: [],
    evaluations: []
  });

  // Toast state
  const [toast, setToast] = useState({ message: "", type: "" });

  // Centralized notification function
  const setNotification = (message, type = "success", duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), duration);
  };

  // Show server-side flash messages once on load
  useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const message = params.get('message');
  const type = params.get('type'); // success or error
  if (message) {
    setNotification(message, type || "success");
    // Clear query string so the message doesn’t show again
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}, []);


  // Initialize trash
  useEffect(() => {
    setTrash({
      questions: deletedQuestions.map(q => ({ id: q.id, title: q.text, deleted_at: q.deleted_at })),
      criteria: deletedCriteria.map(c => ({ id: c.id, title: c.title, deleted_at: c.deleted_at })),
      evaluations: deletedEvaluations.map(e => ({ id: e.id, title: e.title, deleted_at: e.deleted_at }))
    });
  }, [deletedQuestions, deletedCriteria, deletedEvaluations]);

  const iconMap = {
    questions: <ClipboardList className="w-5 h-5 text-blue-600" />,
    criteria: <ListTree className="w-5 h-5 text-green-600" />,
    evaluations: <FileText className="w-5 h-5 text-purple-600" />
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleString();

  const filteredItems = useMemo(() => {
    if (activeTab === "all") {
      const all = [
        ...trash.questions.map(i => ({ ...i, type: "questions" })),
        ...trash.criteria.map(i => ({ ...i, type: "criteria" })),
        ...trash.evaluations.map(i => ({ ...i, type: "evaluations" }))
      ];
      return all.filter(i => i.title?.toLowerCase().includes(search.toLowerCase()));
    }
    return (trash[activeTab] || []).filter(i => i.title?.toLowerCase().includes(search.toLowerCase()));
  }, [trash, activeTab, search]);

  // Handlers with notifications
  const restoreItem = (type, item) => {
    router.post("/trash/restore", { id: item.id, type }, {
      onSuccess: () => {
        setTrash(prev => ({ ...prev, [type]: prev[type].filter(i => i.id !== item.id) }));
        setNotification("Item restored successfully", "success");
      },
      onError: () => setNotification("Failed to restore item", "error")
    });
  };

  const deleteItem = (type, item) => {
  if (!window.confirm(`Are you sure you want to permanently delete this ${type}?`)) return;

  const backendType = type === "questions" ? "question" : type === "criteria" ? "criteria" : "evaluation";

  router.delete(`/trash/delete/${backendType}/${item.id}`, {
    onSuccess: (page) => {
      setTrash(prev => ({ ...prev, [type]: prev[type].filter(i => i.id !== item.id) }));
      setNotification("Item permanently deleted", "success");
    },
    onError: (errors) => {
      const errorMessage = errors?.error || "Failed to delete item";
      setNotification(errorMessage, "error");
    }
  });
};


  const restoreAll = () => {
    if (activeTab === "all") {
      router.post("/trash/restore-all", {}, {
        onSuccess: () => {
          setTrash({ questions: [], criteria: [], evaluations: [] });
          setNotification("All items restored successfully", "success");
        },
        onError: () => setNotification("Failed to restore all items", "error")
      });
    } else {
      router.post("/trash/restore-all", { type: activeTab }, {
        onSuccess: () => {
          setTrash(prev => ({ ...prev, [activeTab]: [] }));
          setNotification(`All ${activeTab} restored successfully`, "success");
        },
        onError: () => setNotification(`Failed to restore ${activeTab}`, "error")
      });
    }
  };

  const deleteAll = () => {
    if (!window.confirm(`Are you sure you want to permanently delete ${activeTab === "all" ? "all items" : `all ${activeTab}`}?`)) return;

    if (activeTab === "all") {
      router.delete("/trash/delete-all", {}, {
        onSuccess: () => {
          setTrash({ questions: [], criteria: [], evaluations: [] });
          setNotification("All items permanently deleted", "success");
        },
        onError: () => setNotification("Failed to delete all items", "error")
      });
    } else {
      router.delete("/trash/delete-all", { type: activeTab }, {
        onSuccess: () => {
          setTrash(prev => ({ ...prev, [activeTab]: [] }));
          setNotification(`All ${activeTab} permanently deleted`, "success");
        },
        onError: () => setNotification(`Failed to delete ${activeTab}`, "error")
      });
    }
  };

  return (
    <AuthenticatedLayout user={auth.user}>
      <Head title={title} />
      <div className="p-6 mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        <p className="text-sm text-gray-500">All deleted items are stored here until restored or permanently removed.</p>

        {/* Toast Notification */}
        {toast.message && (
          <div className={`fixed top-5 right-5 z-50 px-4 py-2 rounded shadow-md text-white ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
            {toast.message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200">
          {["all", "questions", "criteria", "evaluations"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-4 font-medium ${
                activeTab === tab ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600 hover:text-gray-800"
              }`}
            >
              {tab === "all" ? "All Trash" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 p-3 bg-white border rounded-md shadow-sm">
          <Search className="w-5 h-5 text-gray-500" />
          <Input
            placeholder={`Search deleted ${activeTab === "all" ? "items" : activeTab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={restoreAll}
            disabled={filteredItems.length === 0}
            className="flex items-center gap-2 text-white bg-green-600 hover:bg-green-700"
          >
            <Undo2 className="w-4 h-4" /> Restore All
          </Button>

          <Button
            onClick={deleteAll}
            disabled={filteredItems.length === 0}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Delete All
          </Button>
        </div>

        {/* Trash List */}
        <Card className="border border-red-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-red-600">
              {activeTab === "all"
                ? `All Deleted Items (${filteredItems.length})`
                : `Deleted ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} (${filteredItems.length})`}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {filteredItems.length ? (
              filteredItems.map(item => {
                const type = item.type || activeTab;
                return (
                  <div
                    key={`${type}-${item.id}`}
                    className="flex items-center justify-between p-3 bg-white border rounded-md hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      {iconMap[type]}
                      <div>
                        <p className="font-medium text-gray-800">{item.title}</p>
                        <p className="text-xs text-gray-500 capitalize">
                          {type.slice(0, -1)} • Deleted at: <span className="font-semibold text-red-600">{formatDate(item.deleted_at)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => restoreItem(type, item)} className="flex items-center gap-2">
                        <Undo2 className="w-4 h-4" /> Restore
                      </Button>

                      <Button variant="destructive" size="sm" onClick={() => deleteItem(type, item)} className="flex items-center gap-2">
                        <Trash2 className="w-4 h-4" /> Delete
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-gray-500">
                <Trash2 className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                No deleted items found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
