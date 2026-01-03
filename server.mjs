import express from 'express'
 
import cors from 'cors'


import  history from 'connect-history-api-fallback'



export async function start(){

    const apiPort = 3000 

    const app = express() 

    app.use(cors());

    app.use(express.static('dist'));

    const appListener = app.listen(apiPort, () => {
        console.log(`API Server listening at http://localhost:${apiPort}`)
    }) 
 

}


start()