import { useState, useEffect, useCallback, useMemo } from 'react';
import { CONFIG } from '../config';

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
    id: string;
    type: 'success' | 'error';
    message: string;
}

interface StatCard {
    title: string;
    value: string | number;
    subtitle?: string;
    isText?: boolean;
}

const NOTIFICATION_TIMEOUT = 5000;

export default function Dashboard(): JSX.Element {
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
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const addNotification = useCallback((type: 'success' | 'error', message: string) => {
        const id = Date.now().toString();
        setNotifications((prev: Notification[]) => [...prev, { id, type, message }]);
        setTimeout(() => {
            setNotifications((prev: Notification[]) => prev.filter((n: Notification) => n.id !== id));
        }, NOTIFICATION_TIMEOUT);
    }, []);

    const pollStats = useCallback(async (): Promise<void> => {
        try {
            const [statsRes, rateRes] = await Promise.all([
                fetch('/api/follow'),
                fetch('/api/rate-limit')
            ]);

            if (!statsRes.ok || !rateRes.ok) {
                throw new Error('API request failed');
            }

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
                addNotification('error', `Rate limit running low: ${rateData.remaining} remaining`);
            }
        } catch (error) {
            addNotification('error', 'Failed to fetch stats');
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    }, [addNotification]);

    useEffect(() => {
        if (autoStart) {
            pollStats();
        }

        const interval = setInterval(() => {
            if (autoStart) {
                pollStats();
            }
        }, CONFIG.MONITORING.UPDATE_INTERVAL);

        return () => clearInterval(interval);
    }, [autoStart, pollStats]);

    const toggleAutoStart = useCallback((): void => {
        setAutoStart((prev: boolean) => !prev);
    }, []);

    const calculateResetTime = useCallback((resetTime: number): string => {
        const minutesRemaining = Math.max(0, Math.round((resetTime - Date.now()/1000)/60));
        return `Resets in ${minutesRemaining} minute${minutesRemaining === 1 ? '' : 's'}`;
    }, []);

    const statCards: StatCard[] = useMemo(() => [
        {
            title: 'Recently Followed',
            value: stats.followed.length
        },
        {
            title: 'API Rate Limit',
            value: stats.rateLimit.remaining,
            subtitle: calculateResetTime(stats.rateLimit.reset)
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
    ], [stats, calculateResetTime]);

    return (
        <div className="min-h-screen bg-gray-100" role="main">
            <div aria-live="polite" className="fixed top-4 right-4 space-y-2">
                {notifications.map((notification: Notification) => (
                    <div
                        key={notification.id}
                        className={`p-4 rounded-md shadow-lg ${
                            notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'
                        } text-white`}
                        role="alert"
                    >
                        {notification.message}
                    </div>
                ))}
            </div>
            
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
                        aria-label={autoStart ? 'Stop auto refresh' : 'Start auto refresh'}
                    >
                        {autoStart ? 'Stop Auto-Start' : 'Start Auto-Start'}
                    </button>
                </div>
                
                {loading ? (
                    <div className="animate-pulse flex space-x-4" role="progressbar">
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
                        {statCards.map((stat: StatCard, index: number) => (
                            <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
                                <div className="px-4 py-5 sm:p-6">
                                    <h3 className="text-sm font-medium text-gray-500">
                                        {stat.title}
                                    </h3>
                                    <p className={`mt-1 ${stat.isText ? 'text-sm' : 'text-3xl font-semibold'} text-gray-900`}>
                                        {stat.value}
                                    </p>
                                    {stat.subtitle && (
                                        <p className="text-sm text-gray-500">
                                            {stat.subtitle}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {autoStart && (
                <div className="fixed bottom-4 right-4" role="status">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    <span className="sr-only">Refreshing data...</span>
                </div>
            )}
        </div>
    );
}