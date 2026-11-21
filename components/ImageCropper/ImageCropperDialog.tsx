"use client";

import React from "react";
import { Modal, ModalOverlay, ModalContent } from "@chakra-ui/react";
import { Crop, X } from "lucide-react";
import { cn } from "@/lib/utils";
import ImageCropper from "@/components/ImageCropper/ImageCropper";

interface ImageCropperDialogProps {
    open: boolean;
    onClose: () => void;
    src: string | null;
    onCropped: (blob: Blob) => void;
    aspect?: number;
    cropShape?: "rect" | "round";
    title?: string;
}

/**
 * Portalled image cropper.
 *
 * Uses a Chakra `Modal` so the cropper is always stacked ABOVE whatever
 * drawer/dialog opened it. Chakra appends the modal portal node to
 * `document.body` after the parent drawer's portal node, so painting order
 * is correct on every viewport (the old hand-rolled `fixed z-[10000]` overlay
 * was trapped inside an ancestor stacking context and rendered behind the
 * drawer on mobile). It also plugs into Chakra's modal manager so the focus
 * lock, Esc handling and overlay-click handling move to the cropper.
 */
const ImageCropperDialog = ({
    open,
    onClose,
    src,
    onCropped,
    aspect = 1,
    cropShape = "round",
    title = "Crop & Adjust Avatar",
}: ImageCropperDialogProps) => {
    const handleCropped = (blob: Blob) => {
        onCropped(blob);
        onClose();
    };

    return (
        <Modal
            isOpen={open && !!src}
            onClose={onClose}
            isCentered
            size="md"
            motionPreset="scale"
            blockScrollOnMount={false}
        >
            <ModalOverlay bg="black/80" backdropFilter="blur(4px)" />

            <ModalContent
                bg="white"
                boxShadow="2xl"
                sx={{ _dark: { bg: "neutral.900" } }}
                className={cn(
                    // Neutralise the global `[data-focus-lock-disabled] > [role="dialog"] > * { height: 100dvh }`
                    // drawer hack for this dialog only.
                    "[&>*]:!h-auto",
                    "w-[calc(100%-1.5rem)] max-w-md max-h-[92dvh] p-0 overflow-hidden",
                    "border border-neutral-200 dark:border-neutral-800"
                )}
            >
                {/* ── Header ── */}
                <div className="shrink-0 p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 shrink-0 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Crop size={15} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white truncate">
                            {title}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close cropper"
                        className="p-1.5 shrink-0 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* ── Cropper ── */}
                <div className="flex-1 min-h-0 w-full overflow-y-auto overscroll-contain">
                    {src && (
                        <ImageCropper
                            key={src}
                            src={src}
                            aspect={aspect}
                            cropShape={cropShape}
                            onCropped={handleCropped}
                            onCancel={onClose}
                        />
                    )}
                </div>
            </ModalContent>
        </Modal>
    );
};

export default ImageCropperDialog;
