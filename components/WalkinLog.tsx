import React, { useState, useMemo, useRef } from 'react';
import { WalkinClient, Member, PricePlan, Coach, CheckinRecord, Class } from '../types';
import { UserIcon, SearchIcon, MembersIcon } from './icons/Icons';
import { formatDate, getTodayYMD, parseDate } from '../utils/dateUtils';
import { MemberForm } from './MemberForm';
import { ImageEditor } from './ImageEditor';
import { TaekwondoStudentForm } from './TaekwondoStudentForm';
import { MemberHistoryModal } from './MemberHistoryModal';

interface WalkinLogProps {
    walkinClients: WalkinClient[];
    checkinRecords: CheckinRecord[];
    onSaveMember: (memberData: Omit<Member, 'id' | 'membershipStartDate' | 'lastPaymentDate' | 'dueDate'>, purchasedPlans?: PricePlan[]) => void;
    deleteWalkinClient: (id: string) => void;
    getNextMemberId: () => string;
    coaches: Coach[];
    priceList: PricePlan[];
    classes: Class[];
    updateWalkinClient: (updatedClient: WalkinClient) => void;
}

interface WalkinClientCardProps {
    client: WalkinClient;
    balance: number;
    onConvert: (client: WalkinClient) => void;
    onUploadPhoto: (client: WalkinClient) => void;
    onEdit: (client: WalkinClient) => void;
    onViewHistory: (client: WalkinClient) => void;
}

const WalkinClientCard: React.FC<WalkinClientCardProps> = ({ client, balance, onConvert, onUploadPhoto, onEdit, onViewHistory }) => {
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
                            Sessions: {client.sessionPlan.used} / {client.sessionPlan.total}
                        </p>
                    </div>
                )}
                {balance > 0 && (
                    <div className="mb-3">
                        <p className="text-xs text-red-400 uppercase font-semibold">Outstanding Balance</p>
                        <p className="text-red-400 font-bold text-lg">₱{balance.toFixed(2)}</p>
                    </div>
                )}
                <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Last Visit</p>
                    <p className="text-brand-secondary font-bold">{formatDate(client.lastVisit)}</p>
                </div>
                <div className="mt-4 space-y-2 w-full">
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => onEdit(client)} className="w-full text-center py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-semibold transition text-sm">
                            Edit
                        </button>
                        <button onClick={() => onViewHistory(client)} className="w-full text-center py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition text-sm">
                            History
                        </button>
                    </div>
                    <button onClick={() => onUploadPhoto(client)} className="w-full text-center py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-semibold transition text-sm">
                        Upload Photo
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

export const WalkinLog: React.FC<WalkinLogProps> = ({ walkinClients, checkinRecords, onSaveMember, deleteWalkinClient, getNextMemberId, coaches, priceList, classes, updateWalkinClient }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const today = getTodayYMD();
    const firstDayOfMonth = today.substring(0, 8) + '01';
    const [startDate, setStartDate] = useState(firstDayOfMonth);
    const [endDate, setEndDate] = useState(today);
    const [convertingClient, setConvertingClient] = useState<WalkinClient | null>(null);
    const [editingClient, setEditingClient] = useState<WalkinClient | null>(null);
    const [viewingHistoryClient, setViewingHistoryClient] = useState<WalkinClient | null>(null);
    
    // State for photo editing
    const [editingPhotoForClient, setEditingPhotoForClient] = useState<WalkinClient | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingImageSrc, setEditingImageSrc] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const clientBalances = useMemo(() => {
        const balances = new Map<string, number>();
        checkinRecords.forEach(record => {
            if (record.type === 'Walk-in' && record.walkinClientId && record.balance > 0) {
                const currentBalance = balances.get(record.walkinClientId) || 0;
                balances.set(record.walkinClientId, currentBalance + record.balance);
            }
        });
        return balances;
    }, [checkinRecords]);

    const filteredClients = useMemo(() => {
        const sortedByDate = [...walkinClients].sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime());
        
        const start = parseDate(startDate);
        const end = parseDate(endDate);
        
        return sortedByDate.filter(client => {
            // Date filter
            if (start && end) {
                const lastVisitDate = parseDate(client.lastVisit);
                if (!lastVisitDate || lastVisitDate < start || lastVisitDate > end) {
                    return false;
                }
            }

            // Search filter
            if (!searchTerm.trim()) {
                return true;
            }
            const lowerCaseSearch = searchTerm.toLowerCase();
            return client.name.toLowerCase().includes(lowerCaseSearch) ||
                   client.contactNumber.includes(lowerCaseSearch);
        });
    }, [walkinClients, searchTerm, startDate, endDate]);

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

    // Photo editing handlers
    const handleUploadPhotoClick = (client: WalkinClient) => {
        setEditingPhotoForClient(client);
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                const result = loadEvent.target?.result;
                if (typeof result === 'string') {
                    setEditingImageSrc(result);
                    setIsEditorOpen(true);
                }
            };
            reader.readAsDataURL(file);
        }
        if (e.target) e.target.value = '';
    };

    const handleEditorSave = (newImageDataUrl: string) => {
        if (editingPhotoForClient) {
            updateWalkinClient({ ...editingPhotoForClient, photoUrl: newImageDataUrl });
        }
        setIsEditorOpen(false);
        setEditingImageSrc(null);
        setEditingPhotoForClient(null);
    };
    
    const handleEditorClose = () => {
        setIsEditorOpen(false);
        setEditingImageSrc(null);
        setEditingPhotoForClient(null);
    };

    return (
        <div className="space-y-8">
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Walk-in Client Log</h1>
                    <p className="text-gray-400">A record of all walk-in visitors.</p>
                </div>
                 <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label htmlFor="startDate" className="text-gray-400 text-sm">From:</label>
                        <input
                            type="date"
                            id="startDate"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            max={endDate}
                            className="bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-white"
                        />
                        <label htmlFor="endDate" className="text-gray-400 text-sm">To:</label>
                        <input
                            type="date"
                            id="endDate"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            min={startDate}
                            max={today}
                            className="bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-white"
                        />
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
            </div>

            {filteredClients.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {filteredClients.map(client => {
                        const balance = clientBalances.get(client.id) || 0;
                        return <WalkinClientCard
                            key={client.id}
                            client={client}
                            balance={balance}
                            onConvert={setConvertingClient}
                            onUploadPhoto={handleUploadPhotoClick}
                            onEdit={setEditingClient}
                            onViewHistory={setViewingHistoryClient}
                        />
                    })}
                </div>
            ) : (
                <div className="text-center bg-gray-800 p-12 rounded-xl border border-dashed border-gray-700">
                    <MembersIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white">No Walk-in Clients Found</h3>
                    <p className="text-gray-400 mt-2">
                        {searchTerm ? 'Your search returned no results.' : 'No walk-in clients have been recorded for the selected date range.'}
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
                        details: `Converted from walk-in.\nContact: ${convertingClient.contactNumber}\nLast visit: ${formatDate(convertingClient.lastVisit)}`
                    }}
                    coaches={coaches}
                    priceList={priceList}
                    classes={classes}
                    nextMemberId={getNextMemberId()}
                />
            )}
            
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />
            {isEditorOpen && editingImageSrc && (
                <ImageEditor
                    src={editingImageSrc}
                    onSave={handleEditorSave}
                    onClose={handleEditorClose}
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
