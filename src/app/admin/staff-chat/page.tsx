"use client";

import * as React from "react";
import { format, isToday, isYesterday } from "date-fns";
import {
    MessageSquare,
    Send,
    Smile,
    Paperclip,
    Image as ImageIcon,
    FileText,
    Download,
    X,
    Users,
    Hash,
    Shield,
    Crown,
    Scale,
    Sparkles,
    Search,
    Pin,
    Trash2,
    Check,
    CheckCheck,
    Plus,
    Flame,
    Heart,
    ThumbsUp,
    Lightbulb,
    AlertTriangle,
    Eye,
    MessageCircle,
    UserCheck,
    Loader2,
    Reply,
    MoreVertical,
    Radio,
    Circle,
    HelpCircle,
    Compass,
    Zap,
    PlusCircle,
    Layers,
    UserPlus,
    FolderPlus,
    Clock,
    GripVertical,
    ChevronLeft
} from "lucide-react";
import { 
    collection, 
    query, 
    onSnapshot, 
    doc, 
    orderBy, 
    limit, 
    where,
    getDocs
} from "firebase/firestore";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    DialogClose,
    DialogFooter
} from "@/components/ui/dialog";
import { 
    sendStaffMessageAction, 
    toggleMessageReactionAction, 
    deleteStaffMessageAction,
    createStaffChannelAction,
    deleteStaffChannelAction,
    decryptStaffMessagesAction,
    markMessagesDeliveredAction,
    markMessagesReadAction,
    type StaffMessageAttachment
} from "@/lib/actions/staffChatActions";

// Static Core Channel Definitions
const CORE_STAFF_CHANNELS = [
    {
        id: "general-staff",
        name: "general-staff",
        label: "General Operations",
        description: "Central staff room for daily platform operations and general discussions.",
        icon: Hash,
        color: "text-blue-500",
        badge: "All Staff",
        badgeColor: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
        isCore: true,
        memberIds: ['all']
    },
    {
        id: "safety-and-moderation",
        name: "safety-and-moderation",
        label: "Safety & Moderation",
        description: "Urgent incident triage, user reports, and safety escalations.",
        icon: AlertTriangle,
        color: "text-rose-500",
        badge: "Urgent",
        badgeColor: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
        isCore: true,
        memberIds: ['all']
    },
    {
        id: "leadership-and-vetting",
        name: "leadership-and-vetting",
        label: "Leader Vetting & Hubs",
        description: "Community applications review, ID verification, and leader approvals.",
        icon: Crown,
        color: "text-amber-500",
        badge: "Vetting",
        badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
        isCore: true,
        memberIds: ['all']
    },
    {
        id: "ideas-and-updates",
        name: "ideas-and-updates",
        label: "Ideas & Architecture",
        description: "Feature requests, app roadmap, styling ideas, and bug discovery.",
        icon: Lightbulb,
        color: "text-purple-500",
        badge: "Dev & Growth",
        badgeColor: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
        isCore: true,
        memberIds: ['all']
    }
];

const EMOJI_CATEGORIES = [
    {
        label: "Quick Reactions",
        emojis: ["👍", "❤️", "🚀", "🔥", "👏", "💡", "🚨", "👀", "✅", "🎉"]
    },
    {
        label: "Smiles & Expressions",
        emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥳", "😎", "🤓", "🤔", "🫡", "🤝", "💪"]
    },
    {
        label: "Operations & Work",
        emojis: ["📋", "📌", "💼", "📈", "📊", "🔒", "🛡️", "👑", "⚙️", "💻", "📱", "📦", "💰", "💷", "💳", "📍", "🎯", "⚡", "✨", "⏳"]
    }
];

const CANNED_RESPONSES = [
    "Investigating this now 👀",
    "All sorted & verified ✅",
    "Flagged for admin review 🚨",
    "Updated & deployed 🚀",
    "Thanks team! 👏",
    "Can someone double-check this? 🤔"
];

const CHANNEL_CATEGORY_PRESETS = [
    "Regional Squad",
    "Special Project",
    "Event Planning",
    "VIP Sponsor Desk",
    "Emergency Response",
    "Custom Group"
];

const formatSidebarTime = (timestamp: any) => {
    if (!timestamp) return "";
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        if (isNaN(date.getTime())) return "";
        if (isToday(date)) {
            return format(date, "HH:mm");
        }
        if (isYesterday(date)) {
            return "Yesterday";
        }
        return format(date, "dd MMM");
    } catch {
        return "";
    }
};

type MessageItem = {
    id: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    senderAvatar?: string;
    text: string;
    attachments?: StaffMessageAttachment[];
    replyToId?: string;
    replyToText?: string;
    replyToAuthor?: string;
    reactions?: Record<string, string[]>;
    createdAt: any;
    deliveredTo?: Record<string, boolean>; // uid → true when received
    readBy?: Record<string, boolean>;       // uid → true when opened & seen
};

type StaffMember = {
    id: string;
    name: string;
    email: string;
    role: string;
    photoURL?: string;
    status?: string;
};

type CustomChannel = {
    id: string;
    name: string;
    label: string;
    description: string;
    badge: string;
    memberIds: string[];
    isCustom?: boolean;
    createdBy?: string;
    createdByName?: string;
    createdAt?: any;
};

