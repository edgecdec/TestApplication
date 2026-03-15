import Link from "next/link";

const TITLE = "Air Ball! 🏀";
const SUBTITLE = "The page you're looking for doesn't exist — it may have been moved or deleted.";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-8xl mb-4">🏀</p>
      <h1 className="text-3xl font-bold mb-2">{TITLE}</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">{SUBTITLE}</p>
      <div className="flex gap-3">
        <Link href="/dashboard" className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
          Go to Dashboard
        </Link>
        <Link href="/" className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          Home
        </Link>
      </div>
    </main>
  );
}
