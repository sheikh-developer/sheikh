import { useState, useEffect } from 'react';
import { CONFIG } from '../config';
import type { NextPage } from 'next';

interface RateLimit {
    remaining: number;
    reset: number;
}

interface Stats {
    followed: string[];
    processed: string[];
    rateLimit: RateLimit;
    rate_limit_hits: number;
    errors: number;
    total_processed: number;
    lastUpdate: string | null;
}

interface Notification {
    type: 'success' | 'error';
    message: string;
}

interface StatCard {
    title: string;
    value: string | number;
    subtitle?: string;
    isText?: boolean;
}

const Dashboard: NextPage = () => {
    const [stats, setStats] = useState<Stats>({
        followed: [],
        processed: [],
        rateLimit: { remaining: 0, reset: 0 },
        rate_limit_hits: 0,
        errors: 0,
        total_processed: 0,
        lastUpdate: null
    });
    const [loading, setLoading] = useState<boolean>(true);
    const [autoStart, setAutoStart] = useState<boolean>(CONFIG.AUTO_START);
    const [notification, setNotification] = useState<Notification | null>(null);

    useEffect(() => {
        const pollStats = async (): Promise<void> => {
            try {
                const [statsRes, rateRes] = await Promise.all([
                    fetch('/api/follow'),
                    fetch('/api/rate-limit')
                ]);
                const [statsData, rateData] = await Promise.all([
                    statsRes.json(),
                    rateRes.json()
                ]);
                
                setStats((prev: Stats) => ({
                    ...prev,
                    ...statsData,
                    rateLimit: rateData,
                    lastUpdate: new Date().toISOString()
                }));

                if (rateData.remaining < 100) {
                    setNotification({
                        type: 'error',
                        message: `Rate limit running low: ${rateData.remaining} remaining`
                    });
                }
            } catch (error) {
                setNotification({
                    type: 'error',
                    message: 'Failed to fetch stats'
                });
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

    const toggleAutoStart = (): void => {
        setAutoStart(!autoStart);
    };

    const statCards: StatCard[] = [
        {
            title: 'Recently Followed',
            value: stats.followed.length
        },
        {
            title: 'API Rate Limit',
            value: stats.rateLimit.remaining,
            subtitle: `Resets in ${Math.round((stats.rateLimit.reset - Date.now()/1000)/60)} minutes`
        },
        {
            title: 'Processed Users',
            value: stats.total_processed
        },
        {
            title: 'Rate Limit Hits',
            value: stats.rate_limit_hits
        },
        {
            title: 'Errors',
            value: stats.errors
        },
        {
            title: 'Last Update',
            value: stats.lastUpdate ? new Date(stats.lastUpdate).toLocaleString() : 'Never',
            isText: true
        }
    ];

    return (
        <div className="min-h-screen bg-gray-100" data-testid="dashboard">
            {notification && (
                <div className={`fixed top-4 right-4 p-4 rounded-md shadow-lg ${
                    notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'
                } text-white`}>
                    {notification.message}
                </div>
            )}
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        RecentCoders Dashboard
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <dl className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                            <dt className="text-sm text-gray-400">Total Processed</dt>
                            <dd className="text-2xl font-bold">{stats.total_processed}</dd>
                        </dl>
                        <dl className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                            <dt className="text-sm text-gray-400">Rate Limit Hits</dt>
                            <dd className="text-2xl font-bold">{stats.rate_limit_hits}</dd>
                        </dl>
                        <dl className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                            <dt className="text-sm text-gray-400">Errors</dt>
                            <dd className="text-2xl font-bold">{stats.errors}</dd>
                        </dl>
                        <dl className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                            <dt className="text-sm text-gray-400">Consecutive Actions</dt>
                            <dd className="text-2xl font-bold">{stats.consecutive_actions}</dd>
                        </dl>
                        <dl className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                            <dt className="text-sm text-gray-400">Last Update</dt>
                            <dd className="text-2xl font-bold">{new Date(stats.timestamp).toLocaleString()}</dd>
                        </dl>
                    </div>
                )}
            </div>

            {autoStart && (
                <div className="fixed bottom-4 right-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
