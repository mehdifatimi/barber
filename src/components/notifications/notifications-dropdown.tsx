'use client';

import {
    Bell,
    Calendar,
    CheckCircle2,
    XCircle,
    Loader2,
    Trash2,
    CheckCheck
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '@/hooks/useNotifications';
import { useRouter } from 'next/navigation';

export default function NotificationsDropdown() {
    const {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification
    } = useNotifications();
    const router = useRouter();

    const getIcon = (type: string) => {
        switch (type) {
            case 'booking_created':
                return <Calendar className="w-4 h-4 text-blue-500" />;
            case 'booking_confirmed':
                return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'booking_rejected':
            case 'booking_cancelled':
                return <XCircle className="w-4 h-4 text-red-500" />;
            default:
                return <Bell className="w-4 h-4 text-primary" />;
        }
    };

    const handleNotificationClick = async (n: any) => {
        if (!n.is_read) {
            await markAsRead(n.id);
        }

        if (n.related_booking_id) {
            // Determine path based on current location or role
            const basePath = window.location.pathname.startsWith('/barber')
                ? '/barber/bookings'
                : '/client/dashboard/bookings';

            const path = `${basePath}?bookingId=${n.related_booking_id}`;
            router.push(path);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="relative h-10 w-10 rounded-xl hover:bg-muted/50 transition-all flex items-center justify-center border border-border/50 group">
                    <Bell className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-primary border-2 border-background text-[10px] font-black animate-in zoom-in duration-300">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 rounded-2xl p-2 shadow-2xl border-border/50 bg-card/95 backdrop-blur-xl" align="end">
                <DropdownMenuLabel className="px-4 py-3 flex justify-between items-center">
                    <span className="text-lg font-black tracking-tight underline decoration-primary/30 decoration-4 underline-offset-4">Notifications</span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                            className="h-8 px-2 text-[10px] font-bold text-primary hover:text-primary hover:bg-primary/10 rounded-lg uppercase tracking-widest"
                        >
                            <CheckCheck className="w-3 h-3 mr-1" />
                            Mark all read
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/50" />
                <div className="max-h-[400px] overflow-y-auto overflow-x-hidden scrollbar-none">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="py-12 text-center space-y-3">
                            <div className="mx-auto w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center">
                                <Bell className="w-6 h-6 text-muted-foreground/30" />
                            </div>
                            <p className="text-sm text-muted-foreground font-medium">All caught up! ✨</p>
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <DropdownMenuItem
                                key={n.id}
                                className={`flex flex-col items-start gap-1 p-4 rounded-xl cursor-pointer transition-all mb-1 border border-transparent ${!n.is_read ? 'bg-primary/5 hover:bg-primary/10 border-primary/10' : 'hover:bg-muted/30'}`}
                                onClick={() => handleNotificationClick(n)}
                            >
                                <div className="flex items-start gap-3 w-full">
                                    <div className={`p-2 rounded-lg shrink-0 ${!n.is_read ? 'bg-white shadow-sm' : 'bg-muted/30'}`}>
                                        {getIcon(n.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`text-sm font-bold leading-tight truncate ${!n.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                                            {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{n.message}</p>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-[10px] font-medium text-muted-foreground/60 italic">
                                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNotification(n.id);
                                                }}
                                                className="p-1 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </DropdownMenuItem>
                        ))
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
