import React, { useState, FormEvent, useEffect, useMemo } from 'react';
import { Member, CheckinRecord, PricePlan, WalkinClient } from '../types';
import { ArrowLeftIcon, ClipboardIcon, UserIcon, GnexGymLogoIcon, CheckoutIcon, DumbbellIcon } from './icons/Icons';
import { getTodayYMD, isPastOrToday, parseDate } from '../utils/dateUtils';


interface CheckinProps {
    members: Member[];
    checkinRecords: CheckinRecord[];
    addCheckinRecord: (record: Omit<CheckinRecord, 'id' | 'timestamp'>) => void;
    useSession: (memberId: string) => boolean;
    priceList: PricePlan[];
    walkinClients: WalkinClient[];
    requestCheckoutByRecordId: (recordId: string) => boolean;
    useSessionForWalkinClient: (clientId: string) => { success: boolean; message: string };
}

type KioskStep = 'select' | 'member_id' | 'checkout_id' | 'walkin_form' | 'walkin_session_use' | 'member_unfreeze' | 'member_checkout' | 'member_confirm_session';
type StatusType = 'success' | 'error' | 'info' | null;

const StatusMessage: React.FC<{ type: StatusType; message: string; onClear: () => void }> = ({ type, message, onClear }) => {
    useEffect(() => {
        const timer = setTimeout(onClear, 5000);
        return () => clearTimeout(timer);
    }, [onClear]);

    if (!type) return null;

    let bgColor, borderColor, textColor;

    switch (type) {
        case 'success':
            bgColor = 'bg-green-500/10';
            borderColor = 'border-green-500';
            textColor = 'text-green-400';
            break;
        case 'error':
            bgColor = 'bg-red-500/10';
            borderColor = 'border-red-500';
            textColor = 'text-red-400';
            break;
        case 'info':
            bgColor = 'bg-yellow-500/10';
            borderColor = 'border-yellow-500';
            textColor = 'text-yellow-400';
            break;
        default:
            return null;
    }


    return (
        <div className={`p-4 rounded-lg border ${bgColor} ${borderColor} animate-fade-in-up mb-6`}>
            <p className={`text-center font-semibold ${textColor}`}>{message}</p>
        </div>
    );
};

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
    if (isPastOrToday(member.dueDate) || (member.membershipFeeDueDate && isPastOrToday(member.membershipFeeDueDate) && !specialMfTypes.includes(member.membershipType.toUpperCase()))) {
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


export const Checkin: React.FC<CheckinProps> = ({ members, checkinRecords, addCheckinRecord, useSession, priceList, walkinClients, requestCheckoutByRecordId, useSessionForWalkinClient }) => {
    const [step, setStep] = useState<KioskStep>('select');
    const [currentMember, setCurrentMember] = useState<Member | null>(null);
    const [gymNumberInput, setGymNumberInput] = useState('');
    const [checkoutInput, setCheckoutInput] = useState('');
    const [walkinName, setWalkinName] = useState('');
    const [walkinContact, setWalkinContact] = useState('');
    const [status, setStatus] = useState<{type: StatusType, message: string} | null>(null);
    const [selectedWalkin, setSelectedWalkin] = useState<WalkinClient | null>(null);
    const [activeCheckinRecord, setActiveCheckinRecord] = useState<CheckinRecord | null>(null);


    const walkinNameSuggestions = useMemo(() => {
        if (!walkinName.trim() || selectedWalkin) {
            return [];
        }
        const lowerCaseSearch = walkinName.toLowerCase();
        return walkinClients.filter(client =>
            client.name.toLowerCase().includes(lowerCaseSearch)
        );
    }, [walkinName, walkinClients, selectedWalkin]);
    
    const handleSelectWalkin = (client: WalkinClient) => {
        setSelectedWalkin(client);
        setWalkinName(client.name);
        setWalkinContact(client.contactNumber);
        if (client.sessionPlan && client.sessionPlan.used < client.sessionPlan.total) {
            setStep('walkin_session_use');
        }
    };

    const handleWalkinNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setWalkinName(e.target.value);
        if (selectedWalkin) {
            setSelectedWalkin(null);
            setWalkinContact('');
        }
    };


    const handleMemberCheckin = (e: FormEvent) => {
        e.preventDefault();
        if (!gymNumberInput.trim()) {
            setStatus({ type: 'error', message: 'Please enter your gym number.' });
            return;
        }
        const fullGymNumber = `G-${gymNumberInput}`;
        const member = members.find(m => m.id.toLowerCase() === fullGymNumber.toLowerCase());
        
        if (!member) {
            setStatus({ type: 'error', message: 'Member not found. Please see the front desk for assistance.' });
            setGymNumberInput('');
            return;
        }
        
        const todayStr = getTodayYMD();
        const activeCheckin = checkinRecords.find(r => 
            r.gymNumber === member.id &&
            r.status === 'Confirmed' &&
            r.timestamp.startsWith(todayStr) &&
            !r.checkoutTimestamp
        );

        if (activeCheckin) {
            setCurrentMember(member);
            setActiveCheckinRecord(activeCheckin);
            setStep('member_checkout');
            setStatus(null);
            return;
        }

        const { key: memberStatus } = getDynamicMemberStatus(member);
        const remainingSessions = (member.totalSessions ?? 0) - (member.sessionsUsed ?? 0);
        const hasActiveCoachPlan = member.hasCoach && remainingSessions > 0;

        if (memberStatus === 'active') {
             if (hasActiveCoachPlan) {
                setCurrentMember(member);
                setStep('member_confirm_session');
                setStatus(null);
            } else {
                setStatus({ type: 'success', message: `Check-in request sent for ${member.name}. Please wait for front desk confirmation.` });
                addCheckinRecord({
                    type: 'Member',
                    name: member.name,
                    gymNumber: member.id,
                    photoUrl: member.photoUrl,
                    amountPaid: 0,
                    status: 'Pending',
                    needsCoach: false,
                    pendingAction: 'check-in',
                    className: member.className,
                } as CheckinRecord);
                setGymNumberInput('');
            }

        } else if (['inactive', 'due', 'sessions'].includes(memberStatus)) {
            setStatus({ type: 'info', message: `Welcome, ${member.name}! Your membership requires renewal. Please see the front desk.` });
            addCheckinRecord({
                type: 'Member',
                name: member.name,
                gymNumber: member.id,
                photoUrl: member.photoUrl,
                amountPaid: 0,
                status: 'Pending',
                needsCoach: false, // Don't allow coach request if due
                pendingAction: 'payment', // Signifies renewal is needed
                className: member.className
            } as CheckinRecord);
            setGymNumberInput('');
        } else if (memberStatus === 'frozen') {
            setCurrentMember(member);
            setStep('member_unfreeze');
            setStatus({ type: 'info', message: `Welcome, ${member.name}! Your account is currently frozen.` });
        } else {
            setStatus({ type: 'info', message: `Welcome, ${member.name}! Your membership requires attention. Please see the front desk.` });
            addCheckinRecord({
                type: 'Member', name: member.name, gymNumber: member.id,
                photoUrl: member.photoUrl,
                amountPaid: 0, status: 'Pending', needsCoach: false,
                className: member.className,
            } as CheckinRecord);
            setGymNumberInput('');
        }
    };

    const handleClientCheckout = (e: FormEvent) => {
        e.preventDefault();
        if (!checkoutInput.trim()) {
            setStatus({ type: 'error', message: 'Please enter your name or gym number.' });
            return;
        }
    
        const input = checkoutInput.trim();
        const todayStr = getTodayYMD();
    
        const activeCheckins = checkinRecords.filter(r =>
            r.status === 'Confirmed' &&
            r.timestamp.startsWith(todayStr) &&
            !r.checkoutTimestamp
        );
    
        let matchingRecords: CheckinRecord[] = [];
    
        // Check if input is a gym number
        if (/^\d+$/.test(input)) {
            const fullGymNumber = `G-${input}`;
            matchingRecords = activeCheckins.filter(r => r.gymNumber && r.gymNumber.toLowerCase() === fullGymNumber.toLowerCase());
        }
    
        // If no match by gym number, search by name
        if (matchingRecords.length === 0) {
            const lowerCaseInput = input.toLowerCase();
            matchingRecords = activeCheckins.filter(r => r.name.toLowerCase().includes(lowerCaseInput));
        }
    
        if (matchingRecords.length === 0) {
            setStatus({ type: 'error', message: 'No active check-in found. Please see the front desk.' });
            setCheckoutInput('');
            return;
        }
    
        if (matchingRecords.length > 1) {
            setStatus({ type: 'info', message: 'Multiple clients found. Please provide a more specific name or see the front desk.' });
            return;
        }
    
        const recordToCheckOut = matchingRecords[0];
        const success = requestCheckoutByRecordId(recordToCheckOut.id);

        if (success) {
            if (recordToCheckOut.balance > 0) {
                setStatus({ type: 'info', message: `Checkout request sent. Please settle your balance of ₱${recordToCheckOut.balance.toFixed(2)} at the front desk.` });
            } else {
                setStatus({ type: 'success', message: `Checkout request sent! Please wait for front desk confirmation, ${recordToCheckOut.name}.` });
            }
            setCheckoutInput('');
        } else {
             setStatus({ type: 'error', message: `Could not request checkout for ${recordToCheckOut.name}. They may already have a pending request.` });
        }
    };

    const handleCheckout = () => {
        if (!currentMember || !activeCheckinRecord) return;

        const recordToCheckOut = activeCheckinRecord;
        const success = requestCheckoutByRecordId(recordToCheckOut.id);

        if (success) {
            if (recordToCheckOut.balance > 0) {
                 setStatus({ type: 'info', message: `Checkout request sent. Please settle your balance of ₱${recordToCheckOut.balance.toFixed(2)} at the front desk.` });
            } else {
                setStatus({ type: 'success', message: `Checkout request sent! Have a great day, ${currentMember.name}.` });
            }
        } else {
             setStatus({ type: 'error', message: `Could not request checkout for ${currentMember.name}. They may already have a pending request.` });
        }
        resetToMemberLogin();
    };

    const handleUnfreezeRequest = () => {
        if (!currentMember) return;
        addCheckinRecord({
            type: 'Member', name: currentMember.name, gymNumber: currentMember.id,
            photoUrl: currentMember.photoUrl,
            amountPaid: 0, status: 'Pending', needsCoach: false,
            pendingAction: 'unfreeze',
        } as CheckinRecord);
        setStatus({ type: 'success', message: `Unfreeze request sent. Please confirm with the front desk.` });
        resetToMemberLogin();
    };

    const handleWalkinSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!walkinName.trim() || !walkinContact.trim()) {
            setStatus({ type: 'error', message: 'Please fill in both your name and contact number.' });
            return;
        }
    
        addCheckinRecord({
            type: 'Walk-in',
            name: walkinName,
            contactNumber: walkinContact,
            status: 'Pending',
            pendingAction: 'payment', // This signals the dashboard to handle payment/plan selection
            amountPaid: 0,
            amountDue: 0,
            balance: 0,
            needsCoach: false,
            walkinClientId: selectedWalkin ? selectedWalkin.id : undefined,
            photoUrl: selectedWalkin ? selectedWalkin.photoUrl : undefined,
            isNewWalkin: !selectedWalkin,
        });
    
        setStatus({ type: 'success', message: `Thank you, ${walkinName}! Please see the front desk to complete your check-in.` });
        resetView();
    };

    const handleUseWalkinSession = () => {
        if (!selectedWalkin || !selectedWalkin.sessionPlan) return;
    
        // Check if sessions are available without consuming one.
        // The session will be consumed when the coach marks it complete in the Coach Log.
        if (selectedWalkin.sessionPlan.used >= selectedWalkin.sessionPlan.total) {
            setStatus({ type: 'error', message: 'No sessions remaining. Please purchase a new plan.' });
            return;
        }
    
        addCheckinRecord({
            type: 'Walk-in',
            name: selectedWalkin.name,
            photoUrl: selectedWalkin.photoUrl,
            amountPaid: 0,
            status: 'Pending',
            needsCoach: true,
            coachAssigned: 'COACH RALPH', // This seems specific to Taekwondo
            paymentDetails: {
                plan: `Use Session: ${selectedWalkin.sessionPlan.name}`,
                amount: 0
            },
            balance: 0,
            amountDue: 0,
            walkinClientId: selectedWalkin.id,
            isNewWalkin: false,
            contactNumber: selectedWalkin.contactNumber,
            className: 'Taekwondo',
        });
    
        const remaining = selectedWalkin.sessionPlan.total - selectedWalkin.sessionPlan.used;
        setStatus({ type: 'success', message: `Check-in request sent. You have ${remaining} sessions remaining.` });
        resetView();
    };

    const handleSessionConfirmation = (useSessionToday: boolean) => {
        if (!currentMember) return;
    
        const message = useSessionToday 
            ? `Check-in with session request sent for ${currentMember.name}.`
            : `Check-in request sent for ${currentMember.name}. You can still workout.`;
    
        setStatus({ type: 'success', message });
        addCheckinRecord({
            type: 'Member',
            name: currentMember.name,
            gymNumber: currentMember.id,
            photoUrl: currentMember.photoUrl,
            amountPaid: 0,
            status: 'Pending',
            needsCoach: useSessionToday,
            pendingAction: 'check-in',
            className: currentMember.className,
        } as CheckinRecord);
        resetView();
    };

    const resetToMemberLogin = () => {
        setStep('member_id');
        setCurrentMember(null);
        setGymNumberInput('');
        setCheckoutInput('');
        setActiveCheckinRecord(null);
    }
    
    const resetView = () => {
        setStep('select');
        setStatus(null);
        setCurrentMember(null);
        setGymNumberInput('');
        setCheckoutInput('');
        setWalkinName('');
        setWalkinContact('');
        setSelectedWalkin(null);
        setActiveCheckinRecord(null);
    }
    
    const renderContent = () => {
        switch (step) {
            case 'member_id':
                return (
                    <div className="w-full max-w-md animate-fade-in-up">
                        <h2 className="text-4xl font-bold text-center text-white mb-2">Member Check-in</h2>
                        <p className="text-gray-400 text-center mb-8">Enter your Gym Number below.</p>
                        {status && <StatusMessage type={status.type} message={status.message} onClear={() => setStatus(null)} />}
                        <form onSubmit={handleMemberCheckin} className="space-y-6">
                            <div className="flex items-baseline w-full bg-gray-800/80 border-2 border-gray-700 rounded-xl focus-within:ring-4 focus-within:border-brand-red focus-within:ring-brand-red/20 transition-all duration-300 shadow-lg">
                                <span className="py-4 pl-6 text-brand-red text-4xl font-bold">G-</span>
                                <input type="text" placeholder="1001" className="w-full bg-transparent py-4 pr-6 pl-2 text-white text-4xl font-bold tracking-widest focus:outline-none placeholder-gray-600" value={gymNumberInput} onChange={(e) => setGymNumberInput(e.target.value.replace(/[^0-9]/g, ''))} autoFocus />
                            </div>
                            <button type="submit" className="w-full bg-brand-red hover:opacity-90 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 text-lg shadow-[0_4px_20px_rgba(255,0,0,0.4)] hover:shadow-[0_6px_25px_rgba(255,0,0,0.5)]">CHECK IN</button>
                        </form>
                    </div>
                );
            // FIX: Add block scope to prevent redeclaration error
            case 'member_confirm_session': {
                if (!currentMember) return null;
                const remainingSessions = (currentMember.totalSessions ?? 0) - (currentMember.sessionsUsed ?? 0);
                return (
                    <div className="w-full max-w-lg animate-fade-in-up text-center">
                        <h2 className="text-4xl font-bold text-white mb-6">Welcome, {currentMember.name}!</h2>
                        <div className="w-48 h-48 rounded-full bg-gray-700 mx-auto flex items-center justify-center mb-6 border-4 border-gray-600 shadow-lg">
                            {currentMember.photoUrl ? (
                                <img src={currentMember.photoUrl} alt={currentMember.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <UserIcon className="w-24 h-24 text-gray-500" />
                            )}
                        </div>
                        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                            <p className="text-brand-secondary font-semibold">You have a coaching plan!</p>
                            <p className="text-white text-2xl mt-1">
                                You have <span className="font-bold text-brand-primary text-3xl">{remainingSessions}</span> sessions remaining.
                            </p>
                            <p className="text-gray-400 text-lg mt-4">Would you like to use one for today's workout?</p>
                        </div>
                        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                            <button 
                                onClick={() => handleSessionConfirmation(true)} 
                                className="w-full sm:w-auto bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 text-lg shadow-lg flex-1"
                            >
                                Yes, Use a Session
                            </button>
                            <button 
                                onClick={() => handleSessionConfirmation(false)} 
                                className="w-full sm:w-auto bg-gray-600 hover:bg-gray-500 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 text-lg flex-1"
                            >
                                Not Today
                            </button>
                        </div>
                    </div>
                );
            }
            case 'checkout_id':
                return (
                    <div className="w-full max-w-md animate-fade-in-up">
                        <h2 className="text-4xl font-bold text-center text-white mb-2">Client Check-out</h2>
                        <p className="text-gray-400 text-center mb-8">Enter your Name or Gym Number to check out.</p>
                        {status && <StatusMessage type={status.type} message={status.message} onClear={() => setStatus(null)} />}
                        <form onSubmit={handleClientCheckout} className="space-y-6">
                            <div className="flex items-baseline w-full bg-gray-800/80 border-2 border-gray-700 rounded-xl focus-within:ring-4 focus-within:border-blue-500 focus-within:ring-blue-500/20 transition-all duration-300 shadow-lg">
                                <input type="text" placeholder="Name or Number" className="w-full bg-transparent py-4 px-6 text-white text-4xl font-bold tracking-widest focus:outline-none placeholder-gray-600" value={checkoutInput} onChange={(e) => setCheckoutInput(e.target.value)} autoFocus />
                            </div>
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 text-lg shadow-[0_4px_20px_rgba(59,130,246,0.4)] hover:shadow-[0_6px_25px_rgba(59,130,246,0.5)]">REQUEST CHECK-OUT</button>
                        </form>
                    </div>
                );
            case 'member_checkout':
                return (
                    <div className="w-full max-w-md animate-fade-in-up text-center">
                        <h2 className="text-4xl font-bold text-white mb-6">Welcome back, {currentMember?.name}!</h2>
                        <div className="w-48 h-48 rounded-full bg-gray-700 mx-auto flex items-center justify-center mb-6 border-4 border-gray-600 shadow-lg">
                            {currentMember?.photoUrl ? (
                                <img src={currentMember.photoUrl} alt={currentMember.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <UserIcon className="w-24 h-24 text-gray-500" />
                            )}
                        </div>
                         <p className="text-gray-400 text-lg mb-8">Are you leaving the gym now?</p>
                        <button onClick={handleCheckout} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 text-lg shadow-lg">REQUEST CHECK-OUT</button>
                        <button onClick={resetToMemberLogin} className="mt-6 text-gray-400 hover:text-white transition-colors">Not me? Cancel</button>
                    </div>
                );
            case 'member_unfreeze':
                 return (
                    <div className="w-full max-w-lg animate-fade-in-up text-center">
                        <h2 className="text-4xl font-bold text-white mb-2">Unfreeze Account</h2>
                         {status && <StatusMessage type={status.type} message={status.message} onClear={() => setStatus(null)} />}
                        <p className="text-gray-400 mb-8">Would you like to reactivate your membership? Your remaining days will be readjusted.</p>
                        <button onClick={handleUnfreezeRequest} className="w-full max-w-sm mx-auto bg-brand-secondary hover:opacity-90 text-black font-bold py-4 px-6 rounded-xl transition-all duration-300 text-lg">
                           Yes, Unfreeze My Account
                        </button>
                         <button onClick={resetToMemberLogin} className="mt-6 text-gray-400 hover:text-white transition-colors">Go Back</button>
                    </div>
                );
             // FIX: Add block scope to prevent redeclaration error
             case 'walkin_session_use': {
                const remainingSessions = selectedWalkin?.sessionPlan ? selectedWalkin.sessionPlan.total - selectedWalkin.sessionPlan.used : 0;
                return (
                    <div className="w-full max-w-lg animate-fade-in-up text-center">
                        <h2 className="text-4xl font-bold text-white mb-2">Welcome Back, {selectedWalkin?.name}!</h2>
                        <div className="w-48 h-48 rounded-full bg-gray-700 mx-auto flex items-center justify-center my-6 border-4 border-gray-600 shadow-lg">
                            {selectedWalkin?.photoUrl ? (
                                <img src={selectedWalkin.photoUrl} alt={selectedWalkin.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <UserIcon className="w-24 h-24 text-gray-500" />
                            )}
                        </div>
                        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                            <p className="text-purple-300 font-semibold">{selectedWalkin?.sessionPlan?.name}</p>
                            <p className="text-white text-2xl mt-1">You have <span className="font-bold text-brand-primary text-3xl">{remainingSessions}</span> sessions remaining.</p>
                        </div>
                        <button onClick={handleUseWalkinSession} className="mt-8 w-full max-w-sm mx-auto bg-brand-primary hover:opacity-90 text-black font-bold py-4 px-6 rounded-xl transition-all duration-300 text-lg">
                           Use 1 Session for Today's Class
                        </button>
                        <button onClick={() => setStep('walkin_form')} className="mt-6 text-gray-400 hover:text-white transition-colors">Pay for a different service instead</button>
                    </div>
                );
            }
            case 'walkin_form':
                 return (
                    <div className="w-full max-w-lg animate-fade-in-up">
                        <h2 className="text-4xl font-bold text-center text-white mb-2">Walk-in Sign-in</h2>
                        <p className="text-gray-400 text-center mb-8">Enter your details to request a check-in.</p>
                         {status && <StatusMessage type={status.type} message={status.message} onClear={() => setStatus(null)} />}
                        <form onSubmit={handleWalkinSubmit} className="space-y-6 bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                            <div className="relative">
                                <label htmlFor="walkinName" className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                                <input type="text" id="walkinName" placeholder="Full Name" className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-secondary/50 focus:border-brand-secondary transition-all" value={walkinName} onChange={handleWalkinNameChange} required />
                                {walkinNameSuggestions.length > 0 && (
                                    <ul className="absolute z-10 w-full bg-gray-600 border border-gray-500 rounded-lg mt-1 max-h-40 overflow-y-auto">
                                        {walkinNameSuggestions.map(client => (
                                            <li key={client.id} onClick={() => handleSelectWalkin(client)} className="px-4 py-2 text-white hover:bg-brand-secondary/20 cursor-pointer">
                                                {client.name}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                             <div>
                                <label htmlFor="walkinContact" className="block text-sm font-medium text-gray-400 mb-1">Contact Number</label>
                                <input type="tel" id="walkinContact" placeholder="Contact Number" className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-secondary/50 focus:border-brand-secondary transition-all disabled:bg-gray-600" value={walkinContact} onChange={(e) => setWalkinContact(e.target.value)} required disabled={!!selectedWalkin} />
                            </div>
                            <button type="submit" className="w-full bg-brand-primary hover:opacity-90 text-gray-900 font-bold py-4 px-6 rounded-xl transition-all duration-300 text-lg">
                                Send Check-in Request
                            </button>
                        </form>
                    </div>
                );
            case 'select':
            default:
                return (
                    <div className="text-center animate-fade-in-up">
                        <GnexGymLogoIcon className="w-24 h-24 mx-auto" />
                        <h1 className="text-5xl font-extrabold text-white mt-4">GNEX<span className="text-brand-red">GYM</span></h1>
                        <p className="text-gray-400 mt-2 text-lg">Your workout begins here. Please check in.</p>
                        <div className="mt-12 flex flex-col lg:flex-row gap-6 justify-center">
                            <button onClick={() => setStep('member_id')} className="group flex flex-col items-center justify-center bg-gray-800/50 backdrop-blur-md hover:bg-gray-800/80 border-2 border-gray-700 hover:border-brand-red rounded-2xl p-8 transition-all duration-300 transform hover:-translate-y-2 w-full lg:w-72 h-60 shadow-lg hover:shadow-[0_0_25px_rgba(255,0,0,0.3)]">
                                <UserIcon className="w-16 h-16 text-gray-400 group-hover:text-brand-red mb-3 transition-all duration-300 group-hover:scale-110"/>
                                <span className="text-2xl font-bold text-white">Member Check-in</span>
                                <span className="text-gray-400">I have a Gym Number</span>
                            </button>
                            <button onClick={() => setStep('walkin_form')} className="group flex flex-col items-center justify-center bg-gray-800/50 backdrop-blur-md hover:bg-gray-800/80 border-2 border-gray-700 hover:border-brand-secondary rounded-2xl p-8 transition-all duration-300 transform hover:-translate-y-2 w-full lg:w-72 h-60 shadow-lg hover:shadow-[0_0_25px_rgba(0,217,224,0.3)]">
                                <ClipboardIcon className="w-16 h-16 text-gray-400 group-hover:text-brand-secondary mb-3 transition-all duration-300 group-hover:scale-110"/>
                                <span className="text-2xl font-bold text-white">Walk-in Sign-in</span>
                                 <span className="text-gray-400">I'm a new visitor</span>
                            </button>
                            <button onClick={() => setStep('checkout_id')} className="group flex flex-col items-center justify-center bg-gray-800/50 backdrop-blur-md hover:bg-gray-800/80 border-2 border-gray-700 hover:border-blue-500 rounded-2xl p-8 transition-all duration-300 transform hover:-translate-y-2 w-full lg:w-72 h-60 shadow-lg hover:shadow-[0_0_25px_rgba(59,130,246,0.3)]">
                                <CheckoutIcon className="w-16 h-16 text-gray-400 group-hover:text-blue-500 mb-3 transition-all duration-300 group-hover:scale-110"/>
                                <span className="text-2xl font-bold text-white">Client Check-out</span>
                                <span className="text-gray-400">I'm leaving the gym</span>
                            </button>
                        </div>
                    </div>
                );
        }
    };

    const showBackButton = ['member_id', 'checkout_id', 'walkin_form', 'walkin_session_use', 'member_unfreeze', 'member_checkout', 'member_confirm_session'].includes(step);

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 relative bg-gray-900 overflow-hidden">
            <div className="absolute -inset-1/4 flex items-center justify-center pointer-events-none">
                <GnexGymLogoIcon className="w-[60rem] h-[60rem] text-gray-800 opacity-20 animate-spin-slow" />
            </div>

            {showBackButton && (
                <button onClick={resetView} className="absolute top-6 left-6 flex items-center text-gray-400 hover:text-white transition-colors z-20 bg-gray-800/50 backdrop-blur-sm p-2 rounded-lg">
                    <ArrowLeftIcon className="w-5 h-5 mr-2" />
                    Back
                </button>
            )}
           <div className="z-10 w-full flex flex-col items-center justify-center">
             {renderContent()}
           </div>
        </div>
    )
};