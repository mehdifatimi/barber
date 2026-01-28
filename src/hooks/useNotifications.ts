'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '@/components/providers/auth-provider';

export interface Notification {
    id: string;
    user_id: string;
    type: 'booking_created' | 'booking_confirmed' | 'booking_rejected' | 'booking_cancelled';
    title: string;
    message: string;
    related_booking_id: string | null;
    is_read: boolean;
    created_at: string;
}

export function useNotifications() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // Fetch initial notifications
    useEffect(() => {
        async function fetchNotifications() {
            if (!user?.id) {
                setNotifications([]);
                setUnreadCount(0);
                setLoading(false);
                return;
            }

            setLoading(true);
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('[Notifications] Error fetching:', error);
            } else {
                setNotifications(data || []);
                setUnreadCount(data?.filter(n => !n.is_read).length || 0);
            }

            setLoading(false);
        }

        fetchNotifications();
    }, [user?.id]);

    // Subscribe to real-time updates
    useEffect(() => {
        if (!user?.id) return;

        let channel: RealtimeChannel;

        async function setupSubscription() {
            if (!user?.id) return;
            console.log('[Notifications] Setting up real-time subscription for user:', user.id);

            channel = supabase
                .channel(`notifications-${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        console.log('[Notifications] New notification received:', payload);
                        const newNotification = payload.new as Notification;

                        // Add to notifications list
                        setNotifications(prev => [newNotification, ...prev]);
                        setUnreadCount(prev => prev + 1);

                        // Show toast
                        toast.success(newNotification.title, {
                            description: newNotification.message,
                            duration: 5000,
                        });
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        console.log('[Notifications] Notification updated:', payload);
                        const updatedNotification = payload.new as Notification;

                        setNotifications(prev => {
                            const updated = prev.map(n => n.id === updatedNotification.id ? updatedNotification : n);
                            const unread = updated.filter(n => !n.is_read).length;
                            setUnreadCount(unread);
                            return updated;
                        });
                    }
                )
                .subscribe((status) => {
                    console.log('[Notifications] Subscription status:', status);
                });
        }

        setupSubscription();

        return () => {
            if (channel) {
                console.log('[Notifications] Cleaning up subscription');
                supabase.removeChannel(channel);
            }
        };
    }, [user?.id]);

    // Mark notification as read
    const markAsRead = useCallback(async (notificationId: string) => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) {
            console.error('[Notifications] Error marking as read:', error);
            toast.error('Failed to mark notification as read');
        }
    }, []);

    // Mark all as read
    const markAllAsRead = useCallback(async () => {
        if (!user?.id) return;

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        if (error) {
            console.error('[Notifications] Error marking all as read:', error);
            toast.error('Failed to mark all as read');
        } else {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
            toast.success('All notifications marked as read');
        }
    }, [user?.id]);

    // Delete notification
    const deleteNotification = useCallback(async (notificationId: string) => {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId);

        if (error) {
            console.error('[Notifications] Error deleting:', error);
            toast.error('Failed to delete notification');
        } else {
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            toast.success('Notification deleted');
        }
    }, []);

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
    };
}
