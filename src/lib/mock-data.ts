

import { PlaceHolderImages } from './placeholder-images'
import { type Announcement } from './announcement-data';
import { type ForumCategory, type Topic } from './forum-data';
import { type Post } from '@/components/post-card';


const getImage = (id: string) => PlaceHolderImages.find(img => img.id === id)

export const mockAnnouncements: Announcement[] = [
    {
      id: 'platform-emergency-1',
      subject: 'Platform-Wide Alert: Severe Weather Warning',
      message: 'A severe thunderstorm is expected to affect all areas this evening. Please take necessary precautions.',
      type: 'Emergency',
      status: 'Live',
      audience: 'All Users',
      sentBy: 'Platform Admin',
      scope: 'platform',
      createdAt: new Date(),
      scheduledDates: new Date().toLocaleDateString(),
    },
    {
      id: 'platform-emergency-2',
      subject: 'Critical Security Update Required',
      message: 'A critical security update has been released. Please log out and log back in to apply the update.',
      type: 'Emergency',
      status: 'Live',
      audience: 'All Users',
      sentBy: 'Platform Admin',
      scope: 'platform',
      createdAt: new Date(),
      scheduledDates: new Date().toLocaleDateString(),
    },
    {
      id: 'platform-emergency-3',
      subject: 'Service Disruption Notification',
      message: 'We are currently experiencing a platform-wide service disruption. Our teams are working to resolve the issue.',
      type: 'Emergency',
      status: 'Live',
      audience: 'All Users',
      sentBy: 'Platform Admin',
      scope: 'platform',
      createdAt: new Date(),
      scheduledDates: new Date().toLocaleDateString(),
    },
    {
      id: 'platform-standard-1',
      subject: 'New Feature: Community Forums!',
      message: 'We are excited to announce the launch of our new community forums. Start a discussion today!',
      type: 'Standard',
      status: 'Live',
      audience: 'All Users',
      sentBy: 'Platform Admin',
      scope: 'platform',
      createdAt: new Date(),
      scheduledDates: new Date().toLocaleDateString(),
    },
    {
      id: 'platform-standard-2',
      subject: 'Scheduled Maintenance this Sunday',
      message: 'The platform will be unavailable for 2 hours this Sunday for scheduled maintenance.',
      type: 'Standard',
      status: 'Scheduled',
      audience: 'All Users',
      sentBy: 'Platform Admin',
      scope: 'platform',
      createdAt: new Date(),
      scheduledDates: 'This Sunday',
    },
    {
      id: 'community-urgent-1',
      subject: 'Urgent: Road Closure on Main St',
      message: 'Main Street will be closed between 1st and 3rd Ave for emergency water main repairs.',
      type: 'Standard',
      severity: 'urgent',
      status: 'Live',
      audience: 'Sunset Valley',
      sentBy: 'Community Leader',
      scope: 'community',
      createdAt: new Date(),
      scheduledDates: new Date().toLocaleDateString(),
    },
     {
      id: 'community-standard-1',
      subject: 'Community BBQ This Saturday!',
      message: 'Join us for the annual community BBQ at Central Park from 12 PM to 4 PM. Food, games, and fun for everyone!',
      type: 'Standard',
      status: 'Live',
      audience: 'Sunset Valley',
      sentBy: 'Community Leader',
      scope: 'community',
      createdAt: new Date(),
      scheduledDates: new Date().toLocaleDateString(),
    },
];

export const mockNationalAdverts = [
  { id: 1, brand: 'Global Energy Inc.', tagline: 'Powering Your Tomorrow.', description: 'Discover our new renewable energy solutions for a sustainable future.', link: '#', image: getImage('partner1') },
  { id: 2, brand: 'Quantum Computers', tagline: 'The Future of Computing.', description: 'Experience unparalleled speed and performance with our next-gen processors.', link: '#', image: getImage('partner2') },
  { id: 3, brand: 'ConnectSphere', tagline: 'Bringing People Together.', description: 'The leading social platform for professionals. Join millions of users today.', link: '#', image: getImage('partner3') },
];

