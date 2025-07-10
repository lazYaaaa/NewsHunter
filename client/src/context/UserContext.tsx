// userContext.tsx
import React, { createContext, useState, type ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface UserContextType {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setAuthenticated: (auth: boolean) => void;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setAuthenticated] = useState(false);

  return (
    <UserContext.Provider value={{ user, isAuthenticated, setUser, setAuthenticated }}>
      {children}
    </UserContext.Provider>
  );
};