export default function AdminStaffChatPage() {
    const { user } = useUser();
    const db = useFirestore();
    const { toast } = useToast();

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);

    // Active Channel / DM state
    const [activeRoomId, setActiveRoomId] = React.useState<string>("general-staff");
    const [activeRoomType, setActiveRoomType] = React.useState<"channel" | "dm">("channel");
    const [activeRecipient, setActiveRecipient] = React.useState<StaffMember | null>(null);

    // Filter Switcher ("Only My Chats" vs "See All Staff")
    const [chatFilterMode, setChatFilterMode] = React.useState<"my_chats" | "all_staff">("my_chats");

    // Responsive Mobile/Compact View Switcher ("list" view vs "chat" view)
    const [mobileView, setMobileView] = React.useState<"list" | "chat">("list");

    // Track whether viewport is desktop-width (≥ 1024px) for sidebar sizing
    const [isDesktop, setIsDesktop] = React.useState<boolean>(false);
    React.useEffect(() => {
        const check = () => setIsDesktop(window.innerWidth >= 1024);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // Draggable Resizable Sidebar States
    const [sidebarWidth, setSidebarWidth] = React.useState<number>(360);
    const [isDragging, setIsDragging] = React.useState<boolean>(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Chat data & Channel metadata (last message, last sender, last timestamp)
    const [messages, setMessages] = React.useState<MessageItem[]>([]);
    const [loadingMessages, setLoadingMessages] = React.useState(true);
    const [staffList, setStaffList] = React.useState<StaffMember[]>([]);
    const [customChannels, setCustomChannels] = React.useState<CustomChannel[]>([]);
    const [channelMetaMap, setChannelMetaMap] = React.useState<Record<string, { lastMessage?: string, lastMessageSender?: string, lastMessageTimestamp?: any }>>({});
    const [staffSearchQuery, setStaffSearchQuery] = React.useState("");

    // Message Input states
    const [inputText, setInputText] = React.useState("");
    const [attachments, setAttachments] = React.useState<StaffMessageAttachment[]>([]);
    const [isSending, setIsSending] = React.useState(false);
    const [replyTarget, setReplyTarget] = React.useState<MessageItem | null>(null);
    const [previewImage, setPreviewImage] = React.useState<string | null>(null);

    // Filter messages search
    const [messageSearchQuery, setMessageSearchQuery] = React.useState("");
    const [isSearchOpen, setIsSearchOpen] = React.useState(false);

    // Create Channel Modal States
    const [isCreateChannelOpen, setIsCreateChannelOpen] = React.useState(false);
    const [newChannelName, setNewChannelName] = React.useState("");
    const [newChannelLabel, setNewChannelLabel] = React.useState("");
    const [newChannelDesc, setNewChannelDesc] = React.useState("");
    const [newChannelBadge, setNewChannelBadge] = React.useState("Special Project");
    const [selectedStaffIds, setSelectedStaffIds] = React.useState<string[]>([]);
    const [channelStaffSearch, setChannelStaffSearch] = React.useState("");
    const [isCreatingChannel, setIsCreatingChannel] = React.useState(false);

    const messagesEndRef = React.useRef<HTMLDivElement>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const imageInputRef = React.useRef<HTMLInputElement>(null);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    // Draggable Separator Mouse Move & Up Listeners
    React.useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const newWidth = e.clientX - containerRect.left;
            // Clamp between 240px and (containerWidth - 320px) up to 580px
            const maxAllowed = Math.min(600, containerRect.width - 320);
            const clampedWidth = Math.max(240, Math.min(newWidth, maxAllowed));
            setSidebarWidth(clampedWidth);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        if (isDragging) {
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    // Auto-expand textarea from 1 line to 5 lines max with scrollbar beyond 5 lines
    React.useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const scrollHeight = textareaRef.current.scrollHeight;
            // 1 line = 40px, 5 lines = 125px
            const newHeight = Math.min(Math.max(scrollHeight, 40), 125);
            textareaRef.current.style.height = `${newHeight}px`;
        }
    }, [inputText]);

    // Fetch Staff Directory (Strict Whitelist + Owner Verification)
    React.useEffect(() => {
        if (!db) return;

        const fetchStaff = async () => {
            try {
                // 1. Get whitelisted emails from authorized_logins
                const authLoginsRef = collection(db, 'authorized_logins');
                const authSnap = await getDocs(authLoginsRef);
                const activeWhitelistedEmails = new Set<string>();

                authSnap.docs.forEach(d => {
                    const data = d.data();
                    if (data.email && (data.status === 'active' || !data.status)) {
                        activeWhitelistedEmails.add(data.email.toLowerCase().trim());
                    }
                });

                // 2. Fetch users and filter strictly by active whitelist or owner email
                const adminRoles = ['owner', 'admin', 'administrator', 'moderator', 'support', 'finance', 'investigator', 'accountant', 'support-specialist'];
                const usersRef = collection(db, 'users');
                const snap = await getDocs(usersRef);
                const staff: StaffMember[] = [];

                snap.docs.forEach(docSnap => {
                    const data = docSnap.data();
                    const userEmail = (data.email || '').toLowerCase().trim();
                    const role = (data.role || '').toLowerCase();
                    const isOwner = userEmail === 'allan_jamieson@outlook.com' || (role === 'owner' && userEmail.includes('allan'));
                    const isWhitelisted = activeWhitelistedEmails.has(userEmail);
                    const isStaffRole = adminRoles.includes(role) || data.isStaff === true;

                    // Only include verified staff/admins who are not the current logged in user
                    if ((isOwner || (isWhitelisted && isStaffRole)) && docSnap.id !== user?.uid) {
                        staff.push({
                            id: docSnap.id,
                            name: data.name || data.displayName || data.email?.split('@')[0] || 'Staff Member',
                            email: data.email || '',
                            role: data.role || (data.isStaff ? 'Staff' : 'Moderator'),
                            photoURL: data.photoURL || data.profileImage || null,
                            status: data.status || 'offline'
                        });
                    }
                });

                setStaffList(staff);
            } catch (err) {
                console.error("Failed to fetch staff list:", err);
            }
        };

        fetchStaff();
    }, [db, user]);

    // Fetch Custom Channels & Channel Metadata (Timestamps & Last Snippets)
    React.useEffect(() => {
        if (!db) return;

        const channelsRef = collection(db, 'staff_channels');
        const unsubscribe = onSnapshot(channelsRef, (snapshot) => {
            const list: CustomChannel[] = [];
            const meta: Record<string, { lastMessage?: string, lastMessageSender?: string, lastMessageTimestamp?: any }> = {};

            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data();
                meta[docSnap.id] = {
                    lastMessage: data.lastMessage,
                    lastMessageSender: data.lastMessageSender,
                    lastMessageTimestamp: data.lastMessageTimestamp
                };

                if (data.isCustom) {
                    list.push({
                        id: docSnap.id,
                        name: data.name || docSnap.id,
                        label: data.label || docSnap.id,
                        description: data.description || '',
                        badge: data.badge || 'Group Chat',
                        memberIds: data.memberIds || ['all'],
                        isCustom: true,
                        createdBy: data.createdBy,
                        createdByName: data.createdByName,
                        createdAt: data.createdAt
                    });
                }
            });

            setChannelMetaMap(meta);
            setCustomChannels(list);
        });

        return () => unsubscribe();
    }, [db]);

    // Real-Time Messages Listener for Active Channel/Room
    React.useEffect(() => {
        if (!db || !activeRoomId) return;

        setLoadingMessages(true);
        const messagesRef = collection(db, 'staff_channels', activeRoomId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(150));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const rawMsgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MessageItem));

            // Decrypt message content server-side (key never exposed to browser)
            let decryptedMsgs = rawMsgs;
            try {
                const decrypted = await decryptStaffMessagesAction(
                    rawMsgs.map(m => ({ id: m.id, text: m.text || '', replyToText: m.replyToText || null }))
                );
                const decryptMap = Object.fromEntries(decrypted.map(d => [d.id, d]));
                decryptedMsgs = rawMsgs.map(m => ({
                    ...m,
                    text: decryptMap[m.id]?.text ?? m.text,
                    replyToText: decryptMap[m.id]?.replyToText ?? m.replyToText,
                }));
            } catch (err) {
                console.error("Failed to decrypt messages:", err);
            }
            setMessages(decryptedMsgs);
            setLoadingMessages(false);

            // Mark messages from others as delivered (single tick)
            if (user) {
                const othersIds = rawMsgs
                    .filter(m => m.senderId !== user.uid && !m.deliveredTo?.[user.uid])
                    .map(m => m.id);
                if (othersIds.length > 0) {
                    markMessagesDeliveredAction({ channelId: activeRoomId, messageIds: othersIds, userId: user.uid });
                }
            }
        }, (error) => {
            console.error("Staff chat listener error:", error);
            setLoadingMessages(false);
        });

        return () => unsubscribe();
    }, [db, activeRoomId, user]);

    // Mark all visible messages as READ when user opens a room
    React.useEffect(() => {
        if (!db || !activeRoomId || !user || messages.length === 0) return;
        const unreadByMe = messages
            .filter(m => m.senderId !== user.uid && !m.readBy?.[user.uid])
            .map(m => m.id);
        if (unreadByMe.length > 0) {
            markMessagesReadAction({ channelId: activeRoomId, messageIds: unreadByMe, userId: user.uid });
        }
    }, [activeRoomId, user, messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

    // Scroll to bottom when messages update
    React.useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, activeRoomId]);

    // Role badge helper
    const getRoleBadge = (role: string) => {
        const lower = (role || '').toLowerCase();
        if (lower === 'owner' || lower.includes('founder')) {
            return (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/40 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Crown className="h-2.5 w-2.5 text-amber-600" /> Owner
                </Badge>
            );
        }
        if (lower === 'admin' || lower.includes('director')) {
            return (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Shield className="h-2.5 w-2.5 text-emerald-600" /> Admin
                </Badge>
            );
        }
        if (lower === 'moderator') {
            return (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/40 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Scale className="h-2.5 w-2.5 text-blue-600" /> Moderator
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/40 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5 text-purple-600" /> Staff
            </Badge>
        );
    };

    // Switch to Channel
    const handleSelectChannel = (channelId: string) => {
        setActiveRoomId(channelId);
        setActiveRoomType("channel");
        setActiveRecipient(null);
        setReplyTarget(null);
        setMobileView("chat"); // on small screens, show chat pane
    };

    // Switch to Direct Message
    const handleSelectDM = (member: StaffMember) => {
        if (!user) return;
        // Deterministic DM room ID (alphabetical sort of uids)
        const sortedIds = [user.uid, member.id].sort();
        const dmRoomId = `dm_${sortedIds[0]}_${sortedIds[1]}`;
        
        setActiveRoomId(dmRoomId);
        setActiveRoomType("dm");
        setActiveRecipient(member);
        setReplyTarget(null);
        setMobileView("chat"); // on small screens, show chat pane
    };

    // Toggle staff selection for new channel
    const handleToggleStaffSelection = (staffId: string) => {
        setSelectedStaffIds(prev => 
            prev.includes(staffId) ? prev.filter(id => id !== staffId) : [...prev, staffId]
        );
    };

    // Select All / Clear Staff
    const handleSelectAllStaff = () => {
        setSelectedStaffIds(staffList.map(s => s.id));
    };

    const handleClearStaffSelection = () => {
        setSelectedStaffIds([]);
    };

    // Create Channel Handler
    const handleCreateChannel = async () => {
        if (!user) return;
        if (!newChannelName.trim() || !newChannelLabel.trim()) {
            toast({ title: "Validation Error", description: "Channel name and display title are required.", variant: "destructive" });
            return;
        }

        setIsCreatingChannel(true);
        const myName = userProfile?.name || userProfile?.displayName || user?.email?.split('@')[0] || "Administrator";

        // Include current user automatically in members
        const finalMembers = Array.from(new Set([...selectedStaffIds, user.uid]));

        const result = await createStaffChannelAction({
            name: newChannelName,
            label: newChannelLabel,
            description: newChannelDesc,
            badge: newChannelBadge,
            memberIds: finalMembers,
            createdBy: user.uid,
            createdByName: myName
        });

        if (result.success && result.channelId) {
            toast({ title: "Operation Channel Created! 🎉", description: `#${result.channelId} is ready with ${finalMembers.length} staff.` });
            setIsCreateChannelOpen(false);
            setNewChannelName("");
            setNewChannelLabel("");
            setNewChannelDesc("");
            setSelectedStaffIds([]);
            handleSelectChannel(result.channelId);
        } else {
            toast({ title: "Creation Failed", description: result.error, variant: "destructive" });
        }
        setIsCreatingChannel(false);
    };

    // Delete custom channel handler
    const handleDeleteChannel = async (channelId: string, channelName: string) => {
        if (!user) return;
        if (!confirm(`Are you sure you want to permanently delete Operation Channel #${channelName}?`)) return;

        const myName = userProfile?.name || "Administrator";
        const result = await deleteStaffChannelAction({
            channelId,
            adminId: user.uid,
            adminName: myName
        });

        if (result.success) {
            toast({ title: "Channel Deleted", description: `#${channelName} was removed.` });
            if (activeRoomId === channelId) {
                handleSelectChannel("general-staff");
            }
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    // Send Message handler
    const handleSendMessage = async () => {
        if (!user || (!inputText.trim() && attachments.length === 0)) return;

        setIsSending(true);
        const myName = userProfile?.name || userProfile?.displayName || user?.email?.split('@')[0] || "Staff Member";
        const myRole = userProfile?.role || (userProfile?.title || "Staff");
        const myAvatar = userProfile?.photoURL || userProfile?.profileImage || "";

        const result = await sendStaffMessageAction({
            channelId: activeRoomId,
            senderId: user.uid,
            senderName: myName,
            senderRole: myRole,
            senderAvatar: myAvatar,
            text: inputText,
            attachments: attachments,
            replyToId: replyTarget?.id,
            replyToText: replyTarget?.text ? (replyTarget.text.length > 80 ? replyTarget.text.substring(0, 80) + '...' : replyTarget.text) : undefined,
            replyToAuthor: replyTarget?.senderName
        });

        if (result.success) {
            setInputText("");
            setAttachments([]);
            setReplyTarget(null);
        } else {
            toast({ title: "Failed to send", description: result.error, variant: "destructive" });
        }
        setIsSending(false);
    };

    // Key Press (Enter to send, Shift+Enter for newline)
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Add emoji to input
    const handleInsertEmoji = (emoji: string) => {
        setInputText(prev => prev + emoji);
    };

    // Toggle Reaction
    const handleToggleReaction = async (messageId: string, emoji: string) => {
        if (!user) return;
        const myName = userProfile?.name || "Staff Member";
        await toggleMessageReactionAction({
            channelId: activeRoomId,
            messageId,
            emoji,
            userId: user.uid,
            userName: myName
        });
    };

    // Delete message
    const handleDeleteMessage = async (messageId: string) => {
        if (!user) return;
        const result = await deleteStaffMessageAction({
            channelId: activeRoomId,
            messageId,
            adminId: user.uid,
            adminName: userProfile?.name || 'Administrator'
        });
        if (result.success) {
            toast({ title: "Message Deleted" });
            setChannelMetaMap(prev => {
                const remaining = messages.filter(m => m.id !== messageId);
                if (remaining.length > 0) {
                    const last = remaining[remaining.length - 1];
                    return {
                        ...prev,
                        [activeRoomId]: {
                            lastMessage: last.text || `[attachment]`,
                            lastMessageSender: last.senderName,
                            lastMessageTimestamp: last.createdAt
                        }
                    };
                } else {
                    const updated = { ...prev };
                    delete updated[activeRoomId];
                    return updated;
                }
            });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    // File / Image Attachment Upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "File too large", description: "Attachments must be under 5MB.", variant: "destructive" });
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setAttachments(prev => [
                ...prev,
                {
                    name: file.name,
                    url: dataUrl,
                    type: type,
                    size: file.size
                }
            ]);
            toast({ title: "Attachment Ready", description: `${file.name} attached.` });
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    // Remove Attachment before sending
    const handleRemoveAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    // Current active room metadata
    const activeCoreChannel = CORE_STAFF_CHANNELS.find(c => c.id === activeRoomId);
    const activeCustomChannel = customChannels.find(c => c.id === activeRoomId);
    const currentChannelTitle = activeCoreChannel?.label || activeCustomChannel?.label || activeRecipient?.name;
    const currentChannelDesc = activeCoreChannel?.description || activeCustomChannel?.description || `Direct message with ${activeRecipient?.name}`;
    const currentChannelBadge = activeCoreChannel?.badge || activeCustomChannel?.badge;
    const currentChannelMemberCount = activeCustomChannel ? activeCustomChannel.memberIds.length : (staffList.length + 1);

    // Filtered messages for search within chat
    const displayMessages = React.useMemo(() => {
        if (!messageSearchQuery.trim()) return messages;
        const q = messageSearchQuery.toLowerCase();
        return messages.filter(m => 
            m.text.toLowerCase().includes(q) || 
            m.senderName.toLowerCase().includes(q)
        );
    }, [messages, messageSearchQuery]);

    // Enhanced staff list with last message metadata & active history detection
    const staffWithChatHistory = React.useMemo(() => {
        if (!user) return [];
        return staffList.map(member => {
            const sortedIds = [user.uid, member.id].sort();
            const dmRoomId = `dm_${sortedIds[0]}_${sortedIds[1]}`;
            const meta = channelMetaMap[dmRoomId];
            const hasHistory = !!meta?.lastMessageTimestamp || !!meta?.lastMessage;
            return {
                ...member,
                dmRoomId,
                lastMessage: meta?.lastMessage,
                lastMessageSender: meta?.lastMessageSender,
                lastMessageTimestamp: meta?.lastMessageTimestamp,
                hasHistory
            };
        });
    }, [staffList, channelMetaMap, user]);

    // Filtered staff list based on search and "Only My Chats" vs "See All Staff"
    const displayStaffList = React.useMemo(() => {
        return staffWithChatHistory.filter(member => {
            const matchesSearch = member.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) || 
                                  member.role.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
                                  member.email.toLowerCase().includes(staffSearchQuery.toLowerCase());
            if (!matchesSearch) return false;
            
            // "Only My Chats" filter mode
            if (chatFilterMode === 'my_chats') {
                return member.hasHistory;
            }
            return true;
        });
    }, [staffWithChatHistory, staffSearchQuery, chatFilterMode]);

    const activeDirectMessageCount = staffWithChatHistory.filter(s => s.hasHistory).length;

    const filteredChannelStaffModal = staffList.filter(s =>
        s.name.toLowerCase().includes(channelStaffSearch.toLowerCase()) ||
        s.role.toLowerCase().includes(channelStaffSearch.toLowerCase()) ||
        s.email.toLowerCase().includes(channelStaffSearch.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-20">
            {/* Vibrant Hero Banner */}
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-violet-600/15 via-indigo-600/10 to-teal-950/15 border-2 border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-md relative overflow-hidden">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest mb-1.5">
                        <MessageSquare className="h-4 w-4 text-indigo-500 animate-pulse" />
                        Internal Staff Room • Secure Real-Time Comms
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-headline flex items-center gap-3 text-foreground">
                        <Radio className="h-8 w-8 text-indigo-600" />
                        Staff Operations &amp; Team Chat
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base mt-2 max-w-3xl leading-relaxed">
                        Coordinate platform management, triage escalations, share documents and screenshots, and collaborate in real-time with fellow staff.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Dialog>
                        <DialogTrigger asChild>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-bold transition-all shadow-sm group cursor-pointer">
                                <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500 animate-pulse" />
                                <span>Encrypted Internal Staff Network</span>
                                <div className="h-4 w-4 rounded-full bg-emerald-500/20 group-hover:bg-emerald-500/30 text-emerald-800 dark:text-emerald-200 flex items-center justify-center text-[10px] font-black ml-1">
                                    ?
                                </div>
                            </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
                                    <Shield className="h-4 w-4" /> Platform Cryptographic Standards
                                </div>
                                <DialogTitle className="text-xl font-black flex items-center gap-2">
                                    Encrypted Internal Staff Network
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    How our platform secures staff communications, operational files, and private direct messages.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-3 text-xs leading-relaxed text-muted-foreground">
                                <div className="p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30 space-y-1">
                                    <p className="font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 text-xs">
                                        <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> Content-Level Encryption (AES-256-GCM)
                                    </p>
                                    <p className="text-[11px]">
                                        Every message body is individually encrypted with <strong className="text-foreground">AES-256-GCM</strong> (authenticated encryption) before being stored in the database. The encryption key lives exclusively on the application server — it is never sent to the browser, never stored in Firestore, and cannot be extracted by anyone with database console access. Even Community Hub staff with Firebase Admin access only see encrypted ciphertext.
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-xl border bg-muted/30 space-y-1">
                                    <p className="font-black text-foreground flex items-center gap-1.5 text-xs">
                                        <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> In-Transit Encryption (TLS 1.3)
                                    </p>
                                    <p className="text-[11px]">
                                        All live connections, real-time message events, and attachment streams are encrypted in transit using TLS 1.3 with perfect forward secrecy.
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-xl border bg-muted/30 space-y-1">
                                    <p className="font-black text-foreground flex items-center gap-1.5 text-xs">
                                        <Crown className="h-3.5 w-3.5 text-amber-500" /> Role-Based Whitelist Access
                                    </p>
                                    <p className="text-[11px]">
                                        Access is restricted strictly to verified staff members on the Administrative Security Whitelist (<code className="font-mono text-foreground font-bold">authorized_emails</code>). Standard member accounts cannot read or join staff rooms.
                                    </p>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Main Chat Workstation (Resizable Split View with Smooth Draggable Divider) */}
            <div 
                ref={containerRef}
                className="flex flex-row h-[740px] rounded-2xl border-2 border-border/70 overflow-hidden shadow-lg bg-card relative select-none"
            >
                
                {/* Left Sidebar: Channels & Staff Direct Messages (Resizable Width) */}
                <div 
                    style={{ width: isDesktop ? `${sidebarWidth}px` : '100%' }}
                    className={cn(
                        "flex-col h-full bg-muted/20 border-b lg:border-b-0 shrink-0 overflow-hidden transition-all duration-200",
                        // Mobile: show full-width list OR hidden when chat is open
                        // Desktop: always show as fixed-width column
                        mobileView === "list" ? "flex" : "hidden lg:flex"
                    )}
                >
                    {/* Header with Search and Filter Switcher */}
                    <div className="p-4 border-b border-border/60 bg-muted/40 space-y-3 shrink-0">
                        <div className="flex items-center justify-between">
                            <span className="font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                <Users className="h-4 w-4 text-indigo-500" /> Channels &amp; Team
                            </span>
                            <Badge variant="secondary" className="font-mono font-bold text-[10px]">
                                {staffList.length + 1} {staffList.length === 0 ? 'Member' : 'Members'} (1 Online)
                            </Badge>
                        </div>

                        {/* Search staff input */}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input 
                                placeholder="Search channels & staff..."
                                value={staffSearchQuery}
                                onChange={(e) => setStaffSearchQuery(e.target.value)}
                                className="pl-8 h-8 text-xs border bg-background font-medium"
                            />
                        </div>

                        {/* 2-Pill View Mode Switcher ("Only My Chats" vs "See All Staff") */}
                        <div className="grid grid-cols-2 p-1 rounded-xl bg-background border-2 text-xs font-bold gap-1 shadow-inner">
                            <button
                                onClick={() => setChatFilterMode('my_chats')}
                                className={cn(
                                    "py-1 px-2 rounded-lg text-center transition-all text-[11px] flex items-center justify-center gap-1",
                                    chatFilterMode === 'my_chats' 
                                        ? "bg-indigo-600 text-white font-black shadow-sm" 
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <MessageCircle className="h-3 w-3" />
                                <span>Only My Chats</span>
                                {activeDirectMessageCount > 0 && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/20 ml-0.5">
                                        {activeDirectMessageCount}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setChatFilterMode('all_staff')}
                                className={cn(
                                    "py-1 px-2 rounded-lg text-center transition-all text-[11px] flex items-center justify-center gap-1",
                                    chatFilterMode === 'all_staff' 
                                        ? "bg-indigo-600 text-white font-black shadow-sm" 
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Users className="h-3 w-3" />
                                <span>See All Staff</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-muted ml-0.5">
                                    {staffList.length}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Channels & Direct Messages (Full Independent Scrolling) */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-6">
                        {/* 1. Operation Channels */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between px-2 py-1">
                                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                    <Layers className="h-3 w-3 text-indigo-500" /> Operation Channels
                                </p>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setIsCreateChannelOpen(true)}
                                    className="h-6 px-2 text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 hover:bg-indigo-500/10 gap-1"
                                >
                                    <Plus className="h-3 w-3" /> New Channel
                                </Button>
                            </div>

                            {/* Core Preset Channels */}
                            {CORE_STAFF_CHANNELS.map(channel => {
                                const IconComponent = channel.icon;
                                const isActive = activeRoomType === "channel" && activeRoomId === channel.id;
                                const meta = channelMetaMap[channel.id];
                                const timestampFormatted = meta?.lastMessageTimestamp ? formatSidebarTime(meta.lastMessageTimestamp) : "";

                                return (
                                    <button
                                        key={channel.id}
                                        onClick={() => handleSelectChannel(channel.id)}
                                        className={cn(
                                            "w-full p-2.5 rounded-xl text-left transition-all text-xs font-semibold",
                                            isActive 
                                                ? "bg-indigo-600 text-white font-bold shadow-sm" 
                                                : "hover:bg-muted/80 text-foreground/90"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2 truncate">
                                                <div className={cn("p-1.5 rounded-lg shrink-0", isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground")}>
                                                    <IconComponent className={cn("h-4 w-4", !isActive && channel.color)} />
                                                </div>
                                                <div className="truncate">
                                                    <span className="block truncate font-bold text-xs">#{channel.name}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end shrink-0 gap-1">
                                                {timestampFormatted && (
                                                    <span className={cn("text-[9px] font-mono", isActive ? "text-white/80" : "text-muted-foreground")}>
                                                        {timestampFormatted}
                                                    </span>
                                                )}
                                                <Badge variant="outline" className={cn("text-[8px] font-bold uppercase", isActive ? "bg-white/20 text-white border-white/30" : channel.badgeColor)}>
                                                    {channel.badge}
                                                </Badge>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}

                            {/* Custom Channels created by Staff */}
                            {customChannels.map(channel => {
                                const isActive = activeRoomType === "channel" && activeRoomId === channel.id;
                                const meta = channelMetaMap[channel.id];
                                const timestampFormatted = meta?.lastMessageTimestamp ? formatSidebarTime(meta.lastMessageTimestamp) : "";

                                return (
                                    <div key={channel.id} className="group relative">
                                        <button
                                            onClick={() => handleSelectChannel(channel.id)}
                                            className={cn(
                                                "w-full p-2.5 rounded-xl text-left transition-all text-xs font-semibold",
                                                isActive 
                                                    ? "bg-indigo-600 text-white font-bold shadow-sm" 
                                                    : "hover:bg-muted/80 text-foreground/90"
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2 truncate">
                                                    <div className={cn("p-1.5 rounded-lg shrink-0", isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground")}>
                                                        <Hash className={cn("h-4 w-4", !isActive && "text-teal-500")} />
                                                    </div>
                                                    <div className="truncate">
                                                        <span className="block truncate font-bold text-xs">#{channel.name}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end shrink-0 gap-1">
                                                    {timestampFormatted && (
                                                        <span className={cn("text-[9px] font-mono", isActive ? "text-white/80" : "text-muted-foreground")}>
                                                            {timestampFormatted}
                                                        </span>
                                                    )}
                                                    <Badge variant="outline" className={cn("text-[8px] font-bold uppercase", isActive ? "bg-white/20 text-white border-white/30" : "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30")}>
                                                        {channel.badge}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </button>
                                        
                                        {/* Quick Delete custom channel for admin/owner */}
                                        {(userProfile?.role === 'owner' || userProfile?.role === 'admin' || channel.createdBy === user?.uid) && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteChannel(channel.id, channel.name); }}
                                                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-rose-500/20 text-muted-foreground hover:text-rose-600 transition-opacity"
                                                title="Delete custom channel"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* 2. Direct Messages Section */}
                        <div className="space-y-1.5 pt-4 border-t border-border/40">
                            <div className="px-2 py-1 flex items-center justify-between">
                                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                    <MessageCircle className="h-3 w-3 text-purple-500" />
                                    <span>{chatFilterMode === 'my_chats' ? 'Active 1-on-1 Chats' : 'All Staff Members'} ({displayStaffList.length})</span>
                                </p>
                            </div>

                            {displayStaffList.length > 0 ? (
                                displayStaffList.map(member => {
                                    const isActive = activeRoomType === "dm" && activeRecipient?.id === member.id;
                                    const timestampFormatted = member.lastMessageTimestamp ? formatSidebarTime(member.lastMessageTimestamp) : "";

                                    return (
                                        <button
                                            key={member.id}
                                            onClick={() => handleSelectDM(member)}
                                            className={cn(
                                                "w-full p-2.5 rounded-xl text-left transition-all text-xs font-medium",
                                                isActive 
                                                    ? "bg-indigo-600 text-white font-bold shadow-sm" 
                                                    : "hover:bg-muted/80 text-foreground/90"
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2.5 truncate">
                                                    <div className="relative shrink-0">
                                                        <Avatar className="h-8 w-8 border">
                                                            <AvatarImage src={member.photoURL || undefined} />
                                                            <AvatarFallback className="text-[10px] font-bold bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                                                                {member.name.substring(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span 
                                                            className={cn(
                                                                "absolute bottom-0 right-0 h-2 w-2 rounded-full ring-2 ring-background",
                                                                member.status === 'active' || member.status === 'online' ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-600"
                                                            )} 
                                                            title={member.status === 'active' || member.status === 'online' ? "Active" : "Offline"}
                                                        />
                                                    </div>
                                                    <div className="truncate">
                                                        <span className="block truncate font-bold text-xs">{member.name}</span>
                                                        <span className={cn("text-[10px] block truncate", isActive ? "text-white/80" : "text-muted-foreground")}>
                                                            {member.email}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end shrink-0 gap-1">
                                                    {timestampFormatted ? (
                                                        <span className={cn("text-[9px] font-mono", isActive ? "text-white/80" : "text-muted-foreground")}>
                                                            {timestampFormatted}
                                                        </span>
                                                    ) : null}
                                                    {getRoleBadge(member.role)}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            ) : chatFilterMode === 'my_chats' ? (
                                <div className="p-3 text-center rounded-xl border border-dashed bg-muted/20 space-y-2 my-2">
                                    <MessageCircle className="h-5 w-5 text-indigo-500 mx-auto" />
                                    <p className="text-[11px] font-bold text-foreground">No Active 1-on-1 Conversations</p>
                                    <p className="text-[10px] text-muted-foreground leading-tight">
                                        You haven&apos;t started private direct messages with any staff members yet.
                                    </p>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => setChatFilterMode('all_staff')}
                                        className="h-7 text-[10px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-700"
                                    >
                                        See All Staff to Chat
                                    </Button>
                                </div>
                            ) : (
                                <div className="p-3 text-center rounded-xl border border-dashed bg-muted/20 space-y-1 my-2">
                                    <UserCheck className="h-4 w-4 text-indigo-500 mx-auto" />
                                    <p className="text-[11px] font-bold text-foreground">Solo Workspace</p>
                                    <p className="text-[10px] text-muted-foreground leading-tight">
                                        You are currently the only verified staff member in the workspace. Whitelist additional staff from Team Management.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Draggable Resizer Separator (Click, Hold & Move Left / Right) */}
                <div
                    onMouseDown={() => setIsDragging(true)}
                    className={cn(
                        "hidden lg:flex w-2.5 hover:w-3 bg-border/60 hover:bg-indigo-500 active:bg-indigo-600 transition-all cursor-col-resize items-center justify-center select-none group z-20 shrink-0 relative border-x border-border/40",
                        isDragging && "bg-indigo-600 w-3 shadow-lg ring-2 ring-indigo-400/50"
                    )}
                    title="Click, hold & drag to resize sidebar width"
                >
                    {/* Visual Grip Handle */}
                    <div className="h-10 w-1 rounded-full bg-muted-foreground/40 group-hover:bg-white group-active:bg-white transition-colors" />
                </div>

                {/* Right Main Chat Area */}
                <div className={cn(
                    "flex-1 flex flex-col h-full bg-background min-w-0 overflow-hidden",
                    mobileView === "chat" ? "flex" : "hidden lg:flex"
                )}>
                    
                    {/* Chat Header */}
                    <div className="p-3 border-b border-border/60 bg-muted/10 flex items-center justify-between gap-2 shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                            {/* Back button - only visible on small screens */}
                            <button
                                onClick={() => setMobileView("list")}
                                className="lg:hidden flex items-center justify-center h-8 w-8 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                title="Back to channels"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            {activeRoomType === "channel" ? (
                                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 shrink-0">
                                    <Hash className="h-5 w-5" />
                                </div>
                            ) : (
                                <Avatar className="h-9 w-9 border-2 border-indigo-500/30 shrink-0">
                                    <AvatarImage src={activeRecipient?.photoURL || undefined} />
                                    <AvatarFallback className="font-bold bg-indigo-500/20 text-indigo-700">
                                        {activeRecipient?.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            )}
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h2 className="font-black text-base text-foreground tracking-tight truncate">
                                        {activeRoomType === "channel" ? `#${activeRoomId}` : activeRecipient?.name}
                                    </h2>
                                    {activeRoomType === "channel" && currentChannelBadge && (
                                        <Badge variant="outline" className="text-[9px] font-bold uppercase bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 shrink-0">
                                            {currentChannelBadge}
                                        </Badge>
                                    )}
                                    {activeRoomType === "dm" && activeRecipient && (
                                        getRoleBadge(activeRecipient.role)
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="truncate">{currentChannelDesc}</span>
                                    {activeRoomType === "channel" && (
                                        <>
                                            <span>•</span>
                                            <span className="font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">{currentChannelMemberCount} staff</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            {isSearchOpen ? (
                                <div className="relative animate-in fade-in duration-200">
                                    <Input 
                                        placeholder="Search in chat..."
                                        value={messageSearchQuery}
                                        onChange={(e) => setMessageSearchQuery(e.target.value)}
                                        className="h-8 w-44 text-xs pr-7 bg-background"
                                        autoFocus
                                    />
                                    <button 
                                        onClick={() => { setIsSearchOpen(false); setMessageSearchQuery(""); }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsSearchOpen(true)} title="Search Messages">
                                    <Search className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Chat Messages Stream */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {loadingMessages ? (
                            <div className="flex flex-col items-center justify-center h-72 space-y-2">
                                <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Connecting to staff stream...</p>
                            </div>
                        ) : displayMessages.length > 0 ? (
                            <div className="space-y-4">
                                {displayMessages.map((msg, idx) => {
                                    const isMine = msg.senderId === user?.uid;
                                    const isSystem = msg.senderId === 'system';
                                    const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;
                                    const msgTime = msg.createdAt?.toDate ? format(msg.createdAt.toDate(), "HH:mm") : (msg.createdAt ? format(new Date(msg.createdAt), "HH:mm") : '');

                                    if (isSystem) {
                                        return (
                                            <div key={msg.id || idx} className="flex justify-center my-3">
                                                <div className="px-4 py-1.5 rounded-full bg-muted/60 border text-[11px] font-bold text-muted-foreground flex items-center gap-1.5 shadow-sm">
                                                    <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                                                    <span>{msg.text}</span>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div 
                                            key={msg.id || idx}
                                            className={cn(
                                                "group flex gap-3 max-w-[85%] transition-all",
                                                isMine ? "ml-auto flex-row-reverse" : "mr-auto"
                                            )}
                                        >
                                            {/* Avatar */}
                                            {!isMine && (
                                                <Avatar className="h-8 w-8 mt-1 shrink-0 border">
                                                    <AvatarImage src={msg.senderAvatar || undefined} />
                                                    <AvatarFallback className="text-[10px] font-bold bg-indigo-500/20 text-indigo-700">
                                                        {msg.senderName.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                            )}

                                            {/* Bubble Container */}
                                            <div className="space-y-1.5">
                                                {/* Author Bar */}
                                                {!isMine && (
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="font-bold text-foreground">{msg.senderName}</span>
                                                        {getRoleBadge(msg.senderRole)}
                                                        <span className="text-[10px] text-muted-foreground font-mono">{msgTime}</span>
                                                    </div>
                                                )}

                                                {/* Quoted Reply if present */}
                                                {msg.replyToText && (
                                                    <div className={cn(
                                                        "p-2 rounded-lg text-xs border-l-2 bg-muted/40 border-indigo-500 text-muted-foreground space-y-0.5",
                                                        isMine && "bg-indigo-950/20 text-indigo-200"
                                                    )}>
                                                        <p className="font-bold text-[10px] text-indigo-600 dark:text-indigo-400">
                                                            Replying to {msg.replyToAuthor || "Staff"}:
                                                        </p>
                                                        <p className="italic text-[11px] line-clamp-1">{msg.replyToText}</p>
                                                    </div>
                                                )}

                                                {/* Main Bubble */}
                                                <div 
                                                    className={cn(
                                                        "p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed relative shadow-sm break-words",
                                                        isMine 
                                                            ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-none font-medium" 
                                                            : "bg-muted/50 border border-border/70 text-foreground rounded-tl-none font-medium"
                                                    )}
                                                >
                                                    {msg.text}

                                                    {/* Attachments */}
                                                    {msg.attachments && msg.attachments.length > 0 && (
                                                        <div className="mt-2.5 space-y-2 pt-2 border-t border-white/20">
                                                            {msg.attachments.map((att, attIdx) => (
                                                                <div key={attIdx}>
                                                                    {att.type === 'image' ? (
                                                                        <div 
                                                                            onClick={() => setPreviewImage(att.url)}
                                                                            className="cursor-pointer overflow-hidden rounded-xl border border-white/20 max-w-sm hover:opacity-90 transition-opacity"
                                                                        >
                                                                            <img src={att.url} alt={att.name} className="max-h-48 w-auto object-cover" />
                                                                        </div>
                                                                    ) : (
                                                                        <a 
                                                                            href={att.url} 
                                                                            download={att.name}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className={cn(
                                                                                "flex items-center gap-2 p-2 rounded-lg border transition-all text-xs font-bold",
                                                                                isMine ? "bg-white/10 hover:bg-white/20 text-white" : "bg-background hover:bg-muted text-foreground"
                                                                            )}
                                                                        >
                                                                            <FileText className="h-4 w-4 shrink-0 text-indigo-400" />
                                                                            <span className="truncate flex-1">{att.name}</span>
                                                                            <Download className="h-3.5 w-3.5 shrink-0" />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Read Receipt Ticks — only on sender's own bubbles */}
                                                    {isMine && (() => {
                                                        const deliveredIds = Object.keys(msg.deliveredTo || {});
                                                        const readIds = Object.keys(msg.readBy || {});
                                                        const anyDelivered = deliveredIds.length > 0;
                                                        const anyRead = readIds.length > 0;

                                                        // For DMs: check if the specific recipient has read
                                                        const dmRecipientId = activeRoomType === 'dm' && activeRecipient ? activeRecipient.id : null;
                                                        const dmRead = dmRecipientId ? (msg.readBy?.[dmRecipientId] === true) : anyRead;
                                                        const dmDelivered = dmRecipientId ? (msg.deliveredTo?.[dmRecipientId] === true) : anyDelivered;

                                                        return (
                                                            <div className="flex items-center justify-end gap-1 text-[9px] text-white/70 font-mono mt-1">
                                                                <span>{msgTime}</span>
                                                                {dmRead ? (
                                                                    // Double teal ticks = Read
                                                                    <span title={`Read by ${readIds.length} member${readIds.length > 1 ? 's' : ''}`}>
                                                                        <svg viewBox="0 0 16 11" className="h-3.5 w-5 fill-teal-300" xmlns="http://www.w3.org/2000/svg">
                                                                            <path d="M11.071.603a.75.75 0 0 1 .026 1.06l-6 6.5a.75.75 0 0 1-1.091-.005l-2.5-2.75a.75.75 0 0 1 1.107-1.006l1.963 2.159 5.435-5.932a.75.75 0 0 1 1.06-.026Z"/>
                                                                            <path d="M14.571.603a.75.75 0 0 1 .026 1.06l-6 6.5a.75.75 0 0 1-1.085.008L9 7.665l.547-.6.966 1.06 5.998-6.496a.75.75 0 0 1 1.06-.026Z"/>
                                                                        </svg>
                                                                    </span>
                                                                ) : dmDelivered ? (
                                                                    // Double grey ticks = Delivered
                                                                    <span title={`Delivered to ${deliveredIds.length} member${deliveredIds.length > 1 ? 's' : ''}`}>
                                                                        <svg viewBox="0 0 16 11" className="h-3.5 w-5 fill-white/50" xmlns="http://www.w3.org/2000/svg">
                                                                            <path d="M11.071.603a.75.75 0 0 1 .026 1.06l-6 6.5a.75.75 0 0 1-1.091-.005l-2.5-2.75a.75.75 0 0 1 1.107-1.006l1.963 2.159 5.435-5.932a.75.75 0 0 1 1.06-.026Z"/>
                                                                            <path d="M14.571.603a.75.75 0 0 1 .026 1.06l-6 6.5a.75.75 0 0 1-1.085.008L9 7.665l.547-.6.966 1.06 5.998-6.496a.75.75 0 0 1 1.06-.026Z"/>
                                                                        </svg>
                                                                    </span>
                                                                ) : (
                                                                    // Single grey tick = Sent (not yet delivered)
                                                                    <span title="Sent">
                                                                        <svg viewBox="0 0 8 11" className="h-3.5 w-3 fill-white/50" xmlns="http://www.w3.org/2000/svg">
                                                                            <path d="M7.071.603a.75.75 0 0 1 .026 1.06l-6 6.5a.75.75 0 0 1-1.091-.005l-2.5-2.75a.75.75 0 0 1 1.107-1.006l1.963 2.159 5.435-5.932a.75.75 0 0 1 1.06-.026Z"/>
                                                                        </svg>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>

                                                {/* Reactions Pill Display */}
                                                {hasReactions && (
                                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                                        {Object.entries(msg.reactions!).map(([emoji, uids]) => (
                                                            <button
                                                                key={emoji}
                                                                onClick={() => handleToggleReaction(msg.id, emoji)}
                                                                className={cn(
                                                                    "flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold transition-all",
                                                                    uids.includes(user?.uid || '') 
                                                                        ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-700 dark:text-indigo-300" 
                                                                        : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                                                                )}
                                                            >
                                                                <span>{emoji}</span>
                                                                <span>{uids.length}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Hover Actions Menu (React, Reply, Delete) */}
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 self-center">
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground">
                                                            <Smile className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="p-2 w-auto flex gap-1" align={isMine ? "end" : "start"}>
                                                        {["👍", "❤️", "🚀", "🔥", "👏", "💡", "🚨", "👀"].map(e => (
                                                            <button 
                                                                key={e} 
                                                                onClick={() => handleToggleReaction(msg.id, e)}
                                                                className="text-base p-1 hover:scale-125 transition-transform"
                                                            >
                                                                {e}
                                                            </button>
                                                        ))}
                                                    </PopoverContent>
                                                </Popover>

                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                                                    onClick={() => setReplyTarget(msg)}
                                                    title="Reply"
                                                >
                                                    <Reply className="h-3.5 w-3.5" />
                                                </Button>

                                                {/* Delete option for own message or if admin */}
                                                {(isMine || userProfile?.role === 'owner' || userProfile?.role === 'admin') && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-7 w-7 rounded-full text-muted-foreground hover:text-rose-600"
                                                        onClick={() => handleDeleteMessage(msg.id)}
                                                        title="Delete message"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-80 space-y-3 text-center px-6">
                                <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-600">
                                    <MessageSquare className="h-10 w-10" />
                                </div>
                                <h3 className="font-bold text-base text-foreground">
                                    {activeRoomType === "dm" && activeRecipient
                                        ? `Welcome to your chat with ${activeRecipient.name}!`
                                        : "Welcome to your Staff Chat area!"}
                                </h3>
                                <p className="text-xs text-muted-foreground max-w-sm">
                                    This is the start of your team discussions. Send a message, share an update, or upload a file below.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Replying Banner if active */}
                    {replyTarget && (
                        <div className="p-2.5 bg-indigo-500/10 border-t border-indigo-500/30 flex items-center justify-between gap-2 px-4 shrink-0">
                            <div className="flex items-center gap-2 text-xs truncate">
                                <Reply className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                <span className="font-bold text-indigo-700 dark:text-indigo-300">Replying to {replyTarget.senderName}:</span>
                                <span className="italic text-muted-foreground truncate">{replyTarget.text}</span>
                            </div>
                            <button onClick={() => setReplyTarget(null)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {/* Pending Attachments Preview Chips */}
                    {attachments.length > 0 && (
                        <div className="p-2 bg-muted/40 border-t flex flex-wrap gap-2 px-4 shrink-0">
                            {attachments.map((att, idx) => (
                                <Badge key={idx} variant="secondary" className="flex items-center gap-1.5 py-1 px-2.5 text-xs font-bold">
                                    {att.type === 'image' ? <ImageIcon className="h-3.5 w-3.5 text-indigo-500" /> : <FileText className="h-3.5 w-3.5 text-blue-500" />}
                                    <span className="truncate max-w-[150px]">{att.name}</span>
                                    <button onClick={() => handleRemoveAttachment(idx)} className="hover:text-destructive ml-1">
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Quick Canned Responses — wraps onto multiple lines instead of scrolling */}
                    <div className="px-3 pt-2 pb-1.5 bg-muted/20 border-t border-border/40 shrink-0">
                        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
                            <Zap className="h-3 w-3 text-amber-500" /> Quick Replies
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                            {CANNED_RESPONSES.map(phrase => (
                                <button
                                    key={phrase}
                                    onClick={() => setInputText(phrase)}
                                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-background hover:bg-indigo-500/10 border border-border/60 hover:border-indigo-500/40 text-muted-foreground hover:text-indigo-700 dark:hover:text-indigo-300 transition-all"
                                >
                                    {phrase}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Message Input Bar */}
                    <div className="p-3 border-t border-border/60 bg-muted/10 space-y-2 shrink-0">
                        <div className="flex items-center gap-2">
                            {/* Hidden file inputs */}
                            <input 
                                type="file" 
                                ref={imageInputRef} 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handleFileUpload(e, 'image')} 
                            />
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                accept=".pdf,.doc,.docx,.txt,.csv,.xlsx" 
                                className="hidden" 
                                onChange={(e) => handleFileUpload(e, 'file')} 
                            />

                            {/* Attachment triggers */}
                            <div className="flex items-center gap-0.5">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-9 w-9 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-500/10" 
                                    onClick={() => imageInputRef.current?.click()}
                                    title="Attach Image / Screenshot"
                                >
                                    <ImageIcon className="h-4 w-4" />
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-9 w-9 text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10" 
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Attach Document / File"
                                >
                                    <Paperclip className="h-4 w-4" />
                                </Button>

                                {/* Emoji Picker Popover */}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-9 w-9 text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10" 
                                            title="Insert Emoji"
                                        >
                                            <Smile className="h-4 w-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-3 space-y-3" align="start">
                                        <div className="space-y-2">
                                            {EMOJI_CATEGORIES.map(cat => (
                                                <div key={cat.label} className="space-y-1">
                                                    <p className="text-[10px] font-black uppercase text-muted-foreground">{cat.label}</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {cat.emojis.map(e => (
                                                            <button 
                                                                key={e} 
                                                                onClick={() => handleInsertEmoji(e)}
                                                                className="text-lg p-1 hover:scale-125 transition-transform"
                                                            >
                                                                {e}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Message Text Input with Auto-Expansion (1 to 5 lines) and Independent Scroll */}
                            <Textarea 
                                ref={textareaRef}
                                placeholder="Message"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="min-h-[40px] max-h-[125px] resize-none text-xs font-medium border-2 bg-background py-2.5 overflow-y-auto leading-relaxed transition-[height] duration-75"
                                rows={1}
                            />

                            {/* Send Button */}
                            <Button 
                                onClick={handleSendMessage} 
                                disabled={isSending || (!inputText.trim() && attachments.length === 0)}
                                className="h-10 px-5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs uppercase tracking-wider shrink-0 gap-1.5 shadow-md"
                            >
                                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                Send
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* CREATE OPERATION CHANNEL & SELECT STAFF MODAL */}
            <Dialog open={isCreateChannelOpen} onOpenChange={setIsCreateChannelOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
                            <FolderPlus className="h-4 w-4" /> New Group Room
                        </div>
                        <DialogTitle className="text-2xl font-black">
                            Create Operation Channel &amp; Assign Staff
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Create a dedicated project room or operational squad and select specific staff members who can participate.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Channel Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider">Channel Slug (ID) *</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-xs">#</span>
                                    <Input 
                                        placeholder="e.g. birmingham-events"
                                        value={newChannelName}
                                        onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                        className="pl-7 h-10 border-2 font-mono text-xs bg-background"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider">Display Label *</Label>
                                <Input 
                                    placeholder="e.g. Birmingham Events Squad"
                                    value={newChannelLabel}
                                    onChange={(e) => setNewChannelLabel(e.target.value)}
                                    className="h-10 border-2 font-medium text-xs bg-background"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider">Mission / Description</Label>
                                <Input 
                                    placeholder="e.g. Coordinate venue sponsors and event logistics"
                                    value={newChannelDesc}
                                    onChange={(e) => setNewChannelDesc(e.target.value)}
                                    className="h-10 border-2 font-medium text-xs bg-background"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider">Category Tag</Label>
                                <select 
                                    value={newChannelBadge} 
                                    onChange={(e) => setNewChannelBadge(e.target.value)}
                                    className="w-full h-10 px-3 rounded-md border-2 bg-background font-bold text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    {CHANNEL_CATEGORY_PRESETS.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Staff Selection Section */}
                        <div className="space-y-3 pt-2 border-t">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <Label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                                        <UserPlus className="h-4 w-4 text-indigo-600" /> Select Staff Members ({selectedStaffIds.length} chosen)
                                    </Label>
                                    <p className="text-[11px] text-muted-foreground">Chosen staff will have immediate access to this channel.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={handleSelectAllStaff} className="h-7 text-[10px] font-bold">
                                        Select All
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={handleClearStaffSelection} className="h-7 text-[10px] font-bold text-muted-foreground">
                                        Clear
                                    </Button>
                                </div>
                            </div>

                            {/* Search staff in modal */}
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input 
                                    placeholder="Filter staff by name or role..."
                                    value={channelStaffSearch}
                                    onChange={(e) => setChannelStaffSearch(e.target.value)}
                                    className="pl-8 h-8 text-xs border bg-background"
                                />
                            </div>

                            {/* Staff Cards Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1">
                                {filteredChannelStaffModal.map(staff => {
                                    const isSelected = selectedStaffIds.includes(staff.id);
                                    return (
                                        <div 
                                            key={staff.id}
                                            onClick={() => handleToggleStaffSelection(staff.id)}
                                            className={cn(
                                                "flex items-center justify-between p-2.5 rounded-xl border-2 cursor-pointer transition-all select-none",
                                                isSelected 
                                                    ? "border-indigo-600 bg-indigo-500/10 text-foreground shadow-sm" 
                                                    : "border-border/70 hover:border-border bg-background"
                                            )}
                                        >
                                            <div className="flex items-center gap-2.5 truncate">
                                                <Checkbox 
                                                    checked={isSelected}
                                                    onCheckedChange={() => {}}
                                                    className="shrink-0"
                                                />
                                                <Avatar className="h-7 w-7 border">
                                                    <AvatarImage src={staff.photoURL || undefined} />
                                                    <AvatarFallback className="text-[10px] font-bold bg-indigo-500/20 text-indigo-700">
                                                        {staff.name.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="truncate">
                                                    <p className="font-bold text-xs truncate">{staff.name}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate">{staff.email}</p>
                                                </div>
                                            </div>
                                            <div className="shrink-0 ml-2">
                                                {getRoleBadge(staff.role)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 border-t pt-4">
                        <Button variant="outline" onClick={() => setIsCreateChannelOpen(false)} className="font-bold text-xs uppercase">
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleCreateChannel} 
                            disabled={isCreatingChannel || !newChannelName.trim() || !newChannelLabel.trim()}
                            className="font-black text-xs uppercase bg-indigo-600 hover:bg-indigo-700 text-white px-6 shadow-md"
                        >
                            {isCreatingChannel ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderPlus className="mr-2 h-4 w-4" />}
                            Create Channel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Image Preview Modal */}
            <Dialog open={!!previewImage} onOpenChange={(open) => { if (!open) setPreviewImage(null); }}>
                <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black/90 border-0">
                    <DialogHeader className="p-4 bg-black/60 text-white flex flex-row items-center justify-between">
                        <DialogTitle className="text-sm font-bold text-white">Attachment Preview</DialogTitle>
                        <DialogDescription className="hidden">Full size image view</DialogDescription>
                    </DialogHeader>
                    <div className="p-4 flex items-center justify-center">
                        {previewImage && <img src={previewImage} alt="Preview" className="max-h-[75vh] w-auto object-contain rounded-lg" />}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
