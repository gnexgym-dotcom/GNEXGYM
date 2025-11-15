import React, { useState, FormEvent, useEffect, useMemo, useRef } from 'react';
import { Member, Coach, PricePlan, Class } from '../types';
import { UserIcon, PlusIcon, MinusIcon, CashIcon } from './icons/Icons';
import { WebcamCapture } from './WebcamCapture';
import { ImageEditor } from './ImageEditor';
import { formatToYMD, addYear, addMonths, parseDate, isPastOrToday, getTodayYMD } from '../utils/dateUtils';

interface MemberFormProps {
    member: Member | null;
    initialData?: Partial<Member>;
    onClose: () => void;
    onSaveMember: (memberData: Member | Omit<Member, 'id' | 'membershipStartDate' | 'lastPaymentDate' | 'dueDate'>, purchasedPlans?: PricePlan[], newSubscriptionStartDate?: string) => void;
    coaches: Coach[];
    priceList: PricePlan[];
    classes: Class[];
    nextMemberId?: string;
}

const trainingOptions = [
    'Loss Weight/Circuit Training',
    'Strength/Bodybuilding Training',
    'Boxing Training',
    'Muaythai Training',
    'Taekwondo Training'
];

const InfoItem: React.FC<{ label: string; value: React.ReactNode; className?: string }> = ({ label, value, className }) => (
    <div className={className}>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-lg font-semibold text-white">{value || 'N/A'}</p>
    </div>
);


