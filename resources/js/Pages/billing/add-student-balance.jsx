import { DataTable } from "@/components/table/data-table";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { debounce } from "lodash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";

export default function AddStudentBalance() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedStudent, setSelectedStudent] = useState(null);

    const [schoolYear, setSchoolYear] = useState("");
    const [semester, setSemester] = useState("");

    const [billingAccountId, setBillingAccountId] = useState(null);

    const [billingItems, setBillingItems] = useState([
        {
            id: null,
            type_id: "",
            balance: "",
            status: "unpaid",
            locked: false,
            paid: 0,
            remaining: 0,
        },
    ]);

    const [saving, setSaving] = useState(false);
    const [initialized, setInitialized] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | SEARCH
    |--------------------------------------------------------------------------
    */

    const debouncedSearchFn = useMemo(
        () =>
            debounce((value) => {
                setDebouncedSearch(value);
            }, 800),
        [],
    );

    const handleSearch = (value) => {
        setSearch(value);

        debouncedSearchFn(value);
    };

    useEffect(() => {
        return () => debouncedSearchFn.cancel();
    }, []);

    /*
    |--------------------------------------------------------------------------
    | FETCH STUDENTS
    |--------------------------------------------------------------------------
    */

    const fetchStudents = async ({ queryKey }) => {
        const [_key, page, search] = queryKey;

        const { data } = await axios.get("/api/billing/get/students", {
            params: {
                page,
                search,
            },
        });

        return data;
    };

    const { data, isLoading } = useQuery({
        queryKey: ["students", page, debouncedSearch],
        queryFn: fetchStudents,
        enabled: !!debouncedSearch,
    });

    /*
    |--------------------------------------------------------------------------
    | FETCH SCHOOL YEARS
    |--------------------------------------------------------------------------
    */

    const { data: schoolYears } = useQuery({
        queryKey: ["school-years"],
        queryFn: async () => {
            const res = await axios.get("/api/billing/get/school-years");

            return res.data;
        },
    });

    /*
    |--------------------------------------------------------------------------
    | FETCH SEMESTERS
    |--------------------------------------------------------------------------
    */

    const { data: semesters } = useQuery({
        queryKey: ["semesters"],
        queryFn: async () => {
            const res = await axios.get("/api/billing/get/semesters");

            return res.data;
        },
    });

    /*
    |--------------------------------------------------------------------------
    | FETCH TYPES
    |--------------------------------------------------------------------------
    */

    const { data: types } = useQuery({
        queryKey: ["billing-types"],
        queryFn: async () => {
            const res = await axios.get("/api/billing/get/types");

            return res.data;
        },
    });

    /*
    |--------------------------------------------------------------------------
    | INITIALIZE ACCOUNT
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        const initializeBilling = async () => {
            if (!selectedStudent || !schoolYear || !semester) {
                return;
            }

            try {
                setInitialized(false);

                const res = await axios.post(
                    "/api/billing/account/initialize",
                    {
                        student_id: selectedStudent.id,
                        school_year_id: schoolYear,
                        semester_id: semester,
                    },
                );

                setBillingAccountId(res.data.account.id);

                if (res.data.items && res.data.items.length > 0) {
                    setBillingItems(
                        res.data.items.map((item) => ({
                            id: item.id,
                            type_id: String(item.billing_type_id),
                            balance: String(item.balance),

                            status: item.status,
                            locked: item.locked,

                            paid: item.paid,
                            remaining: item.remaining,
                        })),
                    );
                } else {
                    setBillingItems([
                        {
                            id: null,
                            type_id: "",
                            balance: "",
                            status: "unpaid",
                            locked: false,
                            paid: 0,
                            remaining: 0,
                        },
                    ]);
                }

                setTimeout(() => {
                    setInitialized(true);
                }, 100);
            } catch (error) {
                console.log(error);
            }
        };

        initializeBilling();
    }, [selectedStudent, schoolYear, semester]);

    /*
    |--------------------------------------------------------------------------
    | AUTO SAVE
    |--------------------------------------------------------------------------
    */

    const autoSave = useMemo(
        () =>
            debounce(async (items, accountId) => {
                if (!accountId) return;

                try {
                    setSaving(true);

                    const res = await axios.post(
                        "/api/billing/items/auto-save",
                        {
                            billing_account_id: accountId,
                            items,
                        },
                    );

                    setBillingItems((prev) => {
                        let changed = false;

                        const updated = prev.map((item, index) => {
                            if (item.id) {
                                return item;
                            }

                            const newId = res.data.items?.[index]?.id;

                            if (newId) {
                                changed = true;

                                return {
                                    ...item,
                                    id: newId,
                                };
                            }

                            return item;
                        });

                        return changed ? updated : prev;
                    });
                } catch (error) {
                    console.log(error);
                } finally {
                    setSaving(false);
                }
            }, 1000),
        [],
    );

    useEffect(() => {
        if (!billingAccountId) return;

        if (!initialized) return;

        const hasValidItem = billingItems.some(
            (item) => item.type_id && item.balance,
        );

        if (!hasValidItem) return;

        autoSave(billingItems, billingAccountId);
    }, [billingItems, initialized, billingAccountId]);

    /*
    |--------------------------------------------------------------------------
    | TABLE
    |--------------------------------------------------------------------------
    */

    const loading = search !== debouncedSearch || isLoading;

    const columns = [
        {
            accessorKey: "user_id_no",
            header: "ID Number",
        },
        {
            accessorKey: "last_name",
            header: "Last Name",
        },
        {
            accessorKey: "first_name",
            header: "First Name",
        },
        {
            accessorKey: "middle_name",
            header: "Middle Name",
        },
    ];

    /*
    |--------------------------------------------------------------------------
    | ITEMS
    |--------------------------------------------------------------------------
    */

    const addItem = () => {
        setBillingItems([
            ...billingItems,
            {
                id: null,
                type_id: "",
                balance: "",
                status: "unpaid",
                locked: false,
                paid: 0,
                remaining: 0,
            },
        ]);
    };

    const updateItem = (index, field, value) => {
        setBillingItems((prev) =>
            prev.map((item, i) =>
                i === index
                    ? {
                          ...item,
                          [field]: value,
                      }
                    : item,
            ),
        );
    };

    const removeItem = async (index) => {
        const item = billingItems[index];

        try {
            if (item.id) {
                await axios.delete(`/api/billing/items/${item.id}`);
            }

            const updated = billingItems.filter((_, i) => i !== index);

            if (updated.length === 0) {
                setBillingItems([
                    {
                        id: null,
                        type_id: "",
                        balance: "",
                        status: "unpaid",
                        locked: false,
                        paid: 0,
                        remaining: 0,
                    },
                ]);

                return;
            }

            setBillingItems(updated);
        } catch (error) {
            console.log(error);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <div className="space-y-6">
            <Card className="p-5">
                <h1 className="text-xl font-semibold">
                    Add Student Balance
                </h1>
            </Card>

            <div className="flex gap-6">
                <Card className="h-fit flex-1 p-5">
                    <DataTable
                        columns={columns}
                        data={data?.data ?? []}
                        page={page}
                        lastPage={data?.last_page ?? 1}
                        setPage={setPage}
                        search={search}
                        setSearch={handleSearch}
                        isLoading={loading}
                        selected={selectedStudent?.id}
                        setSelected={setSelectedStudent}
                        search_placeholder="students"
                    />
                </Card>

                {selectedStudent && (
                    <Card className="h-fit flex-1 p-6 space-y-5">
                        <div>
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">
                                    Billing Setup
                                </h2>

                                <Badge variant="secondary">
                                    {saving
                                        ? "Saving..."
                                        : "Auto Saved"}
                                </Badge>
                            </div>

                            <Separator className="my-3" />

                            <p className="font-medium">
                                {selectedStudent.last_name},{" "}
                                {selectedStudent.first_name}
                            </p>

                            <p className="text-sm text-muted-foreground">
                                {selectedStudent.user_id_no}
                            </p>
                        </div>

                        <Select
                            value={schoolYear}
                            onValueChange={setSchoolYear}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select School Year" />
                            </SelectTrigger>

                            <SelectContent>
                                {schoolYears?.data?.map((sy) => (
                                    <SelectItem
                                        key={sy.id}
                                        value={String(sy.id)}
                                    >
                                        {sy.school_year_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={semester}
                            onValueChange={setSemester}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Semester" />
                            </SelectTrigger>

                            <SelectContent>
                                {semesters?.data?.map((sem) => (
                                    <SelectItem
                                        key={sem.id}
                                        value={String(sem.id)}
                                    >
                                        {sem.semester_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold">
                                    Billing Items
                                </h3>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={addItem}
                                >
                                    + Add Item
                                </Button>
                            </div>

                            {billingItems.map((item, index) => (
                                <div
                                    key={index}
                                    className="border rounded-lg p-3 space-y-3"
                                >
                                    <div className="flex gap-2 items-center">
                                        <Select
                                            disabled={item.locked}
                                            value={item.type_id}
                                            onValueChange={(val) =>
                                                updateItem(
                                                    index,
                                                    "type_id",
                                                    val,
                                                )
                                            }
                                        >
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="Select Type" />
                                            </SelectTrigger>

                                            <SelectContent>
                                                {types?.data?.map((t) => (
                                                    <SelectItem
                                                        key={t.id}
                                                        value={String(t.id)}
                                                    >
                                                        {t.type_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Input
                                            type="number"
                                            disabled={item.locked}
                                            placeholder="Balance"
                                            className="w-32"
                                            value={item.balance}
                                            onChange={(e) =>
                                                updateItem(
                                                    index,
                                                    "balance",
                                                    e.target.value,
                                                )
                                            }
                                        />

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            disabled={item.locked}
                                            onClick={() =>
                                                removeItem(index)
                                            }
                                        >
                                            <Trash2 />
                                        </Button>
                                    </div>

                                    {item.locked && (
                                        <div className="space-y-2">
                                            <Badge
                                                variant="secondary"
                                                className={
                                                    item.status ===
                                                    "paid"
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-yellow-100 text-yellow-700"
                                                }
                                            >
                                                {item.status === "paid"
                                                    ? "Fully Paid"
                                                    : "Partial Payment"}
                                            </Badge>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="border rounded-md p-2">
                                                    <p className="text-xs text-muted-foreground">
                                                        Paid
                                                    </p>

                                                    <p className="font-semibold text-green-600">
                                                        ₱
                                                        {Number(
                                                            item.paid,
                                                        ).toLocaleString()}
                                                    </p>
                                                </div>

                                                <div className="border rounded-md p-2">
                                                    <p className="text-xs text-muted-foreground">
                                                        Remaining
                                                    </p>

                                                    <p className="font-semibold text-red-600">
                                                        ₱
                                                        {Number(
                                                            item.remaining,
                                                        ).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}

AddStudentBalance.layout = (page) => (
    <AuthenticatedLayout children={page} />
);