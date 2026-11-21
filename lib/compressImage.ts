/**
 * Downscale an image file to a bounded square-ish JPEG data URL.
 *
 * Admin/profile avatars are stored as base64 data URLs in Firestore, so the
 * output must stay small. The longest edge is capped at `max` pixels and the
 * JPEG quality at `quality` (default 0.7), which keeps avatars well under
 * Firestore's 1 MiB document limit.
 */
export const compressImage = (file: File, max = 400, quality = 0.7): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
        reader.onload = () => {
            const img = new window.Image();
            img.onerror = () => reject(new Error("Failed to decode image"));
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let { width, height } = img;

                if (width > height) {
                    if (width > max) {
                        height *= max / width;
                        width = max;
                    }
                } else if (height > max) {
                    width *= max / height;
                    height = max;
                }

                canvas.width = Math.max(1, Math.round(width));
                canvas.height = Math.max(1, Math.round(height));

                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Canvas is not available"));
                    return;
                }

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", quality));
            };
            img.src = reader.result as string;
        };

        reader.readAsDataURL(file);
    });

/**
 * Resolve a possibly remote image URL into something safe to draw onto a
 * canvas. Remote URLs taint the canvas (which makes `toDataURL` throw), so we
 * transparently re-host them as a local blob URL first.
 */
export const toLocalImageSource = async (src: string): Promise<string> => {
    if (src.startsWith("data:") || src.startsWith("blob:")) return src;
    try {
        const res = await fetch(src);
        const blob = await res.blob();
        return URL.createObjectURL(blob);
    } catch {
        return src;
    }
};
