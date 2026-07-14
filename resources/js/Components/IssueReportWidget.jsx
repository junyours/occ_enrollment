import React, { useState, useEffect, useRef } from 'react';
import {
    Bug,
    Paperclip,
    Loader2,
    MessageSquarePlus,
    ChevronDown,
    X
} from 'lucide-react';

// shadcn/ui Components
import { Button } from "@/Components/ui/button";
import { Card, CardHeader, CardTitle, CardFooter } from "@/Components/ui/card";
import { Input } from "@/Components/ui/input";
import { Textarea } from "@/Components/ui/textarea";
import { Label } from "@/Components/ui/label";
import { ScrollArea } from "@/Components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/Components/ui/select";
import { Separator } from "@/Components/ui/separator";

// Custom Components
import RequiredLabel from './ui/RequiredLabel';

export default function IssueReportWidget() {
    // --- State ---
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fileError, setFileError] = useState("");
    const [formData, setFormData] = useState({
        type: '',
        title: '',
        description: '',
        files: [],
    });

    // --- Refs ---
    const titleInputRef = useRef(null);
    const fileInputRef = useRef(null);

    // --- Derived State ---
    const isFormValid = formData.type !== '' && formData.title.trim() !== '' && formData.description.trim() !== '';
    const MAX_FILES = 3;
    const hasMaxFiles = formData.files.length >= MAX_FILES;

    // --- Effects ---

    // Auto-focus first input when opened
    useEffect(() => {
        if (isOpen && titleInputRef.current) {
            setTimeout(() => titleInputRef.current.focus(), 100);
        }
    }, [isOpen]);

    // Cleanup object URLs when component unmounts to prevent memory leaks
    useEffect(() => {
        return () => {
            formData.files.forEach(item => {
                if (item.preview) URL.revokeObjectURL(item.preview);
            });
        };
    }, [formData.files]);

    // --- Handlers ---
    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (e) => {
        setFileError(""); // Clear previous errors

        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length === 0) return;

        const currentCount = formData.files.length;

        // Prevent action if already at limit
        if (currentCount >= MAX_FILES) {
            setFileError(`Maximum of ${MAX_FILES} images allowed.`);
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        const validFilesWithPreviews = [];
        let errorMessage = "";
        const MAX_SIZE_MB = 10;

        // Calculate how many files we are allowed to add
        const allowedFiles = selectedFiles.slice(0, MAX_FILES - currentCount);

        if (selectedFiles.length > allowedFiles.length) {
            errorMessage = `You can only upload up to ${MAX_FILES} images. Extra files were ignored. `;
        }

        for (const file of allowedFiles) {
            // Validate it is an image
            if (!file.type.startsWith('image/')) {
                errorMessage += "Only image files are allowed. ";
                continue; // Skip invalid file but check others
            }

            // Validate file size
            if (file.size > MAX_SIZE_MB * 1024 * 1024) {
                errorMessage += `Each image must be under ${MAX_SIZE_MB}MB. `;
                continue; // Skip invalid file
            }

            // Create a preview URL for the image
            validFilesWithPreviews.push({
                file,
                preview: URL.createObjectURL(file)
            });
        }

        if (errorMessage) {
            setFileError(errorMessage.trim());
        }

        if (validFilesWithPreviews.length > 0) {
            // Append new valid files to the existing array
            setFormData(prev => ({
                ...prev,
                files: [...prev.files, ...validFilesWithPreviews]
            }));
        }

        // Reset the input value so the user can select the same file again if they remove it
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeFile = (indexToRemove) => {
        setFormData(prev => {
            const newFiles = [...prev.files];
            // Revoke the URL to free up memory
            URL.revokeObjectURL(newFiles[indexToRemove].preview);
            newFiles.splice(indexToRemove, 1);
            return { ...prev, files: newFiles };
        });
        setFileError(""); // Clear errors when a file is removed just in case
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormValid) return;

        setIsSubmitting(true);

        // Simulate API delay for demonstration
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // TODO: Replace with actual Axios/Inertia request
        // const payload = new FormData();
        // payload.append('type', formData.type);
        // payload.append('title', formData.title);
        // payload.append('description', formData.description);
        // formData.files.forEach((item, index) => {
        //     payload.append(`images[${index}]`, item.file);
        // });
        // await axios.post(route('issues.store'), payload);

        setIsSubmitting(false);
        setIsOpen(false);

        // Revoke URLs and reset form upon successful submission
        formData.files.forEach(item => URL.revokeObjectURL(item.preview));
        setFormData({
            type: '',
            title: '',
            description: '',
            files: [],
        });
        setFileError("");
    };

    return (
        <div
            // Centered on mobile, bottom-right on desktop
            className="fixed bottom-2 left-0 right-0 sm:left-auto sm:right-8 z-50 flex flex-col items-center sm:items-end isolate pointer-events-none"
        >
            {/* Widget Card (Expanded State) */}
            <div
                className={`
                    transition-all duration-300 ease-in-out origin-bottom sm:origin-bottom-right overflow-hidden
                    /* Card spacing */
                    mb-4 sm:mb-6 
                    ${isOpen ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 translate-y-12 pointer-events-none absolute bottom-0'}
                `}
            >
                <Card className="w-[calc(100vw-4rem)] sm:w-[400px] shadow-2xl border-muted rounded-2xl bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                    <CardHeader className="pb-4 space-y-1">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 text-primary">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Bug className="w-5 h-5" />
                                </div>
                                <CardTitle className="text-lg">Report an Issue</CardTitle>
                            </div>
                        </div>
                    </CardHeader>

                    <Separator />

                    <form onSubmit={handleSubmit}>
                        <ScrollArea className="h-max max-h-[60vh] px-6 py-4">
                            <div className="space-y-4">
                                {/* Issue Type */}
                                <div className="space-y-2">
                                    <RequiredLabel htmlFor="type">What is this regarding?</RequiredLabel>
                                    <Select
                                        value={formData.type}
                                        onValueChange={(val) => handleInputChange('type', val)}
                                    >
                                        <SelectTrigger id="type" className="w-full">
                                            <SelectValue placeholder="Select an option" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Bug">I found a bug</SelectItem>
                                            <SelectItem value="Feature Request">I have a feature request</SelectItem>
                                            <SelectItem value="Improvement">I have a suggestion</SelectItem>
                                            <SelectItem value="Question">I have a question</SelectItem>
                                            <SelectItem value="Complaint">I want to complain</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Title (Brief Summary) */}
                                <div className="space-y-2">
                                    <RequiredLabel htmlFor="title">Brief summary</RequiredLabel>
                                    <Input
                                        id="title"
                                        ref={titleInputRef}
                                        placeholder="e.g., Cannot upload a profile picture"
                                        value={formData.title}
                                        onChange={(e) => handleInputChange('title', e.target.value)}
                                        className="w-full"
                                    />
                                </div>

                                {/* Description (Details) */}
                                <div className="space-y-2">
                                    <RequiredLabel htmlFor="description">Please provide details</RequiredLabel>
                                    <Textarea
                                        id="description"
                                        placeholder="What were you trying to do? What happened instead? Any error messages?"
                                        className="w-full min-h-[100px] resize-none"
                                        value={formData.description}
                                        onChange={(e) => handleInputChange('description', e.target.value)}
                                    />
                                </div>

                                {/* File Upload */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label>Screenshots (Optional)</Label>
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                            Max {MAX_FILES} images, 10MB each
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={hasMaxFiles}
                                            className={`w-full sm:w-auto text-muted-foreground font-normal relative ${fileError ? 'border-destructive' : ''}`}
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Paperclip className="w-4 h-4 mr-2" />
                                            <span>{hasMaxFiles ? 'Image limit reached' : 'Attach images'}</span>
                                        </Button>
                                        <input
                                            type="file"
                                            multiple
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                        />

                                        {/* Display selected files as image thumbnails */}
                                        {formData.files.length > 0 && (
                                            <div className="flex flex-wrap gap-3 w-full">
                                                {formData.files.map((item, index) => (
                                                    <div
                                                        key={index}
                                                        className="relative group w-16 h-16 sm:w-20 sm:h-20 rounded-md border border-border overflow-hidden bg-muted"
                                                    >
                                                        <img
                                                            src={item.preview}
                                                            alt={`Upload preview ${index + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFile(index)}
                                                            // Always visible on mobile (opacity-100), hidden by default on sm screens until group hover
                                                            className="absolute top-1 right-1 bg-background/90 hover:bg-destructive hover:text-destructive-foreground text-foreground rounded-full p-1 transition-opacity shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                                            title="Remove image"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {fileError && (
                                            <p className="text-xs text-destructive font-medium">{fileError}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>

                        <Separator />

                        <CardFooter className="flex justify-between items-center p-4 bg-muted/30 rounded-b-2xl">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setIsOpen(false)}
                                disabled={isSubmitting}
                                className="text-muted-foreground hover:text-foreground font-medium"
                            >
                                <ChevronDown className="w-4 h-4 mr-1.5" />
                                Minimize
                            </Button>

                            <Button
                                type="submit"
                                disabled={!isFormValid || isSubmitting}
                                className="min-w-[120px] transition-all"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Submitting
                                    </>
                                ) : (
                                    'Submit Issue'
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>

            {/* Sticky Bottom Tab (Minimized State) */}
            <div className={`fixed bottom-0 right-2 z-40 transition-all duration-300 transform pointer-events-auto ${isOpen ? 'translate-y-full opacity-0 absolute' : ''}`}>
                <Button
                    onClick={() => setIsOpen(true)}
                    // Tab styling: flush against the bottom, rounded top corners, text included
                    className="h-10 sm:h-12 px-4 sm:px-6 shadow-xl hover:shadow-2xl hover:brightness-110 transition-all duration-300 bg-primary text-primary-foreground flex items-center gap-2 rounded-t-xl rounded-b-none border border-b-0 border-primary/20"
                >
                    <MessageSquarePlus className="w-5 h-5" />
                    <span className="font-semibold text-sm sm:text-base tracking-wide">Feedback</span>
                </Button>
            </div>
        </div>
    );
}