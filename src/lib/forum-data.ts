
export type ForumCategory = {
  id: string;
  name: string;
  description: string;
  topics: number;
  posts: number;
  communityId: string;
};

export type Topic = {
    id: string;
    title: string;
    authorId: string;
    authorName: string;
    authorAvatar: string;
    replies: number;
    lastPost: string; // This could be a timestamp string
    categoryId: string;
    createdAt: any;
};
