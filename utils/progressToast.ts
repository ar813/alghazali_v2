import { toast } from 'sonner';

/**
 * Wraps an asynchronous operation with a toast that simulates progress from 1% to 99%.
 * When the promise resolves, it shows the success message.
 * When the promise rejects, it shows the error message.
 * 
 * @param promiseFn The asynchronous function to execute
 * @param loadingMessage The initial loading message (e.g., "Saving...")
 * @param successMessage The success message
 * @param errorMessage The error message or a function that receives the error and returns a string
 */
export async function withProgressToast<T>(
  promiseFn: () => Promise<T>,
  loadingMessage: string,
  successMessage: string,
  errorMessage: string | ((error: any) => string) = 'An error occurred'
): Promise<T> {
  const toastId = toast.loading(`${loadingMessage} (1%)`);
  let progress = 1;

  // Simulate progress up to 99%
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 10) + 5; // increment by 5-15%
    if (progress > 99) progress = 99;
    toast.loading(`${loadingMessage} (${progress}%)`, { id: toastId });
  }, 400);

  try {
    const result = await promiseFn();
    clearInterval(interval);
    toast.success(successMessage, { id: toastId });
    return result;
  } catch (error) {
    clearInterval(interval);
    const msg = typeof errorMessage === 'function' ? errorMessage(error) : errorMessage;
    toast.error(msg, { id: toastId });
    throw error;
  }
}
