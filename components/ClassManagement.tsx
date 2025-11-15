import React, { useState, useMemo, useEffect } from 'react';
import { Class, Member, Coach } from '../types';
import { PlusIcon, UserIcon, DumbbellIcon, XIcon, CheckCircleIcon } from './icons/Icons';
import { ClassForm } from './ClassForm';
import { getTodayYMD, formatDate } from '../utils/dateUtils';

interface ClassManagementProps {
    classes: Class[];
    members: Member[];
    coaches: Coach[];
    addClass: (classData: Omit<Class, 'id'>) => void;
    updateClass: (classData: Class) => void;
    deleteClass: (id: string) => void;
    updateMember: (member: Member) => void;
    markAttendance: (classId: string, date: string, presentMemberIds: string[]) => void;
}

export const ClassManagement: React.FC<ClassManagementProps> = ({ classes, members, coaches, addClass, updateClass, deleteClass, updateMember, markAttendance }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<Class | null>(null);
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [memberToEnroll, setMemberToEnroll] = useState('');
    const [attendanceDate, setAttendanceDate] = useState(getTodayYMD());
    const [presentMembers, setPresentMembers] = useState<Set<string>>(new Set());
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);

    const membersByClass = useMemo(() => {
        const map = new Map<string, Member[]>();
        classes.forEach(c => map.set(c.id, []));
        members.forEach(m => {
            if (m.classId && map.has(m.classId)) {
                map.get(m.classId)!.push(m);
            }
        });
        return map;
    }, [classes, members]);

    useEffect(() => {
        if (selectedClass) {
            const attendanceRecord = selectedClass.attendance?.find(rec => rec.date === attendanceDate);
            setPresentMembers(new Set(attendanceRecord?.presentMemberIds || []));
        } else {
            setPresentMembers(new Set());
        }
    }, [selectedClass, attendanceDate]);


    const availableMembersToEnroll = useMemo(() => {
        return members.filter(m => !m.classId).sort((a, b) => a.name.localeCompare(b.name));
    }, [members]);

    const handleAddClass = () => {
        setEditingClass(null);
        setIsFormOpen(true);
    };

    const handleEditClass = (classData: Class) => {
        setEditingClass(classData);
        setIsFormOpen(true);
    };
    
    const handleDeleteClass = (id: string) => {
        if (window.confirm('Are you sure you want to delete this class? Members will be unenrolled.')) {
            const enrolledMembers = membersByClass.get(id) || [];
            enrolledMembers.forEach(member => {
                const { classId, className, ...rest } = member;
                updateMember(rest);
            });
            deleteClass(id);
            if (selectedClass?.id === id) {
                setSelectedClass(null);
            }
        }
    };
    
    const handleSaveClass = (classData: Omit<Class, 'id'> | Class) => {
        if ('id' in classData) {
            updateClass(classData as Class);
        } else {
            addClass(classData as Omit<Class, 'id'>);
        }
    };
    
    const handleEnrollMember = () => {
        if (!memberToEnroll || !selectedClass) return;
        const member = members.find(m => m.id === memberToEnroll);
        if (member) {
            updateMember({ ...member, classId: selectedClass.id, className: selectedClass.name });
        }
        setMemberToEnroll('');
        setIsEnrolling(false);
    };
    
    const handleUnenrollMember = (memberId: string) => {
        const member = members.find(m => m.id === memberId);
        if (member) {
            const { classId, className, ...rest } = member;
            updateMember(rest);
        }
    };

    const handleAttendanceToggle = (memberId: string) => {
        setPresentMembers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(memberId)) {
                newSet.delete(memberId);
            } else {
                newSet.add(memberId);
            }
            return newSet;
        });
    };

    const handleSaveAttendance = () => {
        if (!selectedClass) return;
        markAttendance(selectedClass.id, attendanceDate, Array.from(presentMembers));
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Manage Classes</h1>
                <button
                    onClick={handleAddClass}
                    className="flex items-center bg-brand-primary hover:opacity-90 text-gray-900 font-bold py-2 px-4 rounded-lg"
                >
                    <PlusIcon className="w-5 h-5 mr-2"/>
                    Add Class
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {classes.map(cls => (
                    <div key={cls.id} onClick={() => {setSelectedClass(cls); setAttendanceDate(getTodayYMD());}} className={`bg-gray-800 rounded-xl shadow-lg border-2 p-6 cursor-pointer transition-all duration-300 ${selectedClass?.id === cls.id ? 'border-brand-primary shadow-brand-primary/20' : 'border-gray-700 hover:border-brand-primary/50 hover:-translate-y-1'}`}>
                        <div className="flex items-center mb-4">
                             <div className="p-3 rounded-full bg-brand-primary/20 mr-4">
                                <DumbbellIcon className="w-6 h-6 text-brand-primary" />
                             </div>
                             <div>
                                <h2 className="text-xl font-bold text-white">{cls.name}</h2>
                                <p className="text-sm text-gray-400">{cls.coachName || 'No coach assigned'}</p>
                             </div>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center text-gray-300">
                                <UserIcon className="w-4 h-4 mr-2" />
                                <span>{membersByClass.get(cls.id)?.length || 0} Members</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); handleEditClass(cls); }} className="text-xs text-brand-secondary hover:underline">Edit</button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.id); }} className="text-xs text-red-500 hover:underline">Delete</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {selectedClass && (
                <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 mt-8 animate-fade-in-up grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Member Roster Section */}
                    <div>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-2xl font-bold text-white">Member Roster: {selectedClass.name}</h3>
                                <p className="text-gray-400">{membersByClass.get(selectedClass.id)?.length || 0} members enrolled</p>
                            </div>
                            <button onClick={() => setSelectedClass(null)} className="text-gray-500 hover:text-white"><XIcon className="w-6 h-6" /></button>
                        </div>
                        
                        {isEnrolling ? (
                             <div className="flex gap-2 mb-4 p-4 bg-gray-700/50 rounded-lg">
                                <select value={memberToEnroll} onChange={(e) => setMemberToEnroll(e.target.value)} className="flex-grow bg-gray-600 border border-gray-500 rounded-lg p-2 text-white">
                                    <option value="">Select a member to enroll...</option>
                                    {availableMembersToEnroll.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                                <button onClick={handleEnrollMember} className="py-2 px-4 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold">Enroll</button>
                                <button onClick={() => setIsEnrolling(false)} className="py-2 px-4 rounded-lg bg-gray-500 hover:bg-gray-400 text-white font-semibold">Cancel</button>
                            </div>
                        ) : (
                            <button onClick={() => setIsEnrolling(true)} className="mb-4 flex items-center bg-brand-secondary hover:opacity-90 text-gray-900 font-bold py-2 px-4 rounded-lg">
                                <PlusIcon className="w-5 h-5 mr-2" />
                                Enroll New Member
                            </button>
                        )}
                        
                        <div className="max-h-96 overflow-y-auto">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-gray-800">
                                    <tr>
                                        <th className="p-2 font-semibold">Name</th>
                                        <th className="p-2 font-semibold">Gym Number</th>
                                        <th className="p-2 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {membersByClass.get(selectedClass.id)?.map(member => (
                                        <tr key={member.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                            <td className="p-2 text-white">{member.name}</td>
                                            <td className="p-2 text-gray-400">{member.id}</td>
                                            <td className="p-2">
                                                <button onClick={() => handleUnenrollMember(member.id)} className="text-sm text-red-500 hover:underline">Unenroll</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {(membersByClass.get(selectedClass.id)?.length || 0) === 0 && <p className="text-center p-8 text-gray-500">No members are currently enrolled in this class.</p>}
                        </div>
                    </div>
                    {/* Attendance Section */}
                     <div className="pt-8 md:pt-0 md:border-l md:pl-8 border-gray-700">
                        <h3 className="text-2xl font-bold text-white mb-4">Track Attendance</h3>
                        <div className="flex items-center gap-4 mb-4">
                            <label htmlFor="attendance-date" className="text-gray-400 font-semibold">Session Date:</label>
                            <input 
                                type="date" 
                                id="attendance-date"
                                value={attendanceDate}
                                onChange={(e) => setAttendanceDate(e.target.value)}
                                className="bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-white"
                            />
                        </div>

                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                           {(membersByClass.get(selectedClass.id) || []).map(member => (
                               <div key={member.id} className="flex items-center p-3 bg-gray-700/50 rounded-lg">
                                   <input
                                       type="checkbox"
                                       id={`att-${member.id}`}
                                       checked={presentMembers.has(member.id)}
                                       onChange={() => handleAttendanceToggle(member.id)}
                                       className="h-5 w-5 rounded border-gray-500 bg-gray-800 text-brand-primary focus:ring-brand-primary cursor-pointer flex-shrink-0"
                                   />
                                   <label htmlFor={`att-${member.id}`} className="ml-3 text-white cursor-pointer">{member.name}</label>
                               </div>
                           ))}
                           {(membersByClass.get(selectedClass.id)?.length || 0) === 0 && <p className="text-center p-8 text-gray-500">Enroll members to track attendance.</p>}
                        </div>

                        <div className="mt-4 flex justify-end items-center gap-4">
                             {showSuccessMessage && (
                                <div className="flex items-center gap-2 text-green-400 animate-fade-in-up">
                                    <CheckCircleIcon className="w-5 h-5"/>
                                    <span className="text-sm font-semibold">Attendance Saved!</span>
                                </div>
                            )}
                            <button 
                                onClick={handleSaveAttendance} 
                                className="py-2 px-4 rounded-lg bg-brand-primary hover:opacity-90 text-gray-900 font-bold transition disabled:opacity-50"
                                disabled={(membersByClass.get(selectedClass.id)?.length || 0) === 0}
                            >
                                Save Attendance for {formatDate(attendanceDate)}
                            </button>
                        </div>
                     </div>
                </div>
            )}


            {isFormOpen && (
                <ClassForm 
                    classData={editingClass} 
                    coaches={coaches}
                    onClose={() => setIsFormOpen(false)}
                    onSave={handleSaveClass}
                />
            )}
        </div>
    );
};