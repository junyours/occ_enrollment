import React, { useState, useMemo } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Link, usePage } from '@inertiajs/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/Components/ui/tooltip';
import { Badge } from "@/Components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import axios from 'axios';
import { cn } from "@/Lib/Utils";
import {
    Users, BookOpen, UserPlus, FileStack, Pencil,
    Trash, Download, MoreVertical, FolderOpen, Search, ArrowUpDown
} from 'lucide-react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/Components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";

function YearLevelSections({
    yearLevel, editing, data, sectionOnChange, errors, maxStudentsOnChange,
    setEditing, reset, clearErrors, forSchoolYear = false, courseId, setData,
    submitEdit, post, getEnrollmentCourseSection, setIsDownloading,
    schoolYearId, schoolYear, allowEnrollment
}) {
    const user = usePage().props.auth.user;
    const userRole = user.user_role;
    const { toast } = useToast();

    const [selectedSection, setSelectedSection] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOrder, setSortOrder] = useState("name-asc");

    const deleteSection = (id) => {
        post(route('delete.section', { id: id }), {
            onSuccess: async () => {
                await getEnrollmentCourseSection();
                setSelectedSection(null);
                toast({ description: "Section deleted successfully.", variant: "success" });
            },
            onError: (errors) => {
                if (errors.curriculum_id) toast({ description: errors.curriculum_id, variant: "destructive" });
            },
            preserveScroll: true,
        });
    };

    const handleDownload = async (yearlevel, section) => {
        setIsDownloading(true);
        try {
            const response = await axios.get(
                route('download.section.students', { schoolYearId, courseId, yearlevel, section }),
                { responseType: 'blob' }
            );
            const contentDisposition = response.headers['content-disposition'];
            let filename = 'students.xlsx';
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match) filename = match[1];
            }
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.setAttribute('download', filename);
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err) {
            toast({ description: "Failed to download file.", variant: "destructive" });
        } finally {
            setTimeout(() => setIsDownloading(false), 500);
        }
    };

    const filteredAndSortedSections = useMemo(() => {
        let result = yearLevel.year_section.filter(sec =>
            sec.section.toLowerCase().includes(searchTerm.toLowerCase())
        );

        result.sort((a, b) => {
            if (sortOrder === "name-asc") return a.section.localeCompare(b.section);
            if (sortOrder === "name-desc") return b.section.localeCompare(a.section);
            if (sortOrder === "students-desc") return b.student_count - a.student_count;
            if (sortOrder === "students-asc") return a.student_count - b.student_count;
            if (sortOrder === "capacity-desc") {
                return (b.student_count / b.max_students) - (a.student_count / a.max_students);
            }
            if (sortOrder === "capacity-asc") {
                return (a.student_count / a.max_students) - (b.student_count / b.max_students);
            }
            return 0;
        });
        return result;
    }, [yearLevel.year_section, searchTerm, sortOrder]);

    const getCapacityDetails = (enrolled, max) => {
        const percentage = Math.min((enrolled / max) * 100, 100);
        const overcap = enrolled > max;

        let statusColor = "bg-green-500";
        let badgeText = "Available";
        let badgeVariant = "secondary";

        if (overcap) {
            statusColor = "bg-red-500";
            badgeText = "Over Capacity";
            badgeVariant = "destructive";
        } else if (percentage === 100) {
            statusColor = "bg-red-500";
            badgeText = "Full";
            badgeVariant = "destructive";
        } else if (percentage >= 80) {
            statusColor = "bg-yellow-500";
            badgeText = "Nearly Full";
            badgeVariant = "outline";
        }

        return { percentage, statusColor, badgeText, badgeVariant };
    };

    if (yearLevel.year_section.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/10 rounded-lg">
                <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <h4 className="text-lg font-medium text-foreground">No Sections Yet</h4>
                <p className="text-sm text-muted-foreground mb-4">Create your first section for this year level to start enrolling students.</p>
            </div>
        );
    }

    return (
        <TooltipProvider delayDuration={300}>
            <div className="space-y-4 p-4 sm:p-0">
                {/* Search and Sort Controls */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <div className="flex-1 relative w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search sections..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-full"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                        <Select value={sortOrder} onValueChange={setSortOrder}>
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="name-asc">Section Name (A-Z)</SelectItem>
                                <SelectItem value="name-desc">Section Name (Z-A)</SelectItem>
                                <SelectItem value="students-desc">Most Students</SelectItem>
                                <SelectItem value="students-asc">Least Students</SelectItem>
                                <SelectItem value="capacity-desc">Highest Capacity</SelectItem>
                                <SelectItem value="capacity-asc">Lowest Capacity</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block rounded-md border bg-background">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[120px] font-semibold">Section</TableHead>
                                <TableHead className="font-semibold">Capacity</TableHead>
                                <TableHead className="text-right font-semibold">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAndSortedSections.map((section) => {
                                const isRowEditing = editing && data.id === section.id;
                                const { percentage, statusColor, badgeText, badgeVariant } = getCapacityDetails(section.student_count, section.max_students);

                                if (isRowEditing) {
                                    return (
                                        <TableRow key={section.id} className="bg-muted/30">
                                            <TableCell>
                                                <Input onChange={sectionOnChange} name="section" className={cn("w-20", errors.section && "border-red-500")} value={data.section} />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-muted-foreground">Max:</span>
                                                    <Input name="max_students" value={data.max_students} onChange={maxStudentsOnChange} className={cn("w-20", errors.max_students && "border-red-500")} />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-2">
                                                    <Button variant='outline' size="sm" onClick={() => { setEditing(false); reset(); clearErrors(); }}>
                                                        Cancel
                                                    </Button>
                                                    <Button size="sm" onClick={submitEdit} disabled={!data.section || !data.max_students}>
                                                        Save
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                }

                                return (
                                    <TableRow key={section.id} className="hover:bg-muted/30 transition-colors group">
                                        <TableCell className="font-semibold text-base">{section.section}</TableCell>
                                        <TableCell>
                                            <div className="space-y-1.5 pr-8">
                                                <div className="flex justify-between text-xs text-muted-foreground w-full">
                                                    <span>{section.student_count} / {section.max_students}</span>
                                                    <span className="font-medium">{Math.round((section.student_count / section.max_students) * 100)}%</span>
                                                </div>
                                                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className={cn("h-full transition-all", statusColor)}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1 opacity-100 sm:opacity-60 group-hover:opacity-100 transition-opacity">
                                                <ActionButtons
                                                    section={section}
                                                    yearLevel={yearLevel}
                                                    courseId={courseId}
                                                    schoolYear={schoolYear}
                                                    forSchoolYear={forSchoolYear}
                                                    allowEnrollment={allowEnrollment}
                                                    userRole={userRole}
                                                    setEditing={setEditing}
                                                    setData={setData}
                                                    setSelectedSection={setSelectedSection}
                                                    handleDownload={handleDownload}
                                                    deleteSection={deleteSection}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden grid gap-4">
                    {filteredAndSortedSections.map((section) => {
                        const isRowEditing = editing && data.id === section.id;
                        const { percentage, statusColor, badgeText, badgeVariant } = getCapacityDetails(section.student_count, section.max_students);

                        if (isRowEditing) {
                            return (
                                <div key={section.id} className="border rounded-lg p-4 bg-muted/20 space-y-4">
                                    <div>
                                        <label className="text-sm font-medium mb-1 block">Section Name</label>
                                        <Input onChange={sectionOnChange} name="section" className={cn("w-full", errors.section && "border-red-500")} value={data.section} />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-1 block">Max Students</label>
                                        <Input name="max_students" value={data.max_students} onChange={maxStudentsOnChange} className={cn("w-full", errors.max_students && "border-red-500")} />
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <Button variant='outline' className="flex-1" onClick={() => { setEditing(false); reset(); clearErrors(); }}>Cancel</Button>
                                        <Button className="flex-1" onClick={submitEdit} disabled={!data.section || !data.max_students}>Save</Button>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={section.id} className="border rounded-lg p-4 bg-background shadow-sm hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <h4 className="font-bold text-lg">{section.section}</h4>
                                    <Badge variant={badgeVariant} className={cn(badgeVariant === "outline" && "text-yellow-600 border-yellow-600")}>
                                        {badgeText}
                                    </Badge>
                                </div>
                                <div className="space-y-1 mb-4">
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                        <span>{section.student_count} / {section.max_students} Students</span>
                                        <span className="font-medium">{Math.round((section.student_count / section.max_students) * 100)}%</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                        <div
                                            className={cn("h-full transition-all", statusColor)}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 pt-2 border-t border-muted">
                                    <ActionButtons
                                        section={section}
                                        yearLevel={yearLevel}
                                        courseId={courseId}
                                        schoolYear={schoolYear}
                                        forSchoolYear={forSchoolYear}
                                        allowEnrollment={allowEnrollment}
                                        userRole={userRole}
                                        setEditing={setEditing}
                                        setData={setData}
                                        setSelectedSection={setSelectedSection}
                                        handleDownload={handleDownload}
                                        deleteSection={deleteSection}
                                        mobile={true}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </TooltipProvider>
    );
}

// Extracted Action Buttons component
function ActionButtons({
    section, yearLevel, courseId, schoolYear, forSchoolYear, allowEnrollment, userRole,
    setEditing, setData, setSelectedSection, handleDownload, deleteSection, mobile = false
}) {

    const getRoute = (baseRoute) => {
        if (forSchoolYear) {
            // Map route names for school-year views
            const routeMap = {
                'class': 'school-year.view.class',
                'students': 'school-year.view.students',
                'enroll-student': 'school-year.view.enroll-student',
                'cor': 'enrollment.view.cor' // COR list uses enrollment route
            };
            const routeName = routeMap[baseRoute] || `school-year.view.${baseRoute}`;

            if (baseRoute === 'cor') {
                // COR list route doesn't need schoolyear params
                return route('enrollment.view.cor', {
                    id: courseId,
                    yearlevel: yearLevel.year_level_name.replace(/\s+/g, '-')
                }) + `?section=${section.section}`;
            }

            return route(routeName, {
                schoolyear: `${schoolYear.start_year}-${schoolYear.end_year}`,
                semester: schoolYear.semester.semester_name,
                hashedCourseId: courseId,
                yearlevel: yearLevel.year_level_name.replace(/\s+/g, '-')
            }) + `?section=${section.section}`;
        }
        return route(`enrollment.view.${baseRoute}`, {
            id: courseId,
            yearlevel: yearLevel.year_level_name.replace(/\s+/g, '-')
        }) + `?section=${section.section}`;
    };

    const iconClass = "h-4 w-4";
    const btnClass = mobile ? "flex-1 justify-center" : "h-8 w-8 p-0";

    return (
        <>
            {(userRole === "program_head" || userRole === "registrar") && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Link href={getRoute('class')} className={cn(mobile && "flex-1")}>
                            <Button variant={mobile ? "outline" : "ghost"} size="sm" className={cn("text-purple-600 hover:text-purple-700 hover:bg-purple-300", btnClass)}>
                                <BookOpen className={iconClass} /> {mobile && <span className="ml-2 text-xs">Class</span>}
                            </Button>
                        </Link>
                    </TooltipTrigger>
                    {!mobile && <TooltipContent>View Class</TooltipContent>}
                </Tooltip>
            )}

            <Tooltip>
                <TooltipTrigger asChild>
                    <Link href={getRoute('students')} className={cn(mobile && "flex-1")}>
                        <Button variant={mobile ? "outline" : "ghost"} size="sm" className={cn("text-green-600 hover:text-green-700 hover:bg-green-300", btnClass)}>
                            <Users className={iconClass} /> {mobile && <span className="ml-2 text-xs">Students</span>}
                        </Button>
                    </Link>
                </TooltipTrigger>
                {!mobile && <TooltipContent>View Students</TooltipContent>}
            </Tooltip>

            {!forSchoolYear && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        {allowEnrollment ? (
                            <Link href={getRoute('enroll-student')} className={cn(mobile && "flex-1")}>
                                <Button variant={mobile ? "outline" : "ghost"} size="sm" className={cn("text-blue-600 hover:text-blue-700 hover:bg-blue-300", btnClass)}>
                                    <UserPlus className={iconClass} /> {mobile && <span className="ml-2 text-xs">Enroll</span>}
                                </Button>
                            </Link>
                        ) : (
                            <div className={cn(mobile && "flex-1 flex")}>
                                <Button disabled variant={mobile ? "outline" : "ghost"} size="sm" className={cn("text-muted-foreground", btnClass)}>
                                    <UserPlus className={iconClass} /> {mobile && <span className="ml-2 text-xs">Enroll</span>}
                                </Button>
                            </div>
                        )}
                    </TooltipTrigger>
                    {!mobile && <TooltipContent>{allowEnrollment ? "Enroll Student" : "Enrollment not allowed at this time"}</TooltipContent>}
                </Tooltip>
            )}

            {(userRole === "registrar" || userRole === "program_head") && (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={mobile ? "outline" : "ghost"} size="sm" className={cn(btnClass)}>
                            <MoreVertical className={iconClass} /> {mobile && <span className="ml-2 text-xs">More</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-48 p-2">
                        <div className="space-y-1">
                            {!forSchoolYear && (
                                <Link href={getRoute('cor')}>
                                    <Button disabled={true} variant="ghost" className="w-full justify-start text-sm">
                                        <FileStack className="mr-2 h-4 w-4 text-violet-500" /> COR List
                                    </Button>
                                </Link>
                            )}
                            <Button
                                disabled={!section.student_count}
                                onClick={() => handleDownload(section.year_level_id, section.section)}
                                variant="ghost" className="w-full justify-start text-sm"
                            >
                                <Download className="mr-2 h-4 w-4 text-orange-500" /> Download Data
                            </Button>

                            {userRole === "program_head" && (
                                <>
                                    <div className="h-px bg-muted my-1 w-full" />
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start text-sm"
                                        onClick={() => {
                                            setEditing(true);
                                            setData('id', section.id);
                                            setData('year_level_id', section.year_level_id);
                                            setData('section', section.section);
                                            setData('max_students', section.max_students);
                                        }}
                                    >
                                        <Pencil className="mr-2 h-4 w-4 text-green-500" /> Edit Section
                                    </Button>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                disabled={!!section.student_count}
                                                variant="ghost"
                                                className="w-full justify-start text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => setSelectedSection(section.id)}
                                            >
                                                <Trash className="mr-2 h-4 w-4" /> Delete Section
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete this section?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the section and its related data.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                                    onClick={() => deleteSection(section.id)}
                                                >
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            )}
        </>
    );
}

export default YearLevelSections;