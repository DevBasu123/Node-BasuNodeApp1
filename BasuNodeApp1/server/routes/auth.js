const express = require('express');
// const { check, body } = require('express-validator/check');      // depricated
const { check, body } = require('express-validator');

const authController = require('../controllers/auth');
const User = require('../models/user');

const router = express.Router();

router.get('/login', authController.getLogin);

router.post('/login', 
    [
        body('email')
            .isEmail()              // validator
            .withMessage('Please enter a valid email address.')
            // .normalizeEmail()       // sanitizer
        ,
        body('password', 'Password has to be valid.')
            .isLength({min: 5})     // validator
            .isString()             // validator
            // .trim()                 // sanitizer
        ,
    ],
    authController.postLogin
);

router.get('/signup', authController.getSignup);

router.post('/signup', 
    [
        check('email')
            .isEmail()                          // validator
            .withMessage('Please enter valid values.')
            // Below snippet is for Custom Validator if required...
            .custom( (value, {req} ) => {       // custom validator
                // if ( value === 'test@test.com' ) {
                //     throw new Error("Custom validator check failed.");
                // }
                // return true;

                // Async validation if Email already exists....
                return User.findOne( {email: value} )
                    .then( userDoc => {
                        if(userDoc) {
                            console.log('User already exists...');
                            // req.flash('error', 'E-mail already exists');
                            // return res.redirect('/signup');
                            return Promise.reject('E-mail already exists, pick a different one.');
                        }
                    })
                ;
            } )
            .normalizeEmail()               // sanitizer
        ,
        body('password', 'this parameter is default error message for this validation.')
            .isLength({min: 5})             // validator
            .isString()                     // validator
            // .trim()                         // sanitizer
        ,
        body('confirmPassword')
            // .trim()                         // sanitizer
            .custom( (value, {req} ) => {   // custom validator
                if( value === req.body.password) {
                    return true;
                }
                else {
                    throw new Error('Passwords have to match.');
                }
            } )
        ,
    ], 
    authController.postSignup
);

router.post('/logout', authController.postLogout);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token', authController.getNewPassword);

router.get('/new-password', authController.postNewPassword);

module.exports = router;