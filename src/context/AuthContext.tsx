import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { getRegistrarSetupStatus } from '../services/accountApi';
import { loginWithCredentials, logoutUser, updateOwnPassword, verifiedProfile } from '../services/authService';
import type { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  hasRegistrar: boolean;
  login: (identifier: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  changePassword: (current: string, next: string, confirmation: string) => Promise<UserProfile>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(auth && db));
  const [setupLoading, setSetupLoading] = useState(Boolean(auth && db));
  const [hasRegistrar, setHasRegistrar] = useState(true);

  useEffect(() => {
    if (!auth || !db) return;
    const firestore = db;
    let mounted = true;
    let stopProfile = () => {};
    let sessionVersion = 0;
    const setupTimeout = setTimeout(() => { if (mounted) setSetupLoading(false); }, 4000);
    void getRegistrarSetupStatus()
      .then(result => { if (mounted) setHasRegistrar(result.configured); })
      .catch(() => {})
      .finally(() => {
        clearTimeout(setupTimeout);
        if (mounted) setSetupLoading(false);
      });

    const stopAuth = onAuthStateChanged(auth, session => {
      stopProfile();
      const version = ++sessionVersion;
      setUser(previous => previous?.uid === session?.uid ? previous : null);
      if (!session) {
        setLoading(false);
        return;
      }
      setLoading(true);
      let newestSnapshot = 0;
      let receivedServerSnapshot = false;
      const profileTimeout = setTimeout(() => {
        if (!receivedServerSnapshot && version === sessionVersion) {
          setUser(null);
          setLoading(false);
        }
      }, 8000);
      const unsubscribe = onSnapshot(doc(firestore, 'users', session.uid), {includeMetadataChanges: true},
        snapshot => {
          if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
          receivedServerSnapshot = true;
          clearTimeout(profileTimeout);
          const revision = ++newestSnapshot;
          const finish = (profile: UserProfile | null) => {
            if (version === sessionVersion && revision === newestSnapshot) {
              setUser(profile);
              setLoading(false);
            }
          };
          if (!snapshot.exists()) finish(null);
          else void verifiedProfile(session, snapshot.data() as UserProfile).then(finish, () => finish(null));
        }, () => {
          clearTimeout(profileTimeout);
          if (version === sessionVersion) {
            setUser(null);
            setLoading(false);
          }
        });
      stopProfile = () => { clearTimeout(profileTimeout); unsubscribe(); };
    });
    return () => {
      mounted = false;
      sessionVersion += 1;
      clearTimeout(setupTimeout);
      stopAuth();
      stopProfile();
    };
  }, []);

  const login = async (identifier: string, password: string) => {
    const profile = await loginWithCredentials(identifier, password);
    setHasRegistrar(true);
    setUser(profile);
    setLoading(false);
    return profile;
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  const changePassword = async (current: string, next: string, confirm: string) => {
    const profile = await updateOwnPassword(current, next, confirm);
    setUser(profile);
    setLoading(false);
    return profile;
  };

  return (
    <AuthContext.Provider value={{user, loading: loading || (!user && setupLoading), hasRegistrar, login, logout, changePassword}}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
