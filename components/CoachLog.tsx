import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { CheckinRecord, Member, WalkinClient } from '../types';
import { CoachLogIcon, DumbbellIcon, UserIcon, CheckCircleIcon, XCircleIcon, WarningIcon } from './icons/Icons';
import { formatTime, getTodayYMD } from '../utils/dateUtils';

interface CoachLogProps {
    checkinRecords: CheckinRecord[];
    members: Member[];
    walkinClients: WalkinClient[];
    markSessionComplete: (memberId: string) => void;
    useSessionForWalkinClient: (clientId: string) => { success: boolean; message: string };
    addCheckinRecord: (record: Omit<CheckinRecord, 'id' | 'timestamp'>) => void;
    sessionCompletionMessage: { type: 'success' | 'error' | 'info', text: string } | null;
    clearSessionCompletionMessage: () => void;
    markRecordSessionCompleted: (recordId: string) => void;
}

type CoachedClients = Record<string, CheckinRecord[]>;

const ToastNotification: React.FC<{ type: 'success' | 'error' | 'info', message: string }> = ({ type, message }) => {
    const baseClasses = "fixed top-20 right-8 z-50 animate-fade-in-up text-white py-3 px-6 rounded-lg shadow-lg flex items-center max-w-md";
    let typeClasses = '';
    let Icon = CheckCircleIcon;

    switch (type) {
        case 'success':
            typeClasses = 'bg-green-600';
            Icon = CheckCircleIcon;
            break;
        case 'error':
            typeClasses = 'bg-red-600';
            Icon = XCircleIcon;
            break;
        case 'info':
            typeClasses = 'bg-yellow-600';
            Icon = WarningIcon;
            break;
    }

    return (
        <div role="alert" aria-live="assertive" className={`${baseClasses} ${typeClasses}`}>
            <Icon className="w-6 h-6 mr-3 flex-shrink-0" />
            <p>{message}</p>
        </div>
    );
};

