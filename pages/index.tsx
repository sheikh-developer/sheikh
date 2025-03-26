import { useState, useEffect, useCallback, useMemo } from 'react';
import { CONFIG } from '../config';
import type { NextPage } from 'next';
import Head from 'next/head';
import type { ReactElement } from 'react';

interface RateLimit {
    remaining: number;
    reset: number;
}

interface PaginationInfo {
    current_page: number;
    total_pages: number;
    total_followers: number;
    limit: number;
}

interface Stats {
    followed: string[];
    processed: string[];
    rateLimit: RateLimit;
    rate_limit_hits: number;
    errors: number;
    total_processed: number;
    lastUpdate: string | null;
    pagination?: PaginationInfo;
}

interface Notification {
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
    timestamp: string;
}

interface StatCard {
    title: string;
    value: string | number;
    subtitle?: string;
    isText?: boolean;
    icon?: string;
    color?: string;
}

interface ActivityLog {
    action: string;
    timestamp: string;
    status: 'success' | 'error' | 'info';
    details?: string;
}

const NOTIFICATION_TIMEOUT = 5000;

const Dashboard: NextPage = (): ReactElement => {
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
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [showLogs, setShowLogs] = useState<boolean>(true);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);

    const addNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
        const id = Date.now().toString();
        const notification = {
            id,
            type,
            message,
            timestamp: new Date().toLocaleString()
        };
        setNotifications((prev: Notification[]) => [...prev, notification]);
        setTimeout(() => {
            setNotifications((prev: Notification[]) => prev.filter((n: Notification) => n.id !== id));
        }, NOTIFICATION_TIMEOUT);
    }, []);

    const addActivityLog = useCallback((log: ActivityLog) => {
        setActivityLogs((prev: ActivityLog[]) => [log, ...prev].slice(0, 100));
    }, []);

    const pollStats = useCallback(async (): Promise<void> => {
        try {
            const limit = 5; // Match the default in the API
            
            // Add page and limit parameters to the follow API request
            const [statsRes, rateRes] = await Promise.all([
                fetch(`/api/follow?page=${currentPage}&limit=${limit}`),
                fetch('/api/rate-limit')
            ]);

            // Add error details for debugging
            if (!statsRes.ok) {
                const errorText = await statsRes.text();
                addNotification('error', `Follow API error: ${statsRes.status} - ${errorText.substring(0, 50)}`);
                console.error('Follow API error:', statsRes.status, errorText);
                throw new Error(`Follow API error: ${statsRes.status}`);
            }
            
            if (!rateRes.ok) {
                const errorText = await rateRes.text();
                addNotification('error', `Rate limit API error: ${rateRes.status} - ${errorText.substring(0, 50)}`);
                console.error('Rate limit API error:', rateRes.status, errorText);
                throw new Error(`Rate limit API error: ${rateRes.status}`);
            }

            const [statsData, rateData] = await Promise.all([
                statsRes.json(),
                rateRes.json()
            ]);
            
            // Update pagination state if available
            if (statsData.pagination) {
                setTotalPages(statsData.pagination.total_pages);
                
                addActivityLog({
                    action: 'Pagination',
                    timestamp: new Date().toISOString(),
                    status: 'info',
                    details: `Page ${statsData.pagination.current_page}/${statsData.pagination.total_pages}, ${statsData.pagination.total_followers} total followers`
                });
            }
            
            setStats(prev => ({
                ...prev,
                ...statsData,
                rateLimit: rateData,
                lastUpdate: new Date().toISOString()
            }));

            // Add activity logs
            if (statsData.followed && statsData.followed.length > 0) {
                addActivityLog({
                    action: 'Follow Operation',
                    timestamp: new Date().toISOString(),
                    status: 'success',
                    details: `Followed ${statsData.followed.length} new users`
                });
            }

            if (rateData.remaining < 100) {
                addNotification('error', `Rate limit running low: ${rateData.remaining} remaining`);
                addActivityLog({
                    action: 'Rate Limit Warning',
                    timestamp: new Date().toISOString(),
                    status: 'error',
                    details: `Remaining calls: ${rateData.remaining}`
                });
            }
        } catch (error) {
            addNotification('error', 'Failed to fetch stats');
            addActivityLog({
                action: 'API Error',
                timestamp: new Date().toISOString(),
                status: 'error',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    }, [addNotification, addActivityLog, currentPage, setTotalPages]);

    useEffect(() => {
        if (autoStart) {
            // Reset to page 1 when starting auto-refresh
            setCurrentPage(1);
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
        setAutoStart((prev: boolean) => {
            const newState = !prev;
            addActivityLog({
                action: 'Auto-Start Toggle',
                timestamp: new Date().toISOString(),
                status: 'info',
                details: `Auto-start ${newState ? 'enabled' : 'disabled'}`
            });
            return newState;
        });
    }, [addActivityLog]);

    const calculateResetTime = useCallback((resetTime: number): string => {
        const minutesRemaining = Math.max(0, Math.round((resetTime - Date.now()/1000)/60));
        return `Resets in ${minutesRemaining} minute${minutesRemaining === 1 ? '' : 's'}`;
    }, []);

    const statCards: StatCard[] = useMemo(() => [
        {
            title: 'Recently Followed',
            value: stats.followed.length,
            icon: '👥',
            color: 'bg-green-500'
        },
        {
            title: 'API Rate Limit',
            value: stats.rateLimit.remaining,
            subtitle: calculateResetTime(stats.rateLimit.reset),
            icon: '⚡',
            color: 'bg-blue-500'
        },
        {
            title: 'Processed Users',
            value: stats.total_processed,
            icon: '🔄',
            color: 'bg-purple-500'
        },
        {
            title: 'Rate Limit Hits',
            value: stats.rate_limit_hits,
            icon: '⚠️',
            color: 'bg-yellow-500'
        },
        {
            title: 'Errors',
            value: stats.errors,
            icon: '❌',
            color: 'bg-red-500'
        },
        {
            title: 'Last Update',
            value: stats.lastUpdate ? new Date(stats.lastUpdate).toLocaleString() : 'Never',
            icon: '🕒',
            color: 'bg-gray-500',
            isText: true
        }
    ], [stats, calculateResetTime]);

    return (
        <div className="min-h-screen bg-gray-100" role="main">
            <Head>
                <title>GitHub Follower Dashboard</title>
                <meta name="description" content="Monitor your GitHub follower automation" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            {/* Notifications */}
            <div aria-live="polite" className="fixed top-4 right-4 z-50 space-y-2">
                {notifications.map((notification) => (
                    <div
                        key={notification.id}
                        className={`p-4 rounded-md shadow-lg ${
                            notification.type === 'error' ? 'bg-red-500' :
                            notification.type === 'success' ? 'bg-green-500' :
                            'bg-blue-500'
                        } text-white flex items-center space-x-2`}
                        role="alert"
                    >
                        <span className="text-lg">
                            {notification.type === 'error' ? '❌' :
                             notification.type === 'success' ? '✅' : 'ℹ️'}
                        </span>
                        <div>
                            <p className="font-medium">{notification.message}</p>
                            <p className="text-sm opacity-75">{notification.timestamp}</p>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            GitHub Follower Dashboard
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Monitoring automation for {CONFIG.TARGET_USER}
                        </p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setShowLogs(!showLogs)}
                            className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition-colors"
                        >
                            {showLogs ? 'Hide Logs' : 'Show Logs'}
                        </button>
                        <button
                            onClick={toggleAutoStart}
                            className={`px-4 py-2 rounded-md ${
                                autoStart 
                                    ? 'bg-red-500 hover:bg-red-600' 
                                    : 'bg-green-500 hover:bg-green-600'
                            } text-white font-medium transition-colors`}
                            aria-label={autoStart ? 'Stop auto refresh' : 'Start auto refresh'}
                        >
                            {autoStart ? 'Stop Auto-Start' : 'Start Auto-Start'}
                        </button>
                    </div>
                </div>
                
                {/* Stats Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="animate-pulse bg-white rounded-lg shadow p-6">
                                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {statCards.map((stat, index) => (
                            <div 
                                key={index} 
                                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
                            >
                                <div className="p-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-medium text-gray-500 flex items-center">
                                            <span className="mr-2">{stat.icon}</span>
                                            {stat.title}
                                        </h3>
                                        <div className={`w-2 h-2 rounded-full ${stat.color}`}></div>
                                    </div>
                                    <p className={`mt-2 ${stat.isText ? 'text-sm' : 'text-3xl font-semibold'} text-gray-900`}>
                                        {stat.value}
                                    </p>
                                    {stat.subtitle && (
                                        <p className="mt-1 text-sm text-gray-500">
                                            {stat.subtitle}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Activity Logs */}
                {showLogs && (
                    <div className="mt-8">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Activity Logs</h2>
                        <div className="bg-white shadow rounded-lg overflow-hidden">
                            <div className="max-h-96 overflow-y-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Time
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Action
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Details
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {activityLogs.map((log, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(log.timestamp).toLocaleTimeString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {log.action}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        log.status === 'success' ? 'bg-green-100 text-green-800' :
                                                        log.status === 'error' ? 'bg-red-100 text-red-800' :
                                                        'bg-blue-100 text-blue-800'
                                                    }`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {log.details}
                                                </td>
                                            </tr>
                                        ))}
                                        {activityLogs.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                                                    No activity logs yet
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pagination Controls */}
                {!loading && stats.pagination && (
                    <div className="mt-8 flex justify-center">
                        <nav className="flex items-center bg-white p-2 rounded-md shadow">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className={`px-3 py-1 rounded-l-md ${
                                    currentPage === 1 
                                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                } transition-colors`}
                            >
                                Previous
                            </button>
                            <span className="px-4 py-1 bg-gray-100 text-gray-700">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className={`px-3 py-1 rounded-r-md ${
                                    currentPage === totalPages || totalPages === 0
                                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                } transition-colors`}
                            >
                                Next
                            </button>
                        </nav>
                    </div>
                )}
            </div>

            {/* Loading Indicator */}
            {autoStart && (
                <div className="fixed bottom-4 right-4 flex items-center space-x-2 bg-white rounded-full px-4 py-2 shadow-lg" role="status">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-900 border-t-transparent"></div>
                    <span className="text-sm text-gray-700">Refreshing data...</span>
                </div>
            )}
        </div>
    );
}

export default Dashboard;