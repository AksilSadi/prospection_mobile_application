import type BottomSheet from "@gorhom/bottom-sheet";
import { createContext, useContext, useRef } from "react";

type ProfileSheetContextValue = {
  sheetRef: React.RefObject<BottomSheet>;
  open: () => void;
  close: () => void;
};

const ProfileSheetContext = createContext<ProfileSheetContextValue | undefined>(undefined);

export function ProfileSheetProvider({ children }: { children: React.ReactNode }) {
  const sheetRef = useRef<BottomSheet>(null);

  const open = () => {
    sheetRef.current?.snapToIndex(0);
  };

  const close = () => {
    sheetRef.current?.close();
  };

  return (
    <ProfileSheetContext.Provider value={{ sheetRef, open, close }}>
      {children}
    </ProfileSheetContext.Provider>
  );
}

export function useProfileSheet() {
  const context = useContext(ProfileSheetContext);
  if (!context) {
    throw new Error("useProfileSheet must be used within ProfileSheetProvider");
  }
  return context;
}