export const posts: Post[] = [
  {
    id: 1,
    author: 'Jane Doe',
    authorAvatar: getImage('avatar1')?.imageUrl,
    timestamp: '2h ago',
    content:
      "Just a reminder about the community cleanup this Saturday at 9 AM. We'll be meeting at the town square. Let's make our town shine!",
    image: getImage('postImage1')?.imageUrl,
    likes: 42,
    comments: 8,
    status: 'active',
  },
  {
    id: 2,
    author: 'John Smith',
    authorAvatar: getImage('avatar2')?.imageUrl,
    timestamp: '5h ago',
    content:
      "The farmer's market was amazing today! So many great local vendors. Highly recommend the fresh bread from 'The Daily Rise'.",
    image: getImage('postImage2')?.imageUrl,
    likes: 76,
    comments: 12,
    status: 'active',
  },
  {
    id: 3,
    author: 'Community Leader',
    authorAvatar: getImage('avatar3')?.imageUrl,
    timestamp: '1d ago',
    content:
      'Town hall meeting on Monday at 7 PM to discuss the new park proposal. Your input is valuable!',
    image: undefined,
    likes: 23,
    comments: 5,
    status: 'active',
  },
]

export const businesses = [
  {
    id: 2,
    businessName: 'Page Turners',
    businessCategory: 'bookstore',
    shortDescription: 'Get lost in a good book. A wide selection of new and used books.',
    logoImage: 'https://i.postimg.cc/13YpYf0d/page-turners.png',
    status: 'Approved',
    phone: '555-0102',
    googleMapsUrl: 'https://maps.google.com/?q=Page+Turners',
    openingHours: {
        monday: { open: '10:00', close: '18:00' }, tuesday: { open: '10:00', close: '18:00' }, wednesday: { open: '10:00', close: '18:00' }, thursday: { open: '10:00', close: '20:00' }, friday: { open: '10:00', close: '20:00' }, saturday: { open: '10:00', close: '20:00' }, sunday: { open: '12:00', close: '17:00' },
    }
  },
  { id: 9, businessName: 'The Art Corner', businessCategory: 'arts-crafts', shortDescription: 'Art supplies for all ages and skill levels.', logoImage: 'https://i.postimg.cc/J0PjMvQf/hardware-hub.png', status: 'Approved' },
  { id: 12, businessName: 'Pet Palace', businessCategory: 'pet-services', shortDescription: 'Grooming and supplies for your furry friends.', logoImage: 'https://i.postimg.cc/zX8Jg3yC/the-daily-grind.png', status: 'Approved' },
  { id: 13, businessName: 'The Gadget Spot', businessCategory: 'electronics', shortDescription: 'Latest tech and gadgets. Expert advice.', logoImage: 'https://i.postimg.cc/13YpYf0d/page-turners.png', status: 'Approved' },
  { id: 14, businessName: 'Chic Boutique', businessCategory: 'clothing', shortDescription: 'Curated fashion for the modern individual.', logoImage: 'https://i.postimg.cc/L6Z4Hq57/sweet-treats-bakery.png', status: 'Approved' },
  { id: 15, businessName: 'The Local Butcher', businessCategory: 'food', shortDescription: 'Locally sourced, high-quality meats.', logoImage: 'https://i.postimg.cc/mDcfGzF4/green-thumb-nursery.png', status: 'Approved' },
  { id: 16, businessName: 'Fit Hub', businessCategory: 'fitness', shortDescription: '24/7 gym with state-of-the-art equipment.', logoImage: 'https://i.postimg.cc/J0PjMvQf/hardware-hub.png', status: 'Approved' },
  { id: 18, businessName: "The Toy Chest", businessCategory: "toys-hobbies", shortDescription: "Classic toys and games for all ages.", logoImage: 'https://i.postimg.cc/WbQJ6V4W/wellness-studio.png', status: 'Approved' },
  { id: 20, businessName: "Fresh Blooms", businessCategory: "florist", shortDescription: "Beautiful bouquets for any occasion.", logoImage: 'https://i.postimg.cc/zX8Jg3yC/the-daily-grind.png', status: 'Approved' },
  { id: 21, businessName: "The Jewellery Box", businessCategory: "jewellery", shortDescription: "Handcrafted jewellery and repair services.", logoImage: 'https://i.postimg.cc/13YpYf0d/page-turners.png', status: 'Approved' },
  { id: 23, businessName: "Sole Mates", businessCategory: "shoe-store", shortDescription: "Stylish and comfortable footwear for the whole family.", logoImage: 'https://i.postimg.cc/mDcfGzF4/green-thumb-nursery.png', status: 'Approved' },
  { id: 25, businessName: "Cycle Works", businessCategory: "bike-shop", shortDescription: "Bicycle sales, repairs, and rentals.", logoImage: 'https://i.postimg.cc/3w9fVb8G/the-corner-bistro.png', status: 'Approved' },
  { id: 26, businessName: "The Vinyl Stop", businessCategory: "music-store", shortDescription: "New and vintage vinyl records.", logoImage: 'https://i.postimg.cc/WbQJ6V4W/wellness-studio.png', status: 'Approved' },
  { id: 27, businessName: "The Spice Merchant", businessCategory: "food", shortDescription: "Exotic spices, herbs, and teas from around the world.", logoImage: 'https://i.postimg.cc/k5L2sFpH/mikes-auto.png', status: 'Approved' },
  { id: 29, businessName: "The Optical View", businessCategory: "optician", shortDescription: "Eyewear and eye care specialists.", logoImage: 'https://i.postimg.cc/13YpYf0d/page-turners.png', status: 'Approved' },
  { id: 30, businessName: "Knot & Grain", businessCategory: "furniture", shortDescription: "Handcrafted wooden furniture.", logoImage: 'https://i.postimg.cc/L6Z4Hq57/sweet-treats-bakery.png', status: 'Approved' },
  { id: 31, businessName: "The Computer Cellar", businessCategory: "electronics", shortDescription: "PC and Mac repairs and sales.", logoImage: 'https://i.postimg.cc/mDcfGzF4/green-thumb-nursery.png', status: 'Approved' },
  { id: 32, businessName: "Glow Up", businessCategory: "beauty-salon", shortDescription: "Full-service beauty and nail salon.", logoImage: 'https://i.postimg.cc/J0PjMvQf/hardware-hub.png', status: 'Approved' },
  { id: 33, businessName: "The Fish Monger", businessCategory: "food", shortDescription: "Fresh, sustainably sourced seafood daily.", logoImage: 'https://i.postimg.cc/3w9fVb8G/the-corner-bistro.png', status: 'Approved' },
  { id: 40, businessName: "Ink & Quill", businessCategory: "stationery", shortDescription: "Fine pens, paper, and office supplies.", logoImage: 'https://i.postimg.cc/J0PjMvQf/hardware-hub.png', status: 'Approved' },
  { id: 41, businessName: "Vogue Apparel", businessCategory: "clothing", shortDescription: "Latest trends in men's and women's fashion.", logoImage: 'https://i.postimg.cc/6p6ZpC7M/vogue-apparel.png', status: 'Approved' },
  { id: 42, businessName: "Little Sprouts", businessCategory: "clothing", shortDescription: "Adorable and durable clothing for kids.", logoImage: 'https://i.postimg.cc/d1c3qQ5q/little-sprouts.png', status: 'Approved' },
  { id: 43, businessName: "Gemstone Gems", businessCategory: "jewellery", shortDescription: "Exquisite, handcrafted gemstone jewelry.", logoImage: 'https://i.postimg.cc/JnZkC5R9/gemstone-gems.png', status: 'Approved' },
  { id: 44, businessName: "Timepieces & Co.", businessCategory: "jewellery", shortDescription: "Luxury watches and expert repair services.", logoImage: 'https://i.postimg.cc/T3jRzQ2C/timepieces-co.png', status: 'Approved' },
  { id: 45, businessName: "Tech Forward", businessCategory: "electronics", shortDescription: "Your one-stop shop for all consumer electronics.", logoImage: 'https://i.postimg.cc/PqYgXj5Y/tech-forward.png', status: 'Approved' },
  { id: 46, businessName: "Gamer's Galaxy", businessCategory: "electronics", shortDescription: "Video games, consoles, and accessories.", logoImage: 'https://i.postimg.cc/NfvS8VqS/gamer-galaxy.png', status: 'Approved' },
  { id: 47, businessName: "Toyland Adventures", businessCategory: "toys-hobbies", shortDescription: "A world of fun for kids of all ages.", logoImage: 'https://i.postimg.cc/W3dK7D3K/toyland-adventures.png', status: 'Approved' },
  { id: 48, businessName: "Model Crafters", businessCategory: "toys-hobbies", shortDescription: "Kits and supplies for hobbyist model builders.", logoImage: 'https://i.postimg.cc/mZ3yZz5k/model-crafters.png', status: 'Approved' },
  { id: 49, businessName: "The Cheese Board", businessCategory: "food", shortDescription: "A curated selection of fine cheeses and accompaniments.", logoImage: 'https://i.postimg.cc/9QW8gS9h/cheese-board.png', status: 'Approved' },
  { id: 50, businessName: "The Green Grocer", businessCategory: "food", shortDescription: "Fresh, organic, and locally sourced produce.", logoImage: 'https://i.postimg.cc/HkqYkP7y/green-grocer.png', status: 'Approved' },
  { id: 51, businessName: 'Outdoor Gear Exchange', businessCategory: 'outdoors', shortDescription: 'Gear for hiking, camping, and climbing.', logoImage: 'https://i.postimg.cc/6pQkXj8B/outdoor-gear.png', status: 'Approved' },
  { id: 52, businessName: 'The Lens Cap', businessCategory: 'photography', shortDescription: 'Cameras, lenses, and photo printing services.', logoImage: 'https://i.postimg.cc/W4ZzVjFj/lens-cap.png', status: 'Approved' },
  { id: 53, businessName: 'The Daily Grind', businessCategory: 'food', shortDescription: 'Artisanal coffee, pastries, and light lunches.', logoImage: 'https://i.postimg.cc/zX8Jg3yC/the-daily-grind.png', status: 'Approved' },
  { id: 54, businessName: 'The Corner Bistro', businessCategory: 'food', shortDescription: 'Cozy spot for European-inspired dishes.', logoImage: 'https://i.postimg.cc/3w9fVb8G/the-corner-bistro.png', status: 'Approved' },
  { id: 55, businessName: "Mike's Auto Repair", businessCategory: 'automotive', shortDescription: 'Reliable repairs and maintenance for all vehicles.', logoImage: 'https://i.postimg.cc/k5L2sFpH/mikes-auto.png', status: 'Approved' },
  { id: 56, businessName: 'Wellness Studio', businessCategory: 'health-fitness', shortDescription: 'Yoga, pilates, and meditation classes.', logoImage: 'https://i.postimg.cc/WbQJ6V4W/wellness-studio.png', status: 'Approved' },
  { id: 57, businessName: 'Uptown Threads', businessCategory: 'clothing', shortDescription: 'Vintage and consignment fashion finds.', logoImage: 'https://i.postimg.cc/L8PZ4sYF/uptown-threads.png', status: 'Approved' },
  { id: 58, businessName: 'Silver & Gold', businessCategory: 'jewellery', shortDescription: 'Custom engagement rings and fine jewelry.', logoImage: 'https://i.postimg.cc/sXyN6BwL/silver-gold.png', status: 'Approved' },
  { id: 59, businessName: 'Sound Advice', businessCategory: 'electronics', shortDescription: 'High-fidelity audio equipment and home theaters.', logoImage: 'https://i.postimg.cc/pT5D5t0M/sound-advice.png', status: 'Approved' },
  { id: 60, businessName: 'Playtime Emporium', businessCategory: 'toys-hobbies', shortDescription: 'Educational toys and board games.', logoImage: 'https://i.postimg.cc/Hk7GjK2K/playtime-emporium.png', status: 'Approved' },
  { id: 61, businessName: 'The Olive Branch', businessCategory: 'food', shortDescription: 'Artisanal olive oils and imported goods.', logoImage: 'https://i.postimg.cc/YSG8S3p3/olive-branch.png', status: 'Approved' },
  { id: 62, businessName: 'The Board Room', businessCategory: 'toys-hobbies', shortDescription: 'Board game cafe with a large library of games.', logoImage: 'https://i.postimg.cc/J4BqY2N7/board-room.png', status: 'Approved' },
  { id: 63, businessName: 'Future Threads', businessCategory: 'clothing', shortDescription: 'Sustainable and ethically made apparel.', logoImage: 'https://i.postimg.cc/fygcM1gR/future-threads.png', status: 'Approved' },
  { id: 64, businessName: 'The Sparkling Gem', businessCategory: 'jewellery', shortDescription: 'Affordable and stylish fashion jewellery.', logoImage: 'https://i.postimg.cc/L8y2w0Sj/sparkling-gem.png', status: 'Approved' },
  { id: 65, businessName: 'Mobile Solutions', businessCategory: 'electronics', shortDescription: 'Phone repairs and accessories.', logoImage: 'https://i.postimg.cc/mk0T2vYx/mobile-solutions.png', status: 'Approved' },
  { id: 66, businessName: 'Puzzle Palace', businessCategory: 'toys-hobbies', shortDescription: 'Jigsaw puzzles for all ages and skill levels.', logoImage: 'https://i.postimg.cc/j5G4K6G1/puzzle-palace.png', status: 'Approved' },
  { id: 67, businessName: 'Butcher Block', businessCategory: 'food', shortDescription: 'Artisan butcher with local and exotic meats.', logoImage: 'https://i.postimg.cc/NfK7H3G3/butcher-block.png', status: 'Approved' }
];

