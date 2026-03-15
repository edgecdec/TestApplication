export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">🏀 March Madness Picker</h1>
      <p className="text-lg text-gray-600 mb-8">
        Fill out your bracket and compete with friends.
      </p>
      <div className="flex gap-4">
        <a
          href="/login"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Log In
        </a>
        <a
          href="/register"
          className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
        >
          Register
        </a>
      </div>
    </main>
  );
}
