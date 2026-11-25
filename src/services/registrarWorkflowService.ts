import { fetchCollection, saveDoc, updateDocById, deleteDocById } from './storage';
import { collection, getDocsFromServer, query, where } from 'firebase/firestore';
import { db } from './firebase';
import type { CredentialRequirement, RegistrarWorkflowRequest, SubjectOffering } from '../types';

export const getSubjectOfferings = () => fetchCollection<SubjectOffering>('subjectOfferings');
export const getWorkflowRequests = () => fetchCollection<RegistrarWorkflowRequest>('registrarRequests');
export const getCredentialRequirements = () => fetchCollection<CredentialRequirement>('credentialRequirements');
export async function getStudentWorkflowRequests(studentId: string) {
  if (!db) throw new Error('Firebase is unavailable.');
  const snapshot = await getDocsFromServer(query(collection(db, 'registrarRequests'), where('studentId', '==', studentId)));
  return snapshot.docs.map(item => ({...item.data(), id: item.id} as RegistrarWorkflowRequest));
}
export async function getStudentCredentialRequirements(studentId: string) {
  if (!db) throw new Error('Firebase is unavailable.');
  const snapshot = await getDocsFromServer(query(collection(db, 'credentialRequirements'), where('studentId', '==', studentId)));
  return snapshot.docs.map(item => ({...item.data(), id: item.id} as CredentialRequirement));
}

export async function saveOffering(data: SubjectOffering) { await saveDoc('subjectOfferings', data.id, data); return data; }
export async function updateOffering(id: string, updates: Partial<SubjectOffering>) { await updateDocById('subjectOfferings', id, {...updates, updatedAt: new Date().toISOString()}); }
export async function updateWorkflowRequest(id: string, updates: Partial<RegistrarWorkflowRequest>) {
  await updateDocById('registrarRequests', id, {...updates, updatedAt: new Date().toISOString()});
}
export async function deleteWorkflowRequest(id: string) {
  await deleteDocById('registrarRequests', id);
}
export async function updateCredentialRequirement(id: string, updates: Partial<CredentialRequirement>) {
  await updateDocById('credentialRequirements', id, {...updates, updatedAt: new Date().toISOString()});
}
export async function saveCredentialRequirement(data: CredentialRequirement) { await saveDoc('credentialRequirements', data.id, data); return data; }
