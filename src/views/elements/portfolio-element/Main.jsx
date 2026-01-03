 
 import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
 

import { observer } from "mobx-react";

function Main({title, image, description, link }) {
 

  let navigate = useNavigate();


  let titleColor =  'text-white'
 
 
  return (
    <div className="flex flex-col mt-12 mb-24 border-b-4 border-gray-500"  > 

      <div className="w-full">      
          <a href={link} className="h-full w-full text-xl font-bold block hover:text-blue-500" > 
        {`${title}`} 
          </a>
        
       </div>

    <div className="flex flex-row  ">

       <div className=" text-gray-800 text-lg flex-grow py-8">
        {`${description}`}
        </div>
     
      <div>
        <a href={link} className="h-full w-1/4 p-8" >
          <img  className="mx-auto" src={`${image}`} style={{maxHeight:"140px"}}/>
        </a>
      </div>


    </div> 
      
    

  </div>
  )

}

  


export default observer(Main);


