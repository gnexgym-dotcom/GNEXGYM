import React, { useState, useMemo, useEffect } from 'react';
import { Task, Member } from '../types';
import { PlusIcon, WarningIcon, BellIcon, BellOffIcon, UserIcon, CheckCircleIcon } from './icons/Icons';
import { TaskForm } from './TaskForm';
import { useTasks } from '../hooks/useTasks';
import { formatDate, isPastOrToday, getTodayYMD, parseDate, formatToYMD } from '../utils/dateUtils';

type UseTasksReturn = ReturnType<typeof useTasks>;

interface TasksProps extends UseTasksReturn {
    members: Member[];
}

const isTaskScheduledForDate = (task: Task, checkDate: Date): boolean => {
    const taskStartDate = parseDate(task.dueDate);
    if (!taskStartDate) return false;

    // Zero out the time part for accurate date-only comparison
    const checkDateOnly = new Date(checkDate);
    checkDateOnly.setHours(0, 0, 0, 0);
    taskStartDate.setHours(0, 0, 0, 0);

    if (checkDateOnly < taskStartDate) {
        return false;
    }

    switch (task.recurrence) {
        case 'none':
            return checkDateOnly.getTime() === taskStartDate.getTime();
        case 'daily':
            return true;
        case 'weekly':
            return checkDateOnly.getDay() === taskStartDate.getDay();
        case 'monthly':
            return checkDateOnly.getDate() === taskStartDate.getDate();
        default:
            return false;
    }
};

const TaskCalendar: React.FC<{
    tasks: Task[];
    selectedDate: string;
    onDateSelect: (date: string) => void;
}> = ({ tasks, selectedDate, onDateSelect }) => {
    const [viewDate, setViewDate] = useState(() => {
        const initialDate = parseDate(selectedDate);
        initialDate?.setDate(1); // Start view on the 1st of the month
        return initialDate || new Date();
    });

    const todayYMD = getTodayYMD();

    const tasksByDay = useMemo(() => {
        const map = new Map<string, number>();
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            tasks.forEach(task => {
                if (isTaskScheduledForDate(task, date)) {
                    const dateStr = formatToYMD(date);
                    map.set(dateStr, (map.get(dateStr) || 0) + 1);
                }
            });
        }
        return map;
    }, [tasks, viewDate]);

    const changeMonth = (amount: number) => {
        setViewDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + amount);
            return newDate;
        });
    };

    const calendarGrid = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const grid = [];

        for (let i = 0; i < firstDayOfMonth; i++) {
            grid.push(<div key={`empty-${i}`} className="p-2"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = formatToYMD(new Date(year, month, day));
            const isToday = dateStr === todayYMD;
            const isSelected = dateStr === selectedDate;
            const hasTasks = tasksByDay.has(dateStr);

            grid.push(
                <button
                    key={day}
                    onClick={() => onDateSelect(dateStr)}
                    className={`relative text-center w-10 h-10 rounded-full flex items-center justify-center transition-colors
                        ${isSelected ? 'bg-brand-primary text-gray-900 font-bold' : ''}
                        ${!isSelected && 'hover:bg-gray-600'}
                    `}
                >
                    <span className={`${isToday && !isSelected ? 'text-brand-primary font-bold' : ''}`}>{day}</span>
                    {hasTasks && <div className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-gray-900' : 'bg-brand-secondary'}`}></div>}
                </button>
            );
        }
        return grid;
    }, [viewDate, selectedDate, todayYMD, tasksByDay, onDateSelect]);


    return (
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-4">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-700">&lt;</button>
                <h3 className="font-bold text-lg text-white">{viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-700">&gt;</button>
            </div>
            <div className="grid grid-cols-7 gap-y-2 text-center text-xs text-gray-400 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => <div key={i}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-2 justify-items-center">
                {calendarGrid}
            </div>
        </div>
    );
};


const TaskItem: React.FC<{
    task: Task;
    selectedDate: string;
    onToggle: (id: string, date: string) => void;
    onDelete: (id: string) => void;
    onEdit: (task: Task) => void;
}> = ({ task, selectedDate, onToggle, onDelete, onEdit }) => {
    const isCompletedForDate = task.completedOn.includes(selectedDate);
    const isOverdue = !isCompletedForDate && isPastOrToday(selectedDate);

    return (
        <div className={`p-4 rounded-lg flex items-start gap-4 transition-colors ${isCompletedForDate ? 'bg-gray-800/50 opacity-60' : 'bg-gray-700/50'}`}>
            <input
                type="checkbox"
                checked={isCompletedForDate}
                onChange={() => onToggle(task.id, selectedDate)}
                className="mt-1 h-5 w-5 rounded border-gray-500 bg-gray-800 text-brand-primary focus:ring-brand-primary cursor-pointer flex-shrink-0"
            />
            <div className="flex-1">
                <p className={`font-semibold text-white ${isCompletedForDate ? 'line-through' : ''}`}>{task.title}</p>
                {task.clientName && (
                     <div className="flex items-center gap-1.5 mt-1 text-xs text-brand-secondary">
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>{task.clientName}</span>
                    </div>
                )}
                {task.details && <p className={`text-sm text-gray-400 mt-1 whitespace-pre-wrap ${isCompletedForDate ? 'line-through' : ''}`}>{task.details}</p>}
                <div className="flex items-center gap-2 mt-2">
                     <span className={`text-xs font-medium px-2 py-1 rounded-full ${isOverdue ? 'bg-red-500/20 text-red-400' : 'bg-gray-600 text-gray-300'}`}>
                        Due: {formatDate(task.dueDate)}
                    </span>
                    {task.recurrence !== 'none' && (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 capitalize">{task.recurrence}</span>
                    )}
                    {isOverdue && <WarningIcon className="w-4 h-4 text-red-400" />}
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => onEdit(task)} className="text-sm text-brand-secondary hover:underline">Edit</button>
                <button onClick={() => onDelete(task.id)} className="text-sm text-red-500 hover:underline">Delete</button>
            </div>
        </div>
    );
};