export const mockCharities = [
  { id: 1, title: 'Anytown Food Bank', category: 'Community Support', description: 'Providing essential food supplies to families in need across the community.', image: getImage('charity1') },
  { id: 2, title: 'Paws & Claws Rescue', category: 'Animal Welfare', description: 'A non-profit dedicated to rescuing, rehabilitating, and rehoming stray and abandoned pets.', image: getImage('charity2') },
  { id: 3, title: 'Green Anytown Initiative', category: 'Environment', description: 'Focused on creating and maintaining green spaces, community gardens, and promoting sustainability.', image: getImage('charity3') },
  { id: 4, title: 'Anytown Youth Sports League', category: 'Youth Development', description: 'Offering free sports programs and coaching for children and teenagers in the community.', image: getImage('charity4') },
];

export const mockEnterpriseGroups = [
  { id: 1, name: 'National Housing Association', description: 'Providing quality housing solutions across the country.', logo: getImage('partner1') },
  { id: 2, name: 'Countrywide Logistics', description: 'Your partner in national supply chain management.', logo: getImage('partner2') },
  { id: 3, name: 'UK Health Trust', description: 'Promoting wellness in communities nationwide.', logo: getImage('partner3') },
];

export const lostItems = [
    {
        id: 1,
        name: "Set of Keys",
        description: "Lost a set of keys with a blue lanyard and a small car-shaped keychain. Probably lost near the central park.",
        location: "Central Park",
        timestamp: "2 days ago",
        image: getImage('lostItem1'),
        author: "Mark Johnson",
        authorAvatar: getImage('avatar4'),
    }
]

