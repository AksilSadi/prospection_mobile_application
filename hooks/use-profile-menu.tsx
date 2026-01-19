import { createContext, useContext, useMemo, useState } from "react";

type ProfileMenuContextValue = {
  isVisible: boolean;
  open: () => void;
  close: () => void;
};

const ProfileMenuContext = createContext<ProfileMenuContextValue | undefined>(undefined);

export function ProfileMenuProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);

  const value = useMemo(
    () => ({
      isVisible,
      open: () => setIsVisible(true),
      close: () => setIsVisible(false),
    }),
    [isVisible]
  );

  return <ProfileMenuContext.Provider value={value}>{children}</ProfileMenuContext.Provider>;
}

export function useProfileMenu() {
  const context = useContext(ProfileMenuContext);
  if (!context) {
    throw new Error("useProfileMenu must be used within ProfileMenuProvider");
  }
  return context;
}
