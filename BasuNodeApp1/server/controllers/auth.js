const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator/check');

// ALL SECRETS ....................................................................................
// const fs = require('fs');                                                           // DEV SECRET
// const path = require('path');                                                       // DEV SECRET
// const fsSecrets = fs.readFileSync(path.join( __dirname, '../', 'secrets.json'));    // DEV SECRET
// const mySecrets = JSON.parse(fsSecrets);                                            // DEV SECRET
// const SG_KEY = mySecrets.SG_KEY;                                                    // DEV SECRET
const SG_KEY = process.env.SG_KEY;                                                  // PRODUCTION SECRET

// SG Mail setup ..................................................................................
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(SG_KEY);

const User = require('../models/user');

exports.getLogin = (req, res, next) => {
  let message = req.flash('error');
  if(message.length > 0) {
    message = message[0];
  }
  else {
    message = null;
  }
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage: message,
    oldInput: { email: '', password: '' },
    validationErrors: []
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);
  if( !errors.isEmpty() ) {
    return res
      .status(422)
      .render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        errorMessage: errors.array()[0].msg,
        oldInput: { email: email, password: password },
        validationErrors: errors.array()
      })
    ;
  }

  User.findOne( {email: email} )
    .then( user => {
      if(!user) {
        return res
          .status(422)
          .render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: 'Invalid Email or Password.',
            oldInput: { email: email, password: password },
            validationErrors: []
          })
        ;
      }
      bcrypt
        .compare(password, user.password)
        .then( doMatch => {
          if(doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save( err => {
              console.log(err); // will be undefined because there is no error.
              res.redirect('/');
            } );
          }
          return res
            .status(422)
            .render('auth/login', {
              path: '/login',
              pageTitle: 'Login',
              errorMessage: 'Invalid Email or Password.',
              oldInput: { email: email, password: password },
              validationErrors: []
            })
          ;
        } )
        .catch( err => {
          console.log("bcrypt compare ERROR !!!"); 
        })
      ;
    } )
    .catch( err => {
      const error = new Error(err);
      error.httpStstusCode = 500;
      return next(error);
    })
  ;
};

exports.postLogout = (req, res, next) => {
  req.session.destroy( (err) => {
    console.log(err);   // will be undefined because there is no error.
    res.redirect('/');
  } );
};

exports.getSignup = (req, res, next) => {
  let message = req.flash('error');
  if(message.length > 0) {
    message = message[0];
  }
  else {
    message = null;
  }
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    errorMessage: message,
    oldInput: { email: '', password: '', confirmPassword: '' },
    validationErrors: []
  });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);
  if( !errors.isEmpty() ) {
    console.log("Validation Error...");
    return res
      .status(422)
      .render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        errorMessage: errors.array()[0].msg,
        oldInput: { email: email, password: password, confirmPassword: req.body.confirmPassword },
        validationErrors: errors.array()
      })
    ;
  }

      bcrypt
        .hash(password, 12)
        .then( hashedPassword => {
          const user = new User({
            email: email,
            password: hashedPassword,
            cart: { items: [] }
          });
          return user.save();
        } )
        .then( result => {
          console.log('New user created');
          res.redirect('/login');
          console.log("Placeholder for sending mails...Uncomment below snippet to send mails.");
          // sgMail
          //   .send({
          //     to: email,
          //     from: 'someone@email.com',
          //     subject: "Signup Completed.",
          //     html: '<h1>You successfully signed up.</h1>'
          //   })
          //   .then( () => console.log("Email sent!"))
          //   .catch( err => { console.log("SG mail mailed..."); console.log(err);} )
          // ;

        } )
        .catch( err => { 
          console.log("Error sending signup mail."); 
          const error = new Error(err);
          error.httpStstusCode = 500;
          return next(error);
      } )
      ;
  ;

};


exports.getReset = (req, res, next) => {
  let message = req.flash('error');
  if(message.length > 0) {
    message = message[0];
  }
  else {
    message = null;
  }
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    errorMessage: message
  });
};


exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if(err) {
      console.log("Error...");
      console.log(err);
      return res.redirect('/reset');
    }
    const token = buffer.toString('hex');
    User.findOne({email: req.body.email})
      .then( user => {
        if(!user) {
          req.flash('error', 'No account with the email exists.');
          return res.redirect('/reset');
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 900000 ;
        return user.save();
      })
      .then( result => {
        res.redirect('/');
        transporter.sendMail({
          to: req.body.email,
          from: '<someone@email.com>',
          subject: "Password Reset",
          html: `
          <p>Click <a href="http://localhost:3000/reset/${token}">here</a> to reset your password</p>
          `
        });
      })
      .catch( err => {
        const error = new Error(err);
        error.httpStstusCode = 500;
        return next(error);
  })
    ;
  });
};


exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({
      resetToken: token,
      resetTokenExpiration: { $gt: Date.now() }
    })
    .then( user => {
      let message = req.flash('error');
      if(message.length > 0) {
        message = message[0];
      }
      else {
        message = null;
      }
      res.render('auth/new-password', {
        path: '/new-password',
        pageTitle: 'New Password',
        userId: user._id.toString(),
        passwordToken: token,
        errorMessage: message
      });
    } )
    .catch( err => {
      const error = new Error(err);
      error.httpStstusCode = 500;
      return next(error);
    })
    ;

};


exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;

  let resetUser;

  User.findOne({
      resetToken: passwordToken,
      resetTokenExpiration: { $gt: Date.now() },
      _id: userId
    })
    .then( user => {
      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    } )
    .then( hashedPassword => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;

      return resetUser.save();
    } )
    .then( result => {
      console.log("Password reset success!!");
      res.redirect('/login');
    } )
    .catch( err => {
      console.log("Password reset error"); 
      const error = new Error(err);
      error.httpStstusCode = 500;
      return next(error);
    } )
  ;
};