export const foundItems = [
    {
        id: 1,
        name: "Brown Wallet",
        description: "Found a brown leather wallet near the bus stop on 5th street. Contains credit cards and an ID for 'Sarah K.'",
        location: "5th Street Bus Stop",
        timestamp: "1 day ago",
        image: getImage('foundItem1'),
        author: "Emily White",
        authorAvatar: getImage('avatar1'),
    }
]

export const mockEvents = [
  { 
    id: 1, 
    title: 'Community Cleanup', 
    startDate: new Date(), 
    endDate: new Date(),
    description: 'Meet at the town square.', 
    image: getImage('eventImage1'), 
    category: 'Community' 
  },
  { 
    id: 2, 
    title: 'Farmers Market', 
    startDate: new Date(new Date().setDate(new Date().getDate() + 1)), 
    endDate: new Date(new Date().setDate(new Date().getDate() + 1)),
    description: 'Fresh local produce.', 
    image: getImage('eventImage2'), 
    category: 'Shopping' 
  },
  { 
    id: 3, 
    title: 'Town Hall Meeting', 
    startDate: new Date(new Date().setDate(new Date().getDate() + 2)), 
    endDate: new Date(new Date().setDate(new Date().getDate() + 2)),
    description: 'Discussing new park proposal.', 
    image: getImage('eventImage3'), 
    category: 'Civic' 
  },
];

