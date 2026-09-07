
export type NotificationType = 
  | "Event Request" 
  | "Business Submission" 
  | "General Inquiry" 
  | "News Story Submission" 
  | "Partnership Request" 
  | "New Message" 
  | "New Report" 
  | "Leadership Invitation" 
  | "Special Access Request" 
  | "Leader Information Update" 
  | "Boundary Dispute" 
  | "Leadership Application" 
  | "Advertiser Profile"
  | "New Community"
  | "Lost & Found Report"
  | "Advert Approval Request"
  | "Charity Application"
  | "Account Update"
  | "Platform Announcement"
  | "Community Announcement"
  | "Task Assignment";

export type NotificationStatus = 'New' | 'Read' | 'Archived' | 'Actioned' | 'Assigned' | 'Complete' | 'Reassigned';

export type Notification = {
  id: string;
  type: NotificationType;
  subject: string;
  from: string;
  date: string;
  status: NotificationStatus;
  recipientId: string;
  relatedId?: string;
  details?: {
    reportingCommunityId?: string;
    overlappingCommunityId?: string;
    communityId?: string;
    communityName?: string;
    message?: string;
  };
  assignedTo?: {
    id: string;
    name: string;
  };
  history?: {
    action: string;
    actor: string;
    timestamp: any;
  }[];
};
