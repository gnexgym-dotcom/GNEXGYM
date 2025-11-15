import React, { useState, useMemo } from 'react';
import { WalkinClient, Member, PricePlan, Coach, CheckinRecord, Class } from '../types';
import { UserIcon, SearchIcon, MembersIcon } from './icons/Icons';
import { formatDate, getTodayYMD } from '../utils/dateUtils';
import { MemberForm } from './MemberForm';
import { TaekwondoStudentForm } from './TaekwondoStudentForm';
import { MemberHistoryModal } from './MemberHistoryModal';

interface TaekwondoLogProps {
    walkinClients: WalkinClient[];
    checkinRecords: CheckinRecord[];
    onSaveMember: (memberData: Omit<Member, 'id' | 'membershipStartDate' | 'lastPaymentDate' | 'dueDate'>, purchasedPlans?: PricePlan[]) => void;
    deleteWalkinClient: (id: string) => void;
    updateWalkinClient: (updatedClient: WalkinClient) => void;
    markTaekwondoSessionUsed: (clientId: string) => { success: boolean, message: string };
    getNextMemberId: () => string;
    coaches: Coach[];
    priceList: PricePlan[];
    classes: Class[];
    addCheckinRecord: (record: Omit<CheckinRecord, 'id' | 'timestamp'>) => void;
}

