import React, { useMemo, useState } from "react"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/Components/ui/card"
import { Button } from "@/Components/ui/button"

const TOP_COUNT = 8

// "City Of El Salvador" -> "El Salvador City", "City Of Malaybalay (Capital)" -> "Malaybalay City"
function displayCity(name = "") {
    const cleaned = name.replace(/\s*\(Capital\)\s*/i, "").trim()
    const match = cleaned.match(/^City Of (.+)$/i)
    return match ? `${match[1]} City` : cleaned
}

function CityRow({ label, sublabel, total, max, grandTotal, muted = false }) {
    const width = max > 0 ? Math.max((total / max) * 100, 1) : 0
    const percent = grandTotal > 0 ? (total / grandTotal) * 100 : 0

    return (
        <li className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className={`truncate ${muted ? "text-muted-foreground italic" : "font-medium"}`}>
                    {label}
                    {sublabel && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">{sublabel}</span>
                    )}
                </span>
                <span className="shrink-0 tabular-nums">
                    <span className="font-semibold">{total.toLocaleString()}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">{percent.toFixed(1)}%</span>
                </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
                <div
                    className={`h-2 rounded-full ${muted ? "bg-muted-foreground/40" : "bg-blue-500"}`}
                    style={{ width: `${width}%` }}
                />
            </div>
        </li>
    )
}

function CityCounts({ data }) {
    const [showAll, setShowAll] = useState(false)

    const { cities, unspecified, grandTotal, max } = useMemo(() => {
        const cities = (data?.cities ?? []).map((c) => ({
            ...c,
            total: Number(c.total) || 0,
        }))
        const unspecified = Number(data?.unspecified) || 0
        const grandTotal = cities.reduce((sum, c) => sum + c.total, 0) + unspecified
        const max = Math.max(unspecified, ...cities.map((c) => c.total), 0)

        return { cities, unspecified, grandTotal, max }
    }, [data])

    const visible = showAll ? cities : cities.slice(0, TOP_COUNT)
    const hiddenCount = cities.length - visible.length
    const hiddenTotal = cities.slice(TOP_COUNT).reduce((sum, c) => sum + c.total, 0)

    return (
        <Card className="col-span-full">
            <CardHeader>
                <CardTitle>Students by City</CardTitle>
            </CardHeader>
            <CardContent>
                {grandTotal === 0 ? (
                    <div className="flex min-h-[230px] items-center justify-center">
                        <p className="text-sm text-muted-foreground">No address data yet.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <ul className={`grid gap-x-10 gap-y-3 md:grid-cols-2 ${showAll ? "max-h-[420px] overflow-y-auto pr-2" : ""}`}>
                            {visible.map((c) => (
                                <CityRow
                                    key={c.city_code ?? c.city}
                                    label={displayCity(c.city)}
                                    sublabel={c.province}
                                    total={c.total}
                                    max={max}
                                    grandTotal={grandTotal}
                                />
                            ))}
                            {!showAll && hiddenCount > 0 && (
                                <CityRow
                                    label={`${hiddenCount} other ${hiddenCount === 1 ? "city" : "cities"}`}
                                    total={hiddenTotal}
                                    max={max}
                                    grandTotal={grandTotal}
                                    muted
                                />
                            )}
                            {unspecified > 0 && (
                                <CityRow
                                    label="Not specified"
                                    total={unspecified}
                                    max={max}
                                    grandTotal={grandTotal}
                                    muted
                                />
                            )}
                        </ul>

                        {cities.length > TOP_COUNT && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full md:w-auto md:mx-auto md:flex"
                                onClick={() => setShowAll((v) => !v)}
                            >
                                {showAll ? "Show top cities" : `Show all ${cities.length} cities`}
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default CityCounts
