// storesContext.js
import { createContext } from "react";

const Web3StoreContext = createContext(null);
const SideBarStoreContext = createContext(null);
const SideMenuStoreContext = createContext(null);
const HeaderStoreContext = createContext(null);

export {
  Web3StoreContext,
  SideMenuStoreContext,
  SideBarStoreContext,
  HeaderStoreContext,
};