const TaekwondoStudentCard: React.FC<{
    client: WalkinClient;
    onConvert: (client: WalkinClient) => void;
    onEdit: (client: WalkinClient) => void;
    onUseSession: (clientId: string) => void;
    onViewHistory: (client: WalkinClient) => void;
    sessionUsedToday: boolean;
}> = ({ client, onConvert, onEdit, onUseSession, onViewHistory, sessionUsedToday }) => {
    const remainingSessions = client.sessionPlan ? client.sessionPlan.total - client.sessionPlan.used : null;
    return (
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 flex flex-col items-center text-center transition-transform transform hover:-translate-y-1">
            <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center mb-4 border-2 border-gray-600">
                {client.photoUrl ? (
                    <img src={client.photoUrl} alt={client.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                    <UserIcon className="w-16 h-16 text-gray-500" />
                )}
            </div>
            <h2 className="text-xl font-bold text-white">{client.name}</h2>
            <p className="text-gray-400 font-mono text-sm">{client.contactNumber}</p>
            <div className="mt-4 pt-4 border-t border-gray-700 w-full flex-grow flex flex-col justify-end">
                {client.sessionPlan && (
                    <div className="mb-3">
                        <p className="text-xs text-purple-300 uppercase font-semibold">{client.sessionPlan.name}</p>
                        <p className="text-white font-bold text-lg">
                            Sessions: <span className={remainingSessions !== null && remainingSessions <= 0 ? 'text-red-400' : ''}>{client.sessionPlan.used} / {client.sessionPlan.total}</span>
                        </p>
                    </div>
                )}
                <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Last Visit</p>
                    <p className="text-brand-secondary font-bold">{formatDate(client.lastVisit)}</p>
                </div>
                <div className="mt-4 space-y-2 w-full">
                     <button
                        onClick={() => onUseSession(client.id)}
                        disabled={(remainingSessions !== null && remainingSessions <= 0) || sessionUsedToday}
                        className="w-full text-center py-2 px-4 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold transition text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        {sessionUsedToday ? 'Session Used Today' : 'Mark Session Used'}
                    </button>
                    <button
                        onClick={() => onEdit(client)}
                        className="w-full text-center py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-bold transition text-sm">
                        Edit Client
                    </button>
                    <button
                        onClick={() => onViewHistory(client)}
                        className="w-full text-center py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition text-sm">
                        View History
                    </button>
                    <button
                        onClick={() => onConvert(client)}
                        className="w-full text-center py-2 px-4 rounded-lg bg-brand-primary hover:opacity-90 text-gray-900 font-bold transition text-sm">
                        Convert to Member
                    </button>
                </div>
            </div>
        </div>
    );
};

export const TaekwondoLog: React.FC<TaekwondoLogProps> = ({ walkinClients, checkinRecords, onSaveMember, deleteWalkinClient, updateWalkinClient, markTaekwondoSessionUsed, getNextMemberId, coaches, priceList, classes, addCheckinRecord }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [convertingClient, setConvertingClient] = useState<WalkinClient | null>(null);
    const [editingClient, setEditingClient] = useState<WalkinClient | null>(null);
    const [viewingHistoryClient, setViewingHistoryClient] = useState<WalkinClient | null>(null);

    const sessionClients = useMemo(() => {
        return walkinClients
            .filter(c => c.sessionPlan)
            .sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime());
    }, [walkinClients]);

    const todaysCheckedInClientIds = useMemo(() => {
        const todayStr = getTodayYMD();
        const ids = new Set<string>();
        checkinRecords.forEach(r => {
            if (
                r.timestamp.startsWith(todayStr) && 
                r.status === 'Confirmed' && 
                r.walkinClientId && 
                r.paymentDetails?.plan.toLowerCase().includes('used session')
            ) {
                ids.add(r.walkinClientId);
            }
        });
        return ids;
    }, [checkinRecords]);

    const filteredClients = useMemo(() => {
        if (!searchTerm.trim()) {
            return sessionClients;
        }
        const lowerCaseSearch = searchTerm.toLowerCase();
        return sessionClients.filter(client =>
            client.name.toLowerCase().includes(lowerCaseSearch) ||
            client.contactNumber.includes(lowerCaseSearch)
        );
    }, [sessionClients, searchTerm]);

    const handleSaveConvertedMember = (
        memberData: Omit<Member, 'id' | 'membershipStartDate' | 'lastPaymentDate' | 'dueDate'>,
        purchasedPlans?: PricePlan[]
    ) => {
        onSaveMember(memberData, purchasedPlans);
        if (convertingClient) {
            deleteWalkinClient(convertingClient.id);
        }
        setConvertingClient(null);
    };

    const handleUseSession = (clientId: string) => {
        const result = markTaekwondoSessionUsed(clientId);
        alert(result.message);
        // The creation of a duplicate check-in record has been removed.
        // The markTaekwondoSessionUsed hook correctly handles decrementing the session count.
    };

    return (
        <div className="space-y-8">
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Session Client Log</h1>
                    <p className="text-gray-400">Manage all clients with session-based plans.</p>
                </div>
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or number..."
                        className="bg-gray-700 border border-gray-600 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {filteredClients.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {filteredClients.map(client => {
                        const todayStr = getTodayYMD();
                        const sessionUsedTodayByKiosk = todaysCheckedInClientIds.has(client.id);
                        const sessionUsedTodayByLog = client.sessionPlan?.lastSessionUsedDate === todayStr;
                        const sessionUsedToday = sessionUsedTodayByKiosk || sessionUsedTodayByLog;
                        
                        return (
                            <TaekwondoStudentCard
                                key={client.id}
                                client={client}
                                onConvert={setConvertingClient}
                                onEdit={setEditingClient}
                                onUseSession={handleUseSession}
                                onViewHistory={setViewingHistoryClient}
                                sessionUsedToday={sessionUsedToday}
                            />
                        )
                    })}
                </div>
            ) : (
                <div className="text-center bg-gray-800 p-12 rounded-xl border border-dashed border-gray-700">
                    <MembersIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white">No Session Clients Found</h3>
                    <p className="text-gray-400 mt-2">
                        {searchTerm ? 'Your search returned no results.' : 'No clients with session plans have been recorded yet.'}
                    </p>
                </div>
            )}

            {convertingClient && (
                <MemberForm
                    member={null}
                    onClose={() => setConvertingClient(null)}
                    onSaveMember={handleSaveConvertedMember}
                    initialData={{
                        name: convertingClient.name,
                        photoUrl: convertingClient.photoUrl,
                        details: `Converted from session client.\nContact: ${convertingClient.contactNumber}\nLast visit: ${formatDate(convertingClient.lastVisit)}`
                    }}
                    coaches={coaches}
                    priceList={priceList}
                    classes={classes}
                    nextMemberId={getNextMemberId()}
                />
            )}
            
             {editingClient && (
                <TaekwondoStudentForm
                    client={editingClient}
                    onClose={() => setEditingClient(null)}
                    onSave={(client) => {
                        updateWalkinClient(client);
                        setEditingClient(null);
                    }}
                />
            )}

            {viewingHistoryClient && (
                <MemberHistoryModal 
                    member={viewingHistoryClient as unknown as Member}
                    onClose={() => setViewingHistoryClient(null)}
                />
            )}
        </div>
    );
};