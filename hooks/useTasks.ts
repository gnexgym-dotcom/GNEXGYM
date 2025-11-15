import { useState, useEffect } from 'react';
import { Task } from '../types';
import { isPastOrToday, parseDate, formatToYMD } from '../utils/dateUtils';

const STORAGE_KEY = 'gnex-gym-tasks';
const NOTIFIED_TASKS_KEY = 'gnex-gym-notified-tasks';
const ICON_URL = "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3e%3cpath fill='%23FF0000' d='m242.61 249.98v-51.35h-25.68v51.35c0 28.36 23 51.35 51.35 51.35s51.35-23 51.35-51.35v-102.71h-25.68v102.71c0 14.18-11.51 25.68-25.68 25.68s-25.68-11.5-25.68-25.68zm-25.68-128.39v-25.68h102.71c14.18 0 25.68 11.5 25.68 25.68s-11.5 25.68-25.68 25.68h-51.35l51.35-51.35-18.15-18.15-51.35 51.35-25.68-25.68z'/%3e%3c/svg%3e";

const isTaskScheduledForDate = (task: Task, checkDate: Date): boolean => {
    const taskStartDate = parseDate(task.dueDate);
    if (!taskStartDate) return false;

    // Zero out the time part for accurate date-only comparison
    const checkDateOnly = new Date(checkDate);
    checkDateOnly.setHours(0, 0, 0, 0);
    taskStartDate.setHours(0, 0, 0, 0);

    // The check date must be on or after the task's start date
    if (checkDateOnly < taskStartDate) {
        return false;
    }

    switch (task.recurrence) {
        case 'none':
            // For non-recurring tasks, the dates must be exactly the same.
            return checkDateOnly.getTime() === taskStartDate.getTime();
        case 'daily':
            return true; // Already checked that it's on or after start date
        case 'weekly':
            return checkDateOnly.getDay() === taskStartDate.getDay();
        case 'monthly':
            return checkDateOnly.getDate() === taskStartDate.getDate();
        default:
            return false;
    }
};


export const useTasks = () => {
    const [tasks, setTasks] = useState<Task[]>(() => {
        try {
            const storedData = localStorage.getItem(STORAGE_KEY);
            return storedData ? JSON.parse(storedData) : [];
        } catch (error) {
            console.error("Error reading tasks from localStorage", error);
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        } catch (error) {
            console.error("Error saving tasks to localStorage", error);
        }
    }, [tasks]);

    // Effect to handle notifications for due tasks
    useEffect(() => {
        if (Notification.permission !== 'granted') {
            return;
        }

        const today = new Date();
        const todayYMD = formatToYMD(today);

        const notifiedTaskKeys: string[] = JSON.parse(localStorage.getItem(NOTIFIED_TASKS_KEY) || '[]');
        
        const tasksToNotify = tasks.filter(task => {
            // Don't notify if it has been notified today, or was completed today
            if (notifiedTaskKeys.includes(`${task.id}-${todayYMD}`) || task.completedOn.includes(todayYMD)) {
                return false;
            }
            // Check if the task is scheduled for today
            return isTaskScheduledForDate(task, today);
        });


        if (tasksToNotify.length > 0) {
            const updatedNotifiedKeys = [...notifiedTaskKeys];
            tasksToNotify.forEach(task => {
                new Notification('GNEX GYM: Task Reminder', {
                    body: `Your task "${task.title}" is due today.`,
                    icon: ICON_URL,
                });
                updatedNotifiedKeys.push(`${task.id}-${todayYMD}`);
            });
            localStorage.setItem(NOTIFIED_TASKS_KEY, JSON.stringify(updatedNotifiedKeys));
        }

        // Cleanup: remove keys from notified list if task is deleted
        const allTaskIds = new Set(tasks.map(t => t.id));
        const cleanedNotifiedKeys = notifiedTaskKeys.filter(key => {
            const taskId = key.split('-')[0];
            return allTaskIds.has(taskId);
        });

        if (cleanedNotifiedKeys.length !== notifiedTaskKeys.length) {
            localStorage.setItem(NOTIFIED_TASKS_KEY, JSON.stringify(cleanedNotifiedKeys));
        }
    }, [tasks]);

    const addTask = (taskData: Omit<Task, 'id' | 'completedOn'>) => {
        const newTask: Task = {
            ...taskData,
            id: `task-${Date.now()}`,
            completedOn: [],
        };
        setTasks(prev => [newTask, ...prev]);
    };

    const updateTask = (updatedTask: Task) => {
        setTasks(prev => prev.map(t => (t.id === updatedTask.id ? updatedTask : t)));
    };

    const deleteTask = (id: string) => {
        setTasks(prev => prev.filter(t => t.id !== id));
    };
    
    const toggleTaskCompletionForDate = (taskId: string, dateStr: string) => {
        setTasks(prev => prev.map(task => {
            if (task.id === taskId) {
                const completed = new Set(task.completedOn);
                if (completed.has(dateStr)) {
                    completed.delete(dateStr);
                } else {
                    completed.add(dateStr);
                }
                return { ...task, completedOn: Array.from(completed).sort() };
            }
            return task;
        }));
    };

    return { tasks, addTask, updateTask, deleteTask, toggleTaskCompletionForDate };
};