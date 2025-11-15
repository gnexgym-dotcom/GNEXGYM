

import React, { useState, useMemo, useRef } from 'react';
import { Member, Coach, PricePlan, CheckinRecord, Class } from '../types';
import { useMembers } from '../hooks/useMembers';
import { MemberForm } from './MemberForm';
import { PlusIcon, SearchIcon, UploadIcon, DownloadIcon, HistoryIcon, WarningIcon } from './icons/Icons';
import { ImportResultModal } from './ImportResultModal';
import { MemberHistoryModal } from './MemberHistoryModal';
import { formatDate, isPastOrToday, normalizeDateStringToYMD, getTodayYMD, parseDate } from '../utils/dateUtils';

interface MemberListProps {
    members: Member[];
    checkinRecords: CheckinRecord[];
    deleteMember: (id: string) => void;
    addMultipleMembers: (members: Member[]) => void;
    getNextMemberId: () => string;
    coaches: Coach[];
    onSaveMember: (memberData: Member | Omit<Member, 'id' | 'membershipStartDate' | 'lastPaymentDate' | 'dueDate'>, purchasedPlans?: PricePlan[], newSubscriptionStartDate?: string) => void;
    priceList: PricePlan[];
    classes: Class[];
}

const statusColorMap: Record<string, string> = {
    'active': 'bg-green-500/20 text-green-400',
    'inactive': 'bg-gray-500/20 text-gray-400',
    'frozen': 'bg-blue-500/20 text-blue-400',
    'due': 'bg-red-500/20 text-red-400',
    'sessions': 'bg-orange-500/20 text-orange-400',
};

const statusDotColorMap: Record<string, string> = {
    'active': 'bg-green-500',
    'inactive': 'bg-gray-500',
    'frozen': 'bg-blue-500',
    'due': 'bg-red-500',
    'sessions': 'bg-orange-500',
};
const defaultDotColor = 'bg-purple-500';

const defaultStatusColor = 'bg-purple-500/20 text-purple-400';

const trainingOptions = [
    'Loss Weight/Circuit Training',
    'Strength/Bodybuilding Training',
    'Boxing Training',
    'Muaythai Training',
    'Taekwondo Training'
];

// Represents the result of parsing the CSV file.
interface ParseResult {
    newMembers: Member[];
    errors: string[];
}

interface ImportResult {
    success: number;
    errors: string[];
}

type SortKey = 'name' | 'dueDate' | 'membershipType';
type SortDirection = 'asc' | 'desc';

/**
 * Calculates a member's status dynamically based on their data.
 * This provides a more accurate, real-time status than the stored `member.status` property.
 * Priority: Inactive/Frozen > Due > Sessions Finished > Active.
 */
const getDynamicMemberStatus = (member: Member): { key: string; label: string } => {
    const specialMfTypes = ['LIFETIME', 'FREE ANNUAL', 'NO MF'];
    const lowerCaseStatus = member.status.toLowerCase();

    // If manually set to inactive or frozen, that takes precedence.
    if (lowerCaseStatus === 'inactive' || lowerCaseStatus === 'frozen') {
        return { key: lowerCaseStatus, label: member.status };
    }

    // Check if membership has been lapsed for over a year
    const dueDate = parseDate(member.dueDate);
    if (dueDate) {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (dueDate < oneYearAgo) {
            return { key: 'inactive', label: 'Inactive' };
        }
    }

    // Check for payment issues. This is the highest priority for active members.
    if (isPastOrToday(member.dueDate) || (member.membershipFeeDueDate && isPastOrToday(member.membershipFeeDueDate) && !specialMfTypes.includes(member.membershipType.toUpperCase())) || (member.lockerDueDate && isPastOrToday(member.lockerDueDate))) {
        return { key: 'due', label: 'Due' };
    }

    // Check for session issues.
    if (member.hasCoach) {
        const remainingSessions = (member.totalSessions ?? 0) - (member.sessionsUsed ?? 0);
        const sessionsExpired = member.sessionExpiryDate && isPastOrToday(member.sessionExpiryDate);
        if ((remainingSessions <= 0 && (member.totalSessions ?? 0) > 0) || sessionsExpired) {
            return { key: 'sessions', label: 'Sessions Finished' };
        }
    }

    // If no issues are found, they are considered active.
    return { key: 'active', label: 'Active' };
};

