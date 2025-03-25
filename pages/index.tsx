import { useState, useEffect } from 'react';
import { CONFIG } from '../config';

interface Stats {
  followed: string[];
  processed: string[];
  rateLimit: {
    remaining: number;
    reset: number;
  };
  rate_limit_hits: number;
  errors: number;
  total_processed: number;
  lastUpdate: string | null;
}

export default function Dashboard() {
    const [stats, setStats] = useState<Stats>({
        followed: [],
        processed: [],
        rateLimit: { remaining: 0, reset: 0 },
        rate_limit_hits: 0,
        errors: 0,
        total_processed: 0,
        lastUpdate: null
    });
    const [loading, setLoading] = useState(true);
    const [autoStart, setAutoStart] = useState(CONFIG.AUTO_START);

    useEffect(() => {
        const pollStats = async () => {
            try {
                const [statsRes, rateRes] = await Promise.all([
                    fetch('/api/follow'),
                    fetch('/api/rate-limit')
                ]);
                const [statsData, rateData] = await Promise.all([
                    statsRes.json(),
                    rateRes.json()
                ]);
                
                setStats(prev => ({
                    ...prev,
                    ...statsData,
                    rateLimit: rateData,
                    lastUpdate: new Date().toISOString()
                }));
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            } finally {
                setLoading(false);
            }
        };

        if (autoStart) {
            pollStats();
        }

        const interval = setInterval(() => {
            if (autoStart) {
                pollStats();
            }
        }, CONFIG.MONITORING.UPDATE_INTERVAL);

        return () => clearInterval(interval);
    }, [autoStart]);

    const toggleAutoStart = () => {
        setAutoStart(!autoStart);
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        GitHub Follower Dashboard
                    </h1>
                    <button
                        onClick={toggleAutoStart}
                        className={`px-4 py-2 rounded-md ${
                            autoStart 
                                ? 'bg-red-500 hover:bg-red-600' 
                                : 'bg-green-500 hover:bg-green-600'
                        } text-white font-medium`}
                    >
                        {autoStart ? 'Stop Auto-Start' : 'Start Auto-Start'}
                    </button>
                </div>
                
                {loading ? (
                    <div className="animate-pulse flex space-x-4">
                        <div className="flex-1 space-y-4 py-1">
                            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                            <div className="space-y-2">
                                <div className="h-4 bg-gray-300 rounded"></div>
                                <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <dt className="text-sm font-medium text-gray-500">
                                    Recently Followed
                                </dt>
                                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                                    {stats.followed.length}
                                </dd>
                            </div>
                        </div>

                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <dt className="text-sm font-medium text-gray-500">
                                    API Rate Limit
                                </dt>
                                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                                    {stats.rateLimit.remaining}
                                </dd>
                                <p className="text-sm text-gray-500">
                                    Resets in {Math.round((stats.rateLimit.reset - Date.now()/1000)/60)} minutes
                                </p>
                            </div>
                        </div>

                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <dt className="text-sm font-medium text-gray-500">
                                    Processed Users
                                </dt>
                                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                                    {stats.total_processed}
                                </dd>
                            </div>
                        </div>

                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <dt className="text-sm font-medium text-gray-500">
                                    Rate Limit Hits
                                </dt>
                                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                                    {stats.rate_limit_hits}
                                </dd>
                            </div>
                        </div>

                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <dt className="text-sm font-medium text-gray-500">
                                    Errors
                                </dt>
                                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                                    {stats.errors}
                                </dd>
                            </div>
                        </div>

                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <dt className="text-sm font-medium text-gray-500">
                                    Last Update
                                </dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    {stats.lastUpdate ? new Date(stats.lastUpdate).toLocaleString() : 'Never'}
                                </dd>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
