const express = require('express');
const router = express.Router();
const mysql = require('mysql');
var path = require('path');
const nodemailer = require('nodemailer');

//Creamos la funcion en la cual indicamos desde donde se enviara el correo
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'rafaellacuesta14@gmail.com',
        pass: 'Lacuesta.14'
    }
});

function enviarCorreoBienvenida(email, nombre) {
    const opciones = {
        from: 'rafaellacuesta14@gmail.com',
        to: email,
        subject: 'Bienvenido a la aplicacion',
        text: `Bienvenido ' ${nombre} ' a la aplicacion'`
    }
    transporter.sendMail(opciones, (error, info) => {
    })
};

// Set up de la base de datos
var pool = mysql.createPool({
    connectionLimit: 20,
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'blog_viajes'
});

//Endpoint para la pagina principal
router.get('/', (req, res) => {
    pool.getConnection((err, connection) => {
        //definicion de la consulta
        let consulta;
        let modificadorConsulta = "";
        let modificarPagina = "";
        let pagina = 0;
        const busqueda = ( req.query.busqueda ) ? req.query.busqueda : "";
        if (busqueda != ""){
          modificadorConsulta = `
            WHERE
            titulo LIKE '%${busqueda}%' OR
            resumen LIKE '%${busqueda}%' OR
            contenido LIKE '%${busqueda}%'
          `

          modificarPagina = "";
        }else{
            pagina = (req.query.pagina) ? parseInt(req.query.pagina) : 0;
            if(pagina < 0){
                pagina = 0;
            }
            modificarPagina = `LIMIT 5 OFFSET ${pagina*5}`;
        }
        consulta = `
          SELECT
          publicaciones.id id, titulo, resumen, fecha_hora, pseudonimo, votos, avatar
          FROM publicaciones
          INNER JOIN autores
          ON publicaciones.autor_id = autores.id
          ${modificadorConsulta}
          ORDER BY fecha_hora DESC
            ${modificarPagina}
        `
        connection.query(consulta, (error, filas, campos) => {
            //dibujamos la vista
            res.render('index', { publicaciones: filas, busqueda: busqueda, pagina: pagina });
        });
        connection.release();
    });
});

//Endpoint para la pagina de registro
router.get('/registro', (req, res) => {
    //Empleamos una variable flash en el caso de que el formulario falle, retornamos al formulario y enviamos mensaje de error
    res.render('registro', {mensaje: req.flash('mensaje')});    
});

//Endpoint para procesar registro
router.post('/procesar_registro', (req, res) => {
    pool.getConnection((err, connection) => {
        //obtenemos los datos del formulario
        const email = req.body.email.toLowerCase().trim();
        const pseudonimo = req.body.pseudonimo.trim();
        const contrasena = req.body.contrasena;
        //definicion de la consulta
        const consultaEmail = `
            SELECT *
            FROM autores
            WHERE email = ${connection.escape(email)}
        `

        connection.query(consultaEmail, (error, filas, campos) => {
            //si el email ya existe, retornamos al formulario con mensaje de error
            if (filas.length > 0) {
                req.flash('mensaje', 'Email duplicado');
                res.redirect('/registro');
            }
            else{
                const consultaPseudonimo = `
                    SELECT *
                    FROM autores
                    WHERE pseudonimo = ${connection.escape(pseudonimo)}
                `;

                connection.query(consultaPseudonimo, (error, filas, campos) => {
                    if(filas.length > 0){
                        req.flash('mensaje', 'Pseudonimo duplicado');
                        res.redirect('/registro');
                    }else{
                        //si no existe, insertamos el usuario
                        const consulta = `
                            INSERT INTO
                            autores
                            (email, contrasena, pseudonimo)
                            VALUES
                            (${connection.escape(email)}, 
                            ${connection.escape(contrasena)}, 
                            ${connection.escape(pseudonimo)})
                        `

                        connection.query(consulta, (error, filas, campos) => {
                            //Verificamos si existe un archivo cargado y que se llame avatar
                            if(req.files && req.files.avatar){
                                const archivoAvatar = req.files.avatar;
                                const id = filas.insertId;
                                const nombreArchivo = `${id}${path.extname(archivoAvatar.name)}`;
                                //Colocamos una ruta para guardar el archivo
                                archivoAvatar.mv(`./public/avatars/${nombreArchivo}`, (error) => {
                                    //Realizamos un update en la tabla autores para guardar el avatar
                                    const consultaAvatar = `
                                        UPDATE autores
                                        SET avatar = ${connection.escape(nombreArchivo)}
                                        WHERE id = ${connection.escape(id)}`;

                                        //Ejecutamos la consulta
                                        connection.query(consultaAvatar, (error, filas, campos) => {
                                            enviarCorreoBienvenida(email, pseudonimo);
                                            req.flash('mensaje', 'Registro exitoso');
                                            res.redirect('/registro');
                                        });
                                });
                            }else{
                                enviarCorreoBienvenida(email, pseudonimo);
                                req.flash('mensaje', 'Usuario registrado correctamente');
                                res.redirect('/registro');
                            }
                        });
                    }
                });
            }   
        })
        //Liberamos la conexion
        connection.release();
    })
});

