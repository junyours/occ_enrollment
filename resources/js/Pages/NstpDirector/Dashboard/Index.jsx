import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useSchoolYearStore } from '@/Components/useSchoolYearStore'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import axios from 'axios'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
    Users,
    LayoutGrid,
    UserCheck,
    AlertCircle,
    FilterX,
    Search
} from 'lucide-react'
import { Input } from '@/components/ui/input'

// Animation Variants
const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
}

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 }
}

export default function Index() {
    const { selectedSchoolYearEntry } = useSchoolYearStore()
    const [selectedComponent, setSelectedComponent] = useState(null)
    const [searchTerm, setSearchTerm] = useState("")

    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['nstp-director.dashboard', selectedSchoolYearEntry?.id],
        queryFn: async () => {
            const res = await axios.post('', {
                schoolYearId: selectedSchoolYearEntry.id,
            })
            return res.data
        },
        enabled: !!selectedSchoolYearEntry?.id,
    })

    // Logic for Drill-down Filtering

    const filteredStats = useMemo(() => {
        if (!data) return { sections: [], gender: [] };

        // Filter sections by BOTH the selected component and the search term
        const filteredSections = data.sections.filter(s => {
            // We use .toLowerCase() to prevent "LTS" vs "lts" mismatches
            const matchesComponent = !selectedComponent ||
                s.component_name.toLowerCase() === selectedComponent.toLowerCase();

            const matchesSearch = s.section.toLowerCase().includes(searchTerm.toLowerCase());

            return matchesComponent && matchesSearch;
        });

        // 2. Filter Gender data based on selectedComponent
        let filteredGender = data.gender;
        if (selectedComponent) {
            filteredGender = data.gender.filter(g => g.component_name === selectedComponent);
        }

        return { sections: filteredSections, gender: filteredGender };
    }, [data, selectedComponent, searchTerm]);


    if (isLoading || !data) return <DashboardSkeleton />;

    const { summary, components } = data;
    const { sections, gender } = filteredStats;

    // Helper to calculate totals for the filtered gender view
    const currentTotalStudents = gender.reduce((acc, curr) => acc + curr.total, 0) || 1;

    return (
        <div className="p-6 space-y-8 bg-background text-foreground min-h-screen">
            {/* KPI STATS - Same as your code */}
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Enrollment" value={summary.totalStudents} icon={<Users className="h-4 w-4" />} description="Grand total students" />
                <StatCard title="Active Sections" value={summary.totalSections} icon={<LayoutGrid className="h-4 w-4" />} description="Total groups managed" />
                <StatCard title="Staff Deployed" value={summary.assignedFaculty} icon={<UserCheck className="h-4 w-4" />} description="Faculty with assignments" />
                <StatCard title="Faculty Gaps" value={summary.unassignedFaculty} icon={<AlertCircle className="h-4 w-4" />} description="Needs immediate attention" trend={summary.unassignedFaculty > 0 ? "destructive" : "muted"} />
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT COLUMN: PROGRAMS & GENDER */}
                <div className="space-y-6">
                    <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Components</h3>
                            {selectedComponent && (
                                <Button variant="ghost" size="xs" onClick={() => setSelectedComponent(null)} className="h-7 text-[10px] uppercase font-bold text-destructive hover:bg-destructive/10">
                                    <FilterX className="w-3 h-3 mr-1" /> Reset
                                </Button>
                            )}
                        </div>
                        {components.map((c) => (
                            <Card key={c.component_name} onClick={() => setSelectedComponent(c.component_name === selectedComponent ? null : c.component_name)} className={`relative overflow-hidden cursor-pointer transition-all duration-300 border-2 ${selectedComponent === c.component_name ? 'border-primary ring-2 ring-primary/10 shadow-lg' : 'border-transparent hover:border-muted-foreground/20'}`}>
                                <CardContent className="p-5 flex items-center justify-between">
                                    <div>
                                        <p className={`text-xs font-bold transition-colors ${selectedComponent === c.component_name ? 'text-primary' : 'text-muted-foreground'}`}>{c.component_name}</p>
                                        <h4 className="text-2xl font-bold">{c.total_students.toLocaleString()}</h4>
                                    </div>
                                    <Badge variant={selectedComponent === c.component_name ? "default" : "outline"}>{c.total_sections} Sections</Badge>
                                </CardContent>
                            </Card>
                        ))}
                    </motion.div>

                    {/* GENDER DISTRIBUTION CARD - Restored aggregation logic */}
                    <motion.div variants={itemVariants} initial="hidden" animate="show">
                        <Card className="border-none shadow-md overflow-hidden bg-card">
                            <CardHeader className="pb-3 border-b bg-muted/30">
                                <CardTitle className="text-sm font-bold tracking-tight">
                                    {selectedComponent ? `${selectedComponent} Gender Split` : 'System-Wide Distribution'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="flex h-4 w-full rounded-full overflow-hidden bg-muted mb-6">
                                    {(() => {
                                        const displayGender = selectedComponent
                                            ? gender
                                            : [
                                                { gender: 'Male', total: gender.filter(g => g.gender?.toLowerCase() === 'male').reduce((a, b) => a + b.total, 0) },
                                                { gender: 'Female', total: gender.filter(g => g.gender?.toLowerCase() === 'female').reduce((a, b) => a + b.total, 0) }
                                            ];
                                        return displayGender.map((g) => {
                                            const percentage = (g.total / currentTotalStudents) * 100;
                                            return (
                                                <motion.div key={g.gender} animate={{ width: `${percentage}%` }} className={`${g.gender?.toLowerCase() === 'male' ? 'bg-blue-500' : 'bg-pink-500'} h-full border-r border-background last:border-0`} />
                                            );
                                        });
                                    })()}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {['Male', 'Female'].map(label => {
                                        const count = gender.filter(g => g.gender?.toLowerCase() === label.toLowerCase()).reduce((a, b) => a + b.total, 0);
                                        const perc = Math.round((count / currentTotalStudents) * 100);
                                        return (
                                            <div key={label}>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase">{label}</p>
                                                <p className="text-xl font-bold">{perc}% <span className="text-[10px] text-muted-foreground">({count})</span></p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* RIGHT COLUMN: SECTION UTILIZATION */}
                <motion.div variants={itemVariants} initial="hidden" animate="show" className="lg:col-span-2">
                    <Card className="h-full flex flex-col shadow-md">
                        <CardHeader className="border-b bg-muted/10">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-lg">
                                        {selectedComponent ? `${selectedComponent.toUpperCase()} Sections` : "Section Capacity"}
                                    </CardTitle>
                                    <CardDescription>
                                        {selectedComponent ? `Showing only ${selectedComponent}` : "Saturation per active enrollment group"}
                                    </CardDescription>
                                </div>
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search section..."
                                        className="pl-8 h-9"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto max-h-[600px] p-0">
                            <div className="divide-y divide-muted/50">
                                <AnimatePresence mode="popLayout">
                                    {/* Crucial: We map 'sections' which is the filtered array */}
                                    {sections.length > 0 ? (
                                        sections.map((s) => {
                                            const percent = Math.round((s.enrolled / s.max_students) * 100);
                                            const isCritical = percent >= 90;

                                            return (
                                                <motion.div
                                                    layout
                                                    key={`${s.component_name}-${s.section}`}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className="p-5 group hover:bg-muted/30 transition-colors"
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="space-y-0.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-sm tracking-tight">{s.section}</span>
                                                                <Badge variant="outline" className="text-[9px] uppercase h-4">
                                                                    {s.component_name}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-[11px] text-muted-foreground">Max Capacity: {s.max_students}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`text-sm font-mono font-bold ${isCritical ? 'text-destructive' : 'text-primary'}`}>
                                                                {s.enrolled} / {s.max_students}
                                                            </span>
                                                            <p className="text-[10px] text-muted-foreground font-medium">{percent}% Full</p>
                                                        </div>
                                                    </div>
                                                    <Progress
                                                        value={percent}
                                                        className={`h-2 transition-all ${isCritical ? '[&>div]:bg-destructive' : '[&>div]:bg-primary'}`}
                                                    />
                                                </motion.div>
                                            );
                                        })
                                    ) : (
                                        <div className="p-20 text-center space-y-3">
                                            <div className="inline-flex p-3 rounded-full bg-muted">
                                                <Search className="w-6 h-6 text-muted-foreground" />
                                            </div>
                                            <p className="text-sm text-muted-foreground font-medium">No sections found matching your selection.</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, description, trend }) {
    return (
        <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden group">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {title}
                    </CardTitle>
                    <div className={`${trend === 'destructive' ? 'text-destructive' : 'text-primary'} group-hover:scale-110 transition-transform`}>
                        {icon}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-black tracking-tight">{value?.toLocaleString()}</div>
                    <p className="text-[10px] text-muted-foreground mt-1 font-medium">{description}</p>
                    {trend === 'destructive' && value > 0 && (
                        <div className="mt-3 h-1 w-full bg-destructive/10 overflow-hidden rounded-full">
                            <motion.div
                                className="h-full bg-destructive shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                                initial={{ x: "-100%" }}
                                animate={{ x: "0%" }}
                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    )
}

function DashboardSkeleton() {
    return (
        <div className="p-6 space-y-8 animate-pulse">
            <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
            </div>
            <div className="grid grid-cols-3 gap-6">
                <Skeleton className="h-[500px] w-full rounded-xl" />
                <Skeleton className="h-[500px] w-full col-span-2 rounded-xl" />
            </div>
        </div>
    )
}

Index.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>