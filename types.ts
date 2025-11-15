// types.ts

export type View = 'dashboard' | 'members' | 'checkin' | 'records' | 'coach-log' | 'workout-planner' | 'diet-planner' | 'coaches' | 'prices' | 'products' | 'walkin-log' | 'tasks' | 'classes' | 'taekwondo-log' | 'unsettled-payments' | 'payment-history';

export type HistoryEntryType = 'status_change' | 'payment' | 'session_update' | 'note';

export interface MemberHistoryEntry {
    timestamp: string; // ISO date string
    type: HistoryEntryType;
    title: string;
    details?: string;
    paymentAmount?: number;
}

export interface Member {
    id: string; // e.g., G-1001
    name: string;
    photoUrl?: string;
    status: string; // 'Active', 'Inactive', 'Frozen', 'Due', 'Sessions'
    membershipType: string;
    details: string;
    hasCoach: boolean;
    coachName?: string;
    trainingType?: string;
    membershipStartDate: string; // YYYY-MM-DD
    subscriptionStartDate?: string; // YYYY-MM-DD
    lastPaymentDate: string; // YYYY-MM-DD
    dueDate: string; // YYYY-MM-DD
    totalSessions?: number;
    sessionsUsed?: number;
    daysRemainingOnFreeze?: number;
    coachPlanId?: string;
    sessionExpiryDate?: string; // YYYY-MM-DD
    membershipFeeLastPaid?: string; // YYYY-MM-DD
    membershipFeeDueDate?: string; // YYYY-MM-DD
    lockerStartDate?: string; // YYYY-MM-DD
    lockerDueDate?: string; // YYYY-MM-DD
    classId?: string;
    className?: string;
    history?: MemberHistoryEntry[];
}

export interface PricePlan {
    id: string;
    name: string;
    amount: number;
    type: 'member' | 'walk-in' | 'coach' | 'class';
}

export interface Class {
    id: string;
    name: string;
    coachId?: string;
    coachName?: string;
    attendance?: {
        date: string; // YYYY-MM-DD
        presentMemberIds: string[];
    }[];
}

export interface CheckinRecord {
    id: string;
    timestamp: string; // ISO date string
    type: 'Member' | 'Walk-in';
    name: string;
    gymNumber?: string;
    photoUrl?: string;
    amountPaid: number;
    status: 'Pending' | 'Confirmed' | 'Cancelled';
    needsCoach: boolean;
    coachAssigned?: string;
    paymentDetails?: {
        plan: string;
        amount: number;
    };
    balance: number;
    amountDue: number;
    checkoutTimestamp?: string; // ISO date string
    cancellationReason?: string;
    pendingAction?: 'payment' | 'unfreeze' | 'check-in' | 'checkout';
    productsPurchased?: {
        itemId: string;
        productId: string;
        name: string;
        quantity: number;
        price: number;
    }[];
    balanceDueDate?: string; // YYYY-MM-DD
    walkinClientId?: string;
    isNewWalkin?: boolean;
    contactNumber?: string;
    className?: string;
    sessionPlanDetails?: {
        name: string;
        total: number;
    };
    carriedOverBalance?: number;
    sessionCompleted?: boolean;
}

export interface Coach {
    id: string;
    name: string;
    mobileNumber: string;
    address: string;
    skills: string[];
}

export interface WalkinClient {
    id: string;
    name: string;
    contactNumber: string;
    photoUrl?: string;
    lastVisit: string; // YYYY-MM-DD
    sessionPlan?: {
        name: string;
        total: number;
        used: number;
        lastSessionUsedDate?: string; // YYYY-MM-DD
    };
    history?: MemberHistoryEntry[];
}

export interface Product {
    id: string;
    name: string;
    category: string;
    price: number;
    stock: number;
}

export interface Task {
    id: string;
    title: string;
    details: string;
    dueDate: string; // YYYY-MM-DD
    recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
    clientId?: string;
    clientName?: string;
    completedOn: string[]; // array of YYYY-MM-DD dates
}

export interface WorkoutDay {
    day: string;
    focus: string;
    exercises: {
        name: string;
        sets: string;
        reps: string;
        rest: string;
        description: string;
    }[];
}

export interface WorkoutPlan {
    plan: WorkoutDay[];
}

export interface Meal {
    name: string;
    description: string;
    calories: number;
}

export interface DietDay {
    day: string;
    meals: {
        breakfast: Meal;
        lunch: Meal;
        dinner: Meal;
        snack: Meal;
    };
    total_calories: number;
}

export interface DietPlan {
    plan: DietDay[];
}