const express = require('express');
const router = express.Router();
const mysql = require('mysql');

// Set up de la base de datos
var pool = mysql.createPool({
    connectionLimit: 20,
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'blog_viajes'
});

//Endpoint para el admin
router.use('/admin/', (req, res, next) => {
    // Si no está logueado, redirigimos al login
    if (!req.session.usuario) {
        req.flash('mensaje', 'Debe iniciar sesión');
        res.redirect('/inicio');
    } else {
        next();
    }
})

module.exports = router;