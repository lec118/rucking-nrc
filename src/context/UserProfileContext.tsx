/**
 * 사용자 프로필 컨텍스트
 * - 체중, 나이, 최대심박수, 기본 배낭무게 관리
 * - localStorage에 저장/로드
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface UserProfile {
  bodyWeightKg: number;
  age: number;
  maxHR: number;
  defaultLoadKg: number;
}

const DEFAULT_PROFILE: UserProfile = {
  bodyWeightKg: 70,
  age: 30,
  maxHR: 180,
  defaultLoadKg: 10,
};

interface UserProfileContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const UserProfileContext = createContext<UserProfileContextType | null>(null);

interface UserProfileProviderProps {
  children: ReactNode;
}

export function UserProfileProvider({ children }: UserProfileProviderProps) {
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('userProfile');
      return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
    } catch (e) {
      console.error('Failed to load user profile:', e);
      return DEFAULT_PROFILE;
    }
  });

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      const updated = { ...prev, ...updates };
      try {
        localStorage.setItem('userProfile', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save user profile:', e);
      }
      return updated;
    });
  };

  return (
    <UserProfileContext.Provider value={{ profile, updateProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within UserProfileProvider');
  }
  return context;
};
