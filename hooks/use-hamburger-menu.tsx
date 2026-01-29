import { createContext, useContext, useMemo, useState } from "react";

type HamburgerMenuContextValue = {
  isVisible: boolean;
  open: () => void;
  close: () => void;
};

const HamburgerMenuContext = createContext<HamburgerMenuContextValue | undefined>(undefined);

export function HamburgerMenuProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);

  const value = useMemo(
    () => ({
      isVisible,
      open: () => setIsVisible(true),
      close: () => setIsVisible(false),
    }),
    [isVisible]
  );

  return <HamburgerMenuContext.Provider value={value}>{children}</HamburgerMenuContext.Provider>;
}

export function useHamburgerMenu() {
  const context = useContext(HamburgerMenuContext);
  if (!context) {
    throw new Error("useHamburgerMenu must be used within HamburgerMenuProvider");
  }
  return context;
}
