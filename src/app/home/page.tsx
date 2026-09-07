'use client';

import SignInPage from '../page';

/**
 * Entry Point Resolver for /home
 * This page simply re-uses the secure sign-in logic from the root.
 * This ensures that if the main application redirects administrators 
 * to /home, they reach the correct secure portal without a 404.
 */
export default function HomePageResolver() {
  return <SignInPage />;
}
