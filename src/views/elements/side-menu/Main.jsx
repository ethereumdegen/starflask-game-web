import { useState, useEffect, useContext } from "react";

import { useCallbackState, helper as $h } from "@/utils";
import { Link,  useNavigate } from "react-router-dom";
 
import classnames from "classnames";
import { observer } from "mobx-react";

 
import FrontendConfig from '@/config/frontend-config' 
import DashboardConfig from '@/config/dashboard-config'

import {
   Web3StoreContext,
   
    SideMenuStoreContext,
     HeaderStoreContext } from '@/stores/stores-context';
 

import DashboardLogo from "@/views/components/dashboard/DashboardLogo"

import NavItem from "@/views/components/dashboard/RecursiveNavItem"


function SideMenu( {     }) {
  const sideMenuStore =  useContext(SideMenuStoreContext);  
 

  const web3Store =  useContext(   Web3StoreContext  ) ; 
    

 

  const dashboardMenuItems = DashboardConfig?.dashboardMenu

 const navigate = useNavigate()

 





  return (
    

    <nav
        className={classnames({
          "side-nav": true,  
          
          "xl:block":true
          
        })}

        style={{
         
          zIndex:"55",
          minWidth:"300px" 
        }}
      >  


        <div className="pt-4 mb-4">
          <div className="side-nav__header flex items-center">
            
            <DashboardLogo 
            
            /> 
           
            
            
          </div>
        </div>
        <div className="scrollable">
          <ul className="scrollable__content">



         
            {dashboardMenuItems.map((item, index) => (
              <NavItem key={index} item={item} />
            ))}
           



            {/* END: First Child */}
          </ul>
        </div>
      </nav>


       

  );
}
 

export default observer(SideMenu);