export const MemberForm: React.FC<MemberFormProps> = ({ member, initialData, onClose, onSaveMember, coaches, priceList, classes, nextMemberId }) => {
    const [formData, setFormData] = useState({
        id: member ? member.id : nextMemberId || '',
        name: '',
        photoUrl: '',
        status: 'Active',
        membershipType: 'Annual Membership',
        details: '',
        hasCoach: false,
        coachName: '',
        trainingType: '',
        membershipStartDate: '',
        subscriptionStartDate: '',
        dueDate: '',
        totalSessions: 0,
        sessionsUsed: 0,
        daysRemainingOnFreeze: 0,
        sessionExpiryDate: '',
        membershipFeeLastPaid: '',
        membershipFeeDueDate: '',
        hasLocker: false,
        lockerStartDate: '',
        lockerDueDate: '',
        classId: '',
    });
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingImageSrc, setEditingImageSrc] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showPaymentSection, setShowPaymentSection] = useState(false);
    const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
    const [newSubscriptionStartDate, setNewSubscriptionStartDate] = useState('');


    const { memberPlans, servicePlans } = useMemo(() => {
        const members = priceList.filter(p => p.type === 'member').sort((a,b) => a.amount - b.amount);
        const services = priceList.filter(p => p.type === 'coach' || p.name.toLowerCase().includes('locker')).sort((a,b) => a.name.localeCompare(b.name));
        return { memberPlans: members, servicePlans: services };
    }, [priceList]);
    
    const allPlans = useMemo(() => [...memberPlans, ...servicePlans], [memberPlans, servicePlans]);

    const totalPaymentAmount = useMemo(() => {
        return allPlans
            .filter(p => selectedPlanIds.includes(p.id))
            .reduce((sum, plan) => sum + plan.amount, 0);
    }, [allPlans, selectedPlanIds]);
    
    const hasRenewalPlan = useMemo(() => {
        return selectedPlanIds.some(id => {
            const plan = allPlans.find(p => p.id === id);
            return plan && plan.type === 'member' && !plan.name.toLowerCase().includes('locker') && !plan.name.toLowerCase().includes('membership fee');
        });
    }, [selectedPlanIds, allPlans]);

    useEffect(() => {
        if (member) {
            setFormData({
                id: member.id,
                name: member.name,
                photoUrl: member.photoUrl || '',
                status: member.status,
                membershipType: member.membershipType,
                details: member.details,
                hasCoach: member.hasCoach,
                coachName: member.coachName || '',
                trainingType: member.trainingType,
                membershipStartDate: member.membershipStartDate,
                subscriptionStartDate: member.subscriptionStartDate || member.lastPaymentDate || member.membershipStartDate,
                dueDate: member.dueDate,
                totalSessions: member.totalSessions ?? 0,
                sessionsUsed: member.sessionsUsed ?? 0,
                daysRemainingOnFreeze: member.daysRemainingOnFreeze ?? 0,
                sessionExpiryDate: member.sessionExpiryDate || '',
                membershipFeeLastPaid: member.membershipFeeLastPaid || '',
                membershipFeeDueDate: member.membershipFeeDueDate || '',
                hasLocker: !!member.lockerStartDate,
                lockerStartDate: member.lockerStartDate || '',
                lockerDueDate: member.lockerDueDate || '',
                classId: member.classId || '',
            });
        } else if (initialData) {
            setFormData(prev => ({
                ...prev,
                name: initialData.name || '',
                photoUrl: initialData.photoUrl || '',
                details: initialData.details || '',
            }));
        }
    }, [member, initialData]);

    useEffect(() => {
        if (formData.membershipFeeLastPaid) {
            const lastPaidDate = parseDate(formData.membershipFeeLastPaid);
            if (lastPaidDate) {
                const newDueDateObj = addYear(lastPaidDate);
                const newDueDate = formatToYMD(newDueDateObj);
                setFormData(prev => ({ ...prev, membershipFeeDueDate: newDueDate }));
            } else {
                 setFormData(prev => ({...prev, membershipFeeDueDate: ''}));
            }
        } else {
             setFormData(prev => ({...prev, membershipFeeDueDate: ''}));
        }
    }, [formData.membershipFeeLastPaid]);

    useEffect(() => {
        if (formData.lockerStartDate) {
            const startDate = parseDate(formData.lockerStartDate);
            if (startDate) {
                const newDueDateObj = addMonths(startDate, 1);
                const newDueDate = formatToYMD(newDueDateObj);
                setFormData(prev => ({ ...prev, lockerDueDate: newDueDate }));
            } else {
                 setFormData(prev => ({...prev, lockerDueDate: ''}));
            }
        } else {
             setFormData(prev => ({...prev, lockerDueDate: ''}));
        }
    }, [formData.lockerStartDate]);
    
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

    const handleWebcamCapture = (imageDataUrl: string) => {
        setEditingImageSrc(imageDataUrl);
        setIsEditorOpen(true);
        setIsCameraOpen(false);
    };

    const handleEditorSave = (newImageDataUrl: string) => {
        setFormData(prev => ({ ...prev, photoUrl: newImageDataUrl }));
        setIsEditorOpen(false);
        setEditingImageSrc(null);
    };
    
    const handleEditorClose = () => {
        setIsEditorOpen(false);
        setEditingImageSrc(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => {
                const newState = { ...prev, [name]: checked };
                if (name === 'hasCoach' && !checked) {
                    newState.coachName = '';
                    newState.trainingType = '';
                    newState.totalSessions = 0;
                    newState.sessionsUsed = 0;
                    newState.sessionExpiryDate = '';
                }
                if (name === 'hasLocker' && !checked) {
                    newState.lockerStartDate = '';
                    newState.lockerDueDate = '';
                }
                return newState;
            });
        } else if (type === 'number') {
            let numValue = parseInt(value, 10) || 0;
             if (name === 'sessionsUsed') {
                numValue = Math.max(0, Math.min(numValue, formData.totalSessions));
             }
             setFormData(prev => ({ ...prev, [name]: numValue }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSessionChange = (amount: number) => {
        setFormData(prev => {
            const newSessionsUsed = Math.max(0, Math.min(prev.sessionsUsed + amount, prev.totalSessions));
            return { ...prev, sessionsUsed: newSessionsUsed };
        });
    };

    const handleTogglePlan = (planId: string) => {
        setSelectedPlanIds(prev =>
            prev.includes(planId)
                ? prev.filter(id => id !== planId)
                : [...prev, planId]
        );
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        
        const { id, name, photoUrl, status, membershipType, details, hasCoach, coachName, trainingType, totalSessions, sessionsUsed, daysRemainingOnFreeze, sessionExpiryDate, membershipFeeLastPaid, membershipFeeDueDate, hasLocker, lockerStartDate, lockerDueDate, classId, subscriptionStartDate } = formData;
        
        const selectedClass = classes.find(c => c.id === classId);
        
        const memberData = {
            id,
            name,
            photoUrl: photoUrl || undefined,
            status,
            membershipType,
            details,
            hasCoach,
            coachName: hasCoach ? coachName : undefined,
            trainingType: hasCoach ? trainingType : '',
            totalSessions: hasCoach ? totalSessions : undefined,
            sessionsUsed: hasCoach ? sessionsUsed : undefined,
            subscriptionStartDate: subscriptionStartDate || undefined,
            daysRemainingOnFreeze: status.toLowerCase() === 'frozen' ? daysRemainingOnFreeze : undefined,
            sessionExpiryDate: hasCoach && totalSessions > 0 ? sessionExpiryDate : undefined,
            membershipFeeLastPaid: membershipFeeLastPaid || undefined,
            membershipFeeDueDate: membershipFeeDueDate || undefined,
            lockerStartDate: hasLocker ? lockerStartDate : undefined,
            lockerDueDate: hasLocker ? lockerDueDate : undefined,
            classId: selectedClass ? selectedClass.id : undefined,
            className: selectedClass ? selectedClass.name : undefined,
        };
    
        const purchasedPlans = allPlans.filter(p => selectedPlanIds.includes(p.id));

        if (member) {
            onSaveMember({ ...member, ...memberData }, purchasedPlans, newSubscriptionStartDate);
        } else {
            const { id, ...newMemberData } = memberData;
            onSaveMember(newMemberData, purchasedPlans, newSubscriptionStartDate);
        }
        onClose();
    };
    
    const remainingSessions = formData.totalSessions - formData.sessionsUsed;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 transition-opacity">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-3xl m-4 border border-gray-700 animate-fade-in-up max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6 text-white">{member ? 'Edit Member' : 'Add New Member'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="w-full md:w-1/3 flex-grow-0 flex-shrink-0 flex flex-col items-center">
                            <label className="block text-sm font-medium text-gray-400 mb-2 text-center">Member Photo</label>
                             <div className="w-40 h-40 rounded-full bg-gray-700 flex items-center justify-center mb-4 border-2 border-gray-600 relative overflow-hidden">
                                {formData.photoUrl ? (
                                    <img src={formData.photoUrl} alt={formData.name} className="w-full h-full object-cover" />
                                ) : (
                                    <UserIcon className="w-24 h-24 text-gray-500" />
                                )}
                            </div>
                            <div className="flex flex-col gap-2 w-full">
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full text-center py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-semibold transition text-sm">
                                    Upload Photo
                                </button>
                                <button type="button" onClick={() => setIsCameraOpen(true)} className="w-full text-center py-2 px-4 rounded-lg bg-brand-secondary hover:opacity-90 text-gray-900 font-bold transition text-sm">
                                    Take Photo
                                </button>
                            </div>
                        </div>

                        <div className="w-full md:w-2/3 space-y-4">
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="id" className="block text-sm font-medium text-gray-400 mb-1">GYM NUMBER</label>
                                    <input type="text" id="id" name="id" value={formData.id} readOnly className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary read-only:bg-gray-600 read-only:cursor-not-allowed"/>
                                </div>
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                                    <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                 <div>
                                    <label htmlFor="membershipType" className="block text-sm font-medium text-gray-400 mb-1">Membership Type</label>
                                    <input type="text" id="membershipType" name="membershipType" value={formData.membershipType} onChange={handleChange} required placeholder="e.g., Annual, Walk-In" className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
                                </div>
                                 <div>
                                    <label htmlFor="status" className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                                    <input type="text" id="status" name="status" value={formData.status} onChange={handleChange} required placeholder="e.g., Active, Frozen" className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
                                </div>
                            </div>
                             <div>
                                <label htmlFor="classId" className="block text-sm font-medium text-gray-400 mb-1">Assign to Class</label>
                                <select id="classId" name="classId" value={formData.classId} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary">
                                    <option value="">Unassigned</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {formData.status.toLowerCase() === 'frozen' && (
                        <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-700">
                            <label htmlFor="daysRemainingOnFreeze" className="block text-sm font-medium text-blue-300 mb-1">Days Remaining on Freeze</label>
                            <input type="number" id="daysRemainingOnFreeze" name="daysRemainingOnFreeze" value={formData.daysRemainingOnFreeze} onChange={handleChange} min="0" className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
                            <p className="text-xs text-gray-400 mt-1">This will be used to calculate the new due date when they unfreeze.</p>
                        </div>
                    )}
                    <div>
                        <label htmlFor="details" className="block text-sm font-medium text-gray-400 mb-1">Member Notes</label>
                        <textarea id="details" name="details" value={formData.details} onChange={handleChange} rows={3} placeholder="Add any relevant notes for this member..." className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                    </div>

                    <div className="bg-gray-700/50 p-4 rounded-lg space-y-4">
                        <div className="flex items-center">
                            <input type="checkbox" id="hasLocker" name="hasLocker" checked={formData.hasLocker} onChange={handleChange} className="h-4 w-4 rounded border-gray-500 bg-gray-800 text-brand-primary focus:ring-brand-secondary"/>
                            <label htmlFor="hasLocker" className="ml-2 block text-sm font-medium text-gray-300">Has Locker Rental?</label>
                        </div>
                        {formData.hasLocker && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up">
                                <div>
                                    <label htmlFor="lockerStartDate" className="block text-sm font-medium text-gray-400 mb-1">Locker Start Date</label>
                                    <input type="date" id="lockerStartDate" name="lockerStartDate" value={formData.lockerStartDate} onChange={handleChange} required={formData.hasLocker} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
                                </div>
                                <div>
                                    <label htmlFor="lockerDueDate" className="block text-sm font-medium text-gray-400 mb-1">Locker Due Date</label>
                                    <input type="date" id="lockerDueDate" name="lockerDueDate" value={formData.lockerDueDate} readOnly className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary read-only:bg-gray-600 read-only:cursor-not-allowed"/>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-700/50 p-4 rounded-lg space-y-4">
                        <div className="flex items-center">
                            <input type="checkbox" id="hasCoach" name="hasCoach" checked={formData.hasCoach} onChange={handleChange} className="h-4 w-4 rounded border-gray-500 bg-gray-800 text-brand-primary focus:ring-brand-secondary"/>
                            <label htmlFor="hasCoach" className="ml-2 block text-sm font-medium text-gray-300">Assign a coach?</label>
                        </div>
                        {formData.hasCoach && (
                             <div className="space-y-4 animate-fade-in-up">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div>
                                        <label htmlFor="coachName" className="block text-sm font-medium text-gray-400 mb-1">Coach Name</label>
                                        <select
                                            id="coachName"
                                            name="coachName"
                                            value={formData.coachName}
                                            onChange={handleChange}
                                            required={formData.hasCoach}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                        >
                                            <option value="" disabled>Select a coach...</option>
                                            {coaches.map(coach => <option key={coach.id} value={coach.name}>{coach.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="trainingType" className="block text-sm font-medium text-gray-400 mb-1">Training Program</label>
                                        <select 
                                            id="trainingType" 
                                            name="trainingType" 
                                            value={formData.trainingType} 
                                            onChange={handleChange} 
                                            required={formData.hasCoach} 
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                        >
                                            <option value="" disabled>Select a program...</option>
                                            {trainingOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-gray-900/50 p-4 rounded-lg">
                                    <h4 className="text-md font-semibold text-gray-300 mb-3 text-center">Session Tracking</h4>
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <InfoItem label="Total" value={<span className="text-2xl font-bold">{formData.totalSessions}</span>} />
                                        
                                        <div>
                                            <label htmlFor="sessionsUsed" className="block text-sm text-gray-400">Used</label>
                                            <div className="flex items-center justify-center mt-1">
                                                <button type="button" onClick={() => handleSessionChange(-1)} className="p-1 rounded-full bg-gray-600 hover:bg-gray-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={formData.sessionsUsed <= 0}>
                                                    <MinusIcon className="w-4 h-4" />
                                                </button>
                                                <input
                                                    type="number"
                                                    id="sessionsUsed"
                                                    name="sessionsUsed"
                                                    value={formData.sessionsUsed}
                                                    onChange={handleChange}
                                                    className="w-16 bg-transparent text-center text-2xl font-bold text-white focus:outline-none"
                                                    min="0"
                                                    max={formData.totalSessions}
                                                />
                                                <button type="button" onClick={() => handleSessionChange(1)} className="p-1 rounded-full bg-gray-600 hover:bg-gray-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={formData.sessionsUsed >= formData.totalSessions}>
                                                    <PlusIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <InfoItem
                                            label="Remaining"
                                            value={
                                                <span className={`text-2xl font-extrabold ${
                                                    remainingSessions <= 3 && remainingSessions > 0 ? 'text-orange-400'
                                                    : remainingSessions <= 0 ? 'text-red-400' : 'text-white'
                                                }`}>
                                                    {remainingSessions}
                                                </span>
                                            }
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label htmlFor="sessionExpiryDate" className="block text-sm font-medium text-gray-400 mb-1">Session Expiry Date</label>
                                    <input type="date" id="sessionExpiryDate" name="sessionExpiryDate" value={formData.sessionExpiryDate} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-b border-gray-700 py-4">
                        <button type="button" onClick={() => setShowPaymentSection(p => !p)} className="w-full flex justify-between items-center text-left text-lg font-bold text-white">
                            <span>Process a New Payment (Online/Remote)</span>
                            <CashIcon className={`w-6 h-6 transition-transform ${showPaymentSection ? 'text-brand-primary' : 'text-gray-400'}`} />
                        </button>
                        {showPaymentSection && (
                            <div className="mt-4 space-y-4 animate-fade-in-up">
                                {hasRenewalPlan && (!member || isPastOrToday(member.dueDate)) && (
                                    <div className="animate-fade-in-up bg-gray-700/50 p-4 rounded-lg">
                                        <label htmlFor="newSubscriptionStartDate" className="block text-sm font-medium text-gray-400 mb-1">
                                        Subscription Start Date (Optional)
                                        </label>
                                        <input
                                        type="date"
                                        id="newSubscriptionStartDate"
                                        name="newSubscriptionStartDate"
                                        value={newSubscriptionStartDate}
                                        onChange={(e) => setNewSubscriptionStartDate(e.target.value)}
                                        min={getTodayYMD()}
                                        className="w-full bg-gray-600 border border-gray-500 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Leave blank to start today. For new or expired members only.</p>
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-md font-semibold text-gray-300 mb-2">Membership Renewals</h3>
                                    <div className="space-y-2">
                                        {memberPlans.map(plan => (
                                            <label key={plan.id} className="flex items-center p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700">
                                                <input type="checkbox" checked={selectedPlanIds.includes(plan.id)} onChange={() => handleTogglePlan(plan.id)} className="h-5 w-5 rounded border-gray-500 bg-gray-800 text-brand-primary focus:ring-brand-primary"/>
                                                <span className="ml-3 text-white flex-grow">{plan.name}</span>
                                                <span className="font-semibold text-gray-300">₱{plan.amount}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-md font-semibold text-gray-300 mb-2">Services & Coaching</h3>
                                    <div className="space-y-2">
                                        {servicePlans.map(plan => (
                                            <label key={plan.id} className="flex items-center p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700">
                                                <input type="checkbox" checked={selectedPlanIds.includes(plan.id)} onChange={() => handleTogglePlan(plan.id)} className="h-5 w-5 rounded border-gray-500 bg-gray-800 text-brand-primary focus:ring-brand-primary"/>
                                                <span className="ml-3 text-white flex-grow">{plan.name}</span>
                                                <span className="font-semibold text-gray-300">₱{plan.amount}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {totalPaymentAmount > 0 && (
                                    <div className="bg-gray-900/50 p-4 rounded-lg text-center mt-4">
                                        <h3 className="text-xl font-bold text-white mb-2">Total Payment</h3>
                                        <p className="text-4xl font-extrabold text-brand-primary">₱{totalPaymentAmount.toFixed(2)}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                        <div>
                            <label htmlFor="membershipFeeLastPaid" className="block text-sm font-medium text-gray-400 mb-1">Membership Fee Last Paid</label>
                            <input type="date" id="membershipFeeLastPaid" name="membershipFeeLastPaid" value={formData.membershipFeeLastPaid} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
                        </div>
                        <div>
                            <label htmlFor="membershipFeeDueDate" className="block text-sm font-medium text-gray-400 mb-1">Membership Fee Due Date</label>
                            <input type="date" id="membershipFeeDueDate" name="membershipFeeDueDate" value={formData.membershipFeeDueDate} readOnly className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary read-only:bg-gray-600 read-only:cursor-not-allowed"/>
                        </div>
                    </div>

                    {member && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-700 pt-4">
                            <div>
                                <label htmlFor="membershipStartDate" className="block text-sm font-medium text-gray-400 mb-1">Joining Date</label>
                                <input type="date" id="membershipStartDate" name="membershipStartDate" value={formData.membershipStartDate} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
                            </div>
                             <div>
                                <label htmlFor="subscriptionStartDate" className="block text-sm font-medium text-gray-400 mb-1">Subscription Start Date</label>
                                <input type="date" id="subscriptionStartDate" name="subscriptionStartDate" value={formData.subscriptionStartDate} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
                            </div>
                             <div>
                                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-400 mb-1">Due Date</label>
                                <input type="date" id="dueDate" name="dueDate" value={formData.dueDate} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-semibold transition">Cancel</button>
                        <button type="submit" className="py-2 px-4 rounded-lg bg-brand-primary hover:opacity-90 text-gray-900 font-bold transition">{member ? 'Save Changes' : 'Add Member'}</button>
                    </div>
                </form>
            </div>
            {isCameraOpen && (
                <WebcamCapture 
                    onCapture={handleWebcamCapture}
                    onClose={() => setIsCameraOpen(false)}
                />
            )}
            {isEditorOpen && editingImageSrc && (
                <ImageEditor 
                    src={editingImageSrc}
                    onSave={handleEditorSave}
                    onClose={handleEditorClose}
                />
            )}
        </div>
    );
};