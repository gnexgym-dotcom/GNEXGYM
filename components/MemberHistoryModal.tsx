import React from 'react';
import { Member, HistoryEntryType } from '../types';
import { XIcon, HistoryIcon, CashIcon, ClipboardIcon, DumbbellIcon } from './icons/Icons';

export const MemberHistoryModal: React.FC<{ member: Member | null; onClose: () => void }> = ({ member, onClose }) => {
    if (!member) return null;

    const formatDateTime = (isoString: string) => {
        const date = new Date(isoString);
        return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    };
    
    const getEntryIcon = (type: HistoryEntryType) => {
        switch (type) {
            case 'payment':
                return <div className="p-2 bg-green-500/20 rounded-full"><CashIcon className="w-5 h-5 text-green-400" /></div>;
            case 'status_change':
                return <div className="p-2 bg-blue-500/20 rounded-full"><ClipboardIcon className="w-5 h-5 text-blue-400" /></div>;
            case 'session_update':
                return <div className="p-2 bg-orange-500/20 rounded-full"><DumbbellIcon className="w-5 h-5 text-orange-400" /></div>;
            case 'note':
            default:
                return <div className="p-2 bg-gray-500/20 rounded-full"><HistoryIcon className="w-5 h-5 text-gray-400" /></div>;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 transition-opacity" aria-modal="true" role="dialog">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-2xl m-4 border border-gray-700 animate-fade-in-up max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
                    <div className="flex items-center">
                        <HistoryIcon className="w-8 h-8 mr-3 text-brand-secondary" />
                        <div>
                            <h2 className="text-2xl font-bold text-white">Member History</h2>
                            <p className="text-gray-400">{member.name} ({member.id})</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 pr-2">
                    {member.history && member.history.length > 0 ? (
                        <ul className="space-y-3">
                            {member.history.map((entry, index) => (
                                <li key={index} className="flex items-start gap-4 p-3 bg-gray-700/50 rounded-lg">
                                    <div className="flex-shrink-0 mt-1">{getEntryIcon(entry.type)}</div>
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-white">{entry.title}</p>
                                                {entry.details && <p className="text-sm text-gray-300 mt-1">{entry.details}</p>}
                                            </div>
                                            <span className="text-xs text-gray-400 font-mono flex-shrink-0 ml-4 text-right">{formatDateTime(entry.timestamp)}</span>
                                        </div>
                                        {entry.type === 'payment' && typeof entry.paymentAmount === 'number' && (
                                            <p className="font-semibold text-brand-primary mt-1 text-right">
                                                Amount: ₱{entry.paymentAmount.toFixed(2)}
                                            </p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center p-8">
                            <p className="text-gray-400">No history available for this member.</p>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="py-2 px-6 rounded-lg bg-brand-primary hover:opacity-90 text-gray-900 font-bold transition">Close</button>
                </div>
            </div>
        </div>
    );
};