/**
 * Type definitions for authentication
 */

/**
 * Combined user data from database and auth provider
 */
export interface CombinedUserData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  fullName: string;
  isAdmin: boolean;
}