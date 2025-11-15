import { useState, useMemo, useEffect } from 'react';
import { Class, Coach } from '../types';

const STORAGE_KEY = 'gnex-gym-classes';

const initialClasses: Class[] = [
    {
        id: 'class-1',
        name: 'Taekwondo',
        coachId: 'coach-2', // Coach RALPH
        attendance: [],
    },
];

export const useClasses = (coaches: Coach[]) => {
    const [classes, setClasses] = useState<Class[]>(() => {
        try {
            const storedData = localStorage.getItem(STORAGE_KEY);
            return storedData ? JSON.parse(storedData) : initialClasses;
        } catch (error) {
            console.error("Error reading classes from localStorage", error);
            return initialClasses;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(classes));
        } catch (error) {
            console.error("Error saving classes to localStorage", error);
        }
    }, [classes]);
    
    const classesWithDetails = useMemo(() => {
        return classes.map(c => ({
            ...c,
            coachName: coaches.find(coach => coach.id === c.coachId)?.name,
        }));
    }, [classes, coaches]);

    const addClass = (classData: Omit<Class, 'id'>) => {
        const newClass: Class = {
            ...classData,
            id: `class-${Date.now()}`,
            attendance: [],
        };
        setClasses(prev => [newClass, ...prev]);
    };

    const updateClass = (updatedClass: Class) => {
        setClasses(prev => prev.map(c => c.id === updatedClass.id ? updatedClass : c));
    };

    const deleteClass = (id: string) => {
        setClasses(prev => prev.filter(c => c.id !== id));
    };

    const markAttendance = (classId: string, date: string, presentMemberIds: string[]) => {
        setClasses(prevClasses => prevClasses.map(cls => {
            if (cls.id === classId) {
                const updatedAttendance = [...(cls.attendance || [])];
                const recordIndex = updatedAttendance.findIndex(rec => rec.date === date);

                if (recordIndex > -1) {
                    // Update existing record
                    updatedAttendance[recordIndex] = { date, presentMemberIds };
                } else {
                    // Add new record
                    updatedAttendance.push({ date, presentMemberIds });
                }
                return { ...cls, attendance: updatedAttendance };
            }
            return cls;
        }));
    };

    return { classes: classesWithDetails, addClass, updateClass, deleteClass, markAttendance };
};