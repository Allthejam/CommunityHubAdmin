"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare, PlusCircle, User, Loader2, Archive, LogOut, Trash2, Pin, Star, ArrowLeft, Maximize, Minimize, Smile, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, orderBy, updateDoc, arrayRemove, deleteDoc, getDocs, setDoc } from "firebase/firestore";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ChatPersonalization } from "@/components/chat-personalization";
import { format } from "date-fns";
import EmojiPicker, { Theme as EmojiTheme } from "emoji-picker-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { sendPushNotificationAction } from "@/lib/actions/notificationActions";
import { scanAndFlagAction } from "@/lib/actions/moderationActions";


type Message = {
    senderId: string;
    sender: string;
    text: string;
    timestamp: any;
    isOwn: boolean;
    avatar: string;
    members?: { id: string; name: string }[];
};

type Conversation = {
    id: string;
    name: string;
    avatar: string;
    lastMessage: string;
    isArchived: boolean;
    hasUnread?: boolean;
    lastMessageTimestamp: any;
    createdBy: string;
    scope: 'public' | 'private' | 'platform';
    memberIds: string[];
    archivedBy?: string[];
    communityId: string;
    isPlatformChat?: boolean;
};

type TeamMember = {
    id: string;
    name: string;
    role: string;
};

type ReadStatus = {
    [conversationId: string]: { lastRead: any };
}

