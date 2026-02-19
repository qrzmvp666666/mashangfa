import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AddToHomeScreenContextType {
  isVisible: boolean;
  showPrompt: () => void;
  hidePrompt: () => void;
  isInstallable: boolean;
  setInstallable: (installable: boolean) => void;
}

const AddToHomeScreenContext = createContext<AddToHomeScreenContextType | undefined>(undefined);

export const AddToHomeScreenProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isInstallable, setInstallable] = useState(false);

  const showPrompt = () => setIsVisible(true);
  const hidePrompt = () => setIsVisible(false);

  return (
    <AddToHomeScreenContext.Provider value={{ isVisible, showPrompt, hidePrompt, isInstallable, setInstallable }}>
      {children}
    </AddToHomeScreenContext.Provider>
  );
};

export const useAddToHomeScreen = () => {
  const context = useContext(AddToHomeScreenContext);
  if (!context) {
    throw new Error('useAddToHomeScreen must be used within an AddToHomeScreenProvider');
  }
  return context;
};
