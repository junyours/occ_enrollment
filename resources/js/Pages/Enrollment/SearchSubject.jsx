import React, { useState } from 'react';
import {
    SearchDropdown,
    SearchDropdownTrigger,
    SearchDropdownInput,
    SearchDropdownContent,
    SearchDropdownList,
    SearchDropdownEmpty,
    SearchDropdownItem,
    useSearchDropdown,
} from '@/Components/ui/SearchDropdown';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// Helper component to access filtered data from context
function SearchSubject({ onSelect, selectedValue, searchSubjectClasses }) {
    const { filteredData } = useSearchDropdown();

    if (filteredData.length === 0) {
        return <SearchDropdownEmpty />;
    }

    return filteredData.map((subject, index) => (
        <SearchDropdownItem
            key={subject.value + subject.label + index}
            isSelected={selectedValue === subject.value}
            isLast={index === filteredData.length - 1}
            onClick={() => {
                searchSubjectClasses(subject.value);
                console.log(subject.value);
                onSelect(subject)
            }}
        >
            <div className="flex items-center justify-between">
                <span className="font-medium">{subject.label}</span>
                <span className="text-xs text-muted-foreground">{subject.value}</span>
            </div>
        </SearchDropdownItem>
    ));
}

export default function SubjectSelector({ searchSubjectClasses, schoolYearId }) { // Receive data as prop
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const fetchAllSubjects = async () => {
        try {
            const response = await axios.post(route('enrollment.all-available-subjects'), {
                school_year_id: schoolYearId,
            });

            return response.data.map(subject => ({
                value: subject.subject_code,
                label: subject.descriptive_title,
            }));
        } catch (error) {
            console.error("Error fetching subjects:", error);
            return [];
        }
    };

    const { data: subjectsData = [] } = useQuery({
        queryKey: ['subjects-list'],
        queryFn: fetchAllSubjects,
        staleTime: 60 * 60 * 1000,
    });

    const handleSelectSubject = (subject) => {
        setSelectedSubject(subject);
        setSearchTerm('');
        setIsOpen(false);
    };

    const handleInputChange = (e) => {
        setSearchTerm(e.target.value);
        if (selectedSubject) {
            setSelectedSubject(null);
        }
        // Open dropdown when typing
        if (!isOpen) {
            setIsOpen(true);
        }
    };

    const handleInputFocus = () => {
        // Always open dropdown on focus
        setIsOpen(true);
    };

    return (
        <div className="space-y-6 w-full">
            <SearchDropdown
                isOpen={isOpen}
                onOpenChange={setIsOpen}
                data={subjectsData}
                searchTerm={searchTerm} // Direct search, no debounce
                valueKey="value"
                labelKey="label"
            >
                <SearchDropdownTrigger>
                    <SearchDropdownInput
                        value={selectedSubject ? selectedSubject.label : searchTerm}
                        onChange={handleInputChange}
                        onFocus={handleInputFocus}
                        placeholder="Type to search subjects..."
                    />
                </SearchDropdownTrigger>

                <SearchDropdownContent>
                    <SearchDropdownList>
                        <SearchSubject
                            onSelect={handleSelectSubject}
                            selectedValue={selectedSubject?.value}
                            searchSubjectClasses={searchSubjectClasses}
                        />
                    </SearchDropdownList>
                </SearchDropdownContent>
            </SearchDropdown>
        </div>
    );
}