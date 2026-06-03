import { createContext, useContext } from 'react';

type AppReadyContextValue = {
  onBathroomsReady: () => void;
};

export const AppReadyContext = createContext<AppReadyContextValue>({
  onBathroomsReady: () => {},
});

export const useAppReady = () => useContext(AppReadyContext);
