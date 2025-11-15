

import React, { useState, useMemo } from 'react';
import { Member } from '../types';
import { SearchIcon, UserIcon } from './icons/Icons';

const statusColorMap: Record<string, string> = {
    'active': 'bg-green-500/20 text-green-400 border-green-500',
    'inactive': 'bg-gray-500/20 text-gray-400 border-gray-500',
    'frozen': 'bg-blue-500/20 text-blue-400 border-blue-500',
    'due': 'bg-red-500/20 text-red-400 border-red-500',
    'sessions': 'bg-orange-500/20 text-orange-400 border-orange-500',
};
const defaultStatusColor = 'bg-purple-500/20 text-purple-400 border-purple-500';

const formatDisplayDate = (dateString?: string | null): string => {
    if (!dateString) return 'N/A';
    const date = new Date(`${dateString}T00:00:00`);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const InfoItem: React.FC<{ label: string; value: React.ReactNode; className?: string }> = ({ label, value, className }) => (
    <div className={className}>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-lg font-semibold text-white">{value || 'N/A'}</p>
    </div>
);

const MemberCard: React.FC<{ member: Member }> = ({ member }) => {
    const statusColor = statusColorMap[member.status.toLowerCase()] || defaultStatusColor;
    const isDatePastOrToday = (dateString?: string): boolean => {
        if (!dateString) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const parts = dateString.split('-');
        if (parts.length !== 3) return false;
        const dueDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return dueDate <= today;
    };
    
    return (
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 mt-8 w-full max-w-4xl mx-auto animate-fade-in-up">
            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Photo and Basic Info */}
                <div className="md:col-span-1 flex flex-col items-center text-center">
                    <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center mb-4 border-2 border-gray-600">
                        {member.photoUrl ? (
                            <img src={member.photoUrl} alt={member.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <UserIcon className="w-16 h-16 text-gray-500" />
                        )}
                    </div>
                    <h2 className="text-2xl font-bold text-white">{member.name}</h2>
                    <p className="text-gray-400 font-mono">{member.id}</p>
                    <span className={`mt-3 px-3 py-1.5 rounded-full text-sm font-bold ${statusColor.split(' ')[0]} ${statusColor.split(' ')[1]}`}>
                        {member.status}
                    </span>
                </div>

                {/* Detailed Info */}
                <div className="md:col-span-2 space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-brand-primary mb-3 border-b border-gray-700 pb-2">Membership Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <InfoItem label="Membership Type" value={member.membershipType} />
                            <InfoItem label="Joining Date" value={formatDisplayDate(member.membershipStartDate)} />
                            <InfoItem label="Subscription Start" value={formatDisplayDate(member.subscriptionStartDate)} />
                            <InfoItem label="Due Date" value={
                                <span className={isDatePastOrToday(member.dueDate) ? 'text-red-400' : 'text-white'}>
                                    {formatDisplayDate(member.dueDate)}
                                </span>
                            } />
                            {/* Fix: Corrected property 'mfLastPaid' to 'membershipFeeLastPaid'. */}
                            <InfoItem label="MF Last Paid" value={formatDisplayDate(member.membershipFeeLastPaid)} />
                            <InfoItem label="MF Due Date" value={
                                 /* Fix: Corrected property 'mfDueDate' to 'membershipFeeDueDate'. */
                                 <span className={member.membershipFeeDueDate && isDatePastOrToday(member.membershipFeeDueDate) ? 'text-red-400' : 'text-green-400'}>
                                    {/* Fix: Corrected property 'mfDueDate' to 'membershipFeeDueDate'. */}
                                    {formatDisplayDate(member.membershipFeeDueDate)}
                                </span>
                            }/>
                        </div>
                        {member.details && (
                            <div className="mt-4">
                                <p className="text-sm text-gray-400">Notes</p>
                                <p className="text-md text-gray-300 bg-gray-700/50 p-3 rounded-md">{member.details}</p>
                            </div>
                        )}
                    </div>

                    {member.hasCoach && (
                        <div>
                            <h3 className="text-lg font-semibold text-brand-secondary mb-3 border-b border-gray-700 pb-2">Coach Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <InfoItem label="Assigned Coach" value={member.coachName} />
                                <InfoItem label="Training Program" value={member.trainingType} />
                                <InfoItem label="Sessions" value={`${member.sessionsUsed ?? 0} / ${member.totalSessions ?? 0}`} />
                                <InfoItem label="Session Expiry" value={
                                    <span className={member.sessionExpiryDate && isDatePastOrToday(member.sessionExpiryDate) ? 'text-red-400' : 'text-white'}>
                                        {formatDisplayDate(member.sessionExpiryDate)}
                                    </span>
                                } />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


export const MemberSearch: React.FC<{ members: Member[] }> = ({ members }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const searchResult = useMemo(() => {
        if (!searchTerm.trim()) {
            return null;
        }
        const lowerCaseSearch = searchTerm.toLowerCase().trim();
        return members.find(member =>
            member.name.toLowerCase().includes(lowerCaseSearch) ||
            member.id.toLowerCase().includes(lowerCaseSearch)
        );
    }, [members, searchTerm]);


    return (
        <div className="flex flex-col items-center w-full">
            <div className="relative w-full max-w-2xl">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 pointer-events-none" />
                <input
                    type="text"
                    placeholder="Search by name or Gym Number (e.g., G-1001)..."
                    className="w-full bg-gray-800 border-2 border-gray-700 rounded-xl py-4 pl-14 pr-4 text-white text-lg focus:outline-none focus:ring-4 focus:ring-brand-primary/20 focus:border-brand-primary transition-all duration-300 shadow-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                />
            </div>

            <div className="w-full">
                {searchTerm.trim() && searchResult && <MemberCard member={searchResult} />}
                
                {searchTerm.trim() && !searchResult && (
                    <div className="mt-8 text-center bg-gray-800/50 p-12 rounded-xl border border-dashed border-gray-700 max-w-md mx-auto">
                         <h3 className="text-xl font-bold text-white">No Member Found</h3>
                         <p className="text-gray-400 mt-2">Could not find a member matching your search query.</p>
                    </div>
                )}

                {!searchTerm.trim() && (
                    <div className="mt-8 text-center bg-gray-800/50 p-12 rounded-xl border border-dashed border-gray-700 max-w-md mx-auto">
                        <SearchIcon className="w-16 h-16 text-gray-600 mx-auto mb-4"/>
                        <h3 className="text-xl font-bold text-white">Search for a Member</h3>
                        <p className="text-gray-400 mt-2">Enter a name or Gym Number above to see their details.</p>
                    </div>
                )}
            </div>

        </div>
    );
};