export const mockWhatsOn = [
  { id: '1', title: 'Live Music Night', location: 'The Daily Grind', time: 'Fri, 8 PM', image: getImage('whatsonImage1'), category: 'Music', description: 'Live acoustic music every Friday.' },
  { id: '2', title: 'Open Mic Comedy', location: 'The Town Tavern', time: 'Sat, 9 PM', image: getImage('whatsonImage2'), category: 'Entertainment', description: 'Sign up and show us your talent.' },
  { id: '3', title: 'Kids Story Time', location: 'Anytown Library', time: 'Sat, 10 AM', image: getImage('whatsonImage3'), category: 'Family', description: 'Fun stories for all ages.' },
];

export const mockProducts = [
    { id: '1', name: 'Handmade Mug', price: '£12.00', originalPrice: '£15.00', image: getImage('product1'), audience: ['adults'] },
    { id: '2', name: 'Knitted Scarf', price: '£25.00', image: getImage('product2'), audience: ['adults', 'children'] },
    { id: '3', name: 'Local Honey', price: '£7.00', originalPrice: '£8.50', image: getImage('product3'), audience: ['adults', 'children'] },
    { id: '4', name: 'Potted Succulent', price: '£12.00', image: getImage('product4'), audience: ['adults'] },
    { id: '5', name: 'Landmark Print', price: '£25.00', originalPrice: '£30.00', image: getImage('product5'), audience: ['adults'] },
    { id: '6', name: 'Handmade Soap', price: '£6.00', image: getImage('product6'), audience: ['adults'] },
    { id: '7', name: 'Scented Candle', price: '£18.00', image: getImage('product1'), audience: ['adults'] },
    { id: '8', name: 'Tote Bag', price: '£14.00', image: getImage('product2'), audience: ['adults', 'children'] },
    { id: '9', name: 'Beeswax Wraps', price: '£10.00', image: getImage('product3'), audience: ['adults', 'children'] },
    { id: '10', name: 'Wooden Coasters', price: '£20.00', image: getImage('product4'), audience: ['adults'] },
    { id: '11', name: 'Artisan Chocolate', price: '£7.50', image: getImage('product5'), audience: ['adults', 'children'] },
    { id: '12', name: 'Gourmet Coffee Beans', price: '£12.50', image: getImage('product6'), audience: ['adults'] },
    { id: '13', name: 'Gourmet Dog Treats', price: '£9.99', image: getImage('product13'), audience: ['adults'] },
    { id: '14', name: 'Leather Wallet', price: '£45.00', image: getImage('product14'), audience: ['adults'] },
    { id: '15', name: 'Beard Oil', price: '£14.50', image: getImage('product15'), audience: ['adults'] },
    { id: '16', name: 'Enamel Pin', price: '£7.00', image: getImage('product16'), audience: ['adults', 'children'] },
    { id: '17', name: 'Gourmet Popcorn', price: '£5.50', image: getImage('product17'), audience: ['adults', 'children'] },
    { id: '18', name: 'Hot Sauce', price: '£8.00', image: getImage('product18'), audience: ['adults'] },
    { id: '19', name: 'Wall Art Poster', price: '£22.00', image: getImage('product19'), audience: ['adults'] },
    { id: '20', name: 'Tie-Dye T-Shirt', price: '£28.00', image: getImage('product20'), audience: ['adults', 'children'] },
    { id: '21', name: 'Reusable Water Bottle', price: '£16.00', image: getImage('product21'), audience: ['adults', 'children'] },
    { id: '22', name: 'Yoga Mat', price: '£35.00', image: getImage('product22'), audience: ['adults'] },
    { id: '23', name: 'Jigsaw Puzzle', price: '£19.99', image: getImage('product23'), audience: ['adults', 'children'] },
    { id: '24', name: 'Vinyl Record', price: '£24.00', image: getImage('product24'), audience: ['adults'] },
    { id: '25', name: 'Fountain Pen', price: '£55.00', image: getImage('product25'), audience: ['adults'] },
    { id: '26', name: 'Desk Plant', price: '£15.00', image: getImage('product26'), audience: ['adults'] },
    { id: '27', name: 'Silk Eye Mask', price: '£21.00', image: getImage('product27'), audience: ['adults'] },
    { id: '28', name: 'French Press', price: '£32.00', image: getImage('product28'), audience: ['adults'] },
    { id: '29', name: 'Espresso Cups', price: '£18.00', image: getImage('product29'), audience: ['adults'] },
    { id: '30', name: 'Cocktail Shaker Set', price: '£40.00', image: getImage('product30'), audience: ['adults'] },
    { id: '31', name: 'Chess Set', price: '£60.00', image: getImage('product31'), audience: ['adults', 'children'] },
    { id: '32', name: 'Wireless Charger', price: '£25.00', image: getImage('product32'), audience: ['adults'] },
    { id: '33', name: 'Laptop Sleeve', price: '£22.50', image: getImage('product33'), audience: ['adults'] },
    { id: '34', name: 'Sunglasses', price: '£75.00', image: getImage('product34'), audience: ['adults'] },
    { id: '35', name: 'Duffel Bag', price: '£85.00', image: getImage('product35'), audience: ['adults'] },
    { id: '36', name: 'Electric Kettle', price: '£48.00', image: getImage('product36'), audience: ['adults'] },
    { id: '37', name: 'Stylish Backpack', price: '£50.00', image: getImage('product37'), audience: ['adults', 'children'] },
    { id: '38', name: 'Bluetooth Speaker', price: '£45.00', image: getImage('product38'), audience: ['adults', 'children'] },
    { id: '39', name: 'Gourmet Olive Oil', price: '£18.00', image: getImage('product39'), audience: ['adults'] },
    { id: '40', name: 'Drones for Beginners', price: '£120.00', image: getImage('product40'), audience: ['adults'] },
    { id: '41', name: 'Smart Watch', price: '£150.00', image: getImage('product41'), audience: ['adults'] },
    { id: '42', name: 'Scented Diffuser', price: '£22.00', image: getImage('product42'), audience: ['adults'] },
    { id: '43', name: 'Wool Blanket', price: '£80.00', image: getImage('product43'), audience: ['adults'] },
    { id: '44', name: 'Stainless Steel Pans', price: '£110.00', image: getImage('product44'), audience: ['adults'] },
    { id: '45', name: 'Cordless Drill', price: '£95.00', image: getImage('product45'), audience: ['adults'] },
    { id: '46', name: 'Hardcover Notebook', price: '£12.00', image: getImage('product46'), audience: ['adults', 'children'] },
    { id: '47', name: 'Watercolour Paint Set', price: '£30.00', image: getImage('product47'), audience: ['adults', 'children'] },
    { id: '48', name: 'Dumbbell Set', price: '£50.00', image: getImage('product48'), audience: ['adults'] }
];

