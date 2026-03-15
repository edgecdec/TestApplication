"use client";

const TITLE = "Something went wrong";
const SUBTITLE = "An unexpected error occurred. Please try again.";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-8xl mb-4">😵</p>
      <h1 className="text-3xl font-bold mb-2">{TITLE}</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">{SUBTITLE}</p>
      {process.env.NODE_ENV === "development" && error.message && (
        <pre className="mb-4 max-w-lg text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded overflow-auto">
          {error.message}
        </pre>
      )}
      <div className="flex gap-3">
        <button onClick={reset} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
          Try Again
        </button>
        <a href="/dashboard" className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          Go to Dashboard
        </a>
      </div>
    </main>
  );
}
