import GuestLayout from "@/Layouts/GuestLayout";
import FroalaEditor from "react-froala-wysiwyg";
import FroalaEditorView from "react-froala-wysiwyg/FroalaEditorView";
import { useState } from "react";
import "froala-editor/js/plugins/fullscreen.min.js";
import "froala-editor/js/plugins/colors.min.js";
import "froala-editor/js/plugins/url.min.js";
import "froala-editor/js/plugins/align.min.js";
import "froala-editor/js/plugins/font_size.min.js";
import "froala-editor/js/plugins/emoticons.min.js";
import { Card, CardContent, CardHeader } from "@/Components/ui/card";
import { Button } from "@/Components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/Components/ui/dropdown-menu";
import {
    Calendar,
    FilePenLine,
    Image,
    Loader2,
    MoreHorizontal,
    MoveRight,
    Trash,
} from "lucide-react";
import { Head, router, useForm, usePage } from "@inertiajs/react";
import { Dialog, DialogContent } from "@/Components/ui/dialog";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/Components/ui/alert-dialog";

function Announcement() {
    const { auth } = usePage().props;
    const { announcements } = usePage().props;
    const formatDate = (date) =>
        new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    const [previewImage, setPreviewImage] = useState(null);
    const { data, setData, post, processing } = useForm({
        id: null,
        content_body: "",
        image: null,
    });
    const [open, setOpen] = useState(false);
    const [editData, setEditData] = useState(false);
    const [openMore, setOpenMore] = useState(false);
    const [announcement, setAnnouncement] = useState(null);
    const [openDelete, setOpenDelete] = useState(false);
    const [selectedAnnouncementId, setSelectedAnnouncementId] = useState(null);

    const handleEdit = (announcement) => {
        if (announcement) {
            setEditData(true);
            const annData = {
                id: announcement.id,
                content_body: announcement.content_body,
            };
            setData(annData);
            setPreviewImage(
                announcement.image_file_id
                    ? `https://lh3.googleusercontent.com/d/${announcement.image_file_id}`
                    : null
            );
        } else {
            setEditData(false);
            const newData = {
                id: null,
                content_body: "",
                image: null,
            };
            setData(newData);
            setPreviewImage(null);
        }
        setOpen(!open);
    };

    const handleOpenDelete = (id = null) => {
        setSelectedAnnouncementId(id);
        setOpenDelete((prev) => !prev);
    };

    const handleReadMore = (announcement) => {
        setAnnouncement(announcement ?? null);
        setOpenMore(!openMore);
    };

    const handleUpload = () => {
        post("/announcement/upload", {
            onSuccess: () => {
                handleEdit();
                toast.success("Announcement uploaded successfully.");
            },
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleUpdate = () => {
        post("/announcement/update", {
            onSuccess: () => {
                handleEdit();
                toast.success("Announcement updated successfully.");
            },
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleDelete = (id) => {
        router.post(
            "/announcement/delete",
            { id },
            {
                onSuccess: () => {
                    handleEdit();
                    toast.success("Announcement deleted successfully.");
                },
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    return (
        <>
            <Head title="Announcement" />
            <div className="flex gap-4 max-sm:flex-col-reverse">
                <div
                    className={`flex-1 ${
                        auth?.user.user_role === "announcement_admin"
                            ? " space-y-4"
                            : "grid md:grid-cols-2 lg:grid-cols-3 gap-4"
                    }`}
                >
                    {announcements.map((announcement) => (
                        <Card
                            key={announcement.id}
                            className="flex flex-col justify-between rounded-xl"
                        >
                            <div className="space-y-6">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="text-primary size-5" />
                                            <span className="text-muted-foreground font-medium text-sm">
                                                {formatDate(
                                                    announcement.created_at
                                                )}
                                            </span>
                                        </div>
                                        {auth?.user.user_role ===
                                            "announcement_admin" && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <span className="sr-only">
                                                            Open menu
                                                        </span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            handleEdit(
                                                                announcement
                                                            )
                                                        }
                                                        className="text-primary"
                                                    >
                                                        <FilePenLine />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            handleOpenDelete(
                                                                announcement.id
                                                            )
                                                        }
                                                        className="text-destructive"
                                                    >
                                                        <Trash />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="line-clamp-6">
                                        <FroalaEditorView
                                            model={announcement.content_body}
                                        />
                                    </div>
                                </CardContent>
                            </div>
                            <div className="relative">
                                {announcement.image_file_id && (
                                    <div className="h-[250px] w-full">
                                        <img
                                            src={`https://lh3.googleusercontent.com/d/${announcement.image_file_id}`}
                                            alt={announcement.image_file_id}
                                            className="object-cover size-full rounded-b-xl"
                                        />
                                    </div>
                                )}
                                <div
                                    className={`flex items-end justify-end ${
                                        announcement.image_file_id
                                            ? "absolute inset-0"
                                            : ""
                                    }`}
                                >
                                    <Button
                                        onClick={() =>
                                            handleReadMore(announcement)
                                        }
                                        className="rounded-none rounded-tl-xl rounded-br-xl"
                                    >
                                        Read more
                                        <MoveRight />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
                {auth?.user.user_role === "announcement_admin" && (
                    <div className="flex-1 space-y-4">
                        <div className="relative border rounded-xl h-[250px]">
                            {previewImage && (
                                <img
                                    src={previewImage}
                                    alt="image"
                                    className="object-cover size-full rounded-xl"
                                />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Button
                                    onClick={() =>
                                        document.getElementById("image").click()
                                    }
                                    size="sm"
                                    variant="secondary"
                                >
                                    <Image />
                                    {previewImage ? "Change" : "Upload"}
                                </Button>
                            </div>
                            <input
                                accept=".jpg,.jpeg,.png"
                                id="image"
                                type="file"
                                onChange={(e) => {
                                    const file = e.target.files[0];
                                    setData("image", file);
                                    if (file) {
                                        const imageUrl =
                                            URL.createObjectURL(file);
                                        setPreviewImage(imageUrl);
                                    } else {
                                        setPreviewImage(null);
                                    }
                                }}
                                hidden
                            />
                        </div>
                        <div className="space-y-1">
                            <FroalaEditor
                                model={data.content_body}
                                onModelChange={(val) =>
                                    setData("content_body", val)
                                }
                                tag="textarea"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            {editData && (
                                <Button
                                    onClick={() => handleEdit()}
                                    variant="ghost"
                                    disabled={processing}
                                >
                                    Cancel
                                </Button>
                            )}
                            <Button
                                onClick={editData ? handleUpdate : handleUpload}
                                disabled={!data.content_body || processing}
                            >
                                {processing && (
                                    <Loader2 className="animate-spin" />
                                )}
                                {editData
                                    ? processing
                                        ? "Updating"
                                        : "Update"
                                    : processing
                                    ? "Uploading"
                                    : "Upload"}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <Dialog open={openMore} onOpenChange={() => handleReadMore()}>
                <DialogContent className="sm:max-w-xl max-h-full overflow-y-auto">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="text-primary size-5" />
                            <span className="text-muted-foreground font-medium text-sm">
                                {formatDate(announcement?.created_at)}
                            </span>
                        </div>
                        <FroalaEditorView model={announcement?.content_body} />
                        {announcement?.image_file_id && (
                            <div className="h-[250px]">
                                <img
                                    src={`https://lh3.googleusercontent.com/d/${announcement?.image_file_id}`}
                                    alt={announcement?.image_file_id}
                                    className="object-contain size-full"
                                />
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={openDelete}
                onOpenChange={() => setOpenDelete(false)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete the announcement.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                handleDelete(selectedAnnouncementId);
                            }}
                        >
                            Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export default Announcement;
Announcement.layout = (page) => <GuestLayout>{page}</GuestLayout>;
