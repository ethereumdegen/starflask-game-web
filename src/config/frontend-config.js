
 
import homeImage from '@/assets/images/home_image_logo.png'
import favicon from '@/assets/images/favicon.png'
import punkicon from '@/assets/images/punk1164.png'

const config = {
    title: ' Doodlebuilt: Indie Games',
    tagline: '',
    url: 'https://ethereumdegen,com',
    baseURL: '/',
    favicon: favicon,
    punkicon: punkicon,
    homeImage: homeImage,



    navbar: {
        title: '',
        logo: {
          alt: 'Fire Logo',
          src: 'assets/images/fire_logo.png',
        },
        items: [
         
          { to:'/', label:'Home' },
          { to:'/blog', label:'Rust Gamedev Blog' },
         
          
        ],
    },

      accountMenu: {


          items: [
            {
              to:'/',
              label: 'Home'
            }


          ]
      },


    footer: {
        style: 'light',
        columns: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Blog',
                to: '/blog/',
              } 
            ],
          },
          {
            title: 'Community',
            items: [
            
           

              {
                label: 'Indie DB',
                href: 'https://www.indiedb.com/games/broken-spirit',
              },

              {
                label: 'Support & Donate',
                href: 'https://ko-fi.com/doodlebuilt',
              },

            
            

              
             
            ],
          },
          {
            title: 'More',
            items: [
             
              {
                label: 'GitHub',
                href: 'https://github.com/ethereumdegen/degen-portfolio',
              },
  
              {
                label: 'Twitter',
                href: 'https://twitter.com/doodlebuilt',
              },

             
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} `,

        socials:{
          twitter:"https://twitter.com/ethereumdegen",
          github:"https://github.com/ethereumdegen"
        }
      }
    

}



export default config;
//module.exports = config;
