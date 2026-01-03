import { Transition } from "react-transition-group";
import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useCallbackState, helper as $h } from "@/utils";
    
import Web3Sidebar from "@/views/elements/web3-sidebar/Main.jsx";
 

import Header from '../views/elements/Header';
import Footer from '../views/elements/Footer';
import HeaderSidebar from '@/views/elements/header-sidebar/Main.jsx'
 

function Main() {
  const navigate = useNavigate();
  const location = useLocation();
  
 
 

  return (
    <div className="bg-white">
         {/*  Site header */}
         <Header
           mode="docs"
          
         />

        <div   className="xl:hidden" >
          <HeaderSidebar
            mode="docs"
        
         />
          </div>

         <Web3Sidebar 
         
           slot={<div> </div>} 
         
         /> 
  
            
          <Outlet 
           
            />

 

      {/*  Site footer */}
      <Footer />
    </div>
  );
}

export default Main;
