import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Custom404(): JSX.Element {
  const router = useRouter();

  useEffect(() => {
    // Check if the error is from an API endpoint
    if (router.asPath.startsWith('/api/')) {
      // Redirect to home page after 3 seconds
      const timer = setTimeout(() => {
        router.push('/');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          {router.asPath.startsWith('/api/') 
            ? 'API Endpoint Not Found' 
            : 'Page Not Found'}
        </h2>
        <p className="text-gray-600 mb-8">
          {router.asPath.startsWith('/api/')
            ? 'The API endpoint you are looking for does not exist or is temporarily unavailable.'
            : 'The page you are looking for does not exist.'}
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