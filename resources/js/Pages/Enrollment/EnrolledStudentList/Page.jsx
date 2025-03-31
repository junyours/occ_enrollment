"use client";

import DataTable from "@/Components/ui/DataTable";
import { formatFullName } from "@/Lib/Utils";
import { useEffect, useState } from "react";

const columns = [
    {
        accessorKey: "name",
        header: () => <div className="">Name</div>,
        cell: ({ row }) => {
            const { first_name, middle_name, last_name } = row.original;
            const formattedName = formatFullName({ first_name, middle_name, last_name });

            return <div className="font-medium">{formattedName}</div>;
        },
    },
    {
        accessorKey: "age",
        header: "Age",
    },
    {
        accessorKey: "section",
        header: "Section",
    },
];

const getData = async () => {
    return [
        {
            id: "728ed52f",
            first_name: 'BARRY',
            middle_name: 'TAROY',
            last_name: 'GEBE',
            age: 22,
            section: "A",
        },
        {
            id: "728ed52f",
            first_name: 'BARRY',
            middle_name: 'TAROY',
            last_name: 'GEBE',
            age: 22,
            section: "A",
        },
        {
            id: "728ed52f",
            first_name: 'BARRY',
            middle_name: 'TAROY',
            last_name: 'GEBE',
            age: 22,
            section: "A",
        },
        {
            id: "728ed52f",
            first_name: 'BARRY',
            middle_name: 'TAROY',
            last_name: 'GEBE',
            age: 22,
            section: "A",
        },
    ];
};

const DemoPage = () => {
    const [data, setData] = useState([]);

    useEffect(() => {
        getData().then((fetchedData) => setData(fetchedData));
    }, []);

    return (
        <div className="container mx-auto py-10">
            <DataTable columns={columns} data={data} /> {/* ✅ Ensure columns is passed */}
        </div>
    );
};

export default DemoPage;
export { DataTable };