export const Tasks: React.FC<TasksProps> = ({ tasks, addTask, updateTask, deleteTask, toggleTaskCompletionForDate, members }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
    const [selectedDate, setSelectedDate] = useState(getTodayYMD());

    useEffect(() => {
        const interval = setInterval(() => {
            if (Notification.permission !== notificationPermission) {
                setNotificationPermission(Notification.permission);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [notificationPermission]);

    const handleRequestPermission = async () => {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
    };

    const NotificationBanner = () => {
        if (notificationPermission === 'granted') return null;
        
        if (notificationPermission === 'denied') {
            return (
                <div className="bg-red-800/50 p-4 rounded-xl shadow-lg border border-red-700 flex items-center gap-4">
                    <BellOffIcon className="w-6 h-6 text-red-400" />
                    <div>
                        <h3 className="font-bold text-white">Notifications are blocked.</h3>
                        <p className="text-sm text-red-300">To receive task reminders, please enable notifications for this site in your browser settings.</p>
                    </div>
                </div>
            );
        }
        return (
            <div className="bg-blue-800/50 p-4 rounded-xl shadow-lg border border-blue-700 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h3 className="font-bold text-white">Get reminded for due tasks.</h3>
                    <p className="text-sm text-blue-300">Enable browser notifications to stay on top of your to-do list.</p>
                </div>
                <button
                    onClick={handleRequestPermission}
                    className="flex-shrink-0 flex items-center bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                    <BellIcon className="w-5 h-5 mr-2" />
                    Enable Notifications
                </button>
            </div>
        );
    };

    const { pendingTasks, completedTasks } = useMemo(() => {
        const selected = parseDate(selectedDate);
        if (!selected) return { pendingTasks: [], completedTasks: [] };
    
        const scheduledToday = tasks.filter(task => isTaskScheduledForDate(task, new Date(selected)));
        
        const pending = scheduledToday.filter(task => !task.completedOn.includes(selectedDate));
        const completed = scheduledToday.filter(task => task.completedOn.includes(selectedDate));
        
        return { pendingTasks: pending, completedTasks: completed };
    }, [tasks, selectedDate]);


    const handleAdd = () => {
        setEditingTask(null);
        setIsModalOpen(true);
    };
    
    const handleEdit = (task: Task) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const handleSave = (taskData: Omit<Task, 'id' | 'completedOn'> | Task) => {
        if ('id' in taskData) {
            updateTask(taskData as Task);
        } else {
            addTask(taskData as Omit<Task, 'id' | 'completedOn'>);
        }
    };
    
    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            deleteTask(id);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Tasks & Reminders</h1>
                <button
                    onClick={handleAdd}
                    className="flex items-center bg-brand-primary hover:opacity-90 text-gray-900 font-bold py-2 px-4 rounded-lg"
                >
                    <PlusIcon className="w-5 h-5 mr-2"/>
                    Add Task
                </button>
            </div>

            <NotificationBanner />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1">
                    <TaskCalendar tasks={tasks} selectedDate={selectedDate} onDateSelect={setSelectedDate} />
                </div>

                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Pending Tasks for {formatDate(selectedDate)} ({pendingTasks.length})</h2>
                        <div className="space-y-4">
                            {pendingTasks.length > 0 ? (
                                pendingTasks.map(task => (
                                    <TaskItem key={task.id} task={task} selectedDate={selectedDate} onToggle={toggleTaskCompletionForDate} onDelete={handleDelete} onEdit={handleEdit} />
                                ))
                            ) : (
                                <p className="text-center p-8 text-gray-400">No pending tasks for this day.</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <CheckCircleIcon className="w-6 h-6 text-green-500" />
                            <h2 className="text-xl font-bold text-white">Completed on {formatDate(selectedDate)} ({completedTasks.length})</h2>
                        </div>
                        <div className="space-y-4">
                            {completedTasks.length > 0 ? (
                                completedTasks.map(task => (
                                    <TaskItem key={task.id} task={task} selectedDate={selectedDate} onToggle={toggleTaskCompletionForDate} onDelete={handleDelete} onEdit={handleEdit} />
                                ))
                            ) : (
                                <p className="text-center p-8 text-gray-400">No tasks were completed on this day.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>


            {isModalOpen && (
                <TaskForm
                    task={editingTask}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    members={members}
                />
            )}
        </div>
    );
};