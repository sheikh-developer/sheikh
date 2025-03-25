import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Custom500(): JSX.Element {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page after 5 seconds
    const timer = setTimeout(() => {
      router.push('/');
    }, 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">500</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Server Error
        </h2>
        <p className="text-gray-600 mb-8">
          Something went wrong on our end. We're working to fix it.
        </p>
        <button
          onClick={() => router.push('/')}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-2 rounded-md transition-colors"
        >
          Return Home
        </button>
      </div>
    </div>
  );
} 