import GuestLayout from "@/Layouts/GuestLayout";
import FroalaEditor from "react-froala-wysiwyg";
import FroalaEditorView from "react-froala-wysiwyg/FroalaEditorView";
import { useState } from "react";
import "froala-editor/js/plugins/fullscreen.min.js";
import "froala-editor/js/plugins/save.min.js";
import "froala-editor/js/plugins/colors.min.js";
import "froala-editor/js/plugins/url.min.js";
import "froala-editor/js/plugins/align.min.js";
import "froala-editor/js/plugins/font_size.min.js";
import "froala-editor/js/plugins/emoticons.min.js";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/Components/ui/card";
import { Button } from "@/Components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/Components/ui/dropdown-menu";
import { Calendar, MoreHorizontal } from "lucide-react";

function Announcement() {
    const formatDate = (date) =>
        new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    const [model, setModel] = useState(() => {
        return localStorage.getItem("savedHtml") || "";
    });

    return (
        <></>
        // <div className="grid grid-cols-2 gap-4">
        //     <Card className="h-fit space-y-6 rounded-xl">
        //         <CardHeader>
        //             <div className="flex items-center justify-between">
        //                 <div className="flex items-center gap-2">
        //                     <Calendar className="text-primary size-5" />
        //                     <span className="text-muted-foreground font-medium text-sm">
        //                         {formatDate("01/01/2000")}
        //                     </span>
        //                 </div>
        //                 <DropdownMenu>
        //                     <DropdownMenuTrigger asChild>
        //                         <Button variant="ghost" className="h-8 w-8 p-0">
        //                             <span className="sr-only">Open menu</span>
        //                             <MoreHorizontal className="h-4 w-4" />
        //                         </Button>
        //                     </DropdownMenuTrigger>
        //                     <DropdownMenuContent align="end">
        //                         <DropdownMenuItem>Edit</DropdownMenuItem>
        //                         <DropdownMenuItem>Delete</DropdownMenuItem>
        //                     </DropdownMenuContent>
        //                 </DropdownMenu>
        //             </div>
        //         </CardHeader>
        //         <div>
        //             <CardContent>
        //                 <div className="line-clamp-6">
        //                     <FroalaEditorView model={model} />
        //                 </div>
        //             </CardContent>
        //             <div className="flex justify-end">
        //                 <Button className="rounded-none rounded-tl-xl rounded-br-xl">
        //                     Read more
        //                 </Button>
        //             </div>
        //         </div>
        //     </Card>
        //     <FroalaEditor
        //         model={model}
        //         onModelChange={setModel}
        //         tag="textarea"
        //         config={{
        //             saveInterval: 2000,
        //             events: {
        //                 "save.before": function (html) {
        //                     localStorage.setItem("savedHtml", html);
        //                 },
        //             },
        //         }}
        //     />
        // </div>
    );
}

export default Announcement;
Announcement.layout = (page) => <GuestLayout>{page}</GuestLayout>;