export const mockCommunityAdverts = [
    { id: 1, title: '2-for-1 Pizza', business: 'Pizza Palace', image: getImage('advert1') },
    { id: 2, title: 'Fresh Blooms', business: 'The Flower Shop', image: getImage('advert2') },
    { id: 3, title: 'Morning Coffee Deal', business: 'The Daily Grind', image: getImage('advert3') },
    { id: 4, title: 'Handmade Jewellery', business: 'The Craft Corner', image: getImage('advert1') },
    { id: 5, title: 'Book Sale', business: 'Page Turners', image: getImage('advert2') },
];

export const mockNews = [
    { id: '1', title: 'Local Library Expands Hours', author: 'Anna G.', category: 'Community', date: '2024-05-10', image: getImage('postImage1') },
    { id: '2', title: 'High School Football Team Wins Championship', author: 'Tom B.', category: 'Sports', date: '2024-05-09', image: getImage('postImage2') },
    { id: '3', title: 'Roadwork on Main Street to Begin Next Week', author: 'Community Leader', category: 'Council Updates', date: '2024-05-08', image: getImage('eventImage3') },
];


export type Business = typeof businesses[0]
export type LostItem = typeof lostItems[0]
export type FoundItem = typeof foundItems[0]


export const mockFaqs = [
  { id: 1, question: "What are the community center opening hours?", answer: "The community center is open from 9 AM to 9 PM, Monday to Saturday, and 10 AM to 4 PM on Sundays.", showOnHomepage: true },
  { id: 2, question: "How do I report a problem with a public service?", answer: "You can report issues such as potholes or broken streetlights through the 'Report an Issue' link in your user menu.", showOnHomepage: true },
  { id: 3, question: "Where can I find information about local council meetings?", answer: "All council meeting minutes and upcoming schedules are posted in the 'Council Updates' section of the News page.", showOnHomepage: true },
  { id: 4, question: "How can I volunteer for community events?", answer: "Thank you for your interest! Please visit the Local Charities page to see which organizations are currently looking for volunteers.", showOnHomepage: false },
  { id: 5, question: "Is there a lost and found for the community?", answer: "Yes, you can post lost or found items in the 'Lost & Found' section of the app. Please provide as much detail as possible.", showOnHomepage: true },
];

