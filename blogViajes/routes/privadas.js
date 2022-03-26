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

router.get('/admin/index', (req, res) => {
    pool.getConnection((err, connection) => {
        //definicion de la consulta
        const query = `SELECT * 
        FROM publicaciones WHERE 
        autor_id = ${connection.escape(req.session.usuario.id)}`;
        connection.query(query, (error, filas, campos) => {
            //dibujamos la vista
            res.render('admin/index', { usuario: req.session.usuario, mensaje: req.flash('mensaje'), publicaciones: filas });
        });
        connection.release();
    })
});

router.get('/admin/procesar_cerrar_sesion', (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

//Creamos la vista agregar con el formulario y la interface que esta en la parte privada
router.get('/admin/agregar', (req, res) => {
    res.render('admin/agregar', { mensaje: req.flash('mensaje'), usuario: req.session.usuario });
});

//declaramos el endpoint para procesar el formulario de agregar publicación
router.post('/admin/procesar_agregar', (req, res) => {
    pool.getConnection((err, connection) => {
        const date = new Date();
        const fecha = `${date.getFullYear()}-${date.getMonth() +1 }-${date.getDate()}`
        const consulta = `
            INSERT INTO
            publicaciones
            (titulo, resumen, contenido, autor_id, fecha_hora)
            VALUES
            (${connection.escape(req.body.titulo)},
            ${connection.escape(req.body.resumen)},
            ${connection.escape(req.body.contenido)},
            ${connection.escape(req.session.usuario.id)},
            ${connection.escape(fecha)})
        `;
        //Al finalizar nos muestra un mensaje de publicación agregada y nos redirecciona a la pagina principal
        connection.query(consulta, (error, filas, campos) => {
            req.flash('mensaje', 'Publicacion agregada');
            res.redirect('/admin/index');
        });
        connection.release();
    });
});

//Endpoint para editar una publicación
router.get('/admin/editar/:id', (req, res) => {
    pool.getConnection((err, connection) => {
        const consulta = `
            SELECT * FROM publicaciones 
            WHERE id = ${connection.escape(req.params.id)}
            AND
            autor_id = ${connection.escape(req.session.usuario.id)}`;

            connection.query(consulta, (error, filas, campos) => {
                if(filas.length > 0) {
                    res.render('admin/editar', { publicacion: filas[0], mensaje: req.flash('mensaje'), usuario: req.session.usuario });
                }
                else {
                    req.flash('mensaje', 'No tiene permisos para editar esta publicación');
                    res.redirect('/admin/index');
                }
            });
        connection.release();
    });
});

//Endpoint para procesar la edición de una publicación
router.post('/admin/procesar_editar', (req, res) => {
    pool.getConnection((err, connection) => {
        const consulta = `
            UPDATE publicaciones
            SET 
            titulo = ${connection.escape(req.body.titulo)},
            resumen = ${connection.escape(req.body.resumen)},
            contenido = ${connection.escape(req.body.contenido)}
            WHERE id = ${connection.escape(req.body.id)}
            AND
            autor_id = ${connection.escape(req.session.usuario.id)}`

        connection.query(consulta, (error, filas, campos) => {
            if (filas && filas.affectedRows > 0) {
                req.flash('mensaje', 'Publicación editada');
                res.redirect('/admin/index');
            }else{
                req.flash('mensaje', 'No tiene permisos para editar esta publicación');
                res.redirect('/admin/index');
            }
        });
        connection.release();
    });
});

//Endpoint para eliminar una publicación
router.get('/admin/procesar_eliminar/:id', (req, res) => {
    pool.getConnection((err, connection) => {
        const consulta = ` 
            DELETE FROM publicaciones
            WHERE 
            id = ${connection.escape(req.params.id)}
            AND 
            autor_id = ${connection.escape(req.session.usuario.id)}`;
        
        connection.query(consulta, (error, filas, campos) => {
            if (filas && filas.affectedRows > 0) {
                //Si encuentra la publicacion la elimina
                req.flash('mensaje', 'Publicación eliminada');                
            }else{
                //Si no tiene permisos,muestra mensaje de error
                req.flash('mensaje', 'No tiene permisos para eliminar esta publicación');                
            }
            //Redirecciona a la pagina principal
            res.redirect('/admin/index');
        });
        //libera la conexion
        connection.release();
    });
});


module.exports = router