//Endpoint para el inicio
router.get('/inicio', (req, res) => {
    //Empleamos una variable flash en el caso de que el formulario falle, retornamos al formulario y enviamos mensaje de error
    res.render('inicio', {mensaje: req.flash('mensaje')});
});

//Endpoint para procesar inicio
router.post('/procesar_inicio', (req, res) => {
    pool.getConnection((err, connection) => {
        const consulta = `
        SELECT *
        FROM autores
        WHERE
        email = ${connection.escape(req.body.email)} AND
        contrasena = ${connection.escape(req.body.contrasena)}
      `
        connection.query(consulta, (error, filas, campos) => {
            //Si no tiene usuario, retornamos al index
            if (filas.length > 0) {
                req.session.usuario = filas[0];
                res.redirect('/admin/index');
            } else {
                //En caso contrario retornamos al inicio con mensaje de error
                req.flash('mensaje', 'Usuario o contraseña incorrectos');
                res.redirect('/inicio');
            }
        })
        //Liberamos la conexion
        connection.release();
    })
});

router.get('/publicacion/:id', (req, res) => {
    pool.getConnection((err, connection) => {
        //Traemos todas las publicaciones que coincidan con el id
        const consulta = `
            SELECT * FROM publicaciones
            WHERE id = ${connection.escape(req.params.id)}`;
            //Ejecutamos la consulta
            connection.query(consulta, (error, filas, campos) => {
                if(filas.length > 0){
                    res.render('publicacion', {publicacion: filas[0]});
                }else{
                    //Redireccionamos al index si no hay publicaciones
                    res.redirect('/');
                }
            });
        //Liberamos la conexion
        connection.release();
    });
});

router.get('/autores', (req, res) => {
    //Obtenemos la BD del pool de conexiones
    pool.getConnection((err, connection) => {
        const query = `
        SELECT autores.id id, pseudonimo, avatar, publicaciones.id publicacion_id, titulo
        FROM autores 
        INNER JOIN
        publicaciones on autores.id = publicaciones.autor_id
        ORDER BY id DESC, publicaciones.fecha_hora DESC`;
        //Ejecutamos la consulta
        connection.query(query, (error, filas, campos) => {
            //Declaramos una variable para almacenar los autores
            autores = [];
            ultimoAutorId = undefined;
            //Recorremos las filas
            filas.forEach( registro => {
                //Si el id del autor es diferente al ultimo id, creamos un nuevo autor
                if(registro.id != ultimoAutorId){
                    //Creamos un nuevo autor
                    ultimoAutorId = registro.id;
                    //Ingresamos los datos al objeto autores
                    autores.push({
                        id: registro.id,
                        pseudonimo: registro.pseudonimo,
                        avatar: registro.avatar,
                        publicaciones: []
                    })
                }
                //Agregamos la publicacion al ultimo autor
                autores[autores.length - 1].publicaciones.push({
                    id: registro.publicacion_id,
                    titulo: registro.titulo
                })
            });
            //Si hay autores, renderizamos la vista con los datos
            res.render('autores', {autores: autores});
        });
        connection.release();
    });
});

//Endpoint para votar
router.get('/publicacion/:id/votar', (req, res) => {
    pool.getConnection((err, connection) => {
        const query = `
        SELECT * FROM publicaciones WHERE id = ${connection.escape(req.params.id)}`;

        connection.query(query, (error, filas, campos) => {
            if(filas.length > 0){
                //Actualizamos las publicaciones
                const consultaVoto = `
                    UPDATE publicaciones
                    SET votos = votos + 1
                    WHERE id = ${connection.escape(req.params.id)}`

                connection.query(consultaVoto, (error, filas, campos) => {
                    res.redirect('/publicacion/${req.params.id}');
                });
            }else{
                req.flash('mensaje', 'No existe la publicación');
                res.redirect('/');
            }
        });
        connection.release();
    })
});

module.exports = router;