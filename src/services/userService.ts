import { UserProfile } from '../types';
import { fetchCollection, fetchDocById } from './storage';
import { createStaffAccount, updateAccountProfile, type StaffInput } from './accountApi';

export async function getAllUsers(): Promise<UserProfile[]> {
  return fetchCollection<UserProfile>('users');
}

export async function getUserById(uid: string): Promise<UserProfile | null> {
  return fetchDocById<UserProfile>('users', uid);
}

export function createUser(data: StaffInput) {
  return createStaffAccount(data);
}

export async function updateUser(uid: string, updates: Partial<UserProfile>): Promise<void> {
  await updateAccountProfile(uid, updates);
}

export async function toggleUserStatus(uid: string, currentStatus: UserProfile['status']) {
  const status = currentStatus === 'active' ? 'deactivated' : 'active';
  return (await updateAccountProfile(uid, {status})).status;
}