export default function LeaderChatPage() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const userProfileRef = useMemoFirebase(() => user ? doc(db, 'users', user.uid) : null, [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const communityId = userProfile?.communityId;
    const chatTheme = userProfile?.settings?.chatTheme || { mode: 'light', texture: '', cardTexture: '' };
    
    const [conversations, setConversations] = React.useState<Conversation[]>([]);
    const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
    const [selectedConversationId, setSelectedConversationId] = React.useState<string | null>(null);
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [newMessage, setNewMessage] = React.useState("");
    const [loadingConversations, setLoadingConversations] = React.useState(true);
    const [loadingMessages, setLoadingMessages] = React.useState(false);
    const { toast } = useToast();
    
    const [openNewChatDialog, setOpenNewChatDialog] = React.useState(false);
    const [newGroupName, setNewGroupName] = React.useState("");
    const [selectedMembers, setSelectedMembers] = React.useState<string[]>([]);
    const [isCreatingChat, setIsCreatingChat] = React.useState(false);
    const bottomOfMessagesRef = React.useRef<HTMLDivElement>(null);
    const [conversationToDelete, setConversationToDelete] = React.useState<Conversation | null>(null);
    const [pinnedConversations, setPinnedConversations] = React.useState<string[]>([]);
    const [favoriteConversations, setFavoriteConversations] = React.useState<string[]>([]);
    const [readStatus, setReadStatus] = React.useState<ReadStatus>({});
    const isInitialLoadRef = React.useRef(true);
    const [isChatFullScreen, setChatFullScreen] = React.useState(false);


    React.useEffect(() => {
        const storedPinned = localStorage.getItem('pinnedLeaderChats');
        if (storedPinned) {
            setPinnedConversations(JSON.parse(storedPinned));
        }
        const storedFavorites = localStorage.getItem('favoriteLeaderChats');
        if (storedFavorites) {
            setFavoriteConversations(JSON.parse(storedFavorites));
        }
    }, []);

    const togglePin = (conversationId: string) => {
        const newPinned = pinnedConversations.includes(conversationId)
            ? pinnedConversations.filter(id => id !== conversationId)
            : [...pinnedConversations, conversationId];
        setPinnedConversations(newPinned);
        localStorage.setItem('pinnedLeaderChats', JSON.stringify(newPinned));
    };

    const toggleFavorite = (conversationId: string) => {
        const newFavorites = favoriteConversations.includes(conversationId)
            ? favoriteConversations.filter(id => id !== conversationId)
            : [...favoriteConversations, conversationId];
        setFavoriteConversations(newFavorites);
        localStorage.setItem('favoriteLeaderChats', JSON.stringify(newFavorites));
    };


    React.useEffect(() => {
        if (!user || !communityId || !db) {
            setLoadingConversations(false);
            return;
        }

        const readStatusQuery = query(collection(db, "users", user.uid, "readStatus"));
        const unsubscribeReadStatus = onSnapshot(readStatusQuery, (snapshot) => {
            const status: ReadStatus = {};
            snapshot.forEach(doc => {
                status[doc.id] = doc.data() as { lastRead: any };
            });
            setReadStatus(status);
        });

        const conversationsQuery = query(
            collection(db, "conversations"),
            where("memberIds", "array-contains", user.uid)
        );

        const unsubscribeConvos = onSnapshot(conversationsQuery, async (snapshot) => {
            let currentReadStatus: ReadStatus = {};
            const readStatusRef = collection(db, "users", user.uid, "readStatus");
            const readSnapshot = await getDocs(readStatusRef);
            readSnapshot.forEach(doc => {
                currentReadStatus[doc.id] = doc.data() as { lastRead: any };
            });

            const allUserConvos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
            
            const filteredConvos = allUserConvos.filter(convo => 
                (convo.communityId === communityId && convo.scope === 'private') || convo.isPlatformChat
            ).map(convo => {
                const lastReadTimestamp = currentReadStatus[convo.id]?.lastRead?.seconds || 0;
                const hasUnread = (convo.lastMessageTimestamp?.seconds || 0) > lastReadTimestamp;
                return {
                    ...convo,
                    isArchived: convo.archivedBy?.includes(user.uid) || false,
                    hasUnread,
                };
            });
            
            filteredConvos.sort((a, b) => (b.lastMessageTimestamp?.seconds || 0) - (a.lastMessageTimestamp?.seconds || 0));
            setConversations(filteredConvos);
            setLoadingConversations(false);
        });
        
        const membersQuery = query(
            collection(db, 'users'),
            where('communityId', '==', communityId)
        );

        const unsubscribeMembers = onSnapshot(membersQuery, (snapshot) => {
            const members: TeamMember[] = [];
            const leaderRoles = ['leader', 'president'];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (leaderRoles.includes(data.role)) {
                    members.push({
                        id: doc.id,
                        name: data.name,
                        role: data.role,
                    });
                }
            });
            setTeamMembers(members);
        });


        return () => {
            unsubscribeConvos();
            unsubscribeMembers();
            unsubscribeReadStatus();
        };

    }, [user, communityId, db]);
    
     React.useEffect(() => {
        if (!selectedConversationId || !user || !db) {
            setMessages([]);
            return;
        }
        
        isInitialLoadRef.current = true;
        const markAsRead = async () => {
            const readStatusRef = doc(db, `users/${user.uid}/readStatus`, selectedConversationId);
            await setDoc(readStatusRef, { lastRead: serverTimestamp() }, { merge: true });
        };
        markAsRead();

        setLoadingMessages(true);
        const messagesQuery = query(collection(db, `conversations/${selectedConversationId}/messages`), orderBy("timestamp", "asc"));
        
        const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
            const msgs: Message[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                msgs.push({
                    ...data,
                    isOwn: data.senderId === user?.uid
                } as Message);
            });
            setMessages(msgs);
            setLoadingMessages(false);
        }, () => setLoadingMessages(false));

        return () => unsubscribeMessages();
    }, [selectedConversationId, user, db]);
    
    React.useEffect(() => {
      setTimeout(() => {
        if (isInitialLoadRef.current) {
          bottomOfMessagesRef.current?.scrollIntoView({ behavior: "auto" });
          isInitialLoadRef.current = false;
        }
      }, 100);
    }, [messages]);


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() === "" || !selectedConversationId || !user || !userProfile || !db) return;
    
        const convoRef = doc(db, 'conversations', selectedConversationId);
        const messagesRef = collection(convoRef, 'messages');
        const textToScan = newMessage.trim();
    
        try {
            // CRITICAL: Call the moderation scanner before sending the message
            await scanAndFlagAction({
                text: textToScan,
                contentType: "Private Chat",
                authorId: user.uid,
                authorName: userProfile.name,
                contentId: selectedConversationId,
            });

            await addDoc(messagesRef, {
                senderId: user.uid,
                sender: userProfile.name,
                avatar: userProfile.avatar || '',
                text: textToScan,
                timestamp: serverTimestamp()
            });
    
            await updateDoc(convoRef, {
                lastMessage: textToScan,
                lastMessageTimestamp: serverTimestamp(),
            });
    
            const conversation = conversations.find(c => c.id === selectedConversationId);
            if (conversation) {
                const otherMembers = conversation.memberIds.filter((id: string) => id !== user.uid);
                
                await sendPushNotificationAction({
                    audience: { type: 'users', value: otherMembers },
                    notification: {
                        title: `New message in "${conversation.name}"`,
                        body: `${userProfile.name}: ${textToScan}`,
                        tag: conversation.id,
                    },
                });

                for (const memberId of otherMembers) {
                    await addDoc(collection(db, 'notifications'), {
                        recipientId: memberId,
                        type: 'New Message',
                        subject: `New message in "${conversation.name}"`,
                        from: userProfile.name,
                        date: new Date().toISOString(),
                        status: 'new',
                        relatedId: selectedConversationId
                    });
                }
            }
    
            setNewMessage("");
    
        } catch (error) {
            console.error("Error sending message:", error);
            toast({ title: "Error", description: "Could not send message.", variant: "destructive" });
        }
    };
    
    const findOrCreatePlatformChat = async () => {
        if (!user || !userProfile || !db) return;
        
        const q = query(
            collection(db, "conversations"),
            where("isPlatformChat", "==", true),
            where("memberIds", "array-contains", user.uid)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const existingChat = querySnapshot.docs[0];
            setSelectedConversationId(existingChat.id);
        } else {
             try {
                const newConvoRef = await addDoc(collection(db, 'conversations'), {
                    name: "Platform Support",
                    avatar: `https://i.postimg.cc/HnhWpVyt/Hub-Logo192x192.png`,
                    isPlatformChat: true,
                    communityId: communityId,
                    memberIds: [user.uid],
                    lastMessage: "You have started a conversation with Platform Support.",
                    lastMessageTimestamp: serverTimestamp(),
                    createdAt: serverTimestamp(),
                    archivedBy: [],
                });

                const initialMsgRef = collection(newConvoRef, 'messages');
                await addDoc(initialMsgRef, {
                    senderId: "system",
                    sender: "System",
                    avatar: "",
                    text: "Welcome to Platform Support. An admin will be with you shortly.",
                    timestamp: serverTimestamp(),
                });

                setSelectedConversationId(newConvoRef.id);
            } catch (error) {
                console.error("Error creating platform chat:", error);
                toast({ title: "Error", description: "Failed to create support chat.", variant: "destructive"});
            }
        }
    }

    const handleCreateChat = async () => {
        if (!newGroupName.trim() || selectedMembers.length === 0 || !user || !communityId || !db) {
            return;
        }
        setIsCreatingChat(true);

        const memberIds = [user.uid, ...selectedMembers];
        const allMemberObjects = [
            { id: user.uid, name: userProfile?.name || 'You' },
            ...selectedMembers.map(id => {
                const member = teamMembers.find(m => m.id === id);
                return { id: id, name: member?.name || 'Unknown User' };
            })
        ];
        const avatarSeed = memberIds.sort().join('');
        const initialMessage = `${userProfile?.name} created this group.`;
        
        try {
            const newConvoRef = await addDoc(collection(db, 'conversations'), {
                name: newGroupName,
                avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(avatarSeed)}`,
                communityId: communityId,
                memberIds: memberIds,
                scope: 'private',
                lastMessage: initialMessage,
                lastMessageTimestamp: serverTimestamp(),
                createdBy: user.uid,
                createdAt: serverTimestamp(),
                archivedBy: [],
            });

            for (const memberId of selectedMembers) {
                await addDoc(collection(db, 'notifications'), {
                    recipientId: memberId,
                    type: 'New Message',
                    subject: `You were added to a new chat: "${newGroupName}"`,
                    from: userProfile?.name,
                    date: new Date().toISOString(),
                    status: 'new',
                    relatedId: newConvoRef.id
                });
            }

            const initialMsgRef = collection(newConvoRef, 'messages');
            await addDoc(initialMsgRef, {
                senderId: "system",
                sender: "System",
                avatar: "",
                text: `${userProfile?.name} created the group.`,
                members: allMemberObjects,
                timestamp: serverTimestamp(),
            });

            setSelectedConversationId(newConvoRef.id);
            setOpenNewChatDialog(false);
            setNewGroupName("");
            setSelectedMembers([]);
        } catch (error) {
            console.error("Error creating chat:", error);
            toast({ title: "Error", description: "Failed to create new chat.", variant: "destructive"});
        } finally {
            setIsCreatingChat(false);
        }
    };

    const toggleArchive = async (conversationId: string) => {
        if (!user || !db) return;
        const convoRef = doc(db, 'conversations', conversationId);
        const conversation = conversations.find(c => c.id === conversationId);
        if (!conversation) return;

        const isArchived = conversation.isArchived;
        const currentArchivedBy = (conversation as any).archivedBy || [];
        
        const newArchivedBy = isArchived
            ? currentArchivedBy.filter((uid: string) => uid !== user.uid)
            : [...currentArchivedBy, user.uid];

        try {
            await updateDoc(convoRef, { archivedBy: newArchivedBy });
             toast({
                title: `Conversation ${isArchived ? 'Unarchived' : 'Archived'}`,
                description: `"${conversation.name}" has been moved.`
            });
            if (selectedConversationId === conversationId && !isArchived) {
                const nextConvo = conversations.find(c => !(c as any).archivedBy?.includes(user.uid) && c.id !== conversationId);
                setSelectedConversationId(nextConvo?.id || null);
            }
        } catch (error) {
            console.error("Error archiving chat:", error);
            toast({ title: "Error", description: "Failed to update chat.", variant: "destructive" });
        }
    };

    const handleLeaveGroup = async (conversationId: string) => {
        if (!user || !db) return;
        const convoRef = doc(db, 'conversations', conversationId);

        try {
            await updateDoc(convoRef, {
                memberIds: arrayRemove(user.uid)
            });
            toast({
                title: "You have left the group",
                description: "You will no longer receive messages from this conversation."
            });
            if (selectedConversationId === conversationId) {
                setSelectedConversationId(null);
            }
        } catch (error) {
            console.error("Error leaving group:", error);
            toast({ title: "Error", description: "Could not leave the group.", variant: "destructive" });
        }
    }
    
    const handleDeleteChat = async () => {
        if (!conversationToDelete || !db) return;
        try {
            await deleteDoc(doc(db, "conversations", conversationToDelete.id));
            toast({ title: "Chat Deleted", description: `The chat "${conversationToDelete.name}" has been permanently deleted.` });
            if (selectedConversationId === conversationToDelete.id) {
                setSelectedConversationId(null);
            }
        } catch (error) {
            console.error("Error deleting chat:", error);
            toast({ title: "Error", description: "Failed to delete the chat.", variant: "destructive" });
        } finally {
            setConversationToDelete(null);
        }
    }
    
    const sortedConversations = React.useMemo(() => {
        const active = conversations.filter(c => !c.isArchived && !c.isPlatformChat);
        const pinned = active.filter(c => pinnedConversations.includes(c.id));
        const unpinned = active.filter(c => !pinnedConversations.includes(c.id));
        return [...pinned, ...unpinned];
    }, [conversations, pinnedConversations]);

    const archivedConversations = conversations.filter(c => c.isArchived && !c.isPlatformChat);
    const selectedConversation = conversations.find(c => c.id === selectedConversationId);
    
    let lastDisplayedDate: string | null = null;

    if (isUserLoading || profileLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
  return (
    <>
    <div className={cn(
        "space-y-4",
        isChatFullScreen && `h-screen flex flex-col`,
        chatTheme?.mode,
        chatTheme?.texture
    )}>
       <div className={cn(isChatFullScreen && "hidden")}>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                <MessageSquare className="h-6 w-6 md:h-8 md:w-8" />
                Community Team Chat
            </h1>
            <p className="text-muted-foreground">
                Private communication channels for your community leadership team.
            </p>
        </div>

        <div className={cn(
            "flex-1 md:grid md:grid-cols-3 md:gap-4 h-[75vh]",
            isChatFullScreen && "fixed inset-0 z-50 h-screen w-screen border-0 rounded-none grid grid-cols-3 gap-0"
        )}>
            <Card className={cn(
                "h-full flex flex-col md:h-[70vh]", 
                selectedConversationId ? "hidden md:flex" : "flex",
                chatTheme.cardTexture,
                isChatFullScreen && "rounded-none border-0 md:border-r"
            )}>
                <CardHeader className="flex flex-row items-center justify-between p-4">
                    <CardTitle className="text-lg">Conversations</CardTitle>
                    <div className="flex items-center gap-2">
                        <ChatPersonalization />
                        <Dialog open={openNewChatDialog} onOpenChange={setOpenNewChatDialog}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <PlusCircle className="h-5 w-5" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create a New Group Chat</DialogTitle>
                                    <DialogDescription>
                                        Name your group and select members to invite.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="group-name">Group Name</Label>
                                        <Input id="group-name" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g., Event Planning Committee" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Invite Members</Label>
                                        <ScrollArea className="h-48 rounded-md border p-4">
                                            <div className="space-y-2">
                                                {teamMembers.filter(m => m.id !== user?.uid).map(member => (
                                                    <div key={member.id} className="flex items-center space-x-3">
                                                        <Checkbox 
                                                            id={`member-${member.id}`} 
                                                            onCheckedChange={(checked) => {
                                                                setSelectedMembers(prev => 
                                                                    checked 
                                                                        ? [...prev, member.id]
                                                                        : prev.filter(mId => mId !== member.id)
                                                                )
                                                            }}
                                                        />
                                                        <Label htmlFor={`member-${member.id}`} className="flex items-center gap-2 font-normal">
                                                            <User className="h-4 w-4" />
                                                            {member.name} ({member.role})
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" onClick={handleCreateChat} disabled={isCreatingChat || !newGroupName.trim() || selectedMembers.length === 0}>
                                        {isCreatingChat && <Loader2 className="animate-spin mr-2" />}
                                        Create Chat
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                         <Button variant="ghost" size="icon" onClick={() => setChatFullScreen(!isChatFullScreen)}>
                            {isChatFullScreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                            <span className="sr-only">{isChatFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}</span>
                        </Button>
                    </div>
                </CardHeader>
                <ScrollArea className="flex-1 min-h-0">
                    <CardContent className="p-2">
                        <div className="space-y-2">
                            {userProfile?.role === 'president' && (
                                <Button 
                                    variant="ghost" 
                                    className={cn(
                                        "w-full justify-start p-3 h-auto relative",
                                        selectedConversationId && conversations.find(c => c.id === selectedConversationId)?.isPlatformChat && "bg-secondary"
                                    )}
                                    onClick={findOrCreatePlatformChat}
                                >
                                    <div className="flex items-center gap-3 w-full pl-4">
                                        <Avatar>
                                            <AvatarImage src={"https://i.postimg.cc/HnhWpVyt/Hub-Logo192x192.png"} />
                                            <AvatarFallback>P</AvatarFallback>
                                        </Avatar>
                                        <div className="w-full text-left overflow-hidden">
                                            <p className="font-semibold truncate">Platform Support</p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                Contact an admin for help
                                            </p>
                                        </div>
                                    </div>
                                </Button>
                            )}
                            {loadingConversations ? (
                                <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin"/></div>
                            ) : (
                                sortedConversations.map(convo => (
                                     <ContextMenu key={convo.id}>
                                         <ContextMenuTrigger>
                                            <Button
                                                variant="ghost"
                                                className={cn("w-full justify-start p-3 h-auto relative", selectedConversationId === convo.id && "bg-secondary")}
                                                onClick={() => setSelectedConversationId(convo.id)}
                                            >
                                                 {convo.hasUnread && <span className="absolute left-2 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-blue-500" />}
                                                <div className="flex items-center gap-3 w-full pl-4">
                                                    <Avatar><AvatarImage src={convo.avatar} /><AvatarFallback>{convo.name.charAt(0)}</AvatarFallback></Avatar>
                                                    <div className="w-full text-left overflow-hidden">
                                                        <p className="font-semibold truncate flex items-center gap-2"><Lock className="h-3 w-3"/>{convo.name}</p>
                                                        <p className="text-xs text-muted-foreground truncate">{convo.lastMessage}</p>
                                                    </div>
                                                    <div className="flex items-center shrink-0">
                                                        {favoriteConversations.includes(convo.id) && <Star className="h-4 w-4 text-yellow-500 mr-1" />}
                                                        {pinnedConversations.includes(convo.id) && <Pin className="h-4 w-4 text-muted-foreground" />}
                                                    </div>
                                                </div>
                                            </Button>
                                        </ContextMenuTrigger>
                                        <ContextMenuContent>
                                            <ContextMenuLabel>{convo.name}</ContextMenuLabel>
                                            <ContextMenuSeparator />
                                                <ContextMenuItem onSelect={() => togglePin(convo.id)}><Pin className="mr-2 h-4 w-4" />{pinnedConversations.includes(convo.id) ? "Unpin" : "Pin"}</ContextMenuItem>
                                            <ContextMenuItem onSelect={() => toggleFavorite(convo.id)}><Star className="mr-2 h-4 w-4" />{favoriteConversations.includes(convo.id) ? "Unfavorite" : "Favorite"}</ContextMenuItem>
                                            <ContextMenuSeparator />
                                            <ContextMenuItem onSelect={() => toggleArchive(convo.id)}>
                                                <Archive className="mr-2 h-4 w-4"/> Archive Chat
                                            </ContextMenuItem>
                                            <ContextMenuSeparator />
                                            <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => handleLeaveGroup(convo.id)}><LogOut className="mr-2 h-4 w-4"/> Leave Group</ContextMenuItem>
                                                {convo.createdBy === user?.uid && (
                                                <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConversationToDelete(convo)}>
                                                    <Trash2 className="mr-2 h-4 w-4"/> Delete Chat
                                                </ContextMenuItem>
                                            )}
                                        </ContextMenuContent>
                                    </ContextMenu>
                                ))
                            )}
                        </div>
                    </CardContent>
                </ScrollArea>
            </Card>
            
            <Card className={cn(
                "md:col-span-2 md:h-[70vh]",
                selectedConversationId ? "flex flex-col" : "hidden md:flex flex-col",
                chatTheme.cardTexture,
                isChatFullScreen && "rounded-none border-0"
            )}>
                {selectedConversation ? (
                <>
                    <CardHeader className="flex flex-row items-center gap-3 border-b p-4">
                         <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConversationId(null)}>
                            <ArrowLeft className="h-5 w-5" />
                            <span className="sr-only">Back</span>
                        </Button>
                        <Avatar>
                            <AvatarImage src={selectedConversation.avatar} />
                            <AvatarFallback>{selectedConversation.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-lg">{selectedConversation.name}</CardTitle>
                        </div>
                    </CardHeader>
                    <ScrollArea className="flex-1 p-6 min-h-0">
                        <div className="space-y-6">
                            {loadingMessages ? (
                                <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>
                            ) : (
                                messages.map((msg, index) => {
                                    const messageDate = msg.timestamp?.toDate ? format(msg.timestamp.toDate(), "PPP") : null;
                                    const showDateSeparator = messageDate && messageDate !== lastDisplayedDate;
                                    if (showDateSeparator) {
                                        lastDisplayedDate = messageDate;
                                    }
                                    return (
                                        <React.Fragment key={index}>
                                            {showDateSeparator && (
                                                <div className="relative my-4">
                                                    <div className="absolute inset-0 flex items-center">
                                                        <span className="w-full border-t border-muted" />
                                                    </div>
                                                    <div className="relative flex justify-center text-xs uppercase">
                                                        <span className="bg-card px-2 text-muted-foreground">
                                                            {messageDate}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                            <div className={cn("flex items-end gap-3", msg.isOwn && "flex-row-reverse")}>
                                                <Avatar className={cn("h-8 w-8", msg.senderId === "system" && "hidden")}>
                                                    <AvatarImage src={msg.isOwn ? userProfile?.avatar : msg.avatar} />
                                                    <AvatarFallback>{msg.sender?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className={cn(
                                                    "max-w-xs md:max-w-md rounded-lg px-4 py-2", 
                                                    msg.isOwn ? "bg-primary text-primary-foreground" : "bg-muted",
                                                    msg.senderId === "system" && "w-full text-center bg-transparent text-xs text-muted-foreground italic"
                                                )}>
                                                    {!msg.isOwn && msg.senderId !== "system" && <p className="text-xs font-bold mb-1">{msg.sender}</p>}
                                                    
                                                    {msg.senderId === 'system' ? (
                                                        <div className="text-center text-xs text-muted-foreground italic w-full">
                                                            {msg.members && msg.members.length > 0 ? (
                                                                <>
                                                                    {msg.members[0].name} created the group.
                                                                </>
                                                            ) : (
                                                                msg.text
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm">{msg.text}</p>
                                                    )}
        
                                                    {msg.senderId !== "system" && (
                                                        <p className={cn("text-xs mt-1 text-right", msg.isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                                            {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Sending..."}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                })
                            )}
                            <div ref={bottomOfMessagesRef} />
                        </div>
                    </ScrollArea>
                    <div className="p-4 border-t">
                        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <Smile className="h-5 w-5" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 border-0">
                                    <EmojiPicker 
                                        onEmojiClick={(emojiObject) => setNewMessage(prev => prev + emojiObject.emoji)}
                                        theme={chatTheme.mode === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                                    />
                                </PopoverContent>
                            </Popover>
                            <Input 
                                placeholder="Type your message..." 
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="flex-1"
                            />
                            <Button type="submit">
                                <Send className="h-4 w-4" />
                                <span className="sr-only">Send</span>
                            </Button>
                        </form>
                    </div>
                </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                            {loadingConversations ? <Loader2 className="animate-spin"/> : <p className="text-muted-foreground">Select a conversation to start chatting.</p>}
                    </div>
                )}
            </Card>
        </div>
        
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="archived">
                <AccordionTrigger>
                    <div className="flex items-center gap-2 text-lg font-medium">
                        <Archive className="h-5 w-5" />
                        Archived Chats
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <Card>
                        <CardContent className="pt-4">
                            {archivedConversations.length > 0 ? (
                                <div className="space-y-2">
                                    {archivedConversations.map(convo => (
                                        <div key={convo.id} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary">
                                                <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={convo.avatar} />
                                                    <AvatarFallback>{convo.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-semibold text-left">{convo.name}</p>
                                                    <p className="text-xs text-muted-foreground text-left line-clamp-1">
                                                        {convo.lastMessage}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => toggleArchive(convo.id)}>
                                                    <ArchiveRestore className="mr-2 h-4 w-4" />
                                                    Unarchive
                                                </Button>
                                                <Button variant="destructive" size="sm" onClick={() => setConversationToDelete(convo)}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground py-8">No archived chats.</p>
                            )}
                        </CardContent>
                    </Card>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    </div>
    <Dialog open={!!conversationToDelete} onOpenChange={() => setConversationToDelete(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Delete Chat</DialogTitle>
                <DialogDescription>
                    Are you sure you want to permanently delete the chat "{conversationToDelete?.name}"? This action cannot be undone.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="outline" onClick={() => setConversationToDelete(null)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDeleteChat}>Delete</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
