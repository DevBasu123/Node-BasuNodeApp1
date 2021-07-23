// import dependencies and initialize express
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

// my IMPORTS......................................................................................
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const fs = require('fs');                                   // DEV secrets

const User = require('./models/user');
const errorController = require('./controllers/error');

// ALL SECRETS ....................................................................................
// const fsSecrets = fs.readFileSync(path.join( __dirname, 'secrets.json'));           // DEV SECRETS
// const mySecrets = JSON.parse(fsSecrets);                                            // DEV SECRETS
// // --
// const MONGODB_DRIVER = mySecrets.MONGODB_DRIVER;                // DEV SECRET
// const MONGODB_USERNAME = mySecrets.MONGODB_USERNAME;            // DEV SECRET
// const MONGODB_DBNAME = mySecrets.MONGODB_DBNAME;                // DEV SECRET
// const MONGODB_PASSWORD = mySecrets.MONGODB_PASSWORD;            // DEV SECRET
// const MONGODB_CLUSTER = mySecrets.MONGODB_CLUSTER;              // DEV SECRET
// const MONGODB_PARAMS = mySecrets.MONGODB_PARAMS;                // DEV SECRET
const MONGODB_DRIVER = process.env.MONGODB_DRIVER;           // PRODUCTION SECRET
const MONGODB_USERNAME = process.env.MONGODB_USERNAME;       // PRODUCTION SECRET
const MONGODB_DBNAME = process.env.MONGODB_DBNAME;           // PRODUCTION SECRET
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;       // PRODUCTION SECRET
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER;         // PRODUCTION SECRET
const MONGODB_PARAMS = process.env.MONGODB_PARAMS;           // PRODUCTION SECRET

// set up MONGODB_URI .............................................................................
const MONGODB_URI = MONGODB_DRIVER + '://' + MONGODB_USERNAME + ':' + MONGODB_PASSWORD + '@' + MONGODB_CLUSTER + '/' + MONGODB_DBNAME + '?' + MONGODB_PARAMS;


const healthRoutes = require('./routes/health-route');
const swaggerRoutes = require('./routes/swagger-route');


const app = express();

// sessions .......................................................................................
const store = new MongoDBStore({
	uri: MONGODB_URI,
	collection: 'sessions'
});
// CSRF protection ................................................................................
const csrfProtection = csrf();

// MULTER STORAGE CONFIG ..........................................................................
// destination is now S3, needs to be fixed
const multerStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'images');
	},
	filename: (req, file, cb) => {
        fnarr = file.originalname.split(".");
        fnext = fnarr.splice(-1);
        fnarr.push(Date.now(), fnext);
        newFilename = fnarr.join(".");
        cb(null, newFilename);		
	}
});
// MULTER FILTER ..................................................................................
const fileFilter = (req, file, cb) => {
    if( file.mimetype === 'image/png' || file.mimetype === 'image.jpg' || file.mimetype === 'image/jpeg' ) {
        cb(null, true);
    }
    else {
        cb(null, false);
    }
};


// set View and View Engine .......................................................................
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// app.set('views', 'views');

// set ROUTES .....................................................................................
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

// MULTER PARSING .................................................................................
app.use(multer({storage: multerStorage, fileFilter: fileFilter}).single('image'));

// enable parsing of http request body
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// STATIC FILES ...................................................................................
app.use(express.static(path.join(__dirname, 'public')));
// app.use('/images', express.static(path.join(__dirname, 'images')));      // used IBM S3

// routes and api calls
app.use('/health', healthRoutes);
app.use('/swagger', swaggerRoutes);

// comment this out ...............................................................................
// default path to serve up index.html (single page application)
// app.all('', (req, res) => {
//   res.status(200).sendFile(path.join(__dirname, '../public', 'index.html'));
// });

// SESSION ........................................................................................
app.use(session(
	{
		secret: 'my scret', 
		resave: false, 
		saveUninitialized: false,
		store: store
	}
));

// SET CSRF and FLASH .............................................................................
app.use(csrfProtection);
app.use(flash());

// AUTH CHECK AGAINST ALL REQUEST .................................................................
app.use( (req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn;
    res.locals.csrfToken = req.csrfToken();
    next();
} );
app.use((req, res, next) => {
    if(!req.session.user) {
        console.log("User session NOT Found...");
        return next();
    }
    User.findById(req.session.user._id)
        .then( user => {
            if(!user) {
                return next();
            }
            console.log("User session Found...");
            req.user = user;
            next();
        } )
        .catch( err => {
            console.log("Error in middleware....");
            next(new Error(err));
        } )
    ;
});


// Use ROUTES .....................................................................................
app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

// ERROR 500 ......................................................................................
app.get('/500', errorController.get500);

// ERROR 404 ......................................................................................
app.use(errorController.get404);

// MORE ERROR .....................................................................................
// app.use( (error, req, res, next) => {
//     res.status(500)
//         .render('500', {
//             pageTitle: 'Error!',
//             path: '/500',
//             isAuthenticated: req.session.isLoggedIn
//         })
//     ;
// } );


// start node server
const port = process.env.PORT || 3000;

// Connect to MONGODB using MONGOOSE...............................................................
mongoose.connect(MONGODB_URI)
	.then( result => {
		console.log('Mongoose connected...');
		app.listen(port, () => {
			console.log(`App started on port: ${port}`);
		});
	})
	.catch( err => {
		console.log('Mongoose connection error...');
		console.log(err);
	})
;

// comment below lines ............................................................................
// error handler for unmatched routes or api calls
// app.use((req, res, next) => {
//   res.sendFile(path.join(__dirname, '../public', '404.html'));
// });

module.exports = app;