const SortIndicator: React.FC<{ columnKey: SortKey, sortKey: SortKey | null, sortDirection: SortDirection }> = ({ columnKey, sortKey, sortDirection }) => {
    if (sortKey !== columnKey) {
        return <span className="text-gray-500 opacity-50 select-none">↑↓</span>;
    }
    return <span className="text-white select-none">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
};

export const MemberList: React.FC<MemberListProps> = ({ members, checkinRecords, deleteMember, addMultipleMembers, coaches, getNextMemberId, onSaveMember, priceList, classes }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [coachFilter, setCoachFilter] = useState('All');
    const [classFilter, setClassFilter] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [nextMemberId, setNextMemberId] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [sortKey, setSortKey] = useState<SortKey | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [viewingHistoryMember, setViewingHistoryMember] = useState<Member | null>(null);

    const memberBalances = useMemo(() => {
        const balances = new Map<string, number>();
        checkinRecords.forEach(record => {
            if (record.gymNumber && record.status === 'Confirmed' && !record.checkoutTimestamp && record.balance > 0) {
                const currentBalance = balances.get(record.gymNumber) || 0;
                balances.set(record.gymNumber, currentBalance + record.balance);
            }
        });
        return balances;
    }, [checkinRecords]);

    const getMemberAlerts = (member: Member): string[] => {
        const alerts: string[] = [];
        const specialMfTypes = ['LIFETIME', 'FREE ANNUAL', 'NO MF'];
    
        if (member.status.toLowerCase() === 'due' || isPastOrToday(member.dueDate)) {
            alerts.push(`Membership overdue (${formatDate(member.dueDate)})`);
        }
    
        if (member.membershipFeeDueDate && isPastOrToday(member.membershipFeeDueDate) && !specialMfTypes.includes(member.membershipType.toUpperCase())) {
            alerts.push(`Membership Fee overdue (${formatDate(member.membershipFeeDueDate)})`);
        }

        if (member.lockerDueDate && isPastOrToday(member.lockerDueDate)) {
            alerts.push(`Locker overdue (${formatDate(member.lockerDueDate)})`);
        }
    
        if (member.hasCoach) {
            const remainingSessions = (member.totalSessions ?? 0) - (member.sessionsUsed ?? 0);
            if (remainingSessions <= 0 && (member.totalSessions ?? 0) > 0) {
                alerts.push('All coaching sessions have been used.');
            }
            if (member.sessionExpiryDate && isPastOrToday(member.sessionExpiryDate)) {
                alerts.push(`Coaching sessions expired on ${formatDate(member.sessionExpiryDate)}.`);
            }
        }

        const balance = memberBalances.get(member.id) || 0;
        if (balance > 0) {
            alerts.push(`Outstanding balance of ₱${balance.toFixed(2)}.`);
        }
        
        if (member.details?.trim()) {
            alerts.push(`Note: ${member.details.substring(0, 50)}${member.details.length > 50 ? '...' : ''}`);
        }

        return alerts;
    };

    const filteredMembers = useMemo(() => {
        return members.filter(member => {
            const lowerCaseSearch = searchTerm.toLowerCase();
            const matchesSearch = (
                member.name.toLowerCase().includes(lowerCaseSearch) ||
                member.id.toLowerCase().includes(lowerCaseSearch) ||
                (member.coachName && member.coachName.toLowerCase().includes(lowerCaseSearch))
            );
            
            const { key: dynamicStatusKey } = getDynamicMemberStatus(member);
            const matchesStatus = statusFilter === 'All' || dynamicStatusKey === statusFilter.toLowerCase();
            
            const matchesCoach = coachFilter === 'All'
                || (coachFilter === 'Unassigned' && !member.coachName)
                || member.coachName === coachFilter;

            const matchesClass = classFilter === 'All'
                || (classFilter === 'Unassigned' && !member.classId)
                || member.classId === classFilter;
            
            return matchesSearch && matchesStatus && matchesCoach && matchesClass;
        });
    }, [members, searchTerm, statusFilter, coachFilter, classFilter]);

    const sortedAndFilteredMembers = useMemo(() => {
        const sortableMembers = [...filteredMembers];
        if (!sortKey) {
            return sortableMembers;
        }

        sortableMembers.sort((a, b) => {
            const getSortableDate = (dateStr: string) => new Date(dateStr).getTime();
            switch (sortKey) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'dueDate':
                    return getSortableDate(a.dueDate) - getSortableDate(b.dueDate);
                case 'membershipType':
                    return a.membershipType.localeCompare(b.membershipType);
                default:
                    return 0;
            }
        });
        
        if (sortDirection === 'desc') {
            sortableMembers.reverse();
        }

        return sortableMembers;
    }, [filteredMembers, sortKey, sortDirection]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };


    const handleAdd = () => {
        setNextMemberId(getNextMemberId());
        setEditingMember(null);
        setIsModalOpen(true);
    };
    
    const handleEdit = (member: Member) => {
        setEditingMember(member);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this member?')) {
            deleteMember(id);
        }
    };
    
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleExport = () => {
        if (sortedAndFilteredMembers.length === 0) {
            alert("No members to export.");
            return;
        }
    
        const headers = [
            'gymnumber', 'name', 'photourl', 'status', 'membershiptype', 'details', 'hascoach', 
            'coachname', 'trainingtype', 'joiningdate', 'subscriptionstartdate', 'duedate', 'membershipfeelastpaid', 
            'totalsessions', 'sessionsused', 'membershipfeeduedate', 'sessionexpirydate',
            'lockerstartdate', 'lockerduedate'
        ];
    
        const escapeCsvValue = (value: any): string => {
            if (value === null || value === undefined) return '';
            const str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };
    
        const csvRows = sortedAndFilteredMembers.map(member => [
            escapeCsvValue(member.id),
            escapeCsvValue(member.name),
            escapeCsvValue(member.photoUrl ?? ''),
            escapeCsvValue(member.status),
            escapeCsvValue(member.membershipType),
            escapeCsvValue(member.details),
            escapeCsvValue(member.hasCoach),
            escapeCsvValue(member.coachName),
            escapeCsvValue(member.trainingType),
            escapeCsvValue(member.membershipStartDate),
            escapeCsvValue(member.subscriptionStartDate ?? ''),
            escapeCsvValue(member.dueDate),
            escapeCsvValue(member.membershipFeeLastPaid ?? ''),
            escapeCsvValue(member.totalSessions ?? ''),
            escapeCsvValue(member.sessionsUsed ?? ''),
            escapeCsvValue(member.membershipFeeDueDate ?? ''),
            escapeCsvValue(member.sessionExpiryDate ?? ''),
            escapeCsvValue(member.lockerStartDate ?? ''),
            escapeCsvValue(member.lockerDueDate ?? ''),
        ].join(','));
    
        const csvString = [headers.join(','), ...csvRows].join('\n');
    
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        const today = getTodayYMD();
        link.setAttribute("download", `gnex-gym-members-${today}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const parseCSV = (csvText: string): ParseResult => {
        const newMembers: Member[] = [];
        const errors: string[] = [];

        const lines = csvText.trim().replace(/\r/g, '').split('\n');
        
        if (lines.length < 2) {
            errors.push('CSV file must have a header and at least one data row.');
            return { newMembers, errors };
        }

        const headerLine = lines.shift()?.trim();
        if (!headerLine) {
            errors.push('CSV file is empty or missing a header.');
            return { newMembers, errors };
        }
        
        const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, '').replace(/\s/g, '').toLowerCase());
        
        const requiredHeaders = ['gymnumber', 'name', 'status', 'membershiptype', 'details', 'hascoach', 'coachname', 'trainingtype'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
            const foundHeadersStr = headers.length > 0 ? `Detected headers: [${headers.join(', ')}]` : 'Could not detect any headers.';
            errors.push(`Invalid CSV header. Missing required column(s): [${missingHeaders.join(', ')}]}}]. ${foundHeadersStr}`);
            return { newMembers, errors };
        }

        const indices: Record<string, number> = {};
        const allPossibleHeaders = [...requiredHeaders, 'photourl', 'joiningdate', 'subscriptionstartdate', 'duedate', 'membershipfeelastpaid', 'totalsessions', 'sessionsused', 'membershipfeeduedate', 'sessionexpirydate', 'lockerstartdate', 'lockerduedate'];
        allPossibleHeaders.forEach(h => {
            const index = headers.indexOf(h);
            if (index !== -1) {
                indices[h] = index;
            }
        });
        
        const parseBoolean = (value: string): boolean => {
            const truthy = ['true', 'yes', '1'];
            return truthy.includes((value || '').trim().toLowerCase());
        };

        lines.forEach((line, i) => {
            const rowNum = i + 2;
            
            if (!line.trim()) {
                return;
            }
            
            const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => {
                let value = v.trim();
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.substring(1, value.length - 1);
                }
                return value.replace(/""/g, '"').trim();
            });

            if (values.length < headers.length) {
                errors.push(`Row ${rowNum}: Malformed data. Expected ${headers.length} columns, found ${values.length}. Skipping row.`);
                return;
            }
            
            const id = values[indices['gymnumber']];
            const name = values[indices['name']];
            const statusStr = values[indices['status']];
            const typeStr = values[indices['membershiptype']];

            if (!id || !name || !statusStr || !typeStr) {
                errors.push(`Row ${rowNum}: Missing essential data (gymnumber, name, status, or membershipType). Skipping row.`);
                return;
            }
            
            const hasCoach = parseBoolean(values[indices['hascoach']]);

            newMembers.push({
                id,
                name,
                photoUrl: indices['photourl'] !== undefined ? values[indices['photourl']] : undefined,
                status: statusStr,
                membershipType: typeStr,
                details: values[indices['details']] || '',
                hasCoach,
                coachName: hasCoach ? (values[indices['coachname']] || '') : undefined,
                trainingType: values[indices['trainingtype']] || '',
                membershipStartDate: normalizeDateStringToYMD(indices['joiningdate'] !== undefined ? values[indices['joiningdate']] : undefined),
                subscriptionStartDate: normalizeDateStringToYMD(indices['subscriptionstartdate'] !== undefined ? values[indices['subscriptionstartdate']] : undefined),
                dueDate: normalizeDateStringToYMD(indices['duedate'] !== undefined ? values[indices['duedate']] : undefined),
                lastPaymentDate: '',
                totalSessions: indices['totalsessions'] !== undefined ? parseInt(values[indices['totalsessions']]) || 0 : undefined,
                sessionsUsed: indices['sessionsused'] !== undefined ? parseInt(values[indices['sessionsused']]) || 0 : undefined,
                membershipFeeLastPaid: normalizeDateStringToYMD(indices['membershipfeelastpaid'] !== undefined ? values[indices['membershipfeelastpaid']] : undefined),
                membershipFeeDueDate: normalizeDateStringToYMD(indices['membershipfeeduedate'] !== undefined ? values[indices['membershipfeeduedate']] : undefined),
                sessionExpiryDate: normalizeDateStringToYMD(indices['sessionexpirydate'] !== undefined ? values[indices['sessionexpirydate']] : undefined),
                lockerStartDate: normalizeDateStringToYMD(indices['lockerstartdate'] !== undefined ? values[indices['lockerstartdate']] : undefined),
                lockerDueDate: normalizeDateStringToYMD(indices['lockerduedate'] !== undefined ? values[indices['lockerduedate']] : undefined),
            });
        });

        return { newMembers, errors };
    };


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            try {
                const { newMembers, errors } = parseCSV(text);

                if (newMembers.length > 0) {
                    addMultipleMembers(newMembers);
                }
                
                setImportResult({ success: newMembers.length, errors });

                if (errors.length > 0) {
                     console.warn('CSV Import Errors:\n' + errors.join('\n'));
                }

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                setImportResult({ success: 0, errors: [`An unexpected error occurred during file processing: ${errorMessage}`] });
            } finally {
                if(event.target) {
                    event.target.value = '';
                }
            }
        };
        reader.onerror = () => {
             setImportResult({ success: 0, errors: ['Failed to read the file.'] });
        };
        reader.readAsText(file);
    };
    
    const specialMfTypes = ['LIFETIME', 'FREE ANNUAL', 'NO MF'];

    return (
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700">
            <div className="p-4 md:p-6 flex flex-wrap justify-between items-center border-b border-gray-700 gap-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, Gym Number, coach..."
                            className="bg-gray-700 border border-gray-600 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                     <div>
                        <label htmlFor="status-filter" className="sr-only">Filter by status</label>
                        <select
                            id="status-filter"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-gray-700 border border-gray-600 rounded-lg py-2 pl-3 pr-8 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Frozen">Frozen</option>
                            <option value="Due">Due</option>
                            <option value="Sessions">Sessions Finished</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="coach-filter" className="sr-only">Filter by coach</label>
                        <select
                            id="coach-filter"
                            value={coachFilter}
                            onChange={(e) => setCoachFilter(e.target.value)}
                            className="bg-gray-700 border border-gray-600 rounded-lg py-2 pl-3 pr-8 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        >
                            <option value="All">All Coaches</option>
                            <option value="Unassigned">Unassigned</option>
                            {coaches.map(coach => (
                                <option key={coach.id} value={coach.name}>{coach.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="class-filter" className="sr-only">Filter by class</label>
                        <select
                            id="class-filter"
                            value={classFilter}
                            onChange={(e) => setClassFilter(e.target.value)}
                            className="bg-gray-700 border border-gray-600 rounded-lg py-2 pl-3 pr-8 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        >
                            <option value="All">All Classes</option>
                            <option value="Unassigned">Unassigned</option>
                            {classes.map(cls => (
                                <option key={cls.id} value={cls.id}>{cls.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                    <button
                        onClick={handleExport}
                        className="flex items-center bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                        <DownloadIcon className="w-5 h-5 mr-2"/>
                        Export
                    </button>
                     <button
                        onClick={handleImportClick}
                        className="flex items-center bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                        <UploadIcon className="w-5 h-5 mr-2"/>
                        Import
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".csv"
                        className="hidden"
                    />
                    <button
                        onClick={handleAdd}
                        className="flex items-center bg-brand-primary hover:opacity-90 text-gray-900 font-bold py-2 px-4 rounded-lg transition-opacity duration-200"
                    >
                        <PlusIcon className="w-5 h-5 mr-2"/>
                        Add Member
                    </button>
                </div>
            </div>
            <div>
                <table className="w-full text-left whitespace-nowrap">
                    <thead className="border-b border-gray-700">
                        <tr>
                            <th className="p-4 font-semibold" onClick={() => handleSort('name')}>
                                <div className="flex items-center cursor-pointer select-none">
                                    Name
                                    <span className="ml-2 text-xs">
                                        <SortIndicator columnKey="name" sortKey={sortKey} sortDirection={sortDirection} />
                                    </span>
                                </div>
                            </th>
                            <th className="p-4 font-semibold hidden sm:table-cell">GYM NUMBER</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold hidden md:table-cell">Class</th>
                            <th className="p-4 font-semibold hidden lg:table-cell" onClick={() => handleSort('membershipType')}>
                                <div className="flex items-center cursor-pointer select-none">
                                    Membership Type
                                    <span className="ml-2 text-xs">
                                        <SortIndicator columnKey="membershipType" sortKey={sortKey} sortDirection={sortDirection} />
                                    </span>
                                </div>
                            </th>
                            <th className="p-4 font-semibold hidden md:table-cell" onClick={() => handleSort('dueDate')}>
                                <div className="flex items-center cursor-pointer select-none">
                                    Due Date
                                     <span className="ml-2 text-xs">
                                        <SortIndicator columnKey="dueDate" sortKey={sortKey} sortDirection={sortDirection} />
                                    </span>
                                </div>
                            </th>
                            <th className="p-4 font-semibold hidden lg:table-cell">Membership Fee Due Date</th>
                            <th className="p-4 font-semibold hidden lg:table-cell">Coach</th>
                            <th className="p-4 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAndFilteredMembers.map(member => {
                            const { key: dynamicStatusKey, label: dynamicStatusLabel } = getDynamicMemberStatus(member);
                            const alerts = getMemberAlerts(member);
                            const balance = memberBalances.get(member.id) || 0;
                            const isSpecialMfType = specialMfTypes.includes(member.membershipType.toUpperCase());

                            const isDueDateOverdue = isPastOrToday(member.dueDate);
                            const isMfDateOverdue = !isSpecialMfType && member.membershipFeeDueDate && isPastOrToday(member.membershipFeeDueDate);
                            const isLockerDateOverdue = !!member.lockerDueDate && isPastOrToday(member.lockerDueDate);
                            const hasOutstandingBalance = balance > 0;
                            const isRowHighlighted = isDueDateOverdue || isMfDateOverdue || hasOutstandingBalance || isLockerDateOverdue;
                            
                            return (
                                <tr key={member.id} className={`border-b border-gray-700 transition-colors ${isRowHighlighted ? 'bg-red-900/40 hover:bg-red-900/60' : 'hover:bg-gray-700/50'}`}>
                                    <td className="p-4 font-medium text-white">
                                        <div className="flex items-center gap-3 group relative">
                                            <span
                                                title={`Status: ${dynamicStatusLabel}`}
                                                className={`w-3 h-3 rounded-full flex-shrink-0 ${statusDotColorMap[dynamicStatusKey] || defaultDotColor}`}
                                            ></span>
                                            <span>{member.name}</span>
                                            {alerts.length > 0 && (
                                                <>
                                                    <WarningIcon className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                                                    <div className="absolute left-0 bottom-full mb-2 w-72 hidden group-hover:block bg-gray-900 border border-yellow-600 text-white text-sm rounded-lg p-3 shadow-lg z-10">
                                                        <p className="font-bold text-yellow-300 mb-2">Action Required</p>
                                                        <ul className="list-disc list-inside space-y-1 text-yellow-200">
                                                            {alerts.map((alert, i) => <li key={i}>{alert}</li>)}
                                                        </ul>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-white font-bold hidden sm:table-cell">{member.id}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-sm font-bold ${statusColorMap[dynamicStatusKey] || defaultStatusColor}`}>
                                            {dynamicStatusLabel}
                                        </span>
                                    </td>
                                    <td className={`p-4 hidden md:table-cell text-gray-400`}>
                                        {member.className || 'N/A'}
                                    </td>
                                    <td className="p-4 text-gray-400 hidden lg:table-cell">{member.membershipType}</td>
                                    <td className={`p-4 hidden md:table-cell ${isDueDateOverdue ? 'text-red-400 font-semibold' : 'text-gray-400'}`}>{formatDate(member.dueDate)}</td>
                                    <td className={`p-4 hidden lg:table-cell ${isSpecialMfType || !member.membershipFeeDueDate ? 'text-gray-400' : isMfDateOverdue ? 'text-red-400 font-semibold' : 'text-green-400'}`}>
                                        {isSpecialMfType ? 'N/A' : formatDate(member.membershipFeeDueDate)}
                                    </td>
                                    <td className="p-4 text-gray-400 hidden lg:table-cell">{member.coachName || 'N/A'}</td>
                                    <td className="p-4">
                                        <button onClick={() => handleEdit(member)} className="text-sm text-brand-secondary hover:underline mr-4">Edit</button>
                                        <button onClick={() => setViewingHistoryMember(member)} className="text-sm text-blue-400 hover:underline mr-4">History</button>
                                        <button onClick={() => handleDelete(member.id)} className="text-sm text-red-500 hover:underline">Delete</button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                 {sortedAndFilteredMembers.length === 0 && (
                    <p className="text-center p-8 text-gray-400">No members found. Add a member or import a file to get started.</p>
                )}
            </div>

            {isModalOpen && (
                <MemberForm
                    member={editingMember}
                    onClose={() => setIsModalOpen(false)}
                    onSaveMember={onSaveMember}
                    coaches={coaches}
                    nextMemberId={nextMemberId}
                    priceList={priceList}
                    classes={classes}
                />
            )}

            {importResult && (
                <ImportResultModal 
                    result={importResult}
                    onClose={() => setImportResult(null)}
                />
            )}
            
            {viewingHistoryMember && (
                <MemberHistoryModal 
                    member={viewingHistoryMember}
                    onClose={() => setViewingHistoryMember(null)}
                />
            )}
        </div>
    );
};
