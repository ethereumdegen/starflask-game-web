import React, { useState, useEffect } from 'react';
import { observer } from "mobx-react";
import { Link } from 'react-router-dom';


import ImageGallery from "@/views/components/image-gallery/Main.jsx";
 

const gallery_image_paths = [
  "/blog/brokenspirit1.png",
  "/blog/3deditor.png",
  "/blog/broken_spirit_14.png"
   
  // Add more image URLs as needed
]; 
function Home() {
  return (
    <div className="flex flex-col min-h-screen overflow-hidden">
      <main className="flex-grow">
        <div className="container mx-auto px-4 pb-12">
          <section className="pt-16 pb-8">
            <h1 className="text-4xl font-bold mb-4"> Spirit Editor </h1>
            <p className="text-lg mb-8 italic">A map editor for the bevy game engine.   <Link to="https://github.com/ethereumdegen/spirit_editor" className="inline-block not-italic text-blue-500 text-sm" >[view on github]</Link> </p>
            <ImageGallery
               imagePaths={gallery_image_paths}
            />
          </section>

          <section className="py-16 hidden">
            <h2 className="text-3xl font-bold mb-4">About Us</h2>
            <p className="mb-4">
              We are a passionate team of indie game developers dedicated to crafting unique and engaging gaming experiences.
            </p>
            <p>
              Our mission is to push the boundaries of creativity and deliver games that captivate players from all around the world.
            </p>
          </section>

          <section className="py-16">
            <hr />
            <h2 className="text-3xl font-bold mb-4 hidden">Featured Blog Posts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Add your featured games here */}
              <div>
                <img src="game1.jpg" alt="Game 1" className="w-full h-auto mb-4 hidden" />
                <h3 className="text-xl font-bold">RPG Inventory Component</h3>
                <p>Deep dive into the details of how inventory slots work, how events are handled, and the logic checking involved.</p>
               
                <Link to="/blog/inventory-comp" className="inline-block text-blue-500 my-2" aria-label="Cruip"> [Read More] </Link>
              </div>
              <div className="hidden">
                <img src="game2.jpg" alt="Game 2" className="w-full h-auto mb-4" />
                <h3 className="text-xl font-bold">Game 2</h3>
                <p>Description of Game 2</p>
              </div>
               
            </div>
          </section>


          
        </div>
      </main>
    </div>
  );
}

export default observer(Home);