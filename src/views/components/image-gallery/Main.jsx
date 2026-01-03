import React, { useState, useEffect } from 'react';



/*



const gallery_image_paths = [
  "/blog/brokenspirit1.png",
  "/blog/3deditor.png",
  "/blog/broken_spirit_14.png"
   
  // Add more image URLs as needed
];

*/



function Main({ imagePaths }) { // Destructure imagePaths from props
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
    useEffect(() => {
      const timer = setInterval(() => {
        setCurrentImageIndex((prevIndex) => (prevIndex + 1) % imagePaths.length);
      }, 3000);
  
      return () => {
        clearInterval(timer);
      };
    }, [imagePaths]); // Add imagePaths as a dependency to the useEffect
  
    return (
      <div className="w-full overflow-hidden object-cover object-center" style={{ maxHeight: "600px" }}>
        <img src={imagePaths[currentImageIndex]} alt="Gallery" className="w-full h-auto object-center" />
      </div>
    );
  }
  
  export default Main;