export const mockGuestbookEntries = [
  { id: 1, author: "A visiting family", comment: "We had a wonderful time visiting your beautiful town! The parks are lovely and everyone was so friendly.", timestamp: "2 days ago" },
  { id: 2, author: "John S.", comment: "Lived here my whole life and I'm so glad to see this platform bring us all together. Great initiative!", timestamp: "1 day ago" },
  { id: 3, author: "The Millers", comment: "Just moved to the area and this app has been a fantastic resource for discovering local gems. Thank you!", timestamp: "8 hours ago" },
];


export const mockJobs = [
    { id: 1, title: 'Barista', company: 'The Daily Grind', type: 'Part-time' },
    { id: 2, title: 'Sales Assistant', company: 'Chic Boutique', type: 'Full-time' },
    { id: 3, title: 'Mechanic', company: "Mike's Auto Repair", type: 'Full-time' },
];

export const mockJobSeekers = [
    { id: 1, name: 'Alice Johnson', summary: 'Experienced retail manager looking for new opportunities.' },
    { id: 2, name: 'Ben Carter', summary: 'Graphic designer with a passion for branding and digital media.' },
    { id: 3, name: 'Chloe Davis', summary: 'Certified yoga instructor and wellness coach.' },
];

export const mockPartners = [
  { id: 1, name: 'National Trust', logo: getImage('partner1') },
  { id: 2, name: 'TechCorp', logo: getImage('partner2') },
  { id: 3, name: 'Green Earth Initiative', logo: getImage('partner3') },
  { id: 4, name: 'Arts Council', logo: getImage('partner1') },
  { id: 5, name: 'Health & Wellbeing Board', logo: getImage('partner2') },
  { id: 6, name: 'Regional Transport', logo: getImage('partner3') },
  { id: 7, name: 'National Parks Foundation', logo: getImage('partner1') },
  { id: 8, name: 'Future Coders Academy', logo: getImage('partner2') },
];

// Add originalPrice to some products to simulate offers
mockProducts[0].originalPrice = '£15.00';
mockProducts[0].price = '£12.00';
mockProducts[2].originalPrice = '£8.50';
mockProducts[2].price = '£7.00';
mockProducts[4].originalPrice = '£30.00';
mockProducts[4].price = '£25.00';