export const CoachLog: React.FC<CoachLogProps> = ({ 
    checkinRecords, 
    members, 
    walkinClients,
    markSessionComplete, 
    useSessionForWalkinClient,
    addCheckinRecord,
    sessionCompletionMessage, 
    clearSessionCompletionMessage,
    markRecordSessionCompleted
}) => {
    const [localMessage, setLocalMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
    
    useEffect(() => {
        if (sessionCompletionMessage) {
            const timer = setTimeout(clearSessionCompletionMessage, 5000);
            return () => clearTimeout(timer);
        }
    }, [sessionCompletionMessage, clearSessionCompletionMessage]);

    useEffect(() => {
        if (localMessage) {
            const timer = setTimeout(() => setLocalMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [localMessage]);

    const coachesWithClients = useMemo(() => {
        const todayStr = getTodayYMD();
        
        const todaysCoachedRecords = checkinRecords.filter(r => 
            r.timestamp.startsWith(todayStr) && 
            r.status === 'Confirmed' &&
            r.coachAssigned
        );

        return todaysCoachedRecords.reduce((acc, record) => {
            const coachName = record.coachAssigned!;
            if (!acc[coachName]) {
                acc[coachName] = [];
            }
            acc[coachName].push(record);
            return acc;
        }, {} as CoachedClients);

    }, [checkinRecords]);

    const coachNames = Object.keys(coachesWithClients);

    const handleMarkComplete = useCallback((record: CheckinRecord) => {
        if (!record.gymNumber) {
            alert("This action is only available for members.");
            return;
        }
        markSessionComplete(record.gymNumber);
    }, [markSessionComplete]);

    const handleWalkinSessionComplete = useCallback((record: CheckinRecord, isSingleSession: boolean) => {
        if (!record.walkinClientId) {
            setLocalMessage({ type: 'error', text: 'Client ID not found for this walk-in.' });
            return;
        }
    
        if (isSingleSession) {
            // This is a single-use walk-in (e.g., Walk-in PT). Mark the session as completed on the original checkin record
            // to prevent creating duplicate log entries.
            markRecordSessionCompleted(record.id);
            setLocalMessage({ type: 'success', text: `Session marked as complete for ${record.name}.` });
        } else {
            // This is a client with a multi-session plan (e.g., Taekwondo).
            // This is the ONLY place multi-use sessions should be consumed.
            const result = useSessionForWalkinClient(record.walkinClientId);
            if (result.success) {
                // Also mark the record as complete to disable the button
                markRecordSessionCompleted(record.id);
            }
            setLocalMessage({ type: result.success ? 'success' : 'error', text: result.message });
        }
    }, [useSessionForWalkinClient, markRecordSessionCompleted]);
    
    const activeMessage = sessionCompletionMessage || localMessage;

    return (
        <div className="space-y-8">
            {activeMessage && <ToastNotification type={activeMessage.type} message={activeMessage.text} />}

            <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                <div className="flex items-center">
                    <CoachLogIcon className="w-8 h-8 text-brand-primary mr-4"/>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Coach Activity Log</h2>
                        <p className="text-gray-400">Client assignments for today, {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.</p>
                    </div>
                </div>
            </div>

            {coachNames.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {coachNames.map(coachName => (
                        <div key={coachName} className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 flex flex-col">
                            <div className="p-4 border-b border-gray-700">
                                <h3 className="text-lg font-bold text-brand-secondary">{coachName}</h3>
                                <p className="text-sm text-gray-400">
                                    {coachesWithClients[coachName].length} {coachesWithClients[coachName].length === 1 ? 'client' : 'clients'} today
                                </p>
                            </div>
                            <ul className="divide-y divide-gray-700/50 p-2 flex-1">
                                {coachesWithClients[coachName]
                                    .sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                                    .map(record => {
                                        const todayStr = getTodayYMD();

                                        if (record.type === 'Member' && record.gymNumber) {
                                            const member = members.find(m => m.id === record.gymNumber);
                                            const sessionUsedToday = member?.history?.some(
                                                entry => entry.type === 'session_update' &&
                                                         entry.title === 'Session Marked Complete' &&
                                                         entry.timestamp.startsWith(todayStr)
                                            ) ?? false;

                                            return (
                                                <li key={record.id} className="p-3 flex items-center justify-between">
                                                    <div className="flex items-center">
                                                        <div className="p-2 rounded-full mr-3 bg-blue-500/20"><UserIcon className="w-5 h-5 text-blue-400" /></div>
                                                        <div><p className="font-semibold text-white">{record.name}</p><p className="text-xs text-gray-400">{record.type}</p></div>
                                                    </div>
                                                    <div className="flex items-center gap-x-4">
                                                        <span className="text-sm font-mono text-gray-300 bg-gray-700 px-2 py-1 rounded-md">{formatTime(record.timestamp)}</span>
                                                        <button onClick={() => handleMarkComplete(record)} disabled={sessionUsedToday} className={`flex items-center font-bold py-1 px-3 rounded-lg transition-colors duration-200 text-xs ${sessionUsedToday ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white'}`}><CheckCircleIcon className="w-4 h-4 mr-1.5" />{sessionUsedToday ? 'Completed' : 'Session Done'}</button>
                                                    </div>
                                                </li>
                                            );
                                        } else if (record.type === 'Walk-in' && record.walkinClientId) {
                                            const walkinClient = walkinClients.find(c => c.id === record.walkinClientId);
                                            
                                            const sessionUsedTodayByKiosk = checkinRecords.some(r => 
                                                r.walkinClientId === record.walkinClientId && 
                                                r.timestamp.startsWith(todayStr) && 
                                                r.paymentDetails?.plan.toLowerCase().includes('used session') &&
                                                r.id !== record.id // Exclude the current record itself from this check
                                            );
                                            const sessionUsedTodayByLog = walkinClient?.sessionPlan?.lastSessionUsedDate === todayStr;
                                            const sessionUsedToday = sessionUsedTodayByKiosk || sessionUsedTodayByLog || record.sessionCompleted;

                                            const remainingSessions = walkinClient?.sessionPlan ? walkinClient.sessionPlan.total - walkinClient.sessionPlan.used : 0;
                                            const hasMultiSessionPlan = walkinClient?.sessionPlan && remainingSessions > 0;
                                            
                                            // A single-session walk-in (e.g., "Walk-in PT") is confirmed, needs a coach, but doesn't have a multi-session plan.
                                            const isSingleCoachedSession = record.needsCoach && !hasMultiSessionPlan;

                                            const canUseSession = hasMultiSessionPlan || isSingleCoachedSession;

                                            return (
                                                 <li key={record.id} className="p-3 flex items-center justify-between">
                                                    <div className="flex items-center">
                                                        <div className="p-2 rounded-full mr-3 bg-purple-500/20"><UserIcon className="w-5 h-5 text-purple-400" /></div>
                                                        <div><p className="font-semibold text-white">{record.name}</p><p className="text-xs text-gray-400">{record.className || record.type}</p></div>
                                                    </div>
                                                    <div className="flex items-center gap-x-4">
                                                        <span className="text-sm font-mono text-gray-300 bg-gray-700 px-2 py-1 rounded-md">{formatTime(record.timestamp)}</span>
                                                        {canUseSession && (
                                                             <button onClick={() => handleWalkinSessionComplete(record, isSingleCoachedSession)} disabled={sessionUsedToday} className={`flex items-center font-bold py-1 px-3 rounded-lg transition-colors duration-200 text-xs ${sessionUsedToday ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white'}`}><CheckCircleIcon className="w-4 h-4 mr-1.5" />{sessionUsedToday ? 'Completed' : 'Session Done'}</button>
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        }

                                        return (
                                             <li key={record.id} className="p-3 flex items-center justify-between opacity-70">
                                                <div className="flex items-center">
                                                    <div className="p-2 rounded-full mr-3 bg-purple-500/20"><UserIcon className="w-5 h-5 text-purple-400" /></div>
                                                    <div>
                                                        <p className="font-semibold text-white">{record.name}</p>
                                                        <p className="text-xs text-gray-400">{record.type}</p>
                                                    </div>
                                                </div>
                                                <span className="text-sm font-mono text-gray-300 bg-gray-700 px-2 py-1 rounded-md">{formatTime(record.timestamp)}</span>
                                             </li>
                                        )
                                    })}
                            </ul>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center bg-gray-800 p-12 rounded-xl border border-dashed border-gray-700">
                    <DumbbellIcon className="w-16 h-16 text-gray-600 mx-auto mb-4"/>
                    <h3 className="text-xl font-bold text-white">No Coach Activity Yet</h3>
                    <p className="text-gray-400 mt-2">No clients have been assigned to a coach today.</p>
                </div>
            )}
        </div>
    );
};