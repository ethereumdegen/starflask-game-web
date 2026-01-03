 
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
 

import { Web3SidebarStore } from "@/stores/web3-side-bar.js";
import { Web3Store } from "@/stores/web3-store-mobx.js";

import { SideMenuStore } from "@/stores/side-menu-mobx.js";
import { HeaderStore } from "@/stores/header-store-mobx.js";

import {
  Web3StoreContext,
  SideBarStoreContext,
  SideMenuStoreContext,
  HeaderStoreContext,
} from "@/stores/stores-context";

const sideMenuStore = new SideMenuStore();
const sidebarStore = new Web3SidebarStore();
const web3Store = new Web3Store();
const headerStore = new HeaderStore();

function Main() {
  return (
    <div className=" ">
      <Web3StoreContext.Provider value={web3Store}>
        <SideMenuStoreContext.Provider value={sideMenuStore}>
          <SideBarStoreContext.Provider value={sidebarStore}>
            <HeaderStoreContext.Provider value={headerStore}>
              <Outlet />
            </HeaderStoreContext.Provider>
          </SideBarStoreContext.Provider>
        </SideMenuStoreContext.Provider>
      </Web3StoreContext.Provider>
    </div>
  );
}

export default Main;
