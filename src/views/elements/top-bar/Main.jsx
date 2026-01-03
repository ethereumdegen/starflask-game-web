import { useState, useRef } from "react";
import {
  Lucide,
   
} from "@/views/base-components";

 
 
import dom from "@left4code/tw-starter/dist/js/dom";
import * as $_ from "lodash";
import classnames from "classnames";
import PropTypes from "prop-types";

function Main(  {sidebarStore, sideMenuStore, web3Store }  ) {
   
  

  return (
    <>
      {/* BEGIN: Top Bar */}
      <div className="top-bar">




       {/* BEGIN: Mobile Menu */}
             <div className="-intro-x mr-3 sm:mr-6 ml-2">
          <div
            className="mobile-menu-toggler cursor-pointer"
            onClick={()=>sideMenuStore.toggle()}
          >
            <Lucide
              icon="BarChart2"
              className="mobile-menu-toggler__icon transform rotate-90 dark:text-slate-500"
            />
          </div>
        </div>
        {/* END: Mobile Menu */}



        {/* BEGIN: Breadcrumb */}
        <nav aria-label="breadcrumb" className="-intro-x   xl:flex">
          <ol className="breadcrumb breadcrumb-light">
            <li className="breadcrumb-item">
              <a href="#">App</a>
            </li>
             
            <li className="breadcrumb-item active" aria-current="page">
              Dashboard
            </li>
          </ol>
        </nav>
        {/* END: Breadcrumb */}
 
        {/* BEGIN: Search  
        <div className="intro-x relative ml-auto sm:mx-auto">
          <div className="search   ">
            <input
              onClick={showSearchResultModal}
              type="text"
              className="search__input form-control"
              placeholder="Quick Search... (Ctrl+k)"
            />
            <Lucide icon="Search" className="search__icon" />
          </div>
          <a className="notification sm:hidden" href="">
            <Lucide
              icon="Search"
              className="notification__icon dark:text-slate-500 mr-5"
            />
          </a>
        </div>
         END: Search */}
        
        {/* BEGIN: Notifications */}
        <div className="intro-x dropdown mr-5 sm:mr-6 hidden ">
          <div
            className="dropdown-toggle notification notification--bullet cursor-pointer"
            role="button"
            aria-expanded="false"
            data-tw-toggle="dropdown"
          >
            <Lucide
              icon="Bell"
              className="notification__icon dark:text-slate-500"
            />
          </div>
          <div className="notification-content pt-2 dropdown-menu">
            <div className="notification-content__box dropdown-content">
              <div className="notification-content__title">Notifications</div>
               
            </div>
          </div>
        </div>
        {/* END: Notifications */}
        {/* BEGIN: Notifications */}
        <div className="intro-x mr-auto sm:mr-6 hidden ">
          <div className="notification cursor-pointer">
            <Lucide
              icon="Inbox"
              className="notification__icon dark:text-slate-500"
            />
          </div>
        </div>
        {/* END: Notifications */}
        {/* BEGIN: Account Menu */}
        <div className="flex-grow text-right">
        
           </div>
        {/* END: Account Menu */}
      </div>
      {/* END: Top Bar */}
    </>
  );
}

Main.propTypes = {
  toggleMobileMenu: PropTypes.func,
};

export default Main;
