import React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

interface DeletePhotoConfirmationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    title?: string;
    description?: string;
}

const DeletePhotoConfirmationDialog = ({ 
    open, 
    onOpenChange, 
    onConfirm,
    title = "Remove Profile Photo",
    description = "Are you sure you want to remove this profile picture? This action cannot be undone."
}: DeletePhotoConfirmationDialogProps) => {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            {/* The backdrop blur is typically handled by the AlertDialogOverlay in ui/alert-dialog.tsx */}
            <AlertDialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-none p-0 overflow-hidden border-neutral-200 dark:border-neutral-800 shadow-2xl gap-0 z-[10000] bg-white dark:bg-neutral-950">

                {/* Header Section with Icon */}
                <div className="flex flex-col items-center pt-8 pb-4 px-6 text-center">
                    <div className="w-14 h-14 bg-red-50 dark:bg-red-950/30 rounded-lg flex items-center justify-center text-red-500 mb-4 border border-red-100 dark:border-red-900/50 shadow-sm">
                        <Trash2 size={24} strokeWidth={2.5} />
                    </div>
                    <AlertDialogTitle className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                        {title}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed max-w-[260px]">
                        {description}
                    </AlertDialogDescription>
                </div>

                {/* Footer Actions */}
                <AlertDialogFooter className="p-4 bg-neutral-50 dark:bg-neutral-900/50 border-t border-neutral-100 dark:border-neutral-800 flex-col-reverse sm:flex-row sm:justify-center gap-3">
                    <AlertDialogCancel
                        className="w-full sm:w-1/2 h-11 rounded-none border-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 font-semibold m-0"
                    >
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="w-full sm:w-1/2 h-11 rounded-none bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg shadow-red-500/20 m-0"
                    >
                        Confirm Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default DeletePhotoConfirmationDialog;
