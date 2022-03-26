const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const session = require('express-session')
const flash = require('express-flash')
const fileupload = require('express-fileupload')

const rutasMiddleware = require('./routes/middleware')
const rutasPublicas = require('./routes/publicas')
const rutasPrivadas = require('./routes/privadas')


// Indicamos a la aplicacion que use las librerias
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(session({ secret: 'token-muy-secreto', resave: true, saveUninitialized: true }));
app.use(flash());
app.use(express.static('public'));
app.use(fileupload());

//Le indicamos que rutas mirar
app.use(rutasMiddleware);
app.use(rutasPublicas);
app.use(rutasPrivadas);


app.listen(8080, function(){
    console.log("Servidor iniciado");
})

