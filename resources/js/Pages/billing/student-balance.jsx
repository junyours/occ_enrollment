import { DataTable } from "@/Components/table/data-table";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/Components/ui/sheet";
import { Card } from "@/Components/ui/card";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/Components/ui/accordion";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useMemo, useState } from "react";
import { debounce } from "lodash";
import { router } from "@inertiajs/react";
import { Plus } from "lucide-react";
import { capitalizeFirstLetter, cn } from "@/Lib/Utils";

export default function StudentBalance() {
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(1);
    const [payments, setPayments] = useState({});
    const [bulkOrNumber, setBulkOrNumber] = useState("");

    const formatCurrency = (value) =>
        new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "PHP",
        }).format(value);

    const debouncedSearchFn = useMemo(
        () => debounce((value) => setDebouncedSearch(value), 800),
        [],
    );

    const handleSearch = (value) => {
        setSearch(value);
        debouncedSearchFn(value);
    };

    const {
        data,
        isLoading,
        refetch: refetchStudentBalance,
    } = useQuery({
        queryKey: ["student-balances", page, debouncedSearch],
        queryFn: async () => {
            const res = await axios.get("/api/billing/student-balances", {
                params: { page, search: debouncedSearch },
            });
            return res.data;
        },
        enabled: !!debouncedSearch,
    });

    const { data: details, refetch: refetchStudentDetails } = useQuery({
        queryKey: ["student-details", selectedStudent?.id],
        enabled: !!selectedStudent,
        queryFn: async () => {
            const res = await axios.get(
                `/api/billing/student-balances/${selectedStudent.id}`,
            );
            return res.data;
        },
    });

    const handleSelect = (student) => {
        setSelectedStudent(student);
        setOpen(!open);
    };

    const updatePayment = (itemId, field, value) => {
        setPayments((prev) => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                [field]: value,
            },
        }));
    };

    const paySingle = async (itemId) => {
        const data = payments[itemId];

        if (!data?.or_number || !data?.amount) {
            alert("OR number and amount required");
            return;
        }

        await axios.post("/api/billing/pay-type", {
            billing_item_id: itemId,
            or_number: data.or_number,
            amount: Number(data.amount),
        });

        setPayments((prev) => ({
            ...prev,
            [itemId]: { or_number: "", amount: "" },
        }));

        refetchStudentDetails();
        refetchStudentBalance();
    };

    const payAll = async () => {
        if (!bulkOrNumber) return alert("OR number required");

        await axios.post("/api/billing/pay-all", {
            student_id: selectedStudent.id,
            or_number: bulkOrNumber,
        });

        setBulkOrNumber("");
        refetchStudentDetails();
        refetchStudentBalance();
    };

    const columns = [
        { accessorKey: "user_id_no", header: "ID Number" },
        {
            accessorKey: "student_name",
            header: "Full Name",
            cell: ({ row }) => (
                <span>{capitalizeFirstLetter(row.original.student_name)}</span>
            ),
        },
        {
            accessorKey: "total_balance",
            header: "Total Balance",
            cell: ({ row }) => (
                <span className="text-blue-600 font-semibold">
                    {formatCurrency(row.original.total_balance)}
                </span>
            ),
        },
        {
            accessorKey: "total_paid",
            header: "Total Paid",
            cell: ({ row }) => (
                <span className="text-green-600 font-semibold">
                    {formatCurrency(row.original.total_paid)}
                </span>
            ),
        },
        {
            accessorKey: "remaining_balance",
            header: "Remaining Balance",
            cell: ({ row }) => (
                <span className="text-red-600 font-semibold">
                    {formatCurrency(row.original.remaining_balance)}
                </span>
            ),
        },
        {
            accessorKey: "payment_status",
            header: "Payment Status",
            cell: ({ row }) => {
                const payment_status = row.original.payment_status;
                return (
                    <span
                        className={cn(
                            "text-xs font-medium px-2 py-1 capitalize rounded-full",
                            payment_status === "paid"
                                ? "bg-green-200/80 text-green-600"
                                : payment_status === "partial"
                                  ? "bg-yellow-200/80 text-yellow-600"
                                  : "bg-red-200/80 text-red-600",
                        )}
                    >
                        {payment_status}
                    </span>
                );
            },
        },
    ];

    const loading = search !== debouncedSearch || isLoading;

    return (
        <>
            <Card className="p-5">
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
                    setSelected={handleSelect}
                    search_placeholder="student balances"
                    button={
                        <Button
                            onClick={() =>
                                router.visit(
                                    route("billing.add.student.balance"),
                                )
                            }
                        >
                            <Plus />
                            Add
                        </Button>
                    }
                />
            </Card>

            <Sheet open={open} onOpenChange={() => handleSelect(null)}>
                <SheetContent className="overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>
                            {details?.student?.student_name}
                        </SheetTitle>
                        <SheetDescription>
                            {details?.student?.user_id_no}
                        </SheetDescription>
                    </SheetHeader>
                    <Card className="p-4 mt-4 space-y-2">
                        <h3 className="font-semibold">Bulk Pay All Items</h3>
                        <Input
                            placeholder="OR Number"
                            value={bulkOrNumber}
                            onChange={(e) => setBulkOrNumber(e.target.value)}
                        />
                        <Button onClick={payAll} className="w-full">
                            Pay All Balances
                        </Button>
                    </Card>
                    <div className="mt-5 space-y-4">
                        <Accordion type="single" collapsible>
                            {details?.school_years?.map((schoolYear) => {
                                const schoolYearTotal =
                                    schoolYear.semesters.reduce(
                                        (sum, semester) =>
                                            sum +
                                            semester.items.reduce(
                                                (itemSum, item) =>
                                                    itemSum +
                                                    Number(item.remaining || 0),
                                                0,
                                            ),
                                        0,
                                    );

                                return (
                                    <AccordionItem
                                        key={schoolYear.school_year_id}
                                        value={String(
                                            schoolYear.school_year_id,
                                        )}
                                    >
                                        {/* SCHOOL YEAR */}
                                        <AccordionTrigger>
                                            <div className="flex justify-between items-center w-full pr-4">
                                                <div>
                                                    <p className="font-semibold text-base">
                                                        {
                                                            schoolYear.school_year_name
                                                        }
                                                    </p>

                                                    <p className="text-xs text-muted-foreground">
                                                        {
                                                            schoolYear.semesters
                                                                .length
                                                        }{" "}
                                                        semester(s)
                                                    </p>
                                                </div>

                                                <span className="font-bold text-blue-600">
                                                    {formatCurrency(
                                                        schoolYearTotal,
                                                    )}
                                                </span>
                                            </div>
                                        </AccordionTrigger>

                                        <AccordionContent>
                                            {/* SEMESTERS */}
                                            <div className="space-y-4">
                                                {schoolYear.semesters.map(
                                                    (semester) => {
                                                        const semesterTotal =
                                                            semester.items.reduce(
                                                                (sum, item) =>
                                                                    sum +
                                                                    Number(
                                                                        item.remaining ||
                                                                            0,
                                                                    ),
                                                                0,
                                                            );

                                                        return (
                                                            <Card
                                                                key={
                                                                    semester.account_id
                                                                }
                                                                className="p-4"
                                                            >
                                                                {/* SEMESTER HEADER */}
                                                                <div className="flex justify-between items-center mb-4">
                                                                    <div>
                                                                        <h3 className="font-semibold">
                                                                            {
                                                                                semester.semester_name
                                                                            }
                                                                        </h3>

                                                                        <p className="text-xs text-muted-foreground">
                                                                            Semester
                                                                            Balance
                                                                        </p>
                                                                    </div>

                                                                    <span className="font-semibold text-red-600">
                                                                        {formatCurrency(
                                                                            semesterTotal,
                                                                        )}
                                                                    </span>
                                                                </div>

                                                                {/* ITEMS */}
                                                                <div className="space-y-3">
                                                                    {semester.items.map(
                                                                        (
                                                                            item,
                                                                        ) => {
                                                                            const payment =
                                                                                payments[
                                                                                    item
                                                                                        .id
                                                                                ] ||
                                                                                {};

                                                                            const isPaid =
                                                                                item.remaining <=
                                                                                0;

                                                                            const isPartial =
                                                                                item.paid >
                                                                                    0 &&
                                                                                item.remaining >
                                                                                    0;

                                                                            return (
                                                                                <div
                                                                                    key={
                                                                                        item.id
                                                                                    }
                                                                                    className="border rounded-lg p-4 space-y-3"
                                                                                >
                                                                                    {/* HEADER */}
                                                                                    <div className="flex items-center justify-between">
                                                                                        <div>
                                                                                            <h4 className="font-semibold">
                                                                                                {
                                                                                                    item
                                                                                                        .type
                                                                                                        ?.type_name
                                                                                                }
                                                                                            </h4>

                                                                                            <p className="text-xs text-muted-foreground">
                                                                                                Original:{" "}
                                                                                                {formatCurrency(
                                                                                                    item.balance,
                                                                                                )}
                                                                                            </p>
                                                                                        </div>

                                                                                        <div>
                                                                                            {isPaid && (
                                                                                                <span className="bg-green-200/80 text-green-700 text-xs px-2 py-1 rounded-full">
                                                                                                    Paid
                                                                                                </span>
                                                                                            )}

                                                                                            {isPartial && (
                                                                                                <span className="bg-yellow-200/80 text-yellow-700 text-xs px-2 py-1 rounded-full">
                                                                                                    Partial
                                                                                                </span>
                                                                                            )}

                                                                                            {!isPaid &&
                                                                                                !isPartial && (
                                                                                                    <span className="bg-red-200/80 text-red-700 text-xs px-2 py-1 rounded-full">
                                                                                                        Unpaid
                                                                                                    </span>
                                                                                                )}
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* BALANCE INFO */}
                                                                                    <div className="grid grid-cols-3 gap-3 text-sm">
                                                                                        <div className="border rounded p-2">
                                                                                            <p className="text-xs text-muted-foreground">
                                                                                                Original
                                                                                            </p>

                                                                                            <p className="font-semibold">
                                                                                                {formatCurrency(
                                                                                                    item.balance,
                                                                                                )}
                                                                                            </p>
                                                                                        </div>

                                                                                        <div className="border rounded p-2">
                                                                                            <p className="text-xs text-muted-foreground">
                                                                                                Paid
                                                                                            </p>

                                                                                            <p className="font-semibold text-green-600">
                                                                                                {formatCurrency(
                                                                                                    item.paid,
                                                                                                )}
                                                                                            </p>
                                                                                        </div>

                                                                                        <div className="border rounded p-2">
                                                                                            <p className="text-xs text-muted-foreground">
                                                                                                Remaining
                                                                                            </p>

                                                                                            <p className="font-semibold text-red-600">
                                                                                                {formatCurrency(
                                                                                                    item.remaining,
                                                                                                )}
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* INPUTS */}
                                                                                    <div className="grid grid-cols-2 gap-2">
                                                                                        <Input
                                                                                            placeholder="OR Number"
                                                                                            disabled={
                                                                                                isPaid
                                                                                            }
                                                                                            value={
                                                                                                payment.or_number ||
                                                                                                ""
                                                                                            }
                                                                                            onChange={(
                                                                                                e,
                                                                                            ) =>
                                                                                                updatePayment(
                                                                                                    item.id,
                                                                                                    "or_number",
                                                                                                    e
                                                                                                        .target
                                                                                                        .value,
                                                                                                )
                                                                                            }
                                                                                        />

                                                                                        <Input
                                                                                            type="number"
                                                                                            disabled={
                                                                                                isPaid
                                                                                            }
                                                                                            placeholder={
                                                                                                isPaid
                                                                                                    ? "Fully Paid"
                                                                                                    : `Max ${item.remaining}`
                                                                                            }
                                                                                            value={
                                                                                                payment.amount ||
                                                                                                ""
                                                                                            }
                                                                                            onChange={(
                                                                                                e,
                                                                                            ) =>
                                                                                                updatePayment(
                                                                                                    item.id,
                                                                                                    "amount",
                                                                                                    e
                                                                                                        .target
                                                                                                        .value,
                                                                                                )
                                                                                            }
                                                                                        />
                                                                                    </div>

                                                                                    {/* BUTTON */}
                                                                                    <Button
                                                                                        className="w-full"
                                                                                        disabled={
                                                                                            isPaid
                                                                                        }
                                                                                        variant={
                                                                                            isPaid
                                                                                                ? "secondary"
                                                                                                : "default"
                                                                                        }
                                                                                        onClick={() =>
                                                                                            paySingle(
                                                                                                item.id,
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        {isPaid
                                                                                            ? "Fully Paid"
                                                                                            : isPartial
                                                                                              ? "Continue Partial Payment"
                                                                                              : "Pay This Type"}
                                                                                    </Button>
                                                                                </div>
                                                                            );
                                                                        },
                                                                    )}
                                                                </div>
                                                            </Card>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}

StudentBalance.layout = (page) => <AuthenticatedLayout children={